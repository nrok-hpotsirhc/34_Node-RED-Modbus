# Theoretical Foundations

> Complete theoretical foundation for the node-red-contrib-modbus-pro project.
> Serves as a reference for developers and AI agents.
> References: [Agents](../agents.md) | [Architecture](ARCHITECTURE.md) | [Work Packages](WORK_PACKAGES.md) | [References](REFERENCES.md)

---

## Table of Contents

1. [Historical Context of the Modbus Protocol](#1-historical-context-of-the-modbus-protocol)
2. [Transport Layers: Modbus RTU vs. Modbus TCP](#2-transport-layers-modbus-rtu-vs-modbus-tcp)
3. [The Modbus Data Model](#3-the-modbus-data-model)
4. [Endianness in JavaScript](#4-endianness-in-javascript)
5. [Modbus/TCP Security Protocol (MBTPS)](#5-modbustcp-security-protocol)
6. [Deterministic State Management via XState](#6-deterministic-state-management-via-xstate)
7. [Backpressure Management](#7-backpressure-management)
8. [Dynamic Address Space Mapping](#8-dynamic-address-space-mapping)
9. [Analysis of Existing Implementations](#9-analysis-of-existing-implementations)
10. [Node.js Libraries Comparison](#10-nodejs-libraries-comparison)
11. [Best Practices for Industrial Deployment](#11-best-practices-for-industrial-deployment)
12. [Extended Function Codes – PDU Structure and Protocol Behavior](#12-extended-function-codes--pdu-structure-and-protocol-behavior)
13. [Modbus Exception Responses](#13-modbus-exception-responses)
14. [PDU Payload Limits and Automatic Request Chunking](#14-pdu-payload-limits-and-automatic-request-chunking)
15. [Extended Data Types Across Modbus Registers](#15-extended-data-types-across-modbus-registers)
16. [Modbus RTU over TCP Encapsulation](#16-modbus-rtu-over-tcp-encapsulation)
17. [Industrial Operational Patterns](#17-industrial-operational-patterns)

---

## 1. Historical Context of the Modbus Protocol

### Origin and Standardization

The Modbus protocol was developed in 1979 by Modicon (now part of Schneider Electric) for communication between programmable logic controllers (PLCs). Due to its open specification, simplicity, and royalty-free usage, it has become the de facto standard of industrial automation.

In April 2004, the protocol rights were transferred to the independent **Modbus Organization, Inc.**, cementing the commitment to open interoperability and the avoidance of vendor lock-in.

> **Source:** Modbus Organization – "Modbus Application Protocol Specification V1.1b3" [REF-01]

### Client-Server Architecture (formerly Master-Slave)

The architecture is based on a strict **request-response paradigm**:

- **Client (formerly Master):** Initiates data exchange, sends requests
- **Server (formerly Slave):** Acts purely reactively, only responds to requests

This asymmetry has fundamental implications for the Node-RED implementation:
- A **client node** triggers asynchronous events in the Node.js event loop
- A **server node** continuously listens on a port and manages an address space

### Device Addressing

- Slave IDs 1–247 on a bus
- Address 0: Broadcast (all slaves)
- Addresses 248–255: Reserved
- For TCP: Unit ID typically 255 or 1 (except when using gateways)

> **Source:** Modbus Organization – "MODBUS over Serial Line Specification V1.02" [REF-02]

---

## 2. Transport Layers: Modbus RTU vs. Modbus TCP

### Modbus RTU (Remote Terminal Unit)

- **Physical Medium:** RS-485 (differential signaling, >1000m), RS-232
- **Data Format:** Compact binary format, continuous data sequence
- **Error Checking:** CRC (Cyclic Redundancy Check, 2 bytes)
- **Node Limit:** 32 physical devices (hardware), 247 logical addresses
- **Communication:** Half-duplex (sequential)
- **Speed:** Typically 9,600–115,200 bit/s

**Implication for Node-RED:**
Since serial lines operate sequentially, an RTU client MUST implement a locking mechanism (semaphore). Parallel read requests from multiple flows must be queued.

### Modbus TCP/IP

- **Physical Medium:** Ethernet, Wi-Fi
- **Adaptation:** 1999, encapsulation in TCP/IP packets
- **Error Checking:** TCP checksum + Ethernet FCS (no separate CRC)
- **Port:** 502 (standard), 802 (TLS)
- **Communication:** Full-duplex, multiplexing possible
- **Speed:** 10/100/1000 Mbit/s

**Implication for Node-RED:**
TCP allows parallel socket connections. A connection pool can distribute requests across multiple sockets.

### Comparison Table

| Feature | Modbus RTU | Modbus TCP |
|---------|-----------|-----------|
| Medium | RS-485, RS-232 | Ethernet, Wi-Fi |
| Error Checking | CRC (2 bytes) | TCP Checksum |
| Addressing | Slave ID (1–247) | IP + Unit ID |
| Nodes/Network | 32 (HW), 247 (SW) | Unlimited (IP) |
| Communication | Half-Duplex | Full-Duplex |
| Speed | ≤ 115,200 bit/s | ≤ 1 Gbit/s |
| Use Case | Legacy, long cables, interference | IIoT, cloud, SCADA |

> **Sources:** Modbus Application Protocol Specification V1.1b3 [REF-01], MODBUS Messaging on TCP/IP Implementation Guide V1.0b [REF-03]

---

## 3. The Modbus Data Model

### Four-Table Architecture

The Modbus protocol abstracts machine data through a four-part table system derived from relay logic (ladder logic):

| Table | Type | Access | Size | Function Codes |
|-------|------|--------|------|----------------|
| **Discrete Inputs** (Contacts) | Boolean | Read-only | 1 bit | FC 02 |
| **Coils** (Discrete Outputs) | Boolean | Read/Write | 1 bit | FC 01, 05, 15 |
| **Input Registers** | Numeric | Read-only | 16 bit | FC 04 |
| **Holding Registers** | Numeric | Read/Write | 16 bit | FC 03, 06, 16 |

### Addressing Paradox: Zero-Based vs. One-Based

One of the most common error sources in Modbus integration:

- **Protocol level (bus):** Strictly zero-based. The first holding register has address 0x0000.
- **Datasheet convention:** One-based with type prefix:
  - Discrete Inputs: 10001–19999
  - Coils: 00001–09999
  - Input Registers: 30001–39999
  - Holding Registers: 40001–49999

**Example:** Datasheet shows register **40108**
- Leading "4" → Holding Register → FC 03
- Offset on bus: 108 - 1 = **107** (0x006B)

> An architecturally mature Node-RED node must make this offset mapping transparent or support the user through clear UI validation.

### Standardized Function Codes (FC) – Complete Specification Overview

The table below lists **all function codes** defined in the Modbus Application Protocol Specification
V1.1b3. The **Status** column reflects the implementation state of this project.

| FC (Dec) | FC (Hex) | Function | Transport | Status |
|----------|----------|----------|-----------|--------|
| 01 | 0x01 | Read Coils | TCP + RTU | ✅ Implemented |
| 02 | 0x02 | Read Discrete Inputs | TCP + RTU | ✅ Implemented |
| 03 | 0x03 | Read Holding Registers | TCP + RTU | ✅ Implemented |
| 04 | 0x04 | Read Input Registers | TCP + RTU | ✅ Implemented |
| 05 | 0x05 | Write Single Coil | TCP + RTU | ✅ Implemented |
| 06 | 0x06 | Write Single Register | TCP + RTU | ✅ Implemented |
| 07 | 0x07 | Read Exception Status | RTU only | 🔲 Planned – WP 6.3 |
| 08 | 0x08 | Diagnostics (sub-functions 0x00–0x12) | RTU only | 🔲 Planned – WP 6.3 |
| 11 | 0x0B | Get Comm Event Counter | RTU only | 🔲 Planned – WP 6.4 |
| 12 | 0x0C | Get Comm Event Log | RTU only | 🔲 Planned – WP 6.4 |
| 15 | 0x0F | Write Multiple Coils | TCP + RTU | ✅ Implemented |
| 16 | 0x10 | Write Multiple Registers | TCP + RTU | ✅ Implemented |
| 17 | 0x11 | Report Server ID | RTU only | 🔲 Planned – WP 6.4 |
| 20 | 0x14 | Read File Record | TCP + RTU | 🔲 Planned – WP 6.4 |
| 21 | 0x15 | Write File Record | TCP + RTU | 🔲 Planned – WP 6.4 |
| 22 | 0x16 | Mask Write Register | TCP + RTU | 🔲 Planned – WP 6.1 |
| 23 | 0x17 | Read/Write Multiple Registers | TCP + RTU | 🔲 Planned – WP 6.1 |
| 24 | 0x18 | Read FIFO Queue | TCP + RTU | 🔲 Planned – WP 6.4 |
| 43/13 | 0x2B/0x0D | CANopen General Reference | TCP + RTU | ⬜ Out of scope |
| 43/14 | 0x2B/0x0E | Read Device Identification | TCP + RTU | 🔲 Planned – WP 6.2 |

**Legend:** ✅ Implemented · 🔲 Planned · ⬜ Out of scope

### Function Code Details for Planned Extensions

**FC 22 – Mask Write Register (0x16)**  
Performs an atomic AND/OR bit-mask operation on a single holding register without a
separate read-modify-write cycle. This eliminates race conditions in multi-master
environments and is widely used in PLC programming to set or clear individual control bits.
Formula: `result = (current_value AND andMask) OR (orMask AND NOT andMask)`

**FC 23 – Read/Write Multiple Registers (0x17)**  
Combines a write (FC 16) and a read (FC 03) in a single Modbus transaction. Reduces
round-trip latency in PLC setpoint-feedback loops and guarantees that the read reflects
the state after the write.

**FC 43/14 – Read Device Identification (0x2B/0x0E)**  
Reads standardized object identifiers (vendor name, product code, major/minor revision,
user-defined objects). Essential for automated device discovery in IIoT asset management
and SCADA inventory systems. Supports streaming mode for large object lists.

**FC 08 – Diagnostics (0x08)**  
Serial-line only. Sub-function 0x00 (Return Query Data) is the Modbus loopback test.
Further sub-functions read or reset the communication event counter, CRC error counter,
and bus exception counters. Indispensable for RTU commissioning and maintenance.

**FC 07 – Read Exception Status (0x07)**  
Serial-line only. Reads 8 coil-like status bits from a device-defined register.
Common use: PLC alarm summary word.

**Payload Limitation:** The Modbus specification limits the PDU payload to 253 bytes
(PDU = 1 byte FC + up to 252 bytes data). This means a maximum of 125 holding registers
(FC 03) or 2000 coils (FC 01) per single request. Larger data sets require automatic
chunking across multiple sequential requests – see [WP 7.1](WORK_PACKAGES.md#wp-71-automatic-request-chunking-and-broadcast-support).

> **Source:** Modbus Application Protocol Specification V1.1b3, Chapters 6 and 7 [REF-01]

---

## 4. Endianness in JavaScript

### The Problem

Modbus transmits data packets strictly in **big-endian format** (MSB first). The hex value `0x1234` is sent as `0x12` followed by `0x34`.

Many industrial sensors generate **32-bit values** (Float32 IEEE 754, UInt32) that are split across **two consecutive 16-bit registers**. However, the Modbus protocol does not define the order of these two registers:

| Variant | Register Order | Example for 123456.0 (Float32) |
|---------|---------------|-------------------------------|
| Big-Endian (AB CD) | High word first | [0x47F1, 0x2000] |
| Little-Endian (CD AB) | Low word first | [0x2000, 0x47F1] |
| Big-Endian Byte Swap (BA DC) | Bytes swapped | [0xF147, 0x0020] |
| Little-Endian Byte Swap (DC BA) | Bytes + words swapped | [0x0020, 0xF147] |

### Solution in Node.js

JavaScript processes numbers natively as 64-bit floating point. For correct conversion, incoming buffer arrays must be decomposed into 8-bit octets and reassembled according to the device configuration:

```javascript
// Conceptual example (no copied code)
function parseFloat32(buffer, byteOrder) {
  const view = new DataView(new ArrayBuffer(4));
  switch (byteOrder) {
    case 'BE':    // Big-Endian (AB CD)
      view.setUint8(0, buffer[0]);
      view.setUint8(1, buffer[1]);
      view.setUint8(2, buffer[2]);
      view.setUint8(3, buffer[3]);
      break;
    case 'LE':    // Little-Endian (CD AB)
      view.setUint8(0, buffer[2]);
      view.setUint8(1, buffer[3]);
      view.setUint8(2, buffer[0]);
      view.setUint8(3, buffer[1]);
      break;
    // ... additional variants
  }
  return view.getFloat32(0, false);
}
```

> **Note:** The above code is an independently developed conceptual example illustrating the byte-order problem. It is not based on any external source.

> **Relevant Work Package:** [WP 2.4 – Payload Standardization](WORK_PACKAGES.md#wp-24-payload-standardization-and-buffer-parsing)

---

## 5. Modbus/TCP Security Protocol

### Motivation

Modbus TCP transmits all data in **plaintext** and has **no authentication**. This enables:
- Eavesdropping on traffic (packet sniffers)
- Man-in-the-Middle (MITM) attacks
- Unauthorized write commands (FC 05, 06) to PLC systems

### Modbus/TCP Security (MBTPS)

The Modbus Organization has ratified the "Modbus/TCP Security" specification, which encapsulates the traditional Modbus PDU in a **TLS tunnel**:

| Element | Description |
|---------|-------------|
| **Port 802** | IANA-registered TCP port for secured connections |
| **TLS 1.2/1.3** | Encryption standard, natively available in Node.js `node:tls` |
| **mTLS (Mutual TLS)** | Mutual authentication via X.509v3 certificates |
| **RBAC** | Role-Based Access Control via X.509v3 extensions |

### Certificate Management in Node-RED

**Critical architecture decision:** Certificates and private keys must **never** be stored in `flow.json`, as this file is often unencrypted in Git repositories.

Instead, the architecture uses the **Node-RED Credential API**:
- Credentials are persisted in a separate `*_cred.json` file
- The file is cryptographically protected with the Node-RED `credentialSecret`
- `*_cred.json` is listed in `.gitignore`

### IEC 62443 Compliance

The integration of TLS and mTLS enables compliance with the **IEC 62443** standard series (Industrial Automation and Control Systems Security), which requires:
- Authentication of all network participants
- Encryption of communications
- Role-based access control
- Audit capability

> **Sources:** Modbus/TCP Security Protocol Specification [REF-04], IEC 62443 [REF-10]
> **Relevant Work Package:** [WP 4 – Modbus/TCP Security](WORK_PACKAGES.md#wp-4-modbustcp-security-and-credential-management)

---

## 6. Deterministic State Management via XState

### Problem: Hand-Coded FSM in Legacy Package

The legacy package `node-red-contrib-modbus` implements a proprietary, hand-written Finite State Machine (FSM) with states like INIT, ACTIVATED, QUEUEING, READING, EMPTY, RECONNECTING. This leads to:

- **"FSM Not Ready To Read" errors:** When a trigger reaches the node while the FSM is stuck in READING state
- **Race conditions:** Asynchronous events can push the FSM into undefined states
- **Log floods:** Minimal network latencies result in massive error messages

> **Source:** GitHub issues of the legacy package, documented in the community [REF-05]

### Solution: XState v5

[XState](https://stately.ai/docs/xstate-v5) enables graphical and mathematically correct state modeling. Benefits:

1. **Determinism:** Every transition is explicitly defined. Undefined states are mathematically impossible.
2. **Guards:** Conditions checked before a transition (e.g. `isConnected`, `hasRetriesLeft`).
3. **Actions:** Side effects during state transitions (e.g. open socket, update status).
4. **Visualization:** XState definitions can be graphically displayed (stately.ai/viz).

### State Diagram

```
                    ┌──────────────┐
                    │ DISCONNECTED │ ◄──── max retries reached
                    └──────┬───────┘
                           │ CONNECT
                           ▼
                    ┌──────────────┐
              ┌────►│  CONNECTING  │
              │     └──────┬───────┘
              │            │ SUCCESS
              │            ▼
              │     ┌──────────────┐
              │     │  CONNECTED   │ ◄──── READ/WRITE SUCCESS
              │     └──────┬───────┘
              │            │ READ_REQUEST / WRITE_REQUEST
              │            ▼
              │     ┌──────────────┐
              │     │ READING /    │
              │     │ WRITING      │
              │     └──────┬───────┘
              │            │ FAILURE / TIMEOUT
              │            ▼
              │     ┌──────────────┐
              │     │    ERROR     │
              │     └──────┬───────┘
              │            │ RETRY
              │            ▼
              │     ┌──────────────┐
              └─────┤   BACKOFF    │ (exponential: 1s, 2s, 4s, 8s, ...)
                    └──────────────┘
```

> **Source:** XState v5 Documentation [REF-08]
> **Relevant Work Package:** [WP 1.3 – XState State Machine](WORK_PACKAGES.md#wp-13-xstate-state-machine)

---

## 7. Backpressure Management

### Problem: Queue Overflow in Legacy Package

When the polling rate exceeds the physical processing rate (e.g. 10ms interval at 9600 baud), the internal queue grows uncontrollably. Consequences:
- Massive memory leak
- System becomes extremely sluggish
- Eventually: crash

> **Source:** Community reports in the legacy repository [REF-05]

### Solution: Configurable Queue with Drop Strategy

| Parameter | Description | Default |
|-----------|-------------|---------|
| **Max Queue Size** | Hard limit for queue size | 100 |
| **Drop Strategy: FIFO** | Oldest message is discarded | Sensor monitoring |
| **Drop Strategy: LIFO** | Newest message is discarded | Alarm events |
| **Status Indicator** | `this.status()` shows queue fill level | Yellow at >80% |

**Algorithm:**
```
IF queue.length >= maxQueueSize:
  IF dropStrategy == FIFO:
    queue.shift()     // Remove oldest
  ELSE IF dropStrategy == LIFO:
    // New message is discarded (not enqueued)
    RETURN "dropped"
queue.push(newMessage)
```

The memory footprint remains constant, regardless of the flow's polling rate.

> **Relevant Work Package:** [WP 2.3 – Backpressure Management](WORK_PACKAGES.md#wp-23-backpressure-management)

---

## 8. Dynamic Address Space Mapping

### Problem: Monolithic Memory Arrays

Traditional Modbus server implementations allocate a static array for the entire address space. With non-linear address structures (e.g. data at addresses 6000, 6001, 6005), memory is massively wasted.

### Solution: Event-Based Proxy Pattern

The server config node acts as a pure TCP listener. When requests arrive, an event is published into the Node-RED flow:

```
External Modbus Client
        │
        ▼ FC 03, Register 40108
┌───────────────────┐
│ Server Config Node │  ← TCP listener on port 502
└────────┬──────────┘
         │ Event: { fc: 3, address: 107, quantity: 2 }
         ▼
┌───────────────────┐
│  Modbus-In Node   │  ← Filters by address
└────────┬──────────┘
         │ msg.payload into the flow
         ▼
┌───────────────────┐
│  Flow Processing  │  ← HTTP API, database, sensor, ...
└────────┬──────────┘
         │ Result
         ▼
┌───────────────────┐
│  Modbus-Out Node  │  ← Generates response frame
└────────┬──────────┘
         │ TCP Response
         ▼
External Modbus Client
```

**Benefits:**
- No wasted memory for empty address ranges
- Dynamic data sources (APIs, databases) exposable as Modbus registers
- Full control over response logic in the flow

**Optional: In-Memory Cache** for latency-critical requests (hashmap instead of array).

> **Relevant Work Package:** [WP 3 – Server/Slave Proxy Nodes](WORK_PACKAGES.md#wp-3-modbus-server--slave-proxy-nodes)

---

## 9. Analysis of Existing Implementations

### node-red-contrib-modbus (BiancoRoyal)

**License:** BSD-3-Clause  
**Maintainer:** Klaus Landsdorf / P4NR B2B Community  
**History:** Originally by Mika Karaila (2015), taken over by BiancoRoyal (2016)

**Identified Architectural Weaknesses:**

1. **FSM Bottleneck:** Proprietary, hand-coded finite state machine with states INIT, ACTIVATED, QUEUEING, READING, EMPTY. Error messages like "FSM Not Ready To Read" during asynchronous latencies.

2. **Queue Overflow:** Missing backpressure mechanisms. When polling rate is too high, the queue grows uncontrollably in memory.

3. **Deployment Leaks:** Socket listeners are not correctly deregistered during partial deployments (`removeListener`), leading to event listener multiplication.

> **Note:** This analysis is based on publicly available GitHub issues and community reports. No code snippets are copied or reproduced. The analysis serves exclusively for architectural differentiation of the new development.
> **Source:** GitHub BiancoRoyal/node-red-contrib-modbus [REF-05]

### Differentiation of Our Implementation

| Aspect | Legacy (BiancoRoyal) | Forge (Our Approach) |
|--------|---------------------|---------------------|
| State Management | Hand-coded FSM | XState v5 (formally verifiable) |
| Queue | Unlimited, no backpressure | Configurable, FIFO/LIFO drop |
| Server Memory | Static array | Event-based proxy pattern |
| Security | No TLS | TLS 1.3, mTLS, port 802 |
| Lifecycle | Leak-prone on deploy | Strict deregistration in `node.on('close')` |

---

## 10. Node.js Libraries Comparison

### modbus-serial (ISC License)

- **Repository:** github.com/yaacov/node-modbus-serial
- **Focus:** Client/master with excellent RTU and TCP support
- **API:** Promise-based (async/await compatible)
- **Serialport:** Optional dependency (v13, Node.js 20+)
- **Server:** Simple ServerTCP with vector callbacks
- **Usage in project:** As **npm dependency** for the transport layer

### jsmodbus (MIT License)

- **Repository:** github.com/Cloud-Automation/node-modbus
- **Focus:** Event-based server architecture
- **API:** Event emitter pattern
- **Usage in project:** As **architectural inspiration** for event-based server proxying. No code is copied.

### Comparison Table

| Criterion | modbus-serial | jsmodbus |
|-----------|--------------|---------|
| Primary Focus | Client robustness | Flexible eventing |
| RTU Support | Excellent | Good |
| TCP Support | Very good | Very good |
| Server Architecture | Callback-based | Event-based |
| Promise API | Native | Partial |
| License | ISC | MIT |
| Maintenance | Active | Relatively slow |

### Recommended Hybrid Strategy

- **Client/Master:** `modbus-serial` as dependency (promise API guarantees stability in RTU environments)
- **Server/Slave:** Independent, event-based implementation, inspired by the concept of `jsmodbus`, but without code adoption

> **Sources:** npm package pages [REF-06, REF-07]

---

## 11. Best Practices for Industrial Deployment

### Strict Logic Separation (Separation of Concerns)

Node-RED is an event-driven IT software and must **never** take over hard real-time control logic:
- **Not with Node-RED:** Emergency stop circuits, PID controllers, safety-critical PLC logic
- **Node-RED's role:** Read data, contextualize (JSON), publish to IT systems (MQTT, UNS)

> **Source:** FlowFuse Best Practices [REF-09]

### Efficient Polling

- **Grouping:** Query contiguous registers in a single request (e.g. FC 03, length 50)
- **Interval Adjustment:** HMI: ~1s, cloud dashboard: ~60s
- **Bitwise Stuffing:** Encode 16 coils into a single holding register → reduce network load

### System Resilience

- **RBE (Report By Exception):** Filter node after Modbus-Read → only forward changed values
- **Watchdog:** Status monitoring via `this.status()`, trigger node for connection restart
- **DMZ Placement:** Node-RED between IT and OT (Demilitarized Zone)

> **Source:** FlowFuse – "Working with Modbus in Node-RED" [REF-09]

---

## 12. Extended Function Codes – PDU Structure and Protocol Behavior

> **Relevant Work Packages:** [WP 6.1](WORK_PACKAGES.md#wp-61-fc-22-mask-write-register-and-fc-23-readwrite-multiple-registers), [WP 6.2](WORK_PACKAGES.md#wp-62-fc-4314--read-device-identification), [WP 6.3](WORK_PACKAGES.md#wp-63-fc-08-diagnostics-and-fc-07-read-exception-status--serial-only), [WP 6.4](WORK_PACKAGES.md#wp-64-serial-line-legacy-function-codes-fc-11-12-17-20-21-24)

This section provides the protocol-level PDU structures and behavioral semantics for all
function codes planned in MS-9 and MS-10. Understanding the exact byte layout is essential
for correct implementation and for writing deterministic test vectors.

### 12.1 FC 22 – Mask Write Register (0x16)

**Purpose:** Atomically modify individual bits within a single holding register without
a separate read-modify-write cycle. This eliminates race conditions when multiple masters
share a bus and need to set or clear individual control bits in the same register.

**Formula:**
$$\text{result} = (\text{current} \wedge \text{andMask}) \vee (\text{orMask} \wedge \neg\text{andMask})$$

**PDU Request (8 bytes):**

| Byte | Field | Size | Description |
|------|-------|------|-------------|
| 0 | Function Code | 1 | 0x16 |
| 1–2 | Reference Address | 2 | Holding register address (0x0000–0xFFFF) |
| 3–4 | AND Mask | 2 | Bitmask for AND operation |
| 5–6 | OR Mask | 2 | Bitmask for OR operation |

**PDU Response:** Echo of the request (identical 8 bytes).

**Operational semantics:**
- To **set** bit N: `andMask = 0xFFFF`, `orMask = (1 << N)`
- To **clear** bit N: `andMask = ~(1 << N) & 0xFFFF`, `orMask = 0x0000`
- To **toggle** bit N: Requires a read first (FC 22 alone cannot toggle)
- The operation is guaranteed **atomic** at the device level – no intermediate state
  is observable by other masters on the bus

**modbus-serial API:**
```javascript
// Promise API
await client.maskWriteRegister(address, andMask, orMask);
// Returns: { address, andMask, orMask }
```

**Industrial use cases:**
- PLC control word manipulation (start/stop bits in a shared register)
- Multi-master environments where several SCADA systems write to the same device
- Bit-level I/O control without disrupting adjacent bits

> **Source:** Modbus Application Protocol Specification V1.1b3, §6.16 [REF-01]

### 12.2 FC 23 – Read/Write Multiple Registers (0x17)

**Purpose:** Combines a write of N registers followed by a read of M registers in a
single Modbus transaction. The write is applied before the read, so the read reflects
the post-write state. This reduces round-trip latency in setpoint-feedback loops.

**PDU Request (variable length):**

| Byte | Field | Size | Description |
|------|-------|------|-------------|
| 0 | Function Code | 1 | 0x17 |
| 1–2 | Read Starting Address | 2 | First register to read |
| 3–4 | Quantity to Read | 2 | Number of registers to read (1–125) |
| 5–6 | Write Starting Address | 2 | First register to write |
| 7–8 | Quantity to Write | 2 | Number of registers to write (1–121) |
| 9 | Write Byte Count | 1 | 2 × Quantity to Write |
| 10+ | Write Values | N×2 | Register values to write |

**PDU Response:**

| Byte | Field | Size | Description |
|------|-------|------|-------------|
| 0 | Function Code | 1 | 0x17 |
| 1 | Byte Count | 1 | 2 × Quantity to Read |
| 2+ | Read Values | M×2 | Register values read (post-write) |

**Constraints:**
- Max read: 125 registers (250 bytes)
- Max write: 121 registers (242 bytes)
- Read and write address ranges may overlap – the read returns post-write values

**modbus-serial API:**
```javascript
// writeFC23(address, readStart, readCount, writeStart, writeCount, writeValues, cb)
await client.writeFC23(unitId, readAddr, readLen, writeAddr, writeLen, values);
// Returns: { data: number[], buffer: Buffer }
```

**Industrial use cases:**
- Setpoint-feedback: Write a new setpoint, immediately read back the acknowledged process value
- Configuration registers: Write a configuration change, read back the effective state
- Reduces bus traffic from 2 PDUs to 1 PDU per cycle

> **Source:** Modbus Application Protocol Specification V1.1b3, §6.17 [REF-01]

### 12.3 FC 43/14 – Read Device Identification (MEI Transport, 0x2B/0x0E)

**Purpose:** Retrieves standardized metadata from a Modbus device using the MEI
(Modbus Encapsulated Interface) transport mechanism. This is the only function code
that returns variable-length string data instead of register values.

**MEI Type 14 (0x0E) – Read Device Identification** is the primary mechanism for
automated device discovery in IIoT asset management and SCADA inventory systems.

**Object ID Map (mandatory and optional):**

| Object ID | Name | Category | Content Example |
|-----------|------|----------|-----------------|
| 0x00 | VendorName | Basic | "Weidmueller" |
| 0x01 | ProductCode | Basic | "UR20-FBC-MOD-TCP" |
| 0x02 | MajorMinorRevision | Basic | "V2.3.1" |
| 0x03 | VendorURL | Regular | "https://www.weidmueller.com" |
| 0x04 | ProductName | Regular | "Remote I/O Coupler" |
| 0x05 | ModelName | Regular | "UR20-FBC-MOD-TCP" |
| 0x06 | UserApplicationName | Regular | "Line 4 Station 12" |
| 0x80–0xFF | Vendor-Specific | Extended | Device-dependent |

**Conformity Levels:**

| Level | Read Device ID Code | Objects Returned |
|-------|-------------------|------------------|
| Basic (01) | 0x01 | Objects 0x00–0x02 |
| Regular (02) | 0x02 | Objects 0x00–0x06 |
| Extended (03) | 0x03 | All objects including 0x80–0xFF |
| Individual (04) | 0x04 | Single object by ID |

**PDU Request (4 bytes):**

| Byte | Field | Size | Description |
|------|-------|------|-------------|
| 0 | Function Code | 1 | 0x2B |
| 1 | MEI Type | 1 | 0x0E |
| 2 | Read Device ID Code | 1 | 0x01–0x04 (conformity level) |
| 3 | Object ID | 1 | First object to read (0x00 for all) |

**PDU Response (variable length):**

| Byte | Field | Size | Description |
|------|-------|------|-------------|
| 0 | Function Code | 1 | 0x2B |
| 1 | MEI Type | 1 | 0x0E |
| 2 | Read Device ID Code | 1 | Echo of request |
| 3 | Conformity Level | 1 | Device's max conformity level |
| 4 | More Follows | 1 | 0x00 = last, 0xFF = more data |
| 5 | Next Object ID | 1 | Next object if MoreFollows = 0xFF |
| 6 | Number of Objects | 1 | Count of objects in this response |
| 7+ | Object List | var | Repeated: [ObjId (1), ObjLen (1), ObjValue (N)] |

**Streaming mode:** When the device's response exceeds the PDU size limit (253 bytes),
the `MoreFollows` field is set to 0xFF and `NextObjectID` indicates where to resume.
The client must issue follow-up requests until `MoreFollows = 0x00`.

**modbus-serial API:**
```javascript
const result = await client.readDeviceIdentification(deviceIdCode, objectId);
// Returns: { data: string[], conformityLevel: number }
```

**Implementation note:** The `readDeviceIdentification` method in modbus-serial handles
the streaming internally for TCP. However, the caller should validate conformity level
and handle partial responses gracefully for devices that only support Basic identification.

> **Source:** Modbus Application Protocol Specification V1.1b3, §6.21 (Annex A) [REF-01]

### 12.4 FC 07 – Read Exception Status (0x07)

**Purpose:** Reads 8 predefined exception status bits from a device-specific register.
This is a fast diagnostic function that requires no address argument – the device
determines which 8 coils are mapped to the exception status register.

**Transport:** Serial line only (RTU, ASCII). Not defined for TCP.

**PDU Request (1 byte):**

| Byte | Field | Size | Description |
|------|-------|------|-------------|
| 0 | Function Code | 1 | 0x07 |

**PDU Response (2 bytes):**

| Byte | Field | Size | Description |
|------|-------|------|-------------|
| 0 | Function Code | 1 | 0x07 |
| 1 | Output Data | 1 | 8 exception status bits |

**Bit interpretation:** Device-dependent. Common usage in PLCs: alarm summary word
where each bit represents a predefined alarm condition (e.g., overtemperature,
communication fault, low battery). The mapping must be obtained from the device
documentation.

**modbus-serial support:** Not natively supported. Requires `customFunction()`:
```javascript
const result = await client.customFunction(0x07, []);
// result.buffer[0] = exception status byte
```

> **Source:** Modbus Application Protocol Specification V1.1b3, §6.7 [REF-01]

### 12.5 FC 08 – Diagnostics (0x08)

**Purpose:** A multiplexed diagnostic function with 13 defined sub-functions for
serial line testing, counter management, and bus health monitoring. Indispensable
for RTU commissioning and preventive maintenance.

**Transport:** Serial line only (RTU, ASCII). Not defined for TCP.

**PDU Request (4 bytes):**

| Byte | Field | Size | Description |
|------|-------|------|-------------|
| 0 | Function Code | 1 | 0x08 |
| 1–2 | Sub-Function | 2 | 0x0000–0x0012 |
| 3–4 | Data | 2 | Sub-function-specific data |

**PDU Response (4 bytes):** Echo of request for most sub-functions.

**Sub-Function Reference Table:**

| Sub-FC | Hex | Name | Behavior |
|--------|-----|------|----------|
| 00 | 0x0000 | Return Query Data | Loopback echo test – data field is echoed verbatim |
| 01 | 0x0001 | Restart Communications | Restarts the serial port and clears event counters. Data: 0x0000 (no log clear) or 0xFF00 (clear comm event log) |
| 02 | 0x0002 | Return Diagnostic Register | Returns the 16-bit diagnostic register content |
| 03 | 0x0003 | Change ASCII Input Delimiter | Changes the LF delimiter for ASCII mode. Data: new delimiter in high byte |
| 04 | 0x0004 | Force Listen Only Mode | Forces the device into listen-only mode (no responses). Used for bus debugging |
| 10 | 0x000A | Clear Counters | Resets all diagnostic counters and the diagnostic register to zero |
| 11 | 0x000B | Return Bus Message Count | Total messages detected on the bus (valid + invalid) |
| 12 | 0x000C | Return Bus Communication Error Count | Messages with CRC errors |
| 13 | 0x000D | Return Bus Exception Error Count | Modbus exceptions returned by this device |
| 14 | 0x000E | Return Server Message Count | Messages addressed to this device |
| 15 | 0x000F | Return Server No Response Count | Messages received but not answered (broadcast, listen-only) |
| 16 | 0x0010 | Return Server NAK Count | Exception responses with code 0x05 or 0x06 |
| 17 | 0x0011 | Return Server Busy Count | Exception responses with code 0x06 |
| 18 | 0x0012 | Return Bus Character Overrun Count | UART overrun errors (characters lost) |

**Loopback test (Sub-FC 0x00):** The most commonly used diagnostic: the client sends
arbitrary data and expects an identical echo. If the response differs, the physical
layer (cable, termination, biasing) is suspect. This is the Modbus equivalent of a
network `ping`.

**modbus-serial support:** Not natively supported. Requires `customFunction()`:
```javascript
// Loopback test (sub-function 0x00)
const subFC = 0x0000;
const testData = 0xABCD;
const request = [(subFC >> 8) & 0xFF, subFC & 0xFF, (testData >> 8) & 0xFF, testData & 0xFF];
const result = await client.customFunction(0x08, request);
```

> **Source:** Modbus Application Protocol Specification V1.1b3, §6.8 [REF-01]

### 12.6 FC 11/12 – Communication Event Counter and Event Log (0x0B/0x0C)

**Transport:** Serial line only.

**FC 11 – Get Comm Event Counter (0x0B):**
Returns a status word (0x0000 = not busy, 0xFFFF = busy) and a 16-bit event counter
that increments for every successful message completion. The counter is reset by FC 08
sub-function 0x0A (Clear Counters).

PDU Request: 1 byte (FC only).
PDU Response: 5 bytes (FC + status word + event count).

**FC 12 – Get Comm Event Log (0x0C):**
Returns the status word, event count, message count, plus a 64-event ring buffer
where each event byte records the type and outcome of a bus transaction. This provides
a detailed audit trail for diagnosing intermittent communication failures.

PDU Request: 1 byte (FC only).
PDU Response: Variable (FC + byte count + status + event count + message count + events[]).

**modbus-serial support:** Not natively supported. Requires `customFunction()`.

> **Source:** Modbus Application Protocol Specification V1.1b3, §6.9–6.10 [REF-01]

### 12.7 FC 17 – Report Server ID (0x11)

**Purpose:** Returns device-specific identification data: a server ID byte, a
run-indicator (0x00 = OFF, 0xFF = ON), and optional additional data defined by the
device manufacturer.

**Transport:** All (TCP + RTU), though primarily used in RTU environments.

**PDU Request:** 1 byte (FC only).

**PDU Response:**

| Byte | Field | Size | Description |
|------|-------|------|-------------|
| 0 | Function Code | 1 | 0x11 |
| 1 | Byte Count | 1 | Total payload length |
| 2 | Server ID | 1 | Device-specific identifier |
| 3 | Run Indicator | 1 | 0x00 = OFF, 0xFF = ON |
| 4+ | Additional Data | var | Device-specific (manufacturer-defined) |

**modbus-serial API:**
```javascript
const result = await client.reportServerID(unitId);
// Returns: { serverId: number, running: boolean, additionalData: Buffer }
```

> **Source:** Modbus Application Protocol Specification V1.1b3, §6.11 [REF-01]

### 12.8 FC 20/21 – File Record Access (0x14/0x15)

**Purpose:** Reads and writes records in an extended file memory area outside the
standard register address space. Used by some PLCs for recipe storage, data logging,
and firmware transfer.

**File addressing model:**
- File Number: 0x0001–0xFFFF (file 0x0000 is reserved)
- Record Number: 0x0000–0x270F within a file
- Record Length: 1–N registers (each record is 16-bit)
- Reference Type: Always 0x06 (as specified)

**FC 20 – Read File Record (0x14):**

PDU Request contains one or more sub-requests, each specifying:
| Field | Size | Description |
|-------|------|-------------|
| Reference Type | 1 | Always 0x06 |
| File Number | 2 | Target file (1–65535) |
| Record Number | 2 | Starting record within file |
| Record Length | 2 | Number of registers to read |

PDU Response contains the corresponding data blocks, each prefixed with a length byte
and reference type.

**FC 21 – Write File Record (0x15):**
Same sub-request structure as FC 20, but with the register values appended to each
sub-request block.

**modbus-serial support:** Not natively supported. Requires `customFunction()` with
manual PDU construction.

> **Source:** Modbus Application Protocol Specification V1.1b3, §6.12–6.13 [REF-01]

### 12.9 FC 24 – Read FIFO Queue (0x18)

**Purpose:** Reads up to 31 register values from a First-In-First-Out queue associated
with a given pointer address. The FIFO is managed by the device firmware; the Modbus
client only reads the current queue contents without removing them.

**PDU Request (3 bytes):**

| Byte | Field | Size | Description |
|------|-------|------|-------------|
| 0 | Function Code | 1 | 0x18 |
| 1–2 | FIFO Pointer Address | 2 | Address of the FIFO pointer register |

**PDU Response:**

| Byte | Field | Size | Description |
|------|-------|------|-------------|
| 0 | Function Code | 1 | 0x18 |
| 1–2 | Byte Count | 2 | Total response bytes (including FIFO count) |
| 3–4 | FIFO Count | 2 | Number of registers in queue (0–31) |
| 5+ | FIFO Values | N×2 | Queue register values |

**Constraint:** Maximum 31 registers (62 bytes) per response. If the FIFO contains
more than 31 entries, only the first 31 are returned.

**modbus-serial support:** Not natively supported. Requires `customFunction()`.

> **Source:** Modbus Application Protocol Specification V1.1b3, §6.14 [REF-01]

### 12.10 Library Support Summary

The following table maps each planned FC to its modbus-serial API availability:

| FC | Name | modbus-serial Method | Native Support |
|----|------|---------------------|----------------|
| 22 | Mask Write Register | `maskWriteRegister()` | ✅ Yes |
| 23 | Read/Write Multiple Registers | `writeFC23()` | ✅ Yes |
| 43/14 | Read Device Identification | `readDeviceIdentification()` | ✅ Yes |
| 17 | Report Server ID | `reportServerID()` | ✅ Yes |
| 07 | Read Exception Status | `customFunction(0x07, [])` | ⚠️ Via customFC |
| 08 | Diagnostics | `customFunction(0x08, [...])` | ⚠️ Via customFC |
| 11 | Get Comm Event Counter | `customFunction(0x0B, [])` | ⚠️ Via customFC |
| 12 | Get Comm Event Log | `customFunction(0x0C, [])` | ⚠️ Via customFC |
| 20 | Read File Record | `customFunction(0x14, [...])` | ⚠️ Via customFC |
| 21 | Write File Record | `customFunction(0x15, [...])` | ⚠️ Via customFC |
| 24 | Read FIFO Queue | `customFunction(0x18, [...])` | ⚠️ Via customFC |

For FCs requiring `customFunction()`, the implementation must construct the raw PDU
request bytes manually and parse the raw response buffer. This is a deliberate design
in modbus-serial: the library provides the transport framing (CRC for RTU, MBAP header
for TCP) while the application handles the PDU payload.

---

## 13. Modbus Exception Responses

> **Relevant Work Package:** [WP 7.3](WORK_PACKAGES.md#wp-73-modbus-exception-code-structured-error-handling)

### Error Response Format

When a Modbus server cannot fulfill a request, it returns an **exception response**
instead of a normal response. The exception response has a specific format:

**PDU Exception Response (2 bytes):**

| Byte | Field | Size | Description |
|------|-------|------|-------------|
| 0 | Error Code | 1 | Original FC OR-ed with 0x80 (e.g., FC 03 → 0x83) |
| 1 | Exception Code | 1 | One of the defined exception codes (0x01–0x0B) |

The high bit (0x80) of the function code signals to the client that this is an exception
response, not a normal response. The client must check this bit before attempting to
parse register data.

### Exception Code Reference

| Code | Hex | Name | Meaning | Typical Cause |
|------|-----|------|---------|---------------|
| 01 | 0x01 | Illegal Function | FC not supported | Device does not implement the requested FC |
| 02 | 0x02 | Illegal Data Address | Register address does not exist | Address out of range for this device |
| 03 | 0x03 | Illegal Data Value | Value out of range | Quantity exceeds PDU limit, or invalid value |
| 04 | 0x04 | Server Device Failure | Unrecoverable internal error | Hardware fault, firmware crash |
| 05 | 0x05 | Acknowledge | Long operation in progress | Device accepted but needs time; retry later |
| 06 | 0x06 | Server Device Busy | Cannot process now | Device is processing another request |
| 08 | 0x08 | Memory Parity Error | Extended memory failure | EEPROM/flash corruption |
| 0A | 0x0A | Gateway Path Unavailable | Gateway misconfiguration | TCP-to-RTU gateway cannot reach the serial bus |
| 0B | 0x0B | Gateway Target Device Failed | Target not responding | RTU slave behind the gateway is offline |

### Gateway-Specific Behavior

Exception codes 0x0A and 0x0B are particularly important in TCP-to-RTU gateway
deployments (e.g., Moxa, Lantronix, Wago):

- **0x0A (Gateway Path Unavailable):** The gateway itself is reachable via TCP, but
  the serial port configuration is invalid or the bus is physically disconnected.
- **0x0B (Gateway Target Device Failed):** The gateway forwarded the request to the
  RTU bus, but the target slave did not respond within the gateway's timeout.

These codes enable differentiated error handling: 0x0A indicates a gateway
configuration problem, while 0x0B indicates a device-level problem.

### Structured Error Object Design

For SCADA alarm management and dashboard integration, the raw exception code must be
parsed into a structured object:

```javascript
// Conceptual design for exception-parser.js
const EXCEPTION_CODES = {
  0x01: { name: 'ILLEGAL_FUNCTION', severity: 'error', retryable: false },
  0x02: { name: 'ILLEGAL_DATA_ADDRESS', severity: 'error', retryable: false },
  0x03: { name: 'ILLEGAL_DATA_VALUE', severity: 'error', retryable: false },
  0x04: { name: 'SERVER_DEVICE_FAILURE', severity: 'critical', retryable: false },
  0x05: { name: 'ACKNOWLEDGE', severity: 'info', retryable: true },
  0x06: { name: 'SERVER_DEVICE_BUSY', severity: 'warning', retryable: true },
  0x08: { name: 'MEMORY_PARITY_ERROR', severity: 'critical', retryable: false },
  0x0A: { name: 'GATEWAY_PATH_UNAVAILABLE', severity: 'error', retryable: false },
  0x0B: { name: 'GATEWAY_TARGET_FAILED', severity: 'error', retryable: true }
};
```

The `retryable` flag is operationally critical: codes 0x05 and 0x06 indicate temporary
conditions where an automatic retry (with backoff) is appropriate. Code 0x0B is retryable
because the target device may recover. All other codes indicate persistent configuration
or hardware errors that will not resolve by retrying.

The parsed exception is attached to `msg.payload.exception`:
```javascript
msg.payload.exception = {
  code: 0x02,
  name: 'ILLEGAL_DATA_ADDRESS',
  severity: 'error',
  retryable: false,
  fc: 3,
  address: 9999,
  message: 'Register address 9999 does not exist on unit 1'
};
```

> **Source:** Modbus Application Protocol Specification V1.1b3, §7 [REF-01]

---

## 14. PDU Payload Limits and Automatic Request Chunking

> **Relevant Work Package:** [WP 7.1](WORK_PACKAGES.md#wp-71-automatic-request-chunking-and-broadcast-support)

### ADU vs. PDU Size Constraints

The Modbus protocol defines a strict maximum size for the Protocol Data Unit (PDU):

$$\text{PDU}_{\max} = 253 \text{ bytes} = 1 \text{ byte FC} + 252 \text{ bytes data}$$

The Application Data Unit (ADU) adds transport-specific framing:

| Transport | ADU Header | PDU | ADU Trailer | Max ADU |
|-----------|-----------|-----|-------------|---------|
| RTU | Slave Address (1) | ≤ 253 | CRC (2) | 256 bytes |
| TCP | MBAP Header (7) | ≤ 253 | – | 260 bytes |

### Per-FC Maximum Quantities

The PDU size limit translates to FC-specific maximum quantities:

| FC | Operation | Max Quantity | Calculation |
|----|-----------|-------------|-------------|
| 01 | Read Coils | 2000 | 252 data bytes × 8 bits = 2016, spec caps at 2000 |
| 02 | Read Discrete Inputs | 2000 | Same as FC 01 |
| 03 | Read Holding Registers | 125 | 252 data bytes ÷ 2 bytes/reg = 126, spec caps at 125 |
| 04 | Read Input Registers | 125 | Same as FC 03 |
| 05 | Write Single Coil | 1 | Single value, no chunking needed |
| 06 | Write Single Register | 1 | Single value, no chunking needed |
| 15 | Write Multiple Coils | 1968 | 252 data bytes - 5 header = 247 bytes × 8 bits = 1976, spec caps at 1968 |
| 16 | Write Multiple Registers | 123 | 252 data bytes - 5 header = 247 bytes ÷ 2 = 123 |
| 23 | Read/Write Multiple | Read: 125, Write: 121 | Separate limits for read and write portion |

### Chunking Algorithm

When a user requests more data than a single PDU can carry, the request must be
automatically split into the minimum number of sub-requests:

```
Input: FC, startAddress, quantity, maxPerRequest
Output: Array of { address, count } sub-requests

function chunk(startAddress, quantity, maxPerRequest):
  chunks = []
  remaining = quantity
  offset = 0
  
  WHILE remaining > 0:
    count = MIN(remaining, maxPerRequest)
    chunks.PUSH({ address: startAddress + offset, count: count })
    offset += count
    remaining -= count
  
  RETURN chunks
```

**Example:** Read 300 holding registers starting at address 100:
1. Request 1: FC 03, address 100, length 125
2. Request 2: FC 03, address 225, length 125
3. Request 3: FC 03, address 350, length 50

The results are concatenated in order before being passed to `msg.payload`.

### Reassembly Considerations

- **Atomicity:** Multi-chunk reads are NOT atomic. Register values may change between
  sub-requests. For applications requiring consistency, FC 23 (single-PDU read/write)
  or device-side buffering must be used.
- **Error handling:** If any sub-request fails, the entire chunked operation fails.
  Partial results are discarded to maintain data consistency.
- **Performance:** Each sub-request incurs a full Modbus round-trip. For RTU at 9600
  baud, a 3-chunk request takes ~3× the single-request time. The chunker should warn
  the user (via `node.warn()`) when chunking is required.

### Broadcast Support (Unit ID 0)

The Modbus RTU specification reserves Unit ID 0 as a **broadcast address**:

- Write operations (FC 05, 06, 15, 16) are sent to all slaves simultaneously
- **Servers must not respond** to broadcast messages
- Read operations on Unit ID 0 are undefined and should be rejected
- The client must skip response waiting and suppress timeout errors

**Implementation:** When `unitId === 0`, the transport layer sends the request but
immediately resolves the promise without waiting for a response. A short inter-frame
delay (3.5 character times for RTU) must still be observed before the next request.

> **Source:** Modbus Application Protocol Specification V1.1b3, §4.2 + §6 [REF-01];
> MODBUS over Serial Line Specification V1.02, §2.2 [REF-02]

---

## 15. Extended Data Types Across Modbus Registers

> **Relevant Work Package:** [WP 7.2](WORK_PACKAGES.md#wp-72-extended-data-type-abstraction)

### The Single-Register Limitation

Modbus registers are 16-bit words. All data types wider than 16 bits must be encoded
across **consecutive registers**. The protocol itself does not define how multi-register
values are assembled – this is device-dependent and must be configurable in the node UI.

### Data Type Reference

| Type | Size | Registers | IEEE/Standard | Byte Order Variants |
|------|------|-----------|---------------|-------------------|
| UInt16 | 2 bytes | 1 | – | N/A (single register) |
| Int16 | 2 bytes | 1 | – | N/A (single register) |
| UInt32 | 4 bytes | 2 | – | BE, LE, BE-swap, LE-swap |
| Int32 | 4 bytes | 2 | – | BE, LE, BE-swap, LE-swap |
| Float32 | 4 bytes | 2 | IEEE 754 single | BE, LE, BE-swap, LE-swap |
| Float64 | 8 bytes | 4 | IEEE 754 double | BE, LE, BE-swap, LE-swap |
| UInt64 | 8 bytes | 4 | – | BE, LE, BE-swap, LE-swap |
| Int64 | 8 bytes | 4 | – | BE, LE, BE-swap, LE-swap |
| String | 2N bytes | N | ASCII | – |
| BCD | 2–4 bytes | 1–2 | – | – |
| Unix Timestamp | 4 bytes | 2 | POSIX | BE, LE |
| DateTime (IEC 61131) | 4–6 bytes | 2–3 | IEC 61131-3 | Device-specific |

### Float64 (IEEE 754 Double-Precision)

A 64-bit floating point value spans 4 consecutive registers:

```
Register N:   [Byte 7] [Byte 6]   (MSB of exponent + sign)
Register N+1: [Byte 5] [Byte 4]
Register N+2: [Byte 3] [Byte 2]
Register N+3: [Byte 1] [Byte 0]   (LSB of mantissa)
```

With byte-swap variants, the register order or byte order within registers may differ.
The `buffer-parser.js` must support all 4 standard orderings, identical to Float32
but operating on 8 bytes instead of 4.

**JavaScript implementation note:** `DataView.getFloat64(offset, littleEndian)` handles
the IEEE 754 conversion natively. The challenge is arranging the 8 bytes from the 4
register values into the correct order before calling `getFloat64()`.

### Int64 / UInt64

JavaScript does not natively support 64-bit integers (Number.MAX_SAFE_INTEGER = $2^{53} - 1$).
Two approaches are available:

1. **BigInt:** `BigInt` is available since Node.js 10.3 and handles arbitrary-precision
   integers. `DataView.getBigInt64()` and `DataView.getBigUint64()` are available since
   Node.js 12.
2. **Numeric approximation:** For values within the safe integer range ($\leq 2^{53} - 1$),
   a standard `Number` suffices. For larger values, precision loss occurs.

**Recommendation:** Return `BigInt` for Int64/UInt64 types. The `msg.payload` will contain
BigInt values, which JSON.stringify handles via a custom replacer (or the user converts
with `Number()` if the value is within safe range).

### ASCII String Encoding

Modbus registers pack 2 ASCII characters per register (high byte first):

```
Register N:   [Char 0] [Char 1]
Register N+1: [Char 2] [Char 3]
...
Register N+k: [Char 2k] [0x00 or Char 2k+1]
```

Strings are typically null-terminated. The parser must:
1. Concatenate all register bytes in order
2. Trim trailing null bytes (0x00)
3. Decode as ASCII (or Latin-1 for European devices)

**Length calculation:** To read a string of L characters, request $\lceil L / 2 \rceil$ registers.

### BCD (Binary Coded Decimal)

BCD encodes each decimal digit in a 4-bit nibble. A single 16-bit register holds
4 BCD digits (0000–9999):

```
Register value 0x1234 → decimal "1234"
  Nibble 3: 0x1 → '1'
  Nibble 2: 0x2 → '2'
  Nibble 1: 0x3 → '3'
  Nibble 0: 0x4 → '4'
```

BCD is common in older PLCs and energy meters for displaying numeric values without
floating-point conversion. Two registers (32-bit BCD) encode up to 8 digits.

**Parsing algorithm:**
```
function decodeBCD(register):
  result = ""
  FOR each nibble from MSB to LSB:
    digit = (register >> shift) & 0x0F
    IF digit > 9: RETURN error (invalid BCD)
    result += digit.toString()
  RETURN parseInt(result, 10)
```

### Unix Timestamp

A 32-bit unsigned integer representing seconds since 1970-01-01T00:00:00Z, stored
across 2 registers with device-specific byte order. The parser converts to a JavaScript
`Date` object:

```javascript
const seconds = parseUInt32(registers, byteOrder);
const date = new Date(seconds * 1000);
```

**Range:** 1970-01-01 to 2106-02-07 (UInt32). After 2038, signed Int32 timestamps
overflow (the "Year 2038 problem"); only UInt32 or 64-bit timestamps are safe.

### IEC 61131-3 Date/Time

The IEC 61131-3 standard defines several date/time types commonly used in PLCs:

| Type | Size | Encoding |
|------|------|----------|
| DATE | 2 reg | Year (16-bit) + Month (8-bit) + Day (8-bit) |
| TIME_OF_DAY | 2 reg | Milliseconds since midnight (32-bit) |
| DATE_AND_TIME | 3 reg | DATE (2 reg) + TIME_OF_DAY ms truncated to 16-bit or device-specific |

The exact encoding is manufacturer-dependent. Siemens, Allen-Bradley, and Schneider
use incompatible formats. The parser should expose the raw register values alongside
any decoded interpretation, allowing the user to apply device-specific logic in the flow.

> **Sources:** IEEE 754-2008 [REF-23]; IEC 61131-3 Ed. 3 [REF-24]

---

## 16. Modbus RTU over TCP Encapsulation

> **Relevant Work Package:** [WP 7.4](WORK_PACKAGES.md#wp-74-modbus-rtu-over-tcp-raw-rtu-encapsulation)

### Problem: Protocol Mismatch at Gateways

Standard Modbus TCP wraps the PDU in an **MBAP (Modbus Application Protocol) header**:

| Byte | Field | Size | Description |
|------|-------|------|-------------|
| 0–1 | Transaction ID | 2 | Request/response correlation |
| 2–3 | Protocol ID | 2 | Always 0x0000 for Modbus |
| 4–5 | Length | 2 | Remaining bytes (Unit ID + PDU) |
| 6 | Unit ID | 1 | Target device on serial bus |
| 7+ | PDU | var | Function code + data |

Many industrial TCP-to-serial gateways, however, operate in a **"raw RTU" mode** where
the TCP socket carries a binary-identical Modbus RTU frame **including the 2-byte CRC**,
without the MBAP header:

| Byte | Field | Size | Description |
|------|-------|------|-------------|
| 0 | Slave Address | 1 | Unit ID (1–247) |
| 1+ | PDU | var | Function code + data |
| Last 2 | CRC | 2 | CRC-16 (Modbus) |

### Gateway Product Landscape

The following gateway categories commonly use RTU-over-TCP:

| Manufacturer | Product Example | Default Port | Mode |
|-------------|-----------------|--------------|------|
| Moxa | NPort 5100 series | 4001 | Raw TCP (configurable) |
| Lantronix | XPort, UDS1100 | 10001 | Raw TCP |
| Wago | 750-352 | 502 | Configurable (MBAP or RTU) |
| Digi | PortServer TS | 2101 | Raw TCP |
| ADAM | ADAM-4571 | 5000 | Raw TCP |

**Important:** Some gateways support both MBAP and raw RTU modes, selectable via web
configuration. The Node-RED node must expose this as a transport type selection to avoid
silent protocol mismatches.

### Inter-Frame Delay

RTU framing over TCP may require an **inter-frame delay** between consecutive requests.
On a real serial bus, the RTU specification mandates a silence of at least 3.5 character
times between frames ($t_{3.5}$):

$$t_{3.5} = \frac{3.5 \times 11 \text{ bits}}{baudRate} \text{ seconds}$$

At 9600 baud: $t_{3.5} \approx 4.01$ ms.

Some gateways enforce this delay internally; others require the TCP client to observe it.
The `modbus-client-config` node should expose an optional **inter-frame delay (ms)**
parameter, defaulting to 0 (gateway handles it) with a recommended minimum of 5 ms
for problematic devices.

### modbus-serial Support

The `modbus-serial` library provides native RTU-over-TCP support:

```javascript
// connectTcpRTUBuffered – sends RTU frames (with CRC) over a TCP socket
await client.connectTcpRTUBuffered(host, { port: 4001 });
```

This uses the `TcpRTUBufferedPort` transport internally, which:
1. Opens a standard TCP socket to the gateway
2. Wraps outgoing PDUs in RTU framing (slave address + CRC)
3. Strips RTU framing from incoming responses
4. Applies inter-frame buffering to handle fragmented TCP segments

The `transport-factory.js` must be extended with a third transport type alongside
TCP and RTU: `"rtu-over-tcp"`.

> MODBUS over Serial Line Specification V1.02, §2.5.1.1 [REF-02];
> Moxa NPort User Manual (inter-frame timing) [REF-30]

---

## 17. Industrial Operational Patterns

> **Relevant Work Packages:** [WP 7.5](WORK_PACKAGES.md#wp-75-report-by-exception-rbe-dedicated-node), [WP 7.6](WORK_PACKAGES.md#wp-76-scan-list--polling-scheduler-node), [WP 7.7](WORK_PACKAGES.md#wp-77-watchdog--safe-state-heartbeat-node), [WP 7.8](WORK_PACKAGES.md#wp-78-statistics-and-diagnostics-runtime-node)

This section provides the theoretical foundation for four higher-level operational
patterns that distinguish an enterprise-grade SCADA driver from a basic protocol adapter.

### 17.1 Report-by-Exception (RBE) and Dead-Band Filtering

**Concept:** In a cyclic polling system, most consecutive readings return identical
or near-identical values. Forwarding every reading into the flow wastes processing
resources and bus bandwidth for downstream systems. RBE filters suppress duplicate
values and only propagate changes that exceed a defined threshold.

**IEC 61131-3 Definition:** The IEC 61131-3 standard defines "deadband" as a
parameter that specifies the minimum change required for a value to be reported.
This concept is adopted in OPC UA as "DeadBandFilter" and in MQTT Sparkplug as
"Report by Exception."

**Filtering Modes:**

| Mode | Applicability | Algorithm |
|------|--------------|-----------|
| Absolute Dead-Band | Analog values (registers) | Report if $\|v_{new} - v_{last}\| > \text{deadband}$ |
| Percentage Dead-Band | Scaled process values | Report if $\frac{\|v_{new} - v_{last}\|}{\|v_{last}\|} > \text{percentage}$ |
| Boolean Change | Coils/discrete inputs | Report on any state change (0→1 or 1→0) |
| Inhibit Timer | All types | Suppress reporting for N ms after last report (alarm storm prevention) |

**Per-Register Configuration:** Different registers within the same read request
may require different dead-band thresholds. A temperature sensor might need ±0.5°C,
while a pressure sensor needs ±0.1 bar. The RBE node must maintain a state table
keyed by register address.

**State Table Structure:**
```
Map<address, {
  lastValue: number | boolean,
  lastReportedAt: timestamp,
  deadband: number,
  mode: 'absolute' | 'percentage' | 'boolean'
}>
```

**Output:** `msg.changed[]` contains the addresses of registers that passed the
dead-band filter. Only changed values are forwarded; unchanged registers are suppressed.

> **Source:** IEC 61131-3 Ed. 3 [REF-24]; OPC UA Part 8 – Data Access [REF-28]

### 17.2 Multi-Rate Scan Scheduling

**Concept:** Industrial systems typically poll different data at different rates:

| Scan Group | Interval | Use Case | Example Registers |
|-----------|----------|----------|-------------------|
| Fast | 50–200 ms | Safety-critical, emergency | E-stop status, safety interlocks |
| Normal | 500 ms–2 s | HMI display, process values | Temperature, pressure, flow |
| Slow | 5–60 s | Configuration, diagnostics | Firmware version, serial number |
| On-Demand | Trigger-based | User actions, reports | Recipe upload, data logging |

**Problem with individual nodes:** Placing 50 `modbus-read` nodes with individual
timers creates 50 independent polling loops that compete for the same connection.
This leads to queue contention, unpredictable latency, and excessive bus traffic.

**Solution – Centralized Scan Scheduler:**
A single `modbus-scanner` node manages a configurable scan table and schedules
requests through the existing backpressure queue. Benefits:

1. **Deterministic ordering:** Fast-group requests are always dispatched before
   slow-group requests within the same scheduling tick
2. **Connection sharing:** All scan groups share a single connection pool instance
3. **Bandwidth optimization:** Contiguous address ranges within a scan group are
   merged into a single multi-register read request
4. **Jitter control:** Timer compensation ensures consistent scan intervals even
   under variable response times

**Scheduling Algorithm:**
```
EVERY tick (shortest interval):
  FOR EACH group sorted by priority (fast first):
    IF group.intervalElapsed():
      FOR EACH request in group.mergedRequests():
        queue.enqueue(request)
      group.resetTimer()
```

**Address Merging:** If a scan group contains registers 100–104 and 106–110, the
scheduler may choose to issue a single read of 100–110 (11 registers) and discard
address 105, if the gap is small. A configurable `maxGap` parameter controls this
optimization.

> **Source:** ISA-88/ISA-95 polling strategies [REF-29]

### 17.3 Watchdog and Safe-State Heartbeat

**Concept:** In safety-relevant deployments, a loss of communication between the
Node-RED controller and the PLC must trigger a **fail-safe action**. The watchdog
pattern monitors the connection state and writes a predefined "safe state" value
to the PLC when the connection drops.

**Functional Safety Context:**
- **IEC 61508 (SIL 1/2):** Requires detection of communication failures within a
  defined time window and automatic transition to a safe state
- **ISO 13849 (Performance Level d):** Requires redundant detection channels for
  safety-critical communications
- **IEC 62443:** Requires timeout-based authentication revocation

**Important disclaimer:** Node-RED is NOT a safety-rated runtime. The watchdog
pattern provides an **additional layer of defense** but must not replace a
hardware safety system (safety PLC, safety relay). It is suitable for SIL 1
advisory functions, not for SIL 2+ safety functions.

**Heartbeat Mechanism:**

```
┌─────────────────┐       Heartbeat (every T ms)      ┌──────────┐
│  Node-RED        │ ────── FC 06/16 write 0x0001 ───► │   PLC    │
│  modbus-watchdog │                                    │ Watchdog │
│                  │ ◄───── FC 03 read feedback ──────  │ Register │
└────────┬─────────┘                                    └──────────┘
         │
         │ Connection lost (XState → ERROR)
         │ OR heartbeat ACK missing for 2×T ms
         ▼
┌─────────────────┐
│ Safe-State Write │ ────── FC 06 write 0x0000 ───►   PLC safe register
└─────────────────┘
```

**Configuration Parameters:**

| Parameter | Description | Default |
|-----------|-------------|---------|
| Heartbeat Interval (ms) | Period between heartbeat writes | 1000 |
| Timeout Multiplier | Number of missed heartbeats before safe-state | 2 |
| Safe-State FC | Function code for safe-state write | FC 06 |
| Safe-State Address | Register/coil address for safe-state | – |
| Safe-State Value | Value to write on connection loss | 0x0000 |
| Restore FC | Function code on reconnection (optional) | FC 06 |
| Restore Address | Register/coil address for restore | – |
| Restore Value | Value to write on reconnection | 0x0001 |

**Integration with XState:** The watchdog subscribes to the XState machine's state
changes. When the state transitions to `error` or `disconnected`, the safe-state
write is triggered immediately (within the same event loop tick, using a direct
transport call that bypasses the backpressure queue).

> **Sources:** IEC 61508-3 Ed. 2 [REF-25]; ISO 13849-1 Ed. 3 [REF-26]

### 17.4 Runtime Metrics and Operational Monitoring

**Concept:** Real-time visibility into the Modbus communication health is essential
for operational excellence (OEE) dashboards, predictive maintenance, and SLA
compliance. A `modbus-stats` node collects internal metrics and periodically
emits a metrics payload.

**Key Metrics:**

| Metric | Type | Source | Significance |
|--------|------|--------|-------------|
| `requestsTotal` | Counter | Queue | Total requests dispatched |
| `requestsSuccess` | Counter | Transport | Successful responses received |
| `requestsError` | Counter | Transport | Failed requests (timeout, exception) |
| `avgResponseTimeMs` | Gauge | Transport | Exponential moving average of response time |
| `maxResponseTimeMs` | Gauge | Transport | Maximum response time in the current window |
| `queueDepth` | Gauge | Queue | Current number of queued requests |
| `queueDropped` | Counter | Queue | Requests dropped due to backpressure |
| `reconnectCount` | Counter | State Machine | Number of reconnection cycles |
| `lastExceptionCode` | Status | Transport | Last Modbus exception code received |
| `uptime` | Duration | State Machine | Time since last successful connection |

**Exponential Moving Average (EMA):**

Response time averaging must not buffer all historical values (memory leak risk).
An EMA with a smoothing factor $\alpha$ provides a memory-efficient approximation:

$$\text{EMA}_n = \alpha \cdot x_n + (1 - \alpha) \cdot \text{EMA}_{n-1}$$

With $\alpha = 0.1$ (default), the EMA gives ~90% weight to the historical average
and ~10% to the newest measurement. This smooths out jitter while tracking trends.

**Event Subscription Model:**

The `modbus-stats` node subscribes to internal events emitted by the core modules:

| Event | Source Module | Payload |
|-------|-------------|---------|
| `request:sent` | backpressure-queue | `{ fc, address, timestamp }` |
| `request:success` | transport | `{ fc, address, responseTimeMs }` |
| `request:error` | transport | `{ fc, address, exceptionCode }` |
| `request:dropped` | backpressure-queue | `{ reason: 'overflow' }` |
| `state:changed` | connection-machine | `{ from, to }` |

The stats node aggregates these events and emits the metrics object at a configurable
interval (default: 5 seconds). The metrics are also exposed via `node.status()` for
at-a-glance visibility in the Node-RED editor.

> **Source:** OEE methodology (ISO 22400) [REF-29]; Node-RED custom node patterns [REF-08]

---

## Glossary

| Term | Definition |
|------|-----------|
| **ADU** | Application Data Unit – complete Modbus data packet including header |
| **BCD** | Binary Coded Decimal – encoding where each nibble represents one decimal digit |
| **CRC** | Cyclic Redundancy Check – error checksum for RTU |
| **EMA** | Exponential Moving Average – memory-efficient running average with smoothing factor α |
| **FSM** | Finite State Machine |
| **HMI** | Human Machine Interface |
| **IIoT** | Industrial Internet of Things |
| **MBAP** | Modbus Application Protocol Header – 7-byte TCP framing header |
| **MEI** | Modbus Encapsulated Interface – transport mechanism for FC 43 sub-functions |
| **mTLS** | Mutual TLS – mutual certificate authentication |
| **OEE** | Overall Equipment Effectiveness – productivity metric (Availability × Performance × Quality) |
| **OT** | Operational Technology |
| **PDU** | Protocol Data Unit – payload without transport header (max 253 bytes) |
| **PLC** | Programmable Logic Controller |
| **RBAC** | Role-Based Access Control |
| **RBE** | Report By Exception – report only on value change (dead-band filtering) |
| **SCADA** | Supervisory Control and Data Acquisition |
| **SIL** | Safety Integrity Level – IEC 61508 classification for functional safety |
| **UNS** | Unified Namespace – central data hub in IIoT architectures |
