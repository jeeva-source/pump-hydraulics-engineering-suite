(function () {
'use strict';

const STORAGE_KEY = 'pump_hydraulics_v51_last_config';
const CONFIG_VERSION = 1;

const COMMON_KEYS = [
  'flow',
  'density',
  'viscosity',
  'inletPressure',
  'inletDiameter',
  'outletPressure',
  'vapourPressure',
  'suctionLimit',
  'dischargeLimit',
];

const SEGMENT_KEYS = [
  'name',
  'service',
  'diameter',
  'length',
  'roughness',
  'k',
  'equipment',
  'elevation',
];

function toStringValue(value) {
  if (value === null || value === undefined) return '';
  return String(value);
}

function normalizeCommon(common) {
  if (!common || typeof common !== 'object' || Array.isArray(common)) return null;
  const normalized = {};
  for (const key of COMMON_KEYS) {
    if (!(key in common)) return null;
    normalized[key] = toStringValue(common[key]);
  }
  return normalized;
}

function normalizeSegment(segment) {
  if (!segment || typeof segment !== 'object' || Array.isArray(segment)) return null;
  const service = segment.service === 'suction' || segment.service === 'discharge'
    ? segment.service
    : null;
  if (!service) return null;
  const normalized = {};
  for (const key of SEGMENT_KEYS) {
    if (!(key in segment)) return null;
    normalized[key] = key === 'service' ? service : toStringValue(segment[key]);
  }
  return normalized;
}

function validateConfig(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  if (data.version !== CONFIG_VERSION) return null;
  const common = normalizeCommon(data.common);
  if (!common) return null;
  if (!Array.isArray(data.segments) || data.segments.length === 0) return null;

  const segments = [];
  for (const seg of data.segments) {
    const clean = normalizeSegment(seg);
    if (!clean) return null;
    segments.push(clean);
  }

  return {
    version: CONFIG_VERSION,
    savedAt: typeof data.savedAt === 'string' ? data.savedAt : null,
    common,
    segments,
  };
}

function serializeConfig(common, segments, savedAt) {
  const payload = validateConfig({
    version: CONFIG_VERSION,
    savedAt: savedAt || new Date().toISOString(),
    common,
    segments,
  });
  if (!payload) {
    throw new TypeError('Invalid hydraulic configuration payload');
  }
  return JSON.stringify(payload);
}

function parseConfig(raw) {
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  try {
    const parsed = JSON.parse(raw);
    return validateConfig(parsed);
  } catch {
    return null;
  }
}

function saveConfiguration(storage, common, segments, savedAt) {
  if (!storage || typeof storage.setItem !== 'function') {
    return { ok: false, error: 'Local storage is unavailable in this browser.' };
  }
  try {
    const timestamp = savedAt || new Date().toISOString();
    const serialized = serializeConfig(common, segments, timestamp);
    storage.setItem(STORAGE_KEY, serialized);
    return { ok: true, savedAt: timestamp, segmentCount: segments.length };
  } catch (err) {
    return { ok: false, error: err && err.message ? err.message : 'Unable to save configuration.' };
  }
}

function loadConfiguration(storage) {
  if (!storage || typeof storage.getItem !== 'function') return null;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return parseConfig(raw);
  } catch {
    return null;
  }
}

function hasSavedConfiguration(storage) {
  return loadConfiguration(storage) !== null;
}

function clearConfiguration(storage) {
  if (!storage || typeof storage.removeItem !== 'function') return false;
  try {
    storage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

const api = {
  STORAGE_KEY,
  CONFIG_VERSION,
  COMMON_KEYS,
  SEGMENT_KEYS,
  validateConfig,
  serializeConfig,
  parseConfig,
  saveConfiguration,
  loadConfiguration,
  hasSavedConfiguration,
  clearConfiguration,
};

if (typeof module !== 'undefined' && module.exports) module.exports = api;
else if (typeof window !== 'undefined') window.PumpHydraulicsStorage = api;
})();
