# Arbeitspakete (Work Breakdown Structure)

> Detaillierte Beschreibung aller Arbeitspakete für node-red-contrib-modbus-forge.
> Gruppierung in Meilensteine: siehe [MILESTONES.md](../MILESTONES.md)
> Theoretische Grundlagen: siehe [THEORETISCHE_GRUNDLAGEN.md](THEORETISCHE_GRUNDLAGEN.md)
> Agent-Leitfaden: siehe [agents.md](../agents.md)

---

## WP 1: Core Framework, Transportschicht und Connection Pooling

### WP 1.1: Transport-Layer-Abstraktion

**Meilenstein:** MS-1  
**Abhängigkeiten:** Keine (Startpaket)  
**Theoretische Grundlage:** [§2 Transportschichten](THEORETISCHE_GRUNDLAGEN.md#2-transportschichten-modbus-rtu-vs-modbus-tcp)

**Beschreibung:**
Evaluierung und Abstraktion der `modbus-serial`-Bibliothek (ISC-Lizenz) als primärer Transport-Layer. Die Kapselung der `serialport`-Abhängigkeit muss so gestaltet werden, dass der Node auf Systemen ohne RS-485-Hardware (z.B. Cloud-Container) fehlerfrei installierbar ist und rein über TCP genutzt werden kann.

**Aufgaben:**
1. Factory-Pattern für Transport-Auswahl (TCP vs. RTU)
2. TCP-Transport: Socket-Erstellung via `modbus-serial.connectTCP()`
3. RTU-Transport: Serial-Erstellung via `modbus-serial.connectRTUBuffered()` mit Fallback
4. Graceful Degradation: Wenn `serialport` nicht installiert ist, RTU-Funktionen deaktivieren statt crashen
5. Einheitliches Interface für beide Transportarten (connect, disconnect, isOpen, getID, setID)

**Output-Dateien:**
- `src/lib/transport/tcp-transport.js`
- `src/lib/transport/rtu-transport.js`
- `src/lib/transport/transport-factory.js`
- `test/unit/transport/tcp-transport.test.js`
- `test/unit/transport/rtu-transport.test.js`

---

### WP 1.2: Konfigurations-Knoten (Config Nodes)

**Meilenstein:** MS-1  
**Abhängigkeiten:** WP 1.1  
**Theoretische Grundlage:** [§2 Transportschichten](THEORETISCHE_GRUNDLAGEN.md#2-transportschichten-modbus-rtu-vs-modbus-tcp)

**Beschreibung:**
Entwicklung der zentralen Node-RED Configuration Nodes als Singleton-Instanzen für die Verwaltung der physikalischen Verbindungsparameter. Die HTML/JS-UI muss folgende Parameter abdecken:

**TCP-Parameter:**
- Host/IP-Adresse
- Port (Standard: 502, bei TLS: 802)
- Timeout (ms)
- Unit ID / Slave ID

**RTU-Parameter:**
- Serieller Port (z.B. COM3, /dev/ttyUSB0)
- Baudrate (9600, 19200, 38400, 57600, 115200)
- Parity (None, Even, Odd)
- Data Bits (7, 8)
- Stop Bits (1, 2)
- Unit ID / Slave ID

**Output-Dateien:**
- `src/nodes/config/modbus-client-config.js`
- `src/nodes/config/modbus-client-config.html`

---

### WP 1.3: XState Zustandsautomat

**Meilenstein:** MS-2  
**Abhängigkeiten:** WP 1.1, WP 1.2  
**Theoretische Grundlage:** [§6 Deterministisches State-Management](THEORETISCHE_GRUNDLAGEN.md#6-deterministisches-state-management-via-xstate)

**Beschreibung:**
Implementierung einer formalisierten State Machine unter Nutzung von XState v5, die den gesamten Verbindungslebenszyklus deterministisch modelliert. Ersetzt die handcodierte, fehleranfällige FSM des Legacy-Pakets.

**Zustände:**
```
DISCONNECTED → CONNECTING → CONNECTED → READING/WRITING → CONNECTED
                    ↓                         ↓
               ERROR → BACKOFF → RECONNECTING → CONNECTING
                                      ↓
                              DISCONNECTED (max retries)
```

**XState-Elemente:**
- **States:** DISCONNECTED, CONNECTING, CONNECTED, READING, WRITING, ERROR, BACKOFF, RECONNECTING
- **Events:** CONNECT, DISCONNECT, READ_REQUEST, WRITE_REQUEST, SUCCESS, FAILURE, TIMEOUT, RETRY
- **Guards:** isConnected, isQueueFull, hasRetriesLeft, isValidRequest
- **Actions:** openSocket, closeSocket, enqueueRequest, dequeueRequest, updateStatus, incrementRetry

**Integration mit Node-RED:**
- `this.status()` API-Aufrufe als XState-Actions
- Grün: CONNECTED, Rot: DISCONNECTED/ERROR, Gelb: BACKOFF/RECONNECTING

**Output-Dateien:**
- `src/lib/state-machine/connection-machine.js`
- `src/lib/state-machine/guards.js`
- `src/lib/state-machine/actions.js`
- `test/unit/state-machine/connection-machine.test.js`

---

### WP 1.4: Connection Pool (TCP) und Semaphore (RTU)

**Meilenstein:** MS-2  
**Abhängigkeiten:** WP 1.3  
**Theoretische Grundlage:** [§6.1 Connection Pooling](THEORETISCHE_GRUNDLAGEN.md#6-deterministisches-state-management-via-xstate)

**Beschreibung:**
- **TCP:** Connection Pool analog zu Datenbank-Treibern. Anfragen werden über Multiplexing auf parallele Sockets verteilt. Pool-Size konfigurierbar, um SYN-Flood-Schutz der Ziel-SPS zu gewährleisten.
- **RTU:** Da RS-485 Half-Duplex ist, fungiert der Config-Node als asynchroner Arbitrator (Semaphore). Alle Read/Write-Requests werden als Promises in eine serielle Queue überführt. Erst nach Empfang der Antwort (oder Timeout) wird der nächste Request gesendet.

**Output-Dateien:**
- `src/lib/queue/connection-pool.js`
- `src/lib/queue/rtu-semaphore.js`
- `test/unit/queue/connection-pool.test.js`
- `test/unit/queue/rtu-semaphore.test.js`

---

## WP 2: Modbus Client / Master Nodes

### WP 2.1: Getter-Nodes (Lese-Function-Codes)

**Meilenstein:** MS-3  
**Abhängigkeiten:** WP 1.1–1.4  
**Theoretische Grundlage:** [§3 Datenmodell und Function Codes](THEORETISCHE_GRUNDLAGEN.md#3-das-modbus-datenmodell)

**Beschreibung:**
Implementierung der Read-Nodes für FC 01 (Read Coils), FC 02 (Read Discrete Inputs), FC 03 (Read Holding Registers) und FC 04 (Read Input Registers).

**UI-Elemente:**
- Dropdown: Function Code Auswahl
- Input: Startadresse
- Input: Anzahl der Register/Coils
- Toggle: Zero-based vs. One-based Adressierung (mit Tooltip-Erklärung)
- Dropdown: Polling-Modus (Trigger-basiert oder Intervall)

**Adress-Offset-Logik:**
Wenn One-based aktiviert: UI zeigt 40001, interner Offset = 0 (40001 - 40001). Register 40108 → Offset 107.

**Output-Dateien:**
- `src/nodes/client/modbus-read.js`
- `src/nodes/client/modbus-read.html`
- `test/integration/modbus-read.test.js`

---

### WP 2.2: Setter-Nodes (Schreib-Function-Codes)

**Meilenstein:** MS-4  
**Abhängigkeiten:** WP 2.1  
**Theoretische Grundlage:** [§3 Datenmodell und Function Codes](THEORETISCHE_GRUNDLAGEN.md#3-das-modbus-datenmodell)

**Beschreibung:**
Implementierung der Write-Nodes für FC 05 (Write Single Coil), FC 06 (Write Single Register), FC 15 (Write Multiple Coils) und FC 16 (Write Multiple Registers).

**Besonderheiten:**
- FC 05: msg.payload als Boolean oder 0xFF00/0x0000
- FC 06: msg.payload als Integer (0–65535)
- FC 15: msg.payload als Boolean-Array → Konvertierung in Bit-Packed-Buffer
- FC 16: msg.payload als Integer-Array → Validierung auf 16-Bit-Bereich

**Output-Dateien:**
- `src/nodes/client/modbus-write.js`
- `src/nodes/client/modbus-write.html`
- `test/integration/modbus-write.test.js`

---

### WP 2.3: Backpressure-Management

**Meilenstein:** MS-4  
**Abhängigkeiten:** WP 1.4  
**Theoretische Grundlage:** [§7 Backpressure-Management](THEORETISCHE_GRUNDLAGEN.md#7-backpressure-management)

**Beschreibung:**
Implementierung der konfigurierbaren Warteschlange mit hartem Limit zum Schutz des Node.js Event-Loops.

**Konfigurationsparameter:**
- **Max Queue Size:** Hartes Limit (Standard: 100)
- **Drop Strategy:**
  - FIFO (First-In-First-Out): Älteste Nachricht wird verworfen → ideal für kontinuierliches Sensor-Monitoring
  - LIFO (Last-In-First-Out): Neueste Nachricht wird verworfen → ideal für Alarm-Events
- **Queue Full Status:** `this.status({ fill: "yellow", shape: "ring", text: "Queue full" })`

**Output-Dateien:**
- `src/lib/queue/backpressure-queue.js`
- `test/unit/queue/backpressure-queue.test.js`

---

### WP 2.4: Payload-Standardisierung und Buffer-Parsing

**Meilenstein:** MS-3  
**Abhängigkeiten:** WP 2.1  
**Theoretische Grundlage:** [§4 Endianness in JavaScript](THEORETISCHE_GRUNDLAGEN.md#4-endianness-in-javascript)

**Beschreibung:**
Standardisierung des Node-RED Payloads mit Metadaten und Implementierung von Buffer-Parsing für die Endianness-Problematik bei 32-Bit-Floats.

**msg.payload Struktur:**
```json
{
  "data": [1234, 5678],
  "buffer": "<Buffer 04 d2 16 2e>",
  "fc": 3,
  "address": 107,
  "quantity": 2,
  "unitId": 1,
  "timestamp": "2026-04-16T10:00:00.000Z",
  "connection": "tcp://192.168.1.100:502"
}
```

**Buffer-Parsing-Optionen:**
- Big-Endian (Standard Modbus)
- Little-Endian
- Big-Endian Byte Swap
- Little-Endian Byte Swap
- Float32 IEEE 754 (aus 2 konsekutiven Registern)
- UInt32 / Int32 (aus 2 konsekutiven Registern)

**Output-Dateien:**
- `src/lib/parser/buffer-parser.js`
- `src/lib/parser/payload-builder.js`
- `test/unit/parser/buffer-parser.test.js`
- `test/unit/parser/payload-builder.test.js`
- `test/fixtures/register-maps/` (Beispieldaten)

---

## WP 3: Modbus Server / Slave Proxy-Nodes

### WP 3.1: TCP/RTU-Listener-Architektur

**Meilenstein:** MS-5  
**Abhängigkeiten:** WP 1.1–1.4  
**Theoretische Grundlage:** [§8 Dynamisches Address Space Mapping](THEORETISCHE_GRUNDLAGEN.md#8-dynamisches-address-space-mapping)

**Beschreibung:**
Implementierung der TCP/RTU-Listener-Architektur, inspiriert durch das Event-basierte Design von `jsmodbus` (MIT-Lizenz). Der Server-Config-Node agiert als reiner TCP-Listener, der eingehende Modbus-Requests als Events emittiert.

**Architektur:**
```
Externer Client → TCP:502 → Server-Config-Node → Event emittieren
                                                      ↓
                                               Modbus-In Node (Flow)
                                                      ↓
                                               Flow-Verarbeitung
                                                      ↓
                                               Modbus-Out Node
                                                      ↓
                                         TCP Response → Client
```

**Output-Dateien:**
- `src/nodes/config/modbus-server-config.js`
- `src/nodes/config/modbus-server-config.html`

---

### WP 3.2: Modbus-In Node

**Meilenstein:** MS-5  
**Abhängigkeiten:** WP 3.1

**Beschreibung:**
Entwicklung des Modbus-In Nodes, der Events des Server-Config-Nodes abonniert und als strukturierte JSON-Nachrichten in den Node-RED-Flow weiterleitet.

**msg.payload bei eingehendem Request:**
```json
{
  "type": "readHoldingRegisters",
  "fc": 3,
  "address": 107,
  "quantity": 2,
  "unitId": 1,
  "requestId": "uuid-v4",
  "remoteAddress": "192.168.1.50"
}
```

**Output-Dateien:**
- `src/nodes/server/modbus-in.js`
- `src/nodes/server/modbus-in.html`

---

### WP 3.3: Modbus-Out Node

**Meilenstein:** MS-5  
**Abhängigkeiten:** WP 3.2

**Beschreibung:**
Entwicklung des Modbus-Out Nodes, der die vom Flow asynchron errechneten Werte einsammelt, den korrekten Modbus-Response-Frame generiert und an den wartenden Client sendet.

**msg.payload für Antwort:**
```json
{
  "requestId": "uuid-v4",
  "data": [1234, 5678]
}
```

**Output-Dateien:**
- `src/nodes/server/modbus-out.js`
- `src/nodes/server/modbus-out.html`
- `test/integration/modbus-server-proxy.test.js`

---

### WP 3.4: In-Memory Caching (Optional)

**Meilenstein:** MS-6  
**Abhängigkeiten:** WP 3.1–3.3

**Beschreibung:**
Optionale, speichereffiziente Caching-Engine im Server-Config-Node. Implementierung als Hashmap (Map<number, { value, ttl, timestamp }>), die fragmentierte, nicht-lineare Adressräume ohne Verschwendung abbildet.

**Konfiguration:**
- Cache aktivieren/deaktivieren
- TTL (Time-to-Live) pro Eintrag
- Max Cache Size
- Automatische Invalidierung bei Write-Operationen

**Output-Dateien:**
- `src/lib/cache/register-cache.js`
- `test/unit/cache/register-cache.test.js`

---

## WP 4: Modbus/TCP Security und Credential Management

### WP 4.1: TLS-Integration

**Meilenstein:** MS-7  
**Abhängigkeiten:** WP 1.1–1.4  
**Theoretische Grundlage:** [§5 Modbus/TCP Security](THEORETISCHE_GRUNDLAGEN.md#5-modbustcp-security-protocol)

**Beschreibung:**
Integration von `node:tls` in die Socket-Generierung des Config-Nodes. Bei aktivierter TLS-Option wird der TCP-Socket durch einen TLS-Socket ersetzt, der TLS 1.3 über Port 802 erzwingt.

**Implementierung:**
```javascript
const tls = require('node:tls');
const options = {
  host: config.host,
  port: config.tlsPort || 802,
  ca: fs.readFileSync(credentials.caPath),
  cert: fs.readFileSync(credentials.certPath),
  key: fs.readFileSync(credentials.keyPath),
  minVersion: 'TLSv1.2',
  rejectUnauthorized: true
};
const socket = tls.connect(options);
```

**Output-Dateien:**
- `src/lib/security/tls-wrapper.js`
- `test/unit/security/tls-wrapper.test.js`

---

### WP 4.2: Credential-UI

**Meilenstein:** MS-7  
**Abhängigkeiten:** WP 4.1

**Beschreibung:**
Erweiterung der Config-Node HTML-UI um Eingabefelder für Zertifikate. Nutzung der Node-RED Credential API (`credentials`-Feld in der Node-Definition).

**Felder:**
- CA-Zertifikat (Dateipfad, Typ: password)
- Client-Zertifikat (Dateipfad, Typ: password)
- Private Key (Dateipfad, Typ: password)
- Private Key Passphrase (optional, Typ: password)
- TLS aktivieren (Checkbox)
- Port automatisch auf 802 setzen (bei TLS-Aktivierung)

---

### WP 4.3: Credential-Trennung im Build-Prozess

**Meilenstein:** MS-7  
**Abhängigkeiten:** WP 4.2

**Beschreibung:**
Sicherstellung, dass Zertifikatsdaten niemals in `flow.json` landen. Nutzung des Node-RED Credential-Mechanismus:
- `credentials` im Node-Register definieren
- Daten werden in separater `*_cred.json` gespeichert
- `*_cred.json` ist in `.gitignore` eingetragen
- Validierung beim Deploy: Warnung wenn Credential-Felder leer

**Output-Dateien:**
- `src/lib/security/certificate-validator.js`
- `test/unit/security/certificate-validator.test.js`
- `test/fixtures/certs/` (selbstsignierte Test-Zertifikate)

---

## WP 5: Qualitätssicherung, Dokumentation und Deployment

### WP 5.1: Test-Framework

**Meilenstein:** MS-8  
**Abhängigkeiten:** WP 1–4

**Beschreibung:**
Finalisierung des automatisierten Test-Frameworks. Schwerpunkte:
- Deterministisches XState-Verhalten (alle Zustandsübergänge)
- Korrektheit des Endianness-Parsings (Float32, UInt32, Int16)
- CRC-Berechnung bei RTU
- Queue-Overflow-Verhalten
- TLS-Handshake-Szenarien

---

### WP 5.2: UI-Tests und Leak-Validierung

**Meilenstein:** MS-8  
**Abhängigkeiten:** WP 5.1

**Beschreibung:**
Node-RED UI-Tests mit `node-red-node-test-helper` und Simulation von Verbindungsabbrüchen. Validierung, dass bei Partial-Deployments keine Socket-Listener-Leaks entstehen (vgl. Legacy Issue #187).

**Testszenarien:**
1. Partial Deploy: Knoten entfernen → prüfen ob Listener deregistriert
2. Full Deploy: Alle Sockets korrekt geschlossen
3. Rapid Re-Deploy: 10x hintereinander deployen → kein Memory-Leak
4. Connection Drop: TCP-Server trennen → Reconnect-Verhalten prüfen

---

### WP 5.3: Dokumentation und Beispiel-Flows

**Meilenstein:** MS-8  
**Abhängigkeiten:** WP 5.2

**Beschreibung:**
- Node-RED Help-Sidebar Texte für alle Knoten
- Beispiel-Flows in `examples/flows/`:
  - Watchdog-Implementierung
  - Bitwise Stuffing (16 Coils → 1 Register)
  - RBE-Filterung (Report By Exception)
  - Float32-Parsing
  - Server-Proxy mit dynamischen Adressen

---

### WP 5.4: Lizenz-Compliance und Veröffentlichung

**Meilenstein:** MS-8  
**Abhängigkeiten:** WP 5.3

**Beschreibung:**
- Prüfung der Lizenz-Compliance (BSD-3-Clause, ISC, MIT)
- Veröffentlichung auf npm-Registry
- Registrierung in der Node-RED Flow Library
- CHANGELOG.md finalisieren
- GitHub Release erstellen

**Referenz:** [RECHTSANALYSE.md](RECHTSANALYSE.md)
