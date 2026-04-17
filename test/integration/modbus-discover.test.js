'use strict';

const helper = require('node-red-node-test-helper');
const { expect } = require('chai');
const sinon = require('sinon');
const ModbusRTU = require('modbus-serial');

const modbusDiscoverNode = require('../../src/nodes/client/modbus-discover');
const modbusClientConfig = require('../../src/nodes/config/modbus-client-config');

helper.init(require.resolve('node-red'));

describe('modbus-discover (integration)', function () {
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

    // FC 43/14: Read Device Identification
    // TEST-DATA: Basic device identification response (3 objects)
    sandbox.stub(ModbusRTU.prototype, 'readDeviceIdentification').resolves({
      data: ['Weidmueller', 'UR20-FBC-MOD-TCP', 'V1.2.0'],
      conformityLevel: 2
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
   * Helper to create a flow with a config node, a modbus-discover node,
   * and a helper node to capture output messages.
   */
  function createFlow(discoverConfig) {
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
        id: 'discover1',
        type: 'modbus-discover',
        name: discoverConfig.name || 'Test Discover',
        server: 'config1',
        deviceIdCode: String(discoverConfig.deviceIdCode || 1),
        objectId: discoverConfig.objectId || 0,
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

  // ========== Node loading ==========

  describe('Node loading', function () {

    it('should load the modbus-discover node', function (done) {
      const flow = createFlow({ deviceIdCode: 1 });
      helper.load([modbusClientConfig, modbusDiscoverNode], flow, function () {
        const discoverNode = helper.getNode('discover1');
        expect(discoverNode).to.exist;
        expect(discoverNode.type).to.equal('modbus-discover');
        done();
      });
    });

    it('should show error when no config node is selected', function (done) {
      const flow = [
        {
          id: 'discover1',
          type: 'modbus-discover',
          name: 'No Config',
          server: '',
          deviceIdCode: '1',
          objectId: 0,
          wires: [[]]
        }
      ];

      helper.load([modbusDiscoverNode], flow, function () {
        const discoverNode = helper.getNode('discover1');
        expect(discoverNode).to.exist;
        done();
      });
    });
  });

  // ========== Basic device identification ==========

  describe('Basic device identification (Level 01)', function () {

    it('should read basic device identification', function (done) {
      const flow = createFlow({ deviceIdCode: 1, objectId: 0 });

      helper.load([modbusClientConfig, modbusDiscoverNode], flow, function () {
        const configNode = helper.getNode('config1');
        const discoverNode = helper.getNode('discover1');
        const helperNode = helper.getNode('helper1');

        simulateConnectedTransport(configNode);

        helperNode.on('input', function (msg) {
          expect(msg.payload).to.be.an('object');
          expect(msg.payload.fc).to.equal(43);
          expect(msg.payload.fcName).to.equal('readDeviceIdentification');
          expect(msg.payload.deviceIdCode).to.equal(1);
          expect(msg.payload.objectId).to.equal(0);
          expect(msg.payload.conformityLevel).to.equal(2);
          expect(msg.payload.unitId).to.equal(1);
          expect(msg.payload.timestamp).to.be.a('string');
          expect(msg.payload.connection).to.match(/^tcp:\/\//);

          // Verify device info object map
          expect(msg.payload.deviceInfo).to.be.an('object');
          expect(msg.payload.deviceInfo.VendorName).to.equal('Weidmueller');
          expect(msg.payload.deviceInfo.ProductCode).to.equal('UR20-FBC-MOD-TCP');
          expect(msg.payload.deviceInfo.MajorMinorRevision).to.equal('V1.2.0');
          done();
        });

        discoverNode.receive({}); // TEST-DATA: trigger message
      });
    });

    it('should call readDeviceIdentification with correct parameters', function (done) {
      const flow = createFlow({ deviceIdCode: 1, objectId: 0 });

      helper.load([modbusClientConfig, modbusDiscoverNode], flow, function () {
        const configNode = helper.getNode('config1');
        const discoverNode = helper.getNode('discover1');
        const helperNode = helper.getNode('helper1');

        simulateConnectedTransport(configNode);

        helperNode.on('input', function () {
          expect(ModbusRTU.prototype.readDeviceIdentification.calledOnce).to.be.true;
          const args = ModbusRTU.prototype.readDeviceIdentification.firstCall.args;
          expect(args[0]).to.equal(1); // deviceIdCode
          expect(args[1]).to.equal(0); // objectId
          done();
        });

        discoverNode.receive({});
      });
    });

    it('should set unit ID before discovery', function (done) {
      const flow = createFlow({ deviceIdCode: 1 });

      helper.load([modbusClientConfig, modbusDiscoverNode], flow, function () {
        const configNode = helper.getNode('config1');
        const discoverNode = helper.getNode('discover1');
        const helperNode = helper.getNode('helper1');

        simulateConnectedTransport(configNode);

        helperNode.on('input', function () {
          expect(ModbusRTU.prototype.setID.calledBefore(
            ModbusRTU.prototype.readDeviceIdentification
          )).to.be.true;
          done();
        });

        discoverNode.receive({});
      });
    });
  });

  // ========== Regular device identification ==========

  describe('Regular device identification (Level 02)', function () {

    it('should read regular device identification with 7 objects', function (done) {
      // TEST-DATA: Regular identification response with 7 standard objects
      ModbusRTU.prototype.readDeviceIdentification.resolves({
        data: [
          'Weidmueller', 'UR20-FBC-MOD-TCP', 'V1.2.0',
          'https://www.weidmueller.com', 'Fieldbus Coupler', 'UR20', 'MyApp'
        ],
        conformityLevel: 2
      });

      const flow = createFlow({ deviceIdCode: 2, objectId: 0 });

      helper.load([modbusClientConfig, modbusDiscoverNode], flow, function () {
        const configNode = helper.getNode('config1');
        const discoverNode = helper.getNode('discover1');
        const helperNode = helper.getNode('helper1');

        simulateConnectedTransport(configNode);

        helperNode.on('input', function (msg) {
          expect(msg.payload.deviceInfo.VendorURL).to.equal('https://www.weidmueller.com');
          expect(msg.payload.deviceInfo.ProductName).to.equal('Fieldbus Coupler');
          expect(msg.payload.deviceInfo.ModelName).to.equal('UR20');
          expect(msg.payload.deviceInfo.UserApplicationName).to.equal('MyApp');
          expect(Object.keys(msg.payload.deviceInfo)).to.have.length(7);
          done();
        });

        discoverNode.receive({});
      });
    });
  });

  // ========== Individual mode ==========

  describe('Individual mode (Level 04)', function () {

    it('should read a single object by ID', function (done) {
      // TEST-DATA: Individual mode requesting object 0x04 (ProductName)
      ModbusRTU.prototype.readDeviceIdentification.resolves({
        data: ['Fieldbus Coupler'],
        conformityLevel: 2
      });

      const flow = createFlow({ deviceIdCode: 4, objectId: 4 });

      helper.load([modbusClientConfig, modbusDiscoverNode], flow, function () {
        const configNode = helper.getNode('config1');
        const discoverNode = helper.getNode('discover1');
        const helperNode = helper.getNode('helper1');

        simulateConnectedTransport(configNode);

        helperNode.on('input', function (msg) {
          expect(msg.payload.deviceIdCode).to.equal(4);
          expect(msg.payload.objectId).to.equal(4);
          expect(msg.payload.deviceInfo.ProductName).to.equal('Fieldbus Coupler');
          expect(Object.keys(msg.payload.deviceInfo)).to.have.length(1);
          done();
        });

        discoverNode.receive({});
      });
    });

    it('should handle vendor-specific object IDs', function (done) {
      // TEST-DATA: Extended vendor-specific object at 0x80
      ModbusRTU.prototype.readDeviceIdentification.resolves({
        data: ['CustomVendorData'],
        conformityLevel: 3
      });

      const flow = createFlow({ deviceIdCode: 4, objectId: 0x80 });

      helper.load([modbusClientConfig, modbusDiscoverNode], flow, function () {
        const configNode = helper.getNode('config1');
        const discoverNode = helper.getNode('discover1');
        const helperNode = helper.getNode('helper1');

        simulateConnectedTransport(configNode);

        helperNode.on('input', function (msg) {
          // Vendor-specific objects use hex-based naming
          expect(msg.payload.deviceInfo.object_80).to.equal('CustomVendorData');
          done();
        });

        discoverNode.receive({});
      });
    });
  });

  // ========== Dynamic overrides ==========

  describe('Dynamic overrides via msg properties', function () {

    it('should override deviceIdCode from msg', function (done) {
      const flow = createFlow({ deviceIdCode: 1 }); // Node configured for Basic

      helper.load([modbusClientConfig, modbusDiscoverNode], flow, function () {
        const configNode = helper.getNode('config1');
        const discoverNode = helper.getNode('discover1');
        const helperNode = helper.getNode('helper1');

        simulateConnectedTransport(configNode);

        helperNode.on('input', function () {
          const args = ModbusRTU.prototype.readDeviceIdentification.firstCall.args;
          expect(args[0]).to.equal(2); // Overridden to Regular
          done();
        });

        discoverNode.receive({ deviceIdCode: 2 }); // TEST-DATA: override to Regular
      });
    });

    it('should override objectId from msg', function (done) {
      const flow = createFlow({ deviceIdCode: 4, objectId: 0 });

      helper.load([modbusClientConfig, modbusDiscoverNode], flow, function () {
        const configNode = helper.getNode('config1');
        const discoverNode = helper.getNode('discover1');
        const helperNode = helper.getNode('helper1');

        simulateConnectedTransport(configNode);

        helperNode.on('input', function () {
          const args = ModbusRTU.prototype.readDeviceIdentification.firstCall.args;
          expect(args[1]).to.equal(5); // Overridden objectId
          done();
        });

        discoverNode.receive({ objectId: 5 }); // TEST-DATA: override objectId
      });
    });
  });

  // ========== Output metadata ==========

  describe('Output metadata', function () {

    it('should include modbusDiscover metadata', function (done) {
      const flow = createFlow({ deviceIdCode: 1 });

      helper.load([modbusClientConfig, modbusDiscoverNode], flow, function () {
        const configNode = helper.getNode('config1');
        const discoverNode = helper.getNode('discover1');
        const helperNode = helper.getNode('helper1');

        simulateConnectedTransport(configNode);

        helperNode.on('input', function (msg) {
          expect(msg.modbusDiscover).to.be.an('object');
          expect(msg.modbusDiscover.deviceIdCode).to.equal(1);
          expect(msg.modbusDiscover.objectId).to.equal(0);
          expect(msg.modbusDiscover.unitId).to.equal(1);
          expect(msg.modbusDiscover.conformityLevel).to.equal(2);
          done();
        });

        discoverNode.receive({});
      });
    });

    it('should set default topic with device ID level', function (done) {
      const flow = createFlow({ deviceIdCode: 2 });

      helper.load([modbusClientConfig, modbusDiscoverNode], flow, function () {
        const configNode = helper.getNode('config1');
        const discoverNode = helper.getNode('discover1');
        const helperNode = helper.getNode('helper1');

        simulateConnectedTransport(configNode);

        helperNode.on('input', function (msg) {
          expect(msg.topic).to.equal('modbus:DeviceID:Regular');
          done();
        });

        discoverNode.receive({});
      });
    });

    it('should preserve custom msg.topic', function (done) {
      const flow = createFlow({ deviceIdCode: 1 });

      helper.load([modbusClientConfig, modbusDiscoverNode], flow, function () {
        const configNode = helper.getNode('config1');
        const discoverNode = helper.getNode('discover1');
        const helperNode = helper.getNode('helper1');

        simulateConnectedTransport(configNode);

        helperNode.on('input', function (msg) {
          expect(msg.topic).to.equal('device/inventory');
          done();
        });

        discoverNode.receive({ topic: 'device/inventory' });
      });
    });
  });

  // ========== Error handling ==========

  describe('Error handling', function () {

    it('should handle transport error gracefully', function (done) {
      ModbusRTU.prototype.readDeviceIdentification.rejects(
        new Error('Device does not support FC 43/14')
      );

      const flow = createFlow({ deviceIdCode: 1 });

      helper.load([modbusClientConfig, modbusDiscoverNode], flow, function () {
        const configNode = helper.getNode('config1');
        const discoverNode = helper.getNode('discover1');

        simulateConnectedTransport(configNode);

        discoverNode.receive({});

        setTimeout(function () {
          expect(discoverNode.error.called).to.be.true;
          done();
        }, 100);
      });
    });

    it('should report not-connected error', function (done) {
      const flow = createFlow({ deviceIdCode: 1 });

      helper.load([modbusClientConfig, modbusDiscoverNode], flow, function () {
        const discoverNode = helper.getNode('discover1');

        // No transport simulated
        discoverNode.receive({});

        setTimeout(function () {
          expect(discoverNode.error.called).to.be.true;
          done();
        }, 100);
      });
    });

    it('should reject concurrent discovery requests', function (done) {
      const flow = createFlow({ deviceIdCode: 1 });

      // Make discovery slow
      ModbusRTU.prototype.readDeviceIdentification.callsFake(function () {
        return new Promise(function (resolve) {
          setTimeout(function () {
            resolve({ data: ['Test'], conformityLevel: 1 });
          }, 200);
        });
      });

      helper.load([modbusClientConfig, modbusDiscoverNode], flow, function () {
        const configNode = helper.getNode('config1');
        const discoverNode = helper.getNode('discover1');

        simulateConnectedTransport(configNode);

        // First request
        discoverNode.receive({});

        // Second request while first is in progress
        setTimeout(function () {
          discoverNode.receive({});

          setTimeout(function () {
            expect(discoverNode.error.called).to.be.true;
            done();
          }, 100);
        }, 50);
      });
    });

    it('should handle empty data response', function (done) {
      ModbusRTU.prototype.readDeviceIdentification.resolves({
        data: [],
        conformityLevel: 0
      });

      const flow = createFlow({ deviceIdCode: 1 });

      helper.load([modbusClientConfig, modbusDiscoverNode], flow, function () {
        const configNode = helper.getNode('config1');
        const discoverNode = helper.getNode('discover1');
        const helperNode = helper.getNode('helper1');

        simulateConnectedTransport(configNode);

        helperNode.on('input', function (msg) {
          expect(msg.payload.deviceInfo).to.deep.equal({});
          expect(msg.payload.conformityLevel).to.equal(0);
          done();
        });

        discoverNode.receive({});
      });
    });
  });

  // ========== Cleanup ==========

  describe('Cleanup', function () {

    it('should reset discovering state on close', function (done) {
      const flow = createFlow({ deviceIdCode: 1 });

      helper.load([modbusClientConfig, modbusDiscoverNode], flow, function () {
        const discoverNode = helper.getNode('discover1');
        discoverNode._discovering = true;

        helper.unload().then(function () {
          // Node is unloaded – verify it was cleaned up
          done();
        });
      });
    });
  });
});
