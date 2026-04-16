'use strict';

const { expect } = require('chai');
const sinon = require('sinon');
const {
  FC_NAMES,
  buildReadPayload,
  buildWritePayload,
  buildConnectionString
} = require('../../../src/lib/parser/payload-builder');

describe('PayloadBuilder', function () {

  // ---- FC_NAMES ----

  describe('FC_NAMES', function () {
    it('should map function code 1 to readCoils', function () {
      expect(FC_NAMES[1]).to.equal('readCoils');
    });

    it('should map function code 2 to readDiscreteInputs', function () {
      expect(FC_NAMES[2]).to.equal('readDiscreteInputs');
    });

    it('should map function code 3 to readHoldingRegisters', function () {
      expect(FC_NAMES[3]).to.equal('readHoldingRegisters');
    });

    it('should map function code 4 to readInputRegisters', function () {
      expect(FC_NAMES[4]).to.equal('readInputRegisters');
    });

    it('should map write function codes', function () {
      expect(FC_NAMES[5]).to.equal('writeSingleCoil');
      expect(FC_NAMES[6]).to.equal('writeSingleRegister');
      expect(FC_NAMES[15]).to.equal('writeMultipleCoils');
      expect(FC_NAMES[16]).to.equal('writeMultipleRegisters');
    });

    it('should be frozen', function () {
      expect(Object.isFrozen(FC_NAMES)).to.be.true;
    });
  });

  // ---- buildReadPayload ----

  describe('buildReadPayload()', function () {
    let clock;

    beforeEach(function () {
      clock = sinon.useFakeTimers(new Date('2026-04-16T10:00:00.000Z').getTime());
    });

    afterEach(function () {
      clock.restore();
    });

    it('should build a complete read payload with all fields', function () {
      const payload = buildReadPayload({
        data: [1234, 5678],
        buffer: Buffer.from([0x04, 0xD2, 0x16, 0x2E]),
        fc: 3,
        address: 107,
        quantity: 2,
        unitId: 1,
        connection: 'tcp://192.168.1.100:502'
      });

      expect(payload.data).to.deep.equal([1234, 5678]);
      expect(payload.buffer).to.deep.equal(Buffer.from([0x04, 0xD2, 0x16, 0x2E]));
      expect(payload.fc).to.equal(3);
      expect(payload.fcName).to.equal('readHoldingRegisters');
      expect(payload.address).to.equal(107);
      expect(payload.quantity).to.equal(2);
      expect(payload.unitId).to.equal(1);
      expect(payload.timestamp).to.equal('2026-04-16T10:00:00.000Z');
      expect(payload.connection).to.equal('tcp://192.168.1.100:502');
    });

    it('should handle boolean data for coil reads (FC 01)', function () {
      const payload = buildReadPayload({
        data: [true, false, true],
        fc: 1,
        address: 0,
        quantity: 3,
        unitId: 1
      });

      expect(payload.data).to.deep.equal([true, false, true]);
      expect(payload.fc).to.equal(1);
      expect(payload.fcName).to.equal('readCoils');
    });

    it('should set connection to null when not provided', function () {
      const payload = buildReadPayload({
        data: [100],
        fc: 4,
        address: 0,
        quantity: 1,
        unitId: 1
      });

      expect(payload.connection).to.be.null;
    });

    it('should set buffer to null when not provided', function () {
      const payload = buildReadPayload({
        data: [100],
        fc: 4,
        address: 0,
        quantity: 1,
        unitId: 1
      });

      expect(payload.buffer).to.be.null;
    });

    it('should generate fcName for unknown function codes', function () {
      const payload = buildReadPayload({
        data: [100],
        fc: 99,
        address: 0,
        quantity: 1,
        unitId: 1
      });

      expect(payload.fcName).to.equal('fc99');
    });

    it('should include an ISO timestamp', function () {
      const payload = buildReadPayload({
        data: [100],
        fc: 3,
        address: 0,
        quantity: 1,
        unitId: 1
      });

      expect(payload.timestamp).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should throw when data is missing', function () {
      expect(() => buildReadPayload({
        fc: 3, address: 0, quantity: 1, unitId: 1
      })).to.throw(TypeError, /data/);
    });

    it('should throw when fc is missing', function () {
      expect(() => buildReadPayload({
        data: [1], address: 0, quantity: 1, unitId: 1
      })).to.throw(TypeError, /fc/);
    });

    it('should throw when address is missing', function () {
      expect(() => buildReadPayload({
        data: [1], fc: 3, quantity: 1, unitId: 1
      })).to.throw(TypeError, /address/);
    });

    it('should throw when unitId is missing', function () {
      expect(() => buildReadPayload({
        data: [1], fc: 3, address: 0, quantity: 1
      })).to.throw(TypeError, /unitId/);
    });

    it('should throw for null options', function () {
      expect(() => buildReadPayload(null)).to.throw(TypeError);
    });

    it('should throw for non-object options', function () {
      expect(() => buildReadPayload('string')).to.throw(TypeError);
    });
  });

  // ---- buildWritePayload ----

  describe('buildWritePayload()', function () {
    let clock;

    beforeEach(function () {
      clock = sinon.useFakeTimers(new Date('2026-04-16T10:00:00.000Z').getTime());
    });

    afterEach(function () {
      clock.restore();
    });

    it('should build a single-value write payload (FC 06)', function () {
      const payload = buildWritePayload({
        fc: 6,
        address: 100,
        value: 42,
        unitId: 1,
        connection: 'tcp://192.168.1.100:502'
      });

      expect(payload.fc).to.equal(6);
      expect(payload.fcName).to.equal('writeSingleRegister');
      expect(payload.address).to.equal(100);
      expect(payload.quantity).to.equal(1);
      expect(payload.value).to.equal(42);
      expect(payload.unitId).to.equal(1);
      expect(payload.timestamp).to.equal('2026-04-16T10:00:00.000Z');
      expect(payload.connection).to.equal('tcp://192.168.1.100:502');
    });

    it('should build a multi-value write payload (FC 16)', function () {
      const payload = buildWritePayload({
        fc: 16,
        address: 100,
        value: [10, 20, 30],
        unitId: 1
      });

      expect(payload.quantity).to.equal(3);
      expect(payload.value).to.deep.equal([10, 20, 30]);
    });

    it('should build a boolean write payload (FC 05)', function () {
      const payload = buildWritePayload({
        fc: 5,
        address: 0,
        value: true,
        unitId: 1
      });

      expect(payload.fcName).to.equal('writeSingleCoil');
      expect(payload.value).to.be.true;
      expect(payload.quantity).to.equal(1);
    });

    it('should throw when value is missing', function () {
      expect(() => buildWritePayload({
        fc: 6, address: 0, unitId: 1
      })).to.throw(TypeError, /value/);
    });

    it('should throw when fc is missing', function () {
      expect(() => buildWritePayload({
        address: 0, value: 1, unitId: 1
      })).to.throw(TypeError, /fc/);
    });
  });

  // ---- buildConnectionString ----

  describe('buildConnectionString()', function () {
    it('should build TCP connection string', function () {
      const result = buildConnectionString({
        type: 'tcp',
        host: '192.168.1.100',
        port: 502
      });
      expect(result).to.equal('tcp://192.168.1.100:502');
    });

    it('should build RTU connection string', function () {
      const result = buildConnectionString({
        type: 'rtu',
        serialPort: '/dev/ttyUSB0',
        baudRate: 9600
      });
      expect(result).to.equal('rtu:///dev/ttyUSB0@9600');
    });

    it('should return "unknown" for null config', function () {
      expect(buildConnectionString(null)).to.equal('unknown');
    });

    it('should return "unknown" for unknown type', function () {
      expect(buildConnectionString({ type: 'unknown' })).to.equal('unknown');
    });

    it('should use defaults for missing TCP fields', function () {
      const result = buildConnectionString({ type: 'tcp' });
      expect(result).to.equal('tcp://0.0.0.0:502');
    });

    it('should use defaults for missing RTU fields', function () {
      const result = buildConnectionString({ type: 'rtu' });
      expect(result).to.equal('rtu://unknown@9600');
    });
  });
});
