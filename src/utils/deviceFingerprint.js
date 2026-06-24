let cachedDeviceId;

async function sha256(value) {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);

  if (window.crypto?.subtle) {
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);

    return Array.from(new Uint8Array(hashBuffer))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(31, hash) + value.charCodeAt(index);
  }

  return `fallback-${Math.abs(hash)}`;
}

export async function getDeviceId() {
  if (cachedDeviceId) return cachedDeviceId;

  const nav = window.navigator;
  const screenInfo = window.screen;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const platform = nav.userAgentData?.platform || nav.platform || 'unknown-platform';

  // Keep this browser-neutral so different browsers on the same device match.
  const deviceSignal = [
    'metro-spin-device-v1',
    platform,
    screenInfo.width,
    screenInfo.height,
    screenInfo.availWidth,
    screenInfo.availHeight,
    screenInfo.colorDepth,
    screenInfo.pixelDepth,
    window.devicePixelRatio,
    timezone,
    new Date().getTimezoneOffset(),
    nav.language,
    nav.hardwareConcurrency,
    nav.maxTouchPoints,
  ].join('|');

  cachedDeviceId = await sha256(deviceSignal);

  return cachedDeviceId;
}
