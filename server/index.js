import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  claimSpin,
  createSpinStore,
  getSpinStatus,
  isValidDeviceId,
  readRequestBody,
} from './spinService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.resolve(process.env.DIST_DIR || path.join(projectRoot, 'dist'));
const storePath = path.resolve(process.env.SPIN_STORE_PATH || path.join(projectRoot, 'server', 'spin-store.json'));
const port = Number(process.env.PORT || 4173);
const spinStore = createSpinStore({ storePath });

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

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(body));
}

async function handleSpinStatus(response, requestUrl) {
  const deviceId = requestUrl.searchParams.get('deviceId');

  if (!isValidDeviceId(deviceId)) {
    sendJson(response, 400, { message: 'A valid deviceId is required.' });
    return;
  }

  const status = await getSpinStatus(spinStore, deviceId);
  sendJson(response, 200, status);
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

  const result = await claimSpin(spinStore, deviceId, request);

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
