import path from 'node:path';
import {
  claimSpin,
  createSpinStore,
  getSpinStatus,
  hasSupabaseConfig,
  isValidDeviceId,
  readRequestBody,
} from '../server/spinService.js';

const store = createSpinStore({
  storePath: path.resolve(process.cwd(), 'server', 'spin-store.json'),
});

function sendJson(response, statusCode, body) {
  response.status(statusCode).json(body);
}

export default async function handler(request, response) {
  try {
    if (process.env.VERCEL && !hasSupabaseConfig()) {
      sendJson(response, 500, {
        message: 'Spin lock storage is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.',
      });
      return;
    }

    if (request.method === 'GET') {
      const deviceId = request.query.deviceId;

      if (!isValidDeviceId(deviceId)) {
        sendJson(response, 400, { message: 'A valid deviceId is required.' });
        return;
      }

      const status = await getSpinStatus(store, deviceId);
      sendJson(response, 200, status);
      return;
    }

    if (request.method === 'POST') {
      const body = request.body && Object.keys(request.body).length
        ? request.body
        : await readRequestBody(request);
      const deviceId = body.deviceId;

      if (!isValidDeviceId(deviceId)) {
        sendJson(response, 400, { message: 'A valid deviceId is required.' });
        return;
      }

      const result = await claimSpin(store, deviceId, request);
      sendJson(response, result.statusCode, result.body);
      return;
    }

    sendJson(response, 405, { message: 'Method not allowed.' });
  } catch (error) {
    sendJson(response, 500, {
      message: error.message || 'Unexpected server error.',
    });
  }
}
