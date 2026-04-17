# References

> Complete reference list for node-red-contrib-modbus-pro.
> All specifications, standards, libraries, and resources used in the project.

---

## 1. Modbus Specifications

| ID | Title | Source | Used In |
|----|-------|--------|---------|
| REF-01 | Modbus Application Protocol Specification V1.1b3 | [modbus.org](https://modbus.org/specs.php) | All Modbus implementation |
| REF-02 | Modbus over Serial Line Specification V1.02 | [modbus.org](https://modbus.org/specs.php) | RTU transport |
| REF-03 | Modbus/TCP Security Protocol Specification | [modbus.org](https://modbus.org/specs.php) | TLS implementation (WP 4.x) |
| REF-04 | Modbus Messaging Implementation Guide V1.0b | [modbus.org](https://modbus.org/specs.php) | Protocol details |

---

## 2. Transport Libraries

| ID | Package | License | Version | Purpose |
|----|---------|---------|---------|---------|
| REF-05 | modbus-serial | ISC | ^8.0.0 | Modbus TCP/RTU transport |
| REF-06 | serialport | MIT | ^13.0.0 | Serial port access (optional) |

### modbus-serial API Documentation

- GitHub: [github.com/yaacov/node-modbus-serial](https://github.com/yaacov/node-modbus-serial)
- npm: [npmjs.com/package/modbus-serial](https://www.npmjs.com/package/modbus-serial)
- Key Methods: `connectTCP()`, `connectRTU()`, `readHoldingRegisters()`, `writeRegisters()`

### serialport API Documentation

- GitHub: [github.com/serialport/node-serialport](https://github.com/serialport/node-serialport)
- npm: [npmjs.com/package/serialport](https://www.npmjs.com/package/serialport)

---

## 3. State Machine

| ID | Package | License | Version | Purpose |
|----|---------|---------|---------|---------|
| REF-07 | XState | MIT | ^5.0.0 | Deterministic state management |

### XState Documentation

- Docs: [stately.ai/docs/xstate-v5](https://stately.ai/docs/xstate-v5)
- Visualizer: [stately.ai/viz](https://stately.ai/viz)
- Key Concepts: Machines, Actors, Guards, Actions, Delays

---

## 4. Node-RED Platform

| ID | Resource | Source | Used In |
|----|----------|--------|---------|
| REF-08 | Node-RED Creating Nodes Guide | [nodered.org/docs/creating-nodes](https://nodered.org/docs/creating-nodes/) | All node development |
| REF-09 | Node-RED API Reference | [nodered.org/docs/api](https://nodered.org/docs/api/) | Runtime integration |
| REF-10 | Node-RED Credential Store | [nodered.org/docs/creating-nodes/credentials](https://nodered.org/docs/creating-nodes/credentials) | Security (WP 4.x) |
| REF-11 | Node-RED Node Lifecycle | [nodered.org/docs/creating-nodes/node-js](https://nodered.org/docs/creating-nodes/node-js) | Deploy/undeploy handling |

---

## 5. Existing Modbus Implementations (Comparison)

| ID | Package | License | Purpose |
|----|---------|---------|---------|
| REF-12 | node-red-contrib-modbus (BiancoRoyal) | BSD-3-Clause | Legacy comparison |
| REF-13 | jsmodbus (Cloud-Automation) | MIT | Alternative comparison |
| REF-14 | FlowFuse Modbus Best Practices | Blog | Architecture insights |

### Comparison Sources

- BiancoRoyal GitHub: [github.com/BiancoRoyal/node-red-contrib-modbus](https://github.com/BiancoRoyal/node-red-contrib-modbus)
- jsmodbus GitHub: [github.com/Cloud-Automation/node-modbus](https://github.com/Cloud-Automation/node-modbus)
- FlowFuse Blog: [flowfuse.com/blog](https://flowfuse.com/blog)

---

## 6. Security Standards

| ID | Standard | Source | Used In |
|----|----------|--------|---------|
| REF-15 | TLS 1.3 (RFC 8446) | [rfc-editor.org](https://www.rfc-editor.org/rfc/rfc8446) | TLS implementation |
| REF-16 | X.509v3 (RFC 5280) | [rfc-editor.org](https://www.rfc-editor.org/rfc/rfc5280) | Certificate validation |
| REF-17 | mTLS (RFC 8705) | [rfc-editor.org](https://www.rfc-editor.org/rfc/rfc8705) | Mutual authentication |

---

## 7. Test Framework

| ID | Package | License | Version | Purpose |
|----|---------|---------|---------|---------|
| REF-18 | Mocha | MIT | ^10.0.0 | Test runner |
| REF-19 | Chai | MIT | ^4.0.0 | Assertion library |
| REF-20 | Sinon | BSD-3-Clause | ^17.0.0 | Mocking/stubbing |
| REF-21 | nyc | ISC | ^15.0.0 | Code coverage |
| REF-22 | node-red-node-test-helper | Apache-2.0 | ^0.3.0 | Node-RED integration testing |

---

## 8. Industrial Standards and Data Type References

| ID | Standard/Resource | Source | Used In |
|----|----------|--------|---------|
| REF-23 | IEEE 754-2008 (Floating Point Arithmetic) | [ieee.org](https://standards.ieee.org/standard/754-2008.html) | Float32/Float64 data types (§15) |
| REF-24 | IEC 61131-3 Ed. 3 (PLC Programming Languages) | IEC | Date/Time types, RBE dead-band (§15, §17.1) |
| REF-25 | IEC 61508 Ed. 2 (Functional Safety) | IEC | Watchdog/safe-state patterns (§17.3) |
| REF-26 | ISO 13849-1 Ed. 3 (Machine Safety) | ISO | Performance level requirements (§17.3) |
| REF-27 | IEC 62443 (Industrial Cybersecurity) | IEC | Network segmentation, timeout policies (§5, §17.3) |
| REF-28 | OPC UA Part 8 – Data Access | [opcfoundation.org](https://opcfoundation.org) | DeadBandFilter concept (§17.1) |
| REF-29 | ISO 22400 (OEE / Manufacturing KPIs) | ISO | Runtime metrics methodology (§17.4) |
| REF-30 | Moxa NPort Series User Manual | [moxa.com](https://www.moxa.com) | RTU-over-TCP gateway reference (§16) |

---

## 9. Community Resources

| Resource | URL | Description |
|----------|-----|-------------|
| Node-RED Forum | [discourse.nodered.org](https://discourse.nodered.org) | Community support |
| Node-RED Slack | [nodered.org/slack](https://nodered.org/slack) | Real-time chat |
| Node-RED Flow Library | [flows.nodered.org](https://flows.nodered.org) | Node package directory |
| Modbus Tools | [modbustools.com](https://www.modbustools.com) | Modbus testing tools |
| Simply Modbus | [simplymodbus.ca](http://www.simplymodbus.ca) | Protocol reference |

---

## 9. License Dependency Tree

```
node-red-contrib-modbus-pro (BSD-3-Clause)
├── modbus-serial@^8.0.0 (ISC)
│   └── (transitive dependencies – see npm ls)
├── xstate@^5.0.0 (MIT)
├── serialport@^13.0.0 (MIT) [OPTIONAL]
│   ├── @serialport/bindings-cpp (MIT)
│   └── @serialport/parser-* (MIT)
└── Dev Dependencies (not shipped)
    ├── mocha@^10.0.0 (MIT)
    ├── chai@^4.0.0 (MIT)
    ├── sinon@^17.0.0 (BSD-3-Clause)
    ├── nyc@^15.0.0 (ISC)
    └── node-red-node-test-helper@^0.3.0 (Apache-2.0)
```

> All dependencies are permissive licenses. No copyleft contamination.
