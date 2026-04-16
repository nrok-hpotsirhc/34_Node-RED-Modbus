# Architektur-Dokumentation

> Zielarchitektur für node-red-contrib-modbus-forge.
> Verweise: [Theoretische Grundlagen](THEORETISCHE_GRUNDLAGEN.md) | [Arbeitspakete](ARBEITSPAKETE.md) | [Agents](../agents.md)

---

## Architekturübersicht

Das Projekt basiert auf drei fundamentalen Design-Prinzipien, die die Antipatterns bestehender Implementierungen eliminieren:

1. **Zentralisiertes Connection Pooling** – Singleton Config-Nodes verwalten Verbindungen
2. **Deterministisches State-Management** – XState v5 für alle Zustandsübergänge
3. **Dynamisches Server-Proxying** – Event-basierte Slave-Architektur

## Komponentendiagramm

```
┌─────────────────────────────────────────────────────────────────┐
│                        Node-RED Runtime                         │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    src/nodes/                             │   │
│  │                                                          │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌────────────────┐   │   │
│  │  │ modbus-read │  │ modbus-write│  │ modbus-in/out  │   │   │
│  │  │ (Client)    │  │ (Client)    │  │ (Server Proxy) │   │   │
│  │  └──────┬──────┘  └──────┬──────┘  └───────┬────────┘   │   │
│  │         │                │                  │            │   │
│  │  ┌──────┴────────────────┴──────────────────┴────────┐   │   │
│  │  │            Config Nodes (Singleton)                │   │   │
│  │  │  ┌──────────────────┐  ┌────────────────────┐     │   │   │
│  │  │  │ Client Config    │  │ Server Config      │     │   │   │
│  │  │  │ (TCP/RTU/TLS)    │  │ (TCP Listener)     │     │   │   │
│  │  │  └────────┬─────────┘  └─────────┬──────────┘     │   │   │
│  │  └───────────┼──────────────────────┼────────────────┘   │   │
│  └──────────────┼──────────────────────┼────────────────────┘   │
│                 │                      │                         │
│  ┌──────────────┼──────────────────────┼────────────────────┐   │
│  │              │     src/lib/         │                     │   │
│  │              ▼                      ▼                     │   │
│  │  ┌────────────────┐    ┌────────────────────┐            │   │
│  │  │ State Machine  │    │  Register Cache    │            │   │
│  │  │ (XState v5)    │    │  (Hashmap)         │            │   │
│  │  └───────┬────────┘    └────────────────────┘            │   │
│  │          │                                               │   │
│  │  ┌───────┴────────┐    ┌────────────────────┐            │   │
│  │  │ Queue/Pool     │    │  Security          │            │   │
│  │  │ - TCP Pool     │    │  - TLS Wrapper     │            │   │
│  │  │ - RTU Semaphore│    │  - Cert Validator  │            │   │
│  │  │ - Backpressure │    │  - RBAC            │            │   │
│  │  └───────┬────────┘    └─────────┬──────────┘            │   │
│  │          │                       │                       │   │
│  │  ┌───────┴───────────────────────┴──────────┐            │   │
│  │  │          Transport Layer                  │            │   │
│  │  │  ┌──────────┐  ┌──────────┐  ┌────────┐  │            │   │
│  │  │  │ TCP      │  │ RTU      │  │ TLS    │  │            │   │
│  │  │  │ Transport│  │ Transport│  │ Socket │  │            │   │
│  │  │  └────┬─────┘  └────┬─────┘  └───┬────┘  │            │   │
│  │  └───────┼──────────────┼────────────┼───────┘            │   │
│  └──────────┼──────────────┼────────────┼────────────────────┘   │
└─────────────┼──────────────┼────────────┼────────────────────────┘
              │              │            │
              ▼              ▼            ▼
       ┌──────────┐  ┌──────────┐  ┌──────────┐
       │ modbus-  │  │ serial-  │  │ node:tls │
       │ serial   │  │ port     │  │ (Node.js)│
       │ (ISC)    │  │ (MIT)    │  │          │
       └──────────┘  └──────────┘  └──────────┘
              │              │            │
              ▼              ▼            ▼
       ┌──────────────────────────────────────┐
       │     Physische Modbus-Geräte          │
       │  (SPS, Sensoren, Aktoren, Gateways)  │
       └──────────────────────────────────────┘
```

## Datenfluss: Client Read-Operation

