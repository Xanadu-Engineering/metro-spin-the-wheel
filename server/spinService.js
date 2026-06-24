import { createHash, randomInt, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { SEGMENTS } from '../src/data/segments.js';

const RESPIN_LABEL = 'TRY AGAIN';
const KV_KEY_PREFIX = 'spin-device:';

function hashValue(value) {
  return createHash('sha256').update(value || 'unknown').digest('hex');
}

export function getRequestIp(request) {
  const forwardedFor = request.headers['x-forwarded-for'];

  if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    return forwardedFor.split(',')[0].trim();
  }

  return request.socket?.remoteAddress || 'unknown';
}

export function publicSpin(spin) {
  if (!spin) return null;

  return {
    id: spin.id,
    result: spin.result,
    spunAt: spin.spunAt,
  };
}

export function getAttempts(entry) {
  if (!entry) return [];
  if (Array.isArray(entry.attempts)) return entry.attempts;
  return [entry];
}

export function latestSpin(entry) {
  const attempts = getAttempts(entry);
  return attempts.length ? attempts[attempts.length - 1] : null;
}

export function deviceCanSpin(entry) {
  const attempts = getAttempts(entry);

  if (attempts.length === 0) return true;

  return attempts[attempts.length - 1]?.result?.label === RESPIN_LABEL;
}

export function isValidDeviceId(deviceId) {
  return typeof deviceId === 'string' && /^[a-zA-Z0-9-]{16,128}$/.test(deviceId);
}

export async function readRequestBody(request) {
  let body = '';

  for await (const chunk of request) {
    body += chunk;

    if (body.length > 4096) {
      throw new Error('Request body is too large.');
    }
  }

  return body ? JSON.parse(body) : {};
}

async function kvRequest(pathname, init = {}) {
  const baseUrl = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!baseUrl || !token) return null;

  const response = await fetch(`${baseUrl}${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(`KV request failed with status ${response.status}.`);
  }

  return response.json();
}

export function hasKvConfig() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

export function createSpinStore({ storePath } = {}) {
  let storeQueue = Promise.resolve();

  async function readFileStore() {
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

  async function writeFileStore(store) {
    await mkdir(path.dirname(storePath), { recursive: true });
    await writeFile(storePath, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
  }

  async function getEntry(deviceId) {
    const kvPayload = await kvRequest(`/get/${KV_KEY_PREFIX}${deviceId}`);

    if (kvPayload) {
      return kvPayload.result ? JSON.parse(kvPayload.result) : null;
    }

    const store = await readFileStore();
    return store.spins[deviceId] || null;
  }

  function updateEntry(deviceId, mutator) {
    const next = storeQueue.then(async () => {
      const kvPayload = await kvRequest(`/get/${KV_KEY_PREFIX}${deviceId}`);

      if (kvPayload) {
        const entry = kvPayload.result ? JSON.parse(kvPayload.result) : null;
        const result = await mutator(entry);

        if (result.changed) {
          await kvRequest(`/set/${KV_KEY_PREFIX}${deviceId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(result.entry),
          });
        }

        return result.response;
      }

      const store = await readFileStore();
      const entry = store.spins[deviceId] || null;
      const result = await mutator(entry);

      if (result.changed) {
        store.spins[deviceId] = result.entry;
        await writeFileStore(store);
      }

      return result.response;
    });

    storeQueue = next.catch(() => {});

    return next;
  }

  return {
    getEntry,
    updateEntry,
  };
}

export async function getSpinStatus(store, deviceId) {
  const entry = await store.getEntry(deviceId);

  return {
    hasSpun: Boolean(entry),
    canSpin: deviceCanSpin(entry),
    spin: publicSpin(latestSpin(entry)),
  };
}

export async function claimSpin(store, deviceId, request) {
  return store.updateEntry(deviceId, async (entry) => {
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

    const nextEntry = { attempts: [...getAttempts(entry), spin] };

    return {
      changed: true,
      entry: nextEntry,
      response: {
        statusCode: 201,
        body: {
          allowed: true,
          hasSpun: true,
          canSpin: deviceCanSpin(nextEntry),
          spin: publicSpin(spin),
        },
      },
    };
  });
}
