'use strict';

const { expect } = require('chai');
const sinon = require('sinon');
const EventEmitter = require('events');
const ModbusRTU = require('modbus-serial');
const TcpTransport = require('../../../src/lib/transport/tcp-transport');

describe('TcpTransport', function () {
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.createSandbox();

    // Stub modbus-serial prototype methods used by TcpTransport
    sandbox.stub(ModbusRTU.prototype, 'connectTCP').resolves();
    sandbox.stub(ModbusRTU.prototype, 'setID');
    sandbox.stub(ModbusRTU.prototype, 'getID').returns(1);
    sandbox.stub(ModbusRTU.prototype, 'setTimeout');
    sandbox.stub(ModbusRTU.prototype, 'close').callsFake(function (cb) {
      if (typeof cb === 'function') cb();
    });
    sandbox.stub(ModbusRTU.prototype, 'removeAllListeners');
    sandbox.stub(ModbusRTU.prototype, 'readHoldingRegisters').resolves({ data: [100, 200], buffer: Buffer.from([0, 100, 0, 200]) });
    sandbox.stub(ModbusRTU.prototype, 'readCoils').resolves({ data: [true, false], buffer: Buffer.from([0x02]) });
    sandbox.stub(ModbusRTU.prototype, 'readDiscreteInputs').resolves({ data: [false, true], buffer: Buffer.from([0x02]) });
    sandbox.stub(ModbusRTU.prototype, 'readInputRegisters').resolves({ data: [300], buffer: Buffer.from([0x01, 0x2C]) });
    sandbox.stub(ModbusRTU.prototype, 'writeCoil').resolves();
    sandbox.stub(ModbusRTU.prototype, 'writeRegister').resolves();
    sandbox.stub(ModbusRTU.prototype, 'writeCoils').resolves();
    sandbox.stub(ModbusRTU.prototype, 'writeRegisters').resolves();

    // Extended FC stubs
    // TEST-DATA: FC 22 response echoes parameters
    sandbox.stub(ModbusRTU.prototype, 'maskWriteRegister').resolves({
      address: 0, andMask: 0xFFFF, orMask: 0x0000
    });
    // TEST-DATA: FC 23 response with 3 read registers
    sandbox.stub(ModbusRTU.prototype, 'writeFC23').resolves({
      data: [100, 200, 300], buffer: Buffer.from([0, 100, 0, 200, 1, 44])
    });
    // TEST-DATA: FC 43/14 basic device identification response
    sandbox.stub(ModbusRTU.prototype, 'readDeviceIdentification').resolves({
      data: ['TestVendor', 'TestProduct', 'V1.0'], conformityLevel: 1
    });
  });

  afterEach(function () {
    sandbox.restore();
  });

  // ---- Constructor ----

  describe('constructor', function () {
    it('should create an instance with default config', function () {
      const transport = new TcpTransport();
      expect(transport).to.be.instanceOf(TcpTransport);
      expect(transport).to.be.instanceOf(EventEmitter);
      expect(transport._config.host).to.equal('127.0.0.1');
      expect(transport._config.port).to.equal(502);
      expect(transport._config.timeout).to.equal(5000);
      expect(transport._config.unitId).to.equal(1);
    });

    it('should merge custom config with defaults', function () {
      const transport = new TcpTransport({ host: '10.0.0.1', port: 5020, unitId: 5 });
      expect(transport._config.host).to.equal('10.0.0.1');
      expect(transport._config.port).to.equal(5020);
      expect(transport._config.unitId).to.equal(5);
      expect(transport._config.timeout).to.equal(5000); // default preserved
    });

    it('should initialise as not connected', function () {
      const transport = new TcpTransport();
      expect(transport._connected).to.be.false;
    });

    it('should have type "tcp"', function () {
      const transport = new TcpTransport();
      expect(transport.type).to.equal('tcp');
    });
  });

  // ---- connect() ----

  describe('connect()', function () {
    it('should connect successfully and emit "connect"', async function () {
      const transport = new TcpTransport({ host: '10.0.0.1', port: 502 });
      const connectSpy = sandbox.spy();
      transport.on('connect', connectSpy);

      await transport.connect();

      expect(ModbusRTU.prototype.connectTCP.calledOnce).to.be.true;
      expect(ModbusRTU.prototype.connectTCP.firstCall.args[0]).to.equal('10.0.0.1');
      expect(ModbusRTU.prototype.connectTCP.firstCall.args[1]).to.deep.equal({ port: 502 });
      expect(ModbusRTU.prototype.setID.calledWith(1)).to.be.true;
      expect(ModbusRTU.prototype.setTimeout.calledWith(5000)).to.be.true;
      expect(transport._connected).to.be.true;
      expect(connectSpy.calledOnce).to.be.true;
    });

    it('should be a no-op when already connected', async function () {
      const transport = new TcpTransport();
      await transport.connect();
      ModbusRTU.prototype.connectTCP.resetHistory();

      await transport.connect();
      expect(ModbusRTU.prototype.connectTCP.called).to.be.false;
    });

    it('should throw and emit "error" on connection failure', async function () {
      const connError = new Error('ECONNREFUSED');
      ModbusRTU.prototype.connectTCP.rejects(connError);

      const transport = new TcpTransport();
      const errorSpy = sandbox.spy();
      transport.on('error', errorSpy);

      try {
        await transport.connect();
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.message).to.equal('ECONNREFUSED');
      }

      expect(transport._connected).to.be.false;
      expect(errorSpy.calledOnce).to.be.true;
      expect(errorSpy.firstCall.args[0].message).to.equal('ECONNREFUSED');
    });

    it('should throw on timeout scenario', async function () {
      const timeoutErr = new Error('Timed out');
      ModbusRTU.prototype.connectTCP.rejects(timeoutErr);

      const transport = new TcpTransport({ timeout: 100 });

      try {
        await transport.connect();
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.message).to.equal('Timed out');
      }
      expect(transport._connected).to.be.false;
    });
  });

  // ---- disconnect() ----

  describe('disconnect()', function () {
    it('should disconnect and emit "disconnect"', async function () {
      const transport = new TcpTransport();
      await transport.connect();

      const disconnSpy = sandbox.spy();
      transport.on('disconnect', disconnSpy);

      await transport.disconnect();

      expect(ModbusRTU.prototype.close.calledOnce).to.be.true;
      expect(transport._connected).to.be.false;
      expect(disconnSpy.calledOnce).to.be.true;
    });

    it('should be a no-op when not connected', async function () {
      const transport = new TcpTransport();
      const disconnSpy = sandbox.spy();
      transport.on('disconnect', disconnSpy);

      await transport.disconnect();

      expect(ModbusRTU.prototype.close.called).to.be.false;
      expect(disconnSpy.called).to.be.false;
    });

    it('should handle close errors', async function () {
      ModbusRTU.prototype.close.throws(new Error('close failed'));

      const transport = new TcpTransport();
      await transport.connect();

      const errorSpy = sandbox.spy();
      transport.on('error', errorSpy);

      try {
        await transport.disconnect();
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.message).to.equal('close failed');
      }
      expect(transport._connected).to.be.false;
      expect(errorSpy.calledOnce).to.be.true;
    });
  });

  // ---- isOpen() ----

  describe('isOpen()', function () {
    it('should return false when not connected', function () {
      const transport = new TcpTransport();
      expect(transport.isOpen()).to.be.false;
    });

    it('should return true when connected and client.isOpen is true', async function () {
      const transport = new TcpTransport();
      await transport.connect();
      // modbus-serial isOpen is a getter on the prototype; override on instance
      Object.defineProperty(transport._client, 'isOpen', { value: true, writable: true });
      expect(transport.isOpen()).to.be.true;
    });

    it('should return false when connected but client.isOpen is false', async function () {
      const transport = new TcpTransport();
      await transport.connect();
      Object.defineProperty(transport._client, 'isOpen', { value: false, writable: true });
      expect(transport.isOpen()).to.be.false;
    });
  });

  // ---- getID() / setID() ----

  describe('getID() / setID()', function () {
    it('should delegate getID to the modbus-serial client', function () {
      const transport = new TcpTransport();
      ModbusRTU.prototype.getID.returns(42);
      expect(transport.getID()).to.equal(42);
    });

    it('should delegate setID to the modbus-serial client', function () {
      const transport = new TcpTransport();
      transport.setID(10);
      expect(ModbusRTU.prototype.setID.calledWith(10)).to.be.true;
    });
  });

  // ---- Read operations ----

  describe('read operations', function () {
    let transport;

    beforeEach(async function () {
      transport = new TcpTransport();
      await transport.connect();
    });

    it('readHoldingRegisters should delegate to client', async function () {
      const result = await transport.readHoldingRegisters(0, 2);
      expect(ModbusRTU.prototype.readHoldingRegisters.calledWith(0, 2)).to.be.true;
      expect(result.data).to.deep.equal([100, 200]);
    });

    it('readCoils should delegate to client', async function () {
      const result = await transport.readCoils(10, 2);
      expect(ModbusRTU.prototype.readCoils.calledWith(10, 2)).to.be.true;
      expect(result.data).to.deep.equal([true, false]);
    });

    it('readDiscreteInputs should delegate to client', async function () {
      const result = await transport.readDiscreteInputs(5, 2);
      expect(ModbusRTU.prototype.readDiscreteInputs.calledWith(5, 2)).to.be.true;
      expect(result.data).to.deep.equal([false, true]);
    });

    it('readInputRegisters should delegate to client', async function () {
      const result = await transport.readInputRegisters(0, 1);
      expect(ModbusRTU.prototype.readInputRegisters.calledWith(0, 1)).to.be.true;
      expect(result.data).to.deep.equal([300]);
    });

    it('should reject when not connected', async function () {
      const disconnected = new TcpTransport();
      const ops = [
        disconnected.readHoldingRegisters(0, 1),
        disconnected.readCoils(0, 1),
        disconnected.readDiscreteInputs(0, 1),
        disconnected.readInputRegisters(0, 1)
      ];
      for (const p of ops) {
        try {
          await p;
          expect.fail('should have thrown');
        } catch (err) {
          expect(err.message).to.equal('TcpTransport: not connected');
        }
      }
    });
  });

  // ---- Write operations ----

  describe('write operations', function () {
    let transport;

    beforeEach(async function () {
      transport = new TcpTransport();
      await transport.connect();
    });

    it('writeCoil should delegate to client', async function () {
      await transport.writeCoil(0, true);
      expect(ModbusRTU.prototype.writeCoil.calledWith(0, true)).to.be.true;
    });

    it('writeRegister should delegate to client', async function () {
      await transport.writeRegister(100, 0xFF);
      expect(ModbusRTU.prototype.writeRegister.calledWith(100, 0xFF)).to.be.true;
    });

    it('writeCoils should delegate to client', async function () {
      await transport.writeCoils(0, [true, false, true]);
      expect(ModbusRTU.prototype.writeCoils.calledWith(0, [true, false, true])).to.be.true;
    });

    it('writeRegisters should delegate to client', async function () {
      await transport.writeRegisters(10, [1, 2, 3]);
      expect(ModbusRTU.prototype.writeRegisters.calledWith(10, [1, 2, 3])).to.be.true;
    });

    it('should reject when not connected', async function () {
      const disconnected = new TcpTransport();
      const ops = [
        disconnected.writeCoil(0, true),
        disconnected.writeRegister(0, 1),
        disconnected.writeCoils(0, [true]),
        disconnected.writeRegisters(0, [1])
      ];
      for (const p of ops) {
        try {
          await p;
          expect.fail('should have thrown');
        } catch (err) {
          expect(err.message).to.equal('TcpTransport: not connected');
        }
      }
    });
  });

  // ---- Event emission ----

  describe('event emission', function () {
    it('should forward "error" events from the modbus-serial client', function (done) {
      const transport = new TcpTransport();
      const testError = new Error('test error');

      transport.on('error', (err) => {
        expect(err).to.equal(testError);
        done();
      });

      // Emit directly on the internal client
      transport._client.emit('error', testError);
    });

    it('should emit "disconnect" on client "close" event when connected', async function () {
      const transport = new TcpTransport();
      await transport.connect();

      const disconnSpy = sandbox.spy();
      transport.on('disconnect', disconnSpy);

      transport._client.emit('close');
      expect(disconnSpy.calledOnce).to.be.true;
      expect(transport._connected).to.be.false;
    });

    it('should not emit "disconnect" on client "close" when already disconnected', function () {
      const transport = new TcpTransport();
      const disconnSpy = sandbox.spy();
      transport.on('disconnect', disconnSpy);

      transport._client.emit('close');
      expect(disconnSpy.called).to.be.false;
    });
  });

  // ---- destroy() ----

  describe('destroy()', function () {
    it('should disconnect and remove all listeners', async function () {
      const transport = new TcpTransport();
      await transport.connect();

      const removeSpy = sandbox.spy(transport, 'removeAllListeners');
      await transport.destroy();

      expect(transport._connected).to.be.false;
      expect(ModbusRTU.prototype.removeAllListeners.calledOnce).to.be.true;
      expect(removeSpy.calledOnce).to.be.true;
    });

    it('should work when not connected', async function () {
      const transport = new TcpTransport();
      await transport.destroy();
      // Should not throw
      expect(transport._connected).to.be.false;
    });
  });

  // ---- Extended function codes (FC 22, FC 23, FC 43/14) ----

  describe('maskWriteRegister (FC 22)', function () {
    let transport;

    beforeEach(async function () {
      transport = new TcpTransport();
      await transport.connect();
    });

    it('should delegate to client.maskWriteRegister', async function () {
      const result = await transport.maskWriteRegister(100, 0xFF00, 0x00F0);
      expect(ModbusRTU.prototype.maskWriteRegister.calledWith(100, 0xFF00, 0x00F0)).to.be.true;
      expect(result).to.have.property('address');
      expect(result).to.have.property('andMask');
      expect(result).to.have.property('orMask');
    });

    it('should reject when not connected', async function () {
      const disconnected = new TcpTransport();
      try {
        await disconnected.maskWriteRegister(0, 0xFFFF, 0);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.message).to.equal('TcpTransport: not connected');
      }
    });

    it('should reject invalid address', async function () {
      try {
        await transport.maskWriteRegister(-1, 0xFFFF, 0);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.be.instanceOf(RangeError);
      }
    });

    it('should reject address above 65535', async function () {
      try {
        await transport.maskWriteRegister(65536, 0xFFFF, 0);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.be.instanceOf(RangeError);
      }
    });

    it('should reject andMask above 0xFFFF', async function () {
      try {
        await transport.maskWriteRegister(0, 0x10000, 0);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.be.instanceOf(RangeError);
        expect(err.message).to.include('AND mask');
      }
    });

    it('should reject negative andMask', async function () {
      try {
        await transport.maskWriteRegister(0, -1, 0);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.be.instanceOf(RangeError);
      }
    });

    it('should reject orMask above 0xFFFF', async function () {
      try {
        await transport.maskWriteRegister(0, 0xFFFF, 0x10000);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.be.instanceOf(RangeError);
        expect(err.message).to.include('OR mask');
      }
    });

    it('should reject non-integer andMask', async function () {
      try {
        await transport.maskWriteRegister(0, 1.5, 0);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.be.instanceOf(RangeError);
      }
    });

    it('should accept boundary values (0x0000 and 0xFFFF)', async function () {
      await transport.maskWriteRegister(0, 0x0000, 0xFFFF);
      expect(ModbusRTU.prototype.maskWriteRegister.calledWith(0, 0x0000, 0xFFFF)).to.be.true;
    });
  });

  describe('readWriteRegisters (FC 23)', function () {
    let transport;

    beforeEach(async function () {
      transport = new TcpTransport();
      await transport.connect();
    });

    it('should delegate to client.writeFC23', async function () {
      const result = await transport.readWriteRegisters(0, 3, 100, [10, 20]);
      expect(ModbusRTU.prototype.writeFC23.calledOnce).to.be.true;
      const args = ModbusRTU.prototype.writeFC23.firstCall.args;
      expect(args[0]).to.equal(0); // readAddress
      expect(args[1]).to.equal(3); // readLength
      expect(args[2]).to.equal(100); // writeAddress
      expect(args[3]).to.equal(2); // writeLength
      expect(args[4]).to.deep.equal([10, 20]); // writeValues
      expect(result.data).to.deep.equal([100, 200, 300]);
    });

    it('should reject when not connected', async function () {
      const disconnected = new TcpTransport();
      try {
        await disconnected.readWriteRegisters(0, 1, 0, [1]);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.message).to.equal('TcpTransport: not connected');
      }
    });

    it('should reject invalid read address', async function () {
      try {
        await transport.readWriteRegisters(-1, 1, 0, [1]);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.be.instanceOf(RangeError);
      }
    });

    it('should reject read length > 125', async function () {
      try {
        await transport.readWriteRegisters(0, 126, 0, [1]);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.be.instanceOf(RangeError);
      }
    });

    it('should reject read length = 0', async function () {
      try {
        await transport.readWriteRegisters(0, 0, 0, [1]);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.be.instanceOf(RangeError);
      }
    });

    it('should reject invalid write address', async function () {
      try {
        await transport.readWriteRegisters(0, 1, 70000, [1]);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.be.instanceOf(RangeError);
      }
    });

    it('should reject empty write values', async function () {
      try {
        await transport.readWriteRegisters(0, 1, 0, []);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.be.instanceOf(RangeError);
        expect(err.message).to.include('FC23 registers');
      }
    });

    it('should reject write values exceeding 121 registers', async function () {
      try {
        await transport.readWriteRegisters(0, 1, 0, new Array(122).fill(0));
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.be.instanceOf(RangeError);
      }
    });

    it('should accept max 121 write registers', async function () {
      await transport.readWriteRegisters(0, 1, 0, new Array(121).fill(0));
      expect(ModbusRTU.prototype.writeFC23.calledOnce).to.be.true;
    });

    it('should accept max 125 read registers', async function () {
      await transport.readWriteRegisters(0, 125, 0, [1]);
      expect(ModbusRTU.prototype.writeFC23.calledOnce).to.be.true;
    });
  });

  describe('readDeviceIdentification (FC 43/14)', function () {
    let transport;

    beforeEach(async function () {
      transport = new TcpTransport();
      await transport.connect();
    });

    it('should delegate to client.readDeviceIdentification', async function () {
      const result = await transport.readDeviceIdentification(1, 0);
      expect(ModbusRTU.prototype.readDeviceIdentification.calledWith(1, 0)).to.be.true;
      expect(result.data).to.deep.equal(['TestVendor', 'TestProduct', 'V1.0']);
      expect(result.conformityLevel).to.equal(1);
    });

    it('should reject when not connected', async function () {
      const disconnected = new TcpTransport();
      try {
        await disconnected.readDeviceIdentification(1, 0);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.message).to.equal('TcpTransport: not connected');
      }
    });

    it('should reject invalid deviceIdCode (0)', async function () {
      try {
        await transport.readDeviceIdentification(0, 0);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.be.instanceOf(RangeError);
        expect(err.message).to.include('Device ID code');
      }
    });

    it('should reject invalid deviceIdCode (5)', async function () {
      try {
        await transport.readDeviceIdentification(5, 0);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.be.instanceOf(RangeError);
      }
    });

    it('should reject non-integer deviceIdCode', async function () {
      try {
        await transport.readDeviceIdentification(1.5, 0);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.be.instanceOf(RangeError);
      }
    });

    it('should reject negative objectId', async function () {
      try {
        await transport.readDeviceIdentification(1, -1);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.be.instanceOf(RangeError);
        expect(err.message).to.include('Object ID');
      }
    });

    it('should reject objectId > 255', async function () {
      try {
        await transport.readDeviceIdentification(1, 256);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.be.instanceOf(RangeError);
      }
    });

    it('should default objectId to 0 when undefined', async function () {
      await transport.readDeviceIdentification(1);
      expect(ModbusRTU.prototype.readDeviceIdentification.calledWith(1, 0)).to.be.true;
    });

    it('should default objectId to 0 when null', async function () {
      await transport.readDeviceIdentification(1, null);
      expect(ModbusRTU.prototype.readDeviceIdentification.calledWith(1, 0)).to.be.true;
    });

    it('should accept all valid deviceIdCodes (1-4)', async function () {
      for (let code = 1; code <= 4; code++) {
        await transport.readDeviceIdentification(code, 0);
      }
      expect(ModbusRTU.prototype.readDeviceIdentification.callCount).to.equal(4);
    });

    it('should accept boundary objectId (0 and 255)', async function () {
      await transport.readDeviceIdentification(1, 0);
      await transport.readDeviceIdentification(1, 255);
      expect(ModbusRTU.prototype.readDeviceIdentification.callCount).to.equal(2);
    });
  });
});
