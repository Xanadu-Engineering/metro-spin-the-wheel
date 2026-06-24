import { createServer } from 'node:http';
import { createHash, randomInt, randomUUID } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEGMENTS } from '../src/data/segments.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.resolve(process.env.DIST_DIR || path.join(projectRoot, 'dist'));
const storePath = path.resolve(process.env.SPIN_STORE_PATH || path.join(projectRoot, 'server', 'spin-store.json'));
const port = Number(process.env.PORT || 4173);

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

let storeQueue = Promise.resolve();

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(body));
}

function hashValue(value) {
  return createHash('sha256').update(value || 'unknown').digest('hex');
}

function getRequestIp(request) {
  const forwardedFor = request.headers['x-forwarded-for'];

  if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    return forwardedFor.split(',')[0].trim();
  }

  return request.socket.remoteAddress || 'unknown';
}

function publicSpin(spin) {
  if (!spin) return null;

  return {
    id: spin.id,
    result: spin.result,
    spunAt: spin.spunAt,
  };
}

// Landing on "TRY AGAIN" grants another spin, every time. The session only ends
// once the device lands on a different outcome (a prize, or "OOPS! BETTER LUCK").
const RESPIN_LABEL = 'TRY AGAIN';

function getAttempts(entry) {
  if (!entry) return [];
  if (Array.isArray(entry.attempts)) return entry.attempts;
  // Legacy records stored a single spin object before bonus spins existed.
  return [entry];
}

function latestSpin(entry) {
  const attempts = getAttempts(entry);
  return attempts.length ? attempts[attempts.length - 1] : null;
}

function deviceCanSpin(entry) {
  const attempts = getAttempts(entry);

  if (attempts.length === 0) return true;
  // A retry grants another spin no matter how many times it happens; only a
  // non-retry result (a prize, or "OOPS! BETTER LUCK") ends the session.
  return attempts[attempts.length - 1]?.result?.label === RESPIN_LABEL;
}

function isValidDeviceId(deviceId) {
  return typeof deviceId === 'string' && /^[a-zA-Z0-9-]{16,128}$/.test(deviceId);
}

async function readStore() {
  try {
    const value = await readFile(storePath, 'utf8');
    const parsed = JSON.parse(value);

    return {
      spins: parsed.spins || {},
    };
  } catch (error) {
    if (error.code === 'ENOENT') return { spins: {} };

    throw error;
  }
}

async function writeStore(store) {
  await mkdir(path.dirname(storePath), { recursive: true });
  await writeFile(storePath, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
}

function updateStore(mutator) {
  const next = storeQueue.then(async () => {
    const store = await readStore();
    const result = await mutator(store);

    if (result.changed) {
      await writeStore(store);
    }

    return result.response;
  });

  storeQueue = next.catch(() => {});

  return next;
}

async function readRequestBody(request) {
  let body = '';

  for await (const chunk of request) {
    body += chunk;

    if (body.length > 4096) {
      throw new Error('Request body is too large.');
    }
  }

  return body ? JSON.parse(body) : {};
}

async function handleSpinStatus(response, requestUrl) {
  const deviceId = requestUrl.searchParams.get('deviceId');

  if (!isValidDeviceId(deviceId)) {
    sendJson(response, 400, { message: 'A valid deviceId is required.' });
    return;
  }

  const store = await readStore();
  const entry = store.spins[deviceId];

  sendJson(response, 200, {
    hasSpun: Boolean(entry),
    canSpin: deviceCanSpin(entry),
    spin: publicSpin(latestSpin(entry)),
  });
}

async function handleSpinClaim(request, response) {
  let body;

  try {
    body = await readRequestBody(request);
  } catch {
    sendJson(response, 400, { message: 'Invalid JSON request body.' });
    return;
  }

  const deviceId = body.deviceId;

  if (!isValidDeviceId(deviceId)) {
    sendJson(response, 400, { message: 'A valid deviceId is required.' });
    return;
  }

  const result = await updateStore((store) => {
    const entry = store.spins[deviceId];

    if (!deviceCanSpin(entry)) {
      return {
        changed: false,
        response: {
          statusCode: 409,
          body: {
            allowed: false,
            hasSpun: true,
            canSpin: false,
            spin: publicSpin(latestSpin(entry)),
          },
        },
      };
    }

    const selectedSegment = SEGMENTS[randomInt(SEGMENTS.length)];
    const spin = {
      id: randomUUID(),
      result: selectedSegment,
      spunAt: new Date().toISOString(),
      ipHash: hashValue(getRequestIp(request)),
    };

    store.spins[deviceId] = { attempts: [...getAttempts(entry), spin] };

    return {
      changed: true,
      response: {
        statusCode: 201,
        body: {
          allowed: true,
          hasSpun: true,
          canSpin: deviceCanSpin(store.spins[deviceId]),
          spin: publicSpin(spin),
        },
      },
    };
  });

  sendJson(response, result.statusCode, result.body);
}

async function sendFile(response, filePath) {
  const file = await readFile(filePath);
  const extension = path.extname(filePath).toLowerCase();

  response.writeHead(200, {
    'Content-Type': mimeTypes[extension] || 'application/octet-stream',
  });
  response.end(file);
}

async function serveStatic(response, requestUrl) {
  let pathname = decodeURIComponent(requestUrl.pathname);

  if (pathname === '/') pathname = '/index.html';

  let filePath = path.resolve(distDir, `.${pathname}`);

  if (!filePath.startsWith(distDir)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  try {
    const fileStats = await stat(filePath);

    if (fileStats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    await sendFile(response, filePath);
  } catch {
    await sendFile(response, path.join(distDir, 'index.html'));
  }
}

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host || 'localhost'}`);

  try {
    if (requestUrl.pathname === '/api/spin-lock' && request.method === 'GET') {
      await handleSpinStatus(response, requestUrl);
      return;
    }

    if (requestUrl.pathname === '/api/spin-lock' && request.method === 'POST') {
      await handleSpinClaim(request, response);
      return;
    }

    if (requestUrl.pathname.startsWith('/api/')) {
      sendJson(response, 404, { message: 'Not found.' });
      return;
    }

    await serveStatic(response, requestUrl);
  } catch (error) {
    sendJson(response, 500, {
      message: error.message || 'Unexpected server error.',
    });
  }
});

server.listen(port, () => {
  console.log(`Spin wheel production server running at http://localhost:${port}`);
});
