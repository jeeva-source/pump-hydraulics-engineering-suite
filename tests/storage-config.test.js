'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const StorageConfig = require('../app/storage-config.js');

function createMockStorage() {
  const map = new Map();
  return {
    getItem(k) { return map.has(k) ? map.get(k) : null; },
    setItem(k, v) { map.set(k, String(v)); },
    removeItem(k) { map.delete(k); },
  };
}

const sampleCommon = {
  flow: '85',
  density: '998',
  viscosity: '1.002',
  inletPressure: '2.5',
  inletDiameter: '150',
  outletPressure: '',
  vapourPressure: '0.023',
  suctionLimit: '1.5',
  dischargeLimit: '3.0',
};

const sampleSegments = [
  {
    name: 'Suction header',
    service: 'suction',
    diameter: '150',
    length: '25',
    roughness: '0.045',
    k: '1.8',
    equipment: '0',
    elevation: '-1.5',
  },
  {
    name: 'Discharge riser',
    service: 'discharge',
    diameter: '100',
    length: '95',
    roughness: '0.045',
    k: '4.2',
    equipment: '18',
    elevation: '12',
  },
];

test('saveConfiguration and loadConfiguration round-trip common fields and segments', () => {
  const storage = createMockStorage();
  assert.equal(StorageConfig.hasSavedConfiguration(storage), false);

  const saved = StorageConfig.saveConfiguration(
    storage,
    sampleCommon,
    sampleSegments,
    '2026-11-25T20:00:00.000Z',
  );
  assert.equal(saved.ok, true);
  assert.equal(saved.segmentCount, 2);
  assert.equal(StorageConfig.hasSavedConfiguration(storage), true);

  const loaded = StorageConfig.loadConfiguration(storage);
  assert.ok(loaded);
  assert.equal(loaded.version, 1);
  assert.equal(loaded.savedAt, '2026-11-25T20:00:00.000Z');
  assert.deepEqual(loaded.common, sampleCommon);
  assert.deepEqual(loaded.segments, sampleSegments);
});

test('parseConfig safely rejects malformed JSON, empty segments, and invalid service values', () => {
  assert.equal(StorageConfig.parseConfig('not json{{{'), null);
  assert.equal(StorageConfig.parseConfig(''), null);
  assert.equal(StorageConfig.parseConfig(JSON.stringify({ version: 99, common: sampleCommon, segments: sampleSegments })), null);
  assert.equal(StorageConfig.parseConfig(JSON.stringify({ version: 1, common: sampleCommon, segments: [] })), null);
  assert.equal(
    StorageConfig.parseConfig(JSON.stringify({
      version: 1,
      common: sampleCommon,
      segments: [{ ...sampleSegments[0], service: 'bypass' }],
    })),
    null,
  );
});

test('clearConfiguration removes saved data cleanly', () => {
  const storage = createMockStorage();
  StorageConfig.saveConfiguration(storage, sampleCommon, sampleSegments);
  assert.equal(StorageConfig.hasSavedConfiguration(storage), true);
  assert.equal(StorageConfig.clearConfiguration(storage), true);
  assert.equal(StorageConfig.hasSavedConfiguration(storage), false);
});
