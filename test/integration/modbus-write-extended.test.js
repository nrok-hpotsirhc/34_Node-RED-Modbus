'use strict';

const helper = require('node-red-node-test-helper');
const { expect } = require('chai');
const sinon = require('sinon');
const ModbusRTU = require('modbus-serial');

const modbusWriteNode = require('../../src/nodes/client/modbus-write');
const modbusClientConfig = require('../../src/nodes/config/modbus-client-config');

helper.init(require.resolve('node-red'));

describe('modbus-write extended FCs (integration)', function () {
  let sandbox;

  beforeEach(function (done) {
    sandbox = sinon.createSandbox();

    // Stub modbus-serial prototype methods
    sandbox.stub(ModbusRTU.prototype, 'connectTCP').resolves();
    sandbox.stub(ModbusRTU.prototype, 'setID');
    sandbox.stub(ModbusRTU.prototype, 'getID').returns(1);
    sandbox.stub(ModbusRTU.prototype, 'setTimeout');
    sandbox.stub(ModbusRTU.prototype, 'close').callsFake(function (cb) {
      if (typeof cb === 'function') cb();
    });
    sandbox.stub(ModbusRTU.prototype, 'removeAllListeners');

    // Standard write stubs (needed for validation)
    sandbox.stub(ModbusRTU.prototype, 'writeCoil').resolves();
    sandbox.stub(ModbusRTU.prototype, 'writeRegister').resolves();
    sandbox.stub(ModbusRTU.prototype, 'writeCoils').resolves();
    sandbox.stub(ModbusRTU.prototype, 'writeRegisters').resolves();

    // FC 22: Mask Write Register
    // TEST-DATA: FC 22 response echoes address, andMask, orMask
    sandbox.stub(ModbusRTU.prototype, 'maskWriteRegister').resolves({
      address: 100,
      andMask: 0xFF00,
      orMask: 0x00F0
    });

    // FC 23: Read/Write Multiple Registers
    // TEST-DATA: FC 23 response returns read data after write
    sandbox.stub(ModbusRTU.prototype, 'writeFC23').resolves({
      data: [500, 600, 700],
      buffer: Buffer.from([0x01, 0xF4, 0x02, 0x58, 0x02, 0xBC])
    });

    helper.startServer(done);
  });

  afterEach(function (done) {
    sandbox.restore();
    helper.unload().then(function () {
      helper.stopServer(done);
    });
  });

  /**
   * Helper to create a flow with a config node, a modbus-write node,
   * and a helper node to capture output messages.
   */
  function createFlow(writeConfig) {
    return [
      {
        id: 'config1',
        type: 'modbus-client-config',
        name: 'Test TCP',
        connectionType: 'tcp',
        host: '127.0.0.1',
        port: 502,
        unitId: 1,
        timeout: 1000
      },
      {
        id: 'write1',
        type: 'modbus-write',
        name: writeConfig.name || 'Test Write',
        server: 'config1',
        fc: String(writeConfig.fc || 6),
        address: writeConfig.address || 0,
        addressOffset: writeConfig.addressOffset || 'zero-based',
        readAddress: writeConfig.readAddress || 0,
        readQuantity: writeConfig.readQuantity || 1,
        queueMaxSize: writeConfig.queueMaxSize || 100,
        queueDropStrategy: writeConfig.queueDropStrategy || 'fifo',
        wires: [['helper1']]
      },
      {
        id: 'helper1',
        type: 'helper'
      }
    ];
  }

  /**
   * Simulate a connected transport on the config node.
   */
  function simulateConnectedTransport(configNode) {
    const transport = configNode.createTransport();
    transport._connected = true;
    Object.defineProperty(transport._client, 'isOpen', { get: () => true });
    configNode._transport = transport;
    return transport;
  }

  // ========== FC 22: Mask Write Register ==========

  describe('FC 22 – Mask Write Register', function () {

    it('should perform mask write with andMask and orMask', function (done) {
      // TEST-DATA: FC 22, address 100, set bit 4 (orMask = 0x0010)
      const flow = createFlow({ fc: 22, address: 100 });

      helper.load([modbusClientConfig, modbusWriteNode], flow, function () {
        const configNode = helper.getNode('config1');
        const writeNode = helper.getNode('write1');
        const helperNode = helper.getNode('helper1');

        simulateConnectedTransport(configNode);

        helperNode.on('input', function (msg) {
          expect(msg.payload).to.be.an('object');
          expect(msg.payload.fc).to.equal(22);
          expect(msg.payload.fcName).to.equal('maskWriteRegister');
          expect(msg.payload.address).to.equal(100);
          expect(msg.payload.value).to.deep.equal({ andMask: 0xFFFF, orMask: 0x0010 });
          expect(msg.payload.unitId).to.equal(1);
          expect(msg.payload.timestamp).to.be.a('string');
          expect(msg.payload.connection).to.match(/^tcp:\/\//);
          expect(msg.modbusWrite).to.be.an('object');
          expect(msg.modbusWrite.fc).to.equal(22);
          expect(msg.modbusWrite.value).to.deep.equal({ andMask: 0xFFFF, orMask: 0x0010 });
          done();
        });

        writeNode.receive({ payload: { andMask: 0xFFFF, orMask: 0x0010 } });
      });
    });

    it('should call maskWriteRegister on the transport', function (done) {
      // TEST-DATA: FC 22, address 50, clear bit 3 (andMask = ~(1<<3) & 0xFFFF = 0xFFF7)
      const flow = createFlow({ fc: 22, address: 50 });

      helper.load([modbusClientConfig, modbusWriteNode], flow, function () {
        const configNode = helper.getNode('config1');
        const writeNode = helper.getNode('write1');
        const helperNode = helper.getNode('helper1');

        simulateConnectedTransport(configNode);

        helperNode.on('input', function () {
          expect(ModbusRTU.prototype.maskWriteRegister.calledOnce).to.be.true;
          const args = ModbusRTU.prototype.maskWriteRegister.firstCall.args;
          expect(args[0]).to.equal(50); // address
          expect(args[1]).to.equal(0xFFF7); // andMask
          expect(args[2]).to.equal(0x0000); // orMask
          done();
        });

        writeNode.receive({ payload: { andMask: 0xFFF7, orMask: 0x0000 } });
      });
    });

    it('should reject non-object payload for FC 22', function (done) {
      const flow = createFlow({ fc: 22, address: 0 });

      helper.load([modbusClientConfig, modbusWriteNode], flow, function () {
        const configNode = helper.getNode('config1');
        const writeNode = helper.getNode('write1');

        simulateConnectedTransport(configNode);

        writeNode.receive({ payload: 42 });

        setTimeout(function () {
          expect(writeNode.error.called).to.be.true;
          done();
        }, 50);
      });
    });

    it('should reject array payload for FC 22', function (done) {
      const flow = createFlow({ fc: 22, address: 0 });

      helper.load([modbusClientConfig, modbusWriteNode], flow, function () {
        const configNode = helper.getNode('config1');
        const writeNode = helper.getNode('write1');

        simulateConnectedTransport(configNode);

        writeNode.receive({ payload: [0xFFFF, 0x0010] });

        setTimeout(function () {
          expect(writeNode.error.called).to.be.true;
          done();
        }, 50);
      });
    });

    it('should reject invalid andMask (out of range)', function (done) {
      const flow = createFlow({ fc: 22, address: 0 });

      helper.load([modbusClientConfig, modbusWriteNode], flow, function () {
        const configNode = helper.getNode('config1');
        const writeNode = helper.getNode('write1');

        simulateConnectedTransport(configNode);

        writeNode.receive({ payload: { andMask: 0x10000, orMask: 0 } }); // TEST-DATA: out of range

        setTimeout(function () {
          expect(writeNode.error.called).to.be.true;
          done();
        }, 50);
      });
    });

    it('should reject negative orMask', function (done) {
      const flow = createFlow({ fc: 22, address: 0 });

      helper.load([modbusClientConfig, modbusWriteNode], flow, function () {
        const configNode = helper.getNode('config1');
        const writeNode = helper.getNode('write1');

        simulateConnectedTransport(configNode);

        writeNode.receive({ payload: { andMask: 0xFFFF, orMask: -1 } }); // TEST-DATA: negative mask

        setTimeout(function () {
          expect(writeNode.error.called).to.be.true;
          done();
        }, 50);
      });
    });

    it('should support one-based address offset for FC 22', function (done) {
      // TEST-DATA: FC 22, datasheet address 101 → protocol address 100
      const flow = createFlow({ fc: 22, address: 101, addressOffset: 'one-based' });

      helper.load([modbusClientConfig, modbusWriteNode], flow, function () {
        const configNode = helper.getNode('config1');
        const writeNode = helper.getNode('write1');
        const helperNode = helper.getNode('helper1');

        simulateConnectedTransport(configNode);

        helperNode.on('input', function (msg) {
          expect(msg.modbusWrite.protocolAddress).to.equal(100);
          expect(msg.modbusWrite.address).to.equal(101);
          expect(msg.modbusWrite.addressOffset).to.equal('one-based');
          done();
        });

        writeNode.receive({ payload: { andMask: 0xFFFF, orMask: 0x0001 } });
      });
    });

    it('should set appropriate topic for FC 22', function (done) {
      const flow = createFlow({ fc: 22, address: 0 });

      helper.load([modbusClientConfig, modbusWriteNode], flow, function () {
        const configNode = helper.getNode('config1');
        const writeNode = helper.getNode('write1');
        const helperNode = helper.getNode('helper1');

        simulateConnectedTransport(configNode);

        helperNode.on('input', function (msg) {
          expect(msg.topic).to.equal('modbus:Mask Write Register');
          done();
        });

        writeNode.receive({ payload: { andMask: 0xFFFF, orMask: 0 } });
      });
    });
  });

  // ========== FC 23: Read/Write Multiple Registers ==========

  describe('FC 23 – Read/Write Multiple Registers', function () {

    it('should perform read/write with correct parameters', function (done) {
      // TEST-DATA: FC 23, write address 200, read address 100, read quantity 3
      const flow = createFlow({
        fc: 23, address: 200,
        readAddress: 100, readQuantity: 3
      });

      helper.load([modbusClientConfig, modbusWriteNode], flow, function () {
        const configNode = helper.getNode('config1');
        const writeNode = helper.getNode('write1');
        const helperNode = helper.getNode('helper1');

        simulateConnectedTransport(configNode);

        helperNode.on('input', function (msg) {
          expect(msg.payload).to.be.an('object');
          expect(msg.payload.fc).to.equal(23);
          expect(msg.payload.fcName).to.equal('readWriteMultipleRegisters');
          expect(msg.payload.writeAddress).to.equal(200);
          expect(msg.payload.writeValues).to.deep.equal([10, 20]);
          expect(msg.payload.writeQuantity).to.equal(2);
          expect(msg.payload.readAddress).to.equal(100);
          expect(msg.payload.readQuantity).to.equal(3);
          expect(msg.payload.data).to.deep.equal([500, 600, 700]);
          expect(msg.payload.buffer).to.be.instanceOf(Buffer);
          expect(msg.payload.unitId).to.equal(1);
          expect(msg.payload.timestamp).to.be.a('string');
          expect(msg.payload.connection).to.match(/^tcp:\/\//);
          done();
        });

        writeNode.receive({ payload: [10, 20] }); // TEST-DATA: write values
      });
    });

    it('should call writeFC23 on the transport with correct args', function (done) {
      const flow = createFlow({
        fc: 23, address: 300,
        readAddress: 0, readQuantity: 5
      });

      helper.load([modbusClientConfig, modbusWriteNode], flow, function () {
        const configNode = helper.getNode('config1');
        const writeNode = helper.getNode('write1');
        const helperNode = helper.getNode('helper1');

        simulateConnectedTransport(configNode);

        helperNode.on('input', function () {
          expect(ModbusRTU.prototype.writeFC23.calledOnce).to.be.true;
          const args = ModbusRTU.prototype.writeFC23.firstCall.args;
          expect(args[0]).to.equal(0); // readAddress
          expect(args[1]).to.equal(5); // readLength
          expect(args[2]).to.equal(300); // writeAddress
          expect(args[3]).to.equal(3); // writeLength (values.length)
          expect(args[4]).to.deep.equal([1, 2, 3]); // writeValues
          done();
        });

        writeNode.receive({ payload: [1, 2, 3] }); // TEST-DATA: 3 write registers
      });
    });

    it('should include read metadata in modbusWrite output for FC 23', function (done) {
      const flow = createFlow({
        fc: 23, address: 50,
        readAddress: 10, readQuantity: 2
      });

      helper.load([modbusClientConfig, modbusWriteNode], flow, function () {
        const configNode = helper.getNode('config1');
        const writeNode = helper.getNode('write1');
        const helperNode = helper.getNode('helper1');

        simulateConnectedTransport(configNode);

        helperNode.on('input', function (msg) {
          expect(msg.modbusWrite.readAddress).to.equal(10);
          expect(msg.modbusWrite.protocolReadAddress).to.equal(10);
          expect(msg.modbusWrite.readQuantity).to.equal(2);
          expect(msg.modbusWrite.fc).to.equal(23);
          done();
        });

        writeNode.receive({ payload: [100] }); // TEST-DATA: single write value
      });
    });

    it('should handle one-based read address for FC 23', function (done) {
      // TEST-DATA: one-based mode, write=201→200, read=101→100
      const flow = createFlow({
        fc: 23, address: 201, addressOffset: 'one-based',
        readAddress: 101, readQuantity: 3
      });

      helper.load([modbusClientConfig, modbusWriteNode], flow, function () {
        const configNode = helper.getNode('config1');
        const writeNode = helper.getNode('write1');
        const helperNode = helper.getNode('helper1');

        simulateConnectedTransport(configNode);

        helperNode.on('input', function (msg) {
          expect(msg.modbusWrite.protocolAddress).to.equal(200);
          expect(msg.modbusWrite.protocolReadAddress).to.equal(100);
          expect(msg.payload.writeAddress).to.equal(200);
          expect(msg.payload.readAddress).to.equal(100);
          done();
        });

        writeNode.receive({ payload: [42] });
      });
    });

    it('should reject empty array for FC 23', function (done) {
      const flow = createFlow({ fc: 23, address: 0 });

      helper.load([modbusClientConfig, modbusWriteNode], flow, function () {
        const configNode = helper.getNode('config1');
        const writeNode = helper.getNode('write1');

        simulateConnectedTransport(configNode);

        writeNode.receive({ payload: [] }); // TEST-DATA: empty array

        setTimeout(function () {
          expect(writeNode.error.called).to.be.true;
          done();
        }, 50);
      });
    });

    it('should reject non-array payload for FC 23', function (done) {
      const flow = createFlow({ fc: 23, address: 0 });

      helper.load([modbusClientConfig, modbusWriteNode], flow, function () {
        const configNode = helper.getNode('config1');
        const writeNode = helper.getNode('write1');

        simulateConnectedTransport(configNode);

        writeNode.receive({ payload: 42 }); // TEST-DATA: non-array

        setTimeout(function () {
          expect(writeNode.error.called).to.be.true;
          done();
        }, 50);
      });
    });

    it('should reject write values exceeding 121 registers', function (done) {
      const flow = createFlow({ fc: 23, address: 0 });

      helper.load([modbusClientConfig, modbusWriteNode], flow, function () {
        const configNode = helper.getNode('config1');
        const writeNode = helper.getNode('write1');

        simulateConnectedTransport(configNode);

        // TEST-DATA: 122 registers, exceeding FC 23 limit of 121
        const tooMany = new Array(122).fill(0);
        writeNode.receive({ payload: tooMany });

        setTimeout(function () {
          expect(writeNode.error.called).to.be.true;
          done();
        }, 50);
      });
    });

    it('should reject out-of-range write values for FC 23', function (done) {
      const flow = createFlow({ fc: 23, address: 0 });

      helper.load([modbusClientConfig, modbusWriteNode], flow, function () {
        const configNode = helper.getNode('config1');
        const writeNode = helper.getNode('write1');

        simulateConnectedTransport(configNode);

        writeNode.receive({ payload: [100, 70000] }); // TEST-DATA: 70000 > 65535

        setTimeout(function () {
          expect(writeNode.error.called).to.be.true;
          done();
        }, 50);
      });
    });

    it('should set appropriate topic for FC 23', function (done) {
      const flow = createFlow({ fc: 23, address: 0, readAddress: 0, readQuantity: 1 });

      helper.load([modbusClientConfig, modbusWriteNode], flow, function () {
        const configNode = helper.getNode('config1');
        const writeNode = helper.getNode('write1');
        const helperNode = helper.getNode('helper1');

        simulateConnectedTransport(configNode);

        helperNode.on('input', function (msg) {
          expect(msg.topic).to.equal('modbus:Read/Write Registers');
          done();
        });

        writeNode.receive({ payload: [1] });
      });
    });

    it('should preserve custom msg.topic for FC 23', function (done) {
      const flow = createFlow({ fc: 23, address: 0, readAddress: 0, readQuantity: 1 });

      helper.load([modbusClientConfig, modbusWriteNode], flow, function () {
        const configNode = helper.getNode('config1');
        const writeNode = helper.getNode('write1');
        const helperNode = helper.getNode('helper1');

        simulateConnectedTransport(configNode);

        helperNode.on('input', function (msg) {
          expect(msg.topic).to.equal('my/custom/topic');
          done();
        });

        writeNode.receive({ payload: [1], topic: 'my/custom/topic' });
      });
    });
  });

  // ========== Transport error handling ==========

  describe('Error handling for FC 22/23', function () {

    it('should handle transport error for FC 22', function (done) {
      ModbusRTU.prototype.maskWriteRegister.rejects(new Error('Device timeout'));

      const flow = createFlow({ fc: 22, address: 0 });

      helper.load([modbusClientConfig, modbusWriteNode], flow, function () {
        const configNode = helper.getNode('config1');
        const writeNode = helper.getNode('write1');

        simulateConnectedTransport(configNode);

        writeNode.receive({ payload: { andMask: 0xFFFF, orMask: 0 } });

        setTimeout(function () {
          expect(writeNode.error.called).to.be.true;
          done();
        }, 100);
      });
    });

    it('should handle transport error for FC 23', function (done) {
      ModbusRTU.prototype.writeFC23.rejects(new Error('Connection lost'));

      const flow = createFlow({ fc: 23, address: 0, readAddress: 0, readQuantity: 1 });

      helper.load([modbusClientConfig, modbusWriteNode], flow, function () {
        const configNode = helper.getNode('config1');
        const writeNode = helper.getNode('write1');

        simulateConnectedTransport(configNode);

        writeNode.receive({ payload: [1] });

        setTimeout(function () {
          expect(writeNode.error.called).to.be.true;
          done();
        }, 100);
      });
    });

    it('should report not-connected for FC 22', function (done) {
      const flow = createFlow({ fc: 22, address: 0 });

      helper.load([modbusClientConfig, modbusWriteNode], flow, function () {
        const writeNode = helper.getNode('write1');

        // No transport simulated – should fail
        writeNode.receive({ payload: { andMask: 0xFFFF, orMask: 0 } });

        setTimeout(function () {
          expect(writeNode.error.called).to.be.true;
          done();
        }, 100);
      });
    });
  });

  // ========== Node loading ==========

  describe('Node loading with FC 22/23', function () {

    it('should load write node with FC 22 config', function (done) {
      const flow = createFlow({ fc: 22, address: 100 });
      helper.load([modbusClientConfig, modbusWriteNode], flow, function () {
        const writeNode = helper.getNode('write1');
        expect(writeNode).to.exist;
        expect(writeNode.type).to.equal('modbus-write');
        done();
      });
    });

    it('should load write node with FC 23 config', function (done) {
      const flow = createFlow({ fc: 23, address: 200, readAddress: 100, readQuantity: 5 });
      helper.load([modbusClientConfig, modbusWriteNode], flow, function () {
        const writeNode = helper.getNode('write1');
        expect(writeNode).to.exist;
        expect(writeNode.type).to.equal('modbus-write');
        done();
      });
    });
  });
});
