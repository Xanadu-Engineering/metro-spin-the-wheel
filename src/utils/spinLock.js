import { HAS_SUPABASE_BROWSER_CONFIG, IS_PRODUCTION_ENV } from '../config/spinEnvironment.js';
import { getSupabaseClient } from '../lib/supabaseClient.js';
import { getDeviceId } from './deviceFingerprint.js';

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

function normalizeRpcPayload(payload) {
  if (!payload?.body) {
    throw new Error('Supabase returned an invalid response.');
  }

  return {
    statusCode: payload.statusCode,
    ...payload.body,
  };
}

export async function getProductionSpinStatus() {
  if (!IS_PRODUCTION_ENV) {
    return { hasSpun: false, canSpin: true, spin: null };
  }

  if (!HAS_SUPABASE_BROWSER_CONFIG) {
    throw new Error(
      'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.',
    );
  }

  const deviceId = await getDeviceId();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('get_spin_lock_status', {
    p_device_id: deviceId,
  });

  if (error) {
    throw new Error(error.message || 'Unable to check this device right now.');
  }

  const payload = normalizeRpcPayload(data);

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

  if (!HAS_SUPABASE_BROWSER_CONFIG) {
    throw new Error(
      'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.',
    );
  }

  const deviceId = await getDeviceId();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('claim_spin_lock', {
    p_device_id: deviceId,
  });

  if (error) {
    throw new Error(error.message || 'Unable to verify this device right now.');
  }

  const payload = normalizeRpcPayload(data);

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
