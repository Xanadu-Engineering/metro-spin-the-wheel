import { IS_PRODUCTION_ENV, SPIN_LOCK_API_URL } from '../config/spinEnvironment';
import { getDeviceId } from './deviceFingerprint';

const StoreKeys = {
  spinState: 'metro-spin-state-v1',
  legacyCannotSpin: 'ksnliks',
  legacyPrize: 'klnskdr',
};

function readJson(value) {
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function readStoredSpin() {
  const currentState = readJson(localStorage.getItem(StoreKeys.spinState));

  if (currentState?.result) return currentState;

  const legacyPrize = readJson(localStorage.getItem(StoreKeys.legacyPrize));
  const legacyCannotSpin = localStorage.getItem(StoreKeys.legacyCannotSpin);

  if (legacyPrize || legacyCannotSpin) {
    return {
      result: legacyPrize,
      spunAt: null,
    };
  }

  return null;
}

export function getStoredSpin() {
  try {
    return readStoredSpin();
  } catch {
    return null;
  }
}

export function rememberSpin(result) {
  try {
    const spinState = {
      result,
      spunAt: new Date().toISOString(),
    };

    localStorage.setItem(StoreKeys.spinState, JSON.stringify(spinState));
    localStorage.setItem(StoreKeys.legacyCannotSpin, 'true');
    localStorage.setItem(StoreKeys.legacyPrize, JSON.stringify(result));
  } catch {
    // Storage can be blocked in private modes. The server lock still protects production.
  }
}

async function parseSpinResponse(response) {
  const payload = await response.json().catch(() => ({}));

  if (response.status === 409) {
    return {
      allowed: false,
      hasSpun: true,
      spin: payload.spin || null,
    };
  }

  if (!response.ok) {
    throw new Error(payload.message || 'Unable to check this device right now.');
  }

  return payload;
}

export async function getProductionSpinStatus() {
  if (!IS_PRODUCTION_ENV) {
    return { hasSpun: false, canSpin: true, spin: null };
  }

  const deviceId = await getDeviceId();
  const url = new URL(SPIN_LOCK_API_URL, window.location.origin);

  url.searchParams.set('deviceId', deviceId);

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });

  const payload = await parseSpinResponse(response);

  if (payload.hasSpun && payload.spin?.result) {
    rememberSpin(payload.spin.result);
  }

  return {
    hasSpun: Boolean(payload.hasSpun),
    canSpin: payload.canSpin ?? !payload.hasSpun,
    spin: payload.spin || null,
  };
}

export async function claimProductionSpin() {
  if (!IS_PRODUCTION_ENV) {
    return { allowed: true, spin: null };
  }

  const deviceId = await getDeviceId();
  const response = await fetch(SPIN_LOCK_API_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ deviceId }),
  });

  const payload = await parseSpinResponse(response);

  if (payload.spin?.result) {
    rememberSpin(payload.spin.result);
  }

  return {
    allowed: Boolean(payload.allowed),
    canSpin: Boolean(payload.canSpin),
    spin: payload.spin || null,
  };
}

export { IS_PRODUCTION_ENV };