```
1. Inject/Trigger → modbus-read Node
2. modbus-read → Config Node: "READ_REQUEST" Event
3. Config Node → XState: Transition CONNECTED → READING
4. XState Guard: isConnected? Queue nicht voll?
5. Queue: Request einreihen (Backpressure prüfen)
6. Transport: modbus-serial.readHoldingRegisters(addr, len)
7. Response: Buffer empfangen
8. Parser: Endianness-Konvertierung (Big-Endian → konfiguriert)
9. Payload Builder: msg.payload mit Metadaten anreichern
10. XState: Transition READING → CONNECTED (SUCCESS)
11. modbus-read → Output: msg mit Daten
```

## Datenfluss: Server Proxy-Operation

```
1. Externer Client → TCP:502 → Server Config Node
2. Server Config → Event: { fc, address, quantity, requestId }
3. Modbus-In Node: Event filtern und als msg in Flow injizieren
4. Flow: Daten beschaffen (DB, API, Context, ...)
5. Modbus-Out Node: msg.payload = { requestId, data: [...] }
6. Server Config → TCP Response an externen Client
```

## Sicherheitsarchitektur

```
┌─────────────────────────────────────────┐
│           Node-RED Credential Store      │
│  ┌───────────────────────────────────┐  │
│  │ flows_cred.json (verschlüsselt)  │  │
│  │  - CA-Zertifikat Pfad            │  │
│  │  - Client-Zertifikat Pfad        │  │
│  │  - Private Key Pfad              │  │
│  │  - Key Passphrase                │  │
│  └───────────────────────────────────┘  │
│           NIEMALS in flow.json           │
│           NIEMALS in Git                 │
└──────────────────┬──────────────────────┘
                   │
                   ▼
         ┌─────────────────┐
         │  TLS Wrapper     │
         │  - node:tls      │
         │  - Port 802      │
         │  - TLS 1.2/1.3   │
         │  - mTLS           │
         └────────┬──────────┘
                  │
                  ▼
         ┌─────────────────┐
         │ Cert Validator   │
         │ - X.509v3 Check  │
         │ - RBAC Extrakt.  │
         │ - Expiry Check   │
         └─────────────────┘
```

## Lifecycle Management

### Node-RED Deploy-Zyklus

```javascript
// Konzeptuelles Pattern (Eigenentwicklung)
module.exports = function(RED) {
  function ModbusClientConfig(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    // XState Actor starten
    node.actor = createActor(connectionMachine, { ... });
    node.actor.start();

    // Cleanup bei Deploy/Undeploy
    node.on('close', function(done) {
      // 1. XState Actor stoppen
      node.actor.stop();
      // 2. Alle Socket-Listener deregistrieren
      node.transport.removeAllListeners();
      // 3. Connection Pool schließen
      node.pool.drain().then(() => {
        done();
      });
    });
  }
};
```

> **Hinweis:** Obiges Code-Pattern ist eigenständig entwickelt und basiert auf der offiziellen Node-RED Dokumentation zur Node-Erstellung [REF-11]. Es werden keine Codezeilen aus bestehenden Paketen übernommen.

## Anforderungsmatrix

### Funktionale Anforderungen

| ID | Komponente | Beschreibung | WP | MS |
|----|-----------|-------------|----|----|
| FR-01 | Config Node | TCP- und RTU-Parameterverwaltung | WP 1.2 | MS-1 |
| FR-02 | Config Node | Connection Pool (TCP) und Semaphore (RTU) | WP 1.4 | MS-2 |
| FR-03 | Config Node | TLS 1.3, X.509v3, mTLS | WP 4.1 | MS-7 |
| FR-04 | Client | FC 01, 02, 03, 04, 05, 06, 15, 16 | WP 2.1/2.2 | MS-3/4 |
| FR-05 | Client | Backpressure: Max Queue Size, Drop-Strategy | WP 2.3 | MS-4 |
| FR-06 | Client | Buffer-Parsing: Endianness-Konfiguration | WP 2.4 | MS-3 |
| FR-07 | Server | Dynamisches Adress-Proxying via In/Out Nodes | WP 3.1-3.3 | MS-5 |
| FR-08 | Server | Optionaler In-Memory Cache | WP 3.4 | MS-6 |
| FR-09 | UI/UX | FSM-Status via this.status() | WP 1.3 | MS-2 |

### Nicht-Funktionale Anforderungen

| ID | Kategorie | Beschreibung |
|----|----------|-------------|
| NFR-01 | Performance | Alle I/O asynchron (async/await), keine setTimeout-Kaskaden |
| NFR-02 | Security | Credentials nur im Node-RED Credential Store |
| NFR-03 | Reliability | XState eliminiert Race Conditions |
| NFR-04 | Kompatibilität | Node-RED v3/v4, Node.js 18/20/22 LTS |
| NFR-05 | Lizenzierung | BSD-3-Clause |
