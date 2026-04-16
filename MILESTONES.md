# Meilensteine – node-red-contrib-modbus-forge

> Jeder Meilenstein ist als eigenständige Agent-Session konzipiert.
> Dieses Dokument dient als fortlaufender Leitfaden: Abgeschlossene Meilensteine werden markiert.
> Verweise: [Arbeitspakete](docs/ARBEITSPAKETE.md) | [Architektur](docs/ARCHITEKTUR.md) | [Agents](agents.md)

---

## Übersicht

| # | Meilenstein | Status | Arbeitspakete | Schwerpunkt |
|---|-----------|--------|---------------|-------------|
| MS-1 | Projektfundament & Transportschicht | [ ] Offen | WP 1.1, WP 1.2 | Bibliotheks-Abstraktion, Config-Nodes UI |
| MS-2 | Zustandsautomat & Connection Management | [ ] Offen | WP 1.3, WP 1.4 | XState FSM, Connection Pool, Semaphore |
| MS-3 | Client/Master – Lese-Nodes | [ ] Offen | WP 2.1, WP 2.4 | FC 01-04, Payload-Parsing, Endianness |
| MS-4 | Client/Master – Schreib-Nodes & Queue | [ ] Offen | WP 2.2, WP 2.3 | FC 05/06/15/16, Backpressure |
| MS-5 | Server/Slave – Proxy-Architektur | [ ] Offen | WP 3.1, WP 3.2, WP 3.3 | TCP/RTU Listener, Modbus-In/Out Nodes |
| MS-6 | Server-Caching & Optimierung | [ ] Offen | WP 3.4 | In-Memory Hashmap, Performance |
| MS-7 | Modbus/TCP Security | [ ] Offen | WP 4.1, WP 4.2, WP 4.3 | TLS 1.3, mTLS, Credential Management |
| MS-8 | Qualitätssicherung & Release | [ ] Offen | WP 5.1, WP 5.2, WP 5.3, WP 5.4 | Testing, Docs, npm-Publish |

---

## MS-1: Projektfundament & Transportschicht

**Ziel:** Stabiles Fundament zur Verwaltung physikalischer und logischer Schnittstellen.

**Arbeitspakete:**
- **WP 1.1** – Evaluierung und Abstraktion von `modbus-serial` als Transport-Layer
- **WP 1.2** – Entwicklung der Config-Nodes (HTML/JS UI für TCP- und RTU-Parameter)

**Liefergegenstände:**
- [ ] `src/lib/transport/tcp-transport.js` – TCP-Socket-Abstraktion über modbus-serial
- [ ] `src/lib/transport/rtu-transport.js` – RTU-Serial-Abstraktion (graceful fallback ohne serialport)
- [ ] `src/lib/transport/transport-factory.js` – Factory-Pattern für Transport-Auswahl
- [ ] `src/nodes/config/modbus-client-config.js` – Config-Node Logik
- [ ] `src/nodes/config/modbus-client-config.html` – Config-Node UI (IP, Port, Baudrate, Parity, etc.)
- [ ] `test/unit/transport/tcp-transport.test.js` – Unit Tests TCP
- [ ] `test/unit/transport/rtu-transport.test.js` – Unit Tests RTU
- [ ] `test/mocks/mock-serial-port.js` – Mock für serialport (dokumentiert in mocks/README.md)
- [ ] `test/mocks/mock-tcp-socket.js` – Mock für net.Socket (dokumentiert in mocks/README.md)

**Theoretische Grundlagen:** Siehe [THEORETISCHE_GRUNDLAGEN.md §2 Transportschichten](docs/THEORETISCHE_GRUNDLAGEN.md#2-transportschichten-modbus-rtu-vs-modbus-tcp)

**Abnahmekriterien:**
- Config-Node lässt sich in Node-RED deployen (ohne Verbindung)
- `npm install --no-optional` funktioniert (TCP-only, kein serialport)
- Alle Unit Tests grün

---

## MS-2: Zustandsautomat & Connection Management

**Ziel:** Eliminierung von Race Conditions durch formalisiertes State-Management.

**Arbeitspakete:**
- **WP 1.3** – XState State Machine (Connect, Error, Reconnect, Backoff)
- **WP 1.4** – Connection Pool (TCP) und Semaphore (RTU)

**Liefergegenstände:**
- [ ] `src/lib/state-machine/connection-machine.js` – XState v5 Zustandsautomat
- [ ] `src/lib/state-machine/guards.js` – XState Guards (isConnected, isQueueFull, etc.)
- [ ] `src/lib/state-machine/actions.js` – XState Actions (connect, disconnect, enqueue, etc.)
- [ ] `src/lib/queue/connection-pool.js` – TCP Connection Pool
- [ ] `src/lib/queue/rtu-semaphore.js` – RTU Semaphore/Mutex für serielle Serialisierung
- [ ] `test/unit/state-machine/connection-machine.test.js` – Deterministisches FSM-Testing
- [ ] `test/unit/queue/connection-pool.test.js`
- [ ] `test/unit/queue/rtu-semaphore.test.js`

**Theoretische Grundlagen:** Siehe [THEORETISCHE_GRUNDLAGEN.md §6 Zustandsautomat](docs/THEORETISCHE_GRUNDLAGEN.md#6-deterministisches-state-management-via-xstate)

**Abnahmekriterien:**
- XState-Maschine durchläuft alle definierten Zustandsübergänge
- Parallele TCP-Anfragen werden über Pool multiplexed
- RTU-Anfragen werden strikt serialisiert (kein gleichzeitiger Bus-Zugriff)
- Status-Visualisierung in Node-RED UI (grün/rot/gelb)
- Alle Unit Tests grün

---

## MS-3: Client/Master – Lese-Nodes

**Ziel:** Vollständige Implementierung der Lese-Function-Codes mit intelligentem Payload-Parsing.

**Arbeitspakete:**
- **WP 2.1** – Getter-Nodes für FC 01, 02, 03, 04
- **WP 2.4** – Payload-Standardisierung, Buffer-Parsing, Endianness-Handling

**Liefergegenstände:**
- [ ] `src/nodes/client/modbus-read.js` – Read-Node (alle 4 FCs über Dropdown)
- [ ] `src/nodes/client/modbus-read.html` – Read-Node UI (FC, Adresse, Länge, Adress-Offset-Toggle)
- [ ] `src/lib/parser/buffer-parser.js` – Big-Endian / Little-Endian / Word-Swap Konvertierung
- [ ] `src/lib/parser/payload-builder.js` – msg.payload Standardisierung mit Metadaten
- [ ] `test/unit/parser/buffer-parser.test.js` – Endianness-Tests mit bekannten Float32-Werten
- [ ] `test/unit/parser/payload-builder.test.js`
- [ ] `test/fixtures/register-maps/` – Beispiel-Register-Maps verschiedener Geräte
- [ ] `test/integration/modbus-read.test.js` – Integration mit node-red-node-test-helper

**Theoretische Grundlagen:** Siehe [THEORETISCHE_GRUNDLAGEN.md §3 Datenmodell](docs/THEORETISCHE_GRUNDLAGEN.md#3-das-modbus-datenmodell) und [§4 Endianness](docs/THEORETISCHE_GRUNDLAGEN.md#4-endianness-in-javascript)

**Abnahmekriterien:**
- FC 01-04 liefern korrekte Werte aus Mock-Server
- Zero-based/One-based Adress-Offset konfigurierbar
- Float32 (IEEE 754) korrekt aus 2 Registern rekonstruiert
- msg.payload enthält Metadaten (FC, Adresse, Timestamp, Unit-ID)

---

## MS-4: Client/Master – Schreib-Nodes & Queue

**Ziel:** Sichere Schreiboperationen mit Schutz vor Queue-Overflow.

**Arbeitspakete:**
- **WP 2.2** – Setter-Nodes für FC 05, 06, 15, 16
- **WP 2.3** – Backpressure-Logik mit Max-Queue-Size und FIFO/LIFO-Drop

**Liefergegenstände:**
- [ ] `src/nodes/client/modbus-write.js` – Write-Node (Single + Multiple)
- [ ] `src/nodes/client/modbus-write.html` – Write-Node UI
- [ ] `src/lib/queue/backpressure-queue.js` – Queue mit konfigurierbarem Limit
- [ ] `test/unit/queue/backpressure-queue.test.js` – Tests für FIFO/LIFO-Drop, Overflow
- [ ] `test/integration/modbus-write.test.js`

**Theoretische Grundlagen:** Siehe [THEORETISCHE_GRUNDLAGEN.md §7 Backpressure](docs/THEORETISCHE_GRUNDLAGEN.md#7-backpressure-management)

**Abnahmekriterien:**
- FC 05/06 schreiben Single Values korrekt
- FC 15/16 schreiben Arrays korrekt
- Boolean-Arrays werden in Multi-Coil-Requests konvertiert
- Queue wirft älteste/neueste Nachricht bei Overflow (konfigurationsabhängig)
- Speicherverbrauch bleibt konstant bei Flooding

---

## MS-5: Server/Slave – Proxy-Architektur

**Ziel:** Reaktive, dynamische Slave-Architektur ohne monolithische Speichermatrix.

**Arbeitspakete:**
- **WP 3.1** – TCP/RTU-Listener-Architektur
- **WP 3.2** – Modbus-In Node
- **WP 3.3** – Modbus-Out Node

**Liefergegenstände:**
- [ ] `src/nodes/config/modbus-server-config.js` – Server Config-Node (TCP Listener)
- [ ] `src/nodes/config/modbus-server-config.html` – Server Config UI
- [ ] `src/nodes/server/modbus-in.js` – Event-Empfänger (Request → Flow)
- [ ] `src/nodes/server/modbus-in.html`
- [ ] `src/nodes/server/modbus-out.js` – Response-Sender (Flow → TCP Response)
- [ ] `src/nodes/server/modbus-out.html`
- [ ] `test/integration/modbus-server-proxy.test.js` – End-to-End Proxy-Test

**Theoretische Grundlagen:** Siehe [THEORETISCHE_GRUNDLAGEN.md §8 Dynamisches Server-Proxying](docs/THEORETISCHE_GRUNDLAGEN.md#8-dynamisches-address-space-mapping)

**Abnahmekriterien:**
- Externer Modbus-Client kann Register von Node-RED-Server lesen
- Anfragen werden als JSON in den Flow injiziert
- Antworten können asynchron aus dem Flow zurückgesendet werden
- Nicht-lineare Adressräume funktionieren ohne Speicherverschwendung

---

## MS-6: Server-Caching & Optimierung

**Ziel:** Performance-Optimierung für latenzkritische Szenarien.

**Arbeitspakete:**
- **WP 3.4** – In-Memory Hashmap für Auto-Replying

**Liefergegenstände:**
- [ ] `src/lib/cache/register-cache.js` – Hashmap-basierter Register-Cache
- [ ] `test/unit/cache/register-cache.test.js`
- [ ] Performance-Benchmarks dokumentiert

**Abnahmekriterien:**
- Cache beantwortet wiederkehrende Anfragen ohne Flow-Durchlauf
- Cache-TTL konfigurierbar
- Cache-Invalidierung bei Write-Operationen

---

## MS-7: Modbus/TCP Security

**Ziel:** Zertifikatsbasierte Verschlüsselung und OT-Sicherheitsnormen.

**Arbeitspakete:**
- **WP 4.1** – TLS 1.3 Integration über node:tls, Port 802
- **WP 4.2** – Credential-UI für Zertifikate (CA, Client, Key)
- **WP 4.3** – Build-Prozess für Credential-Trennung

**Liefergegenstände:**
- [ ] `src/lib/security/tls-wrapper.js` – TLS-Socket-Erstellung
- [ ] `src/lib/security/certificate-validator.js` – X.509v3 Validierung, RBAC-Extraktion
- [ ] Erweiterung der Config-Node HTML für TLS-Felder (Credential-Typ)
- [ ] `test/unit/security/tls-wrapper.test.js`
- [ ] `test/unit/security/certificate-validator.test.js`
- [ ] `test/fixtures/certs/` – Test-Zertifikate (selbstsigniert, dokumentiert)

**Theoretische Grundlagen:** Siehe [THEORETISCHE_GRUNDLAGEN.md §5 Modbus/TCP Security](docs/THEORETISCHE_GRUNDLAGEN.md#5-modbustcp-security-protocol)

**Abnahmekriterien:**
- TLS-Verbindung über Port 802 funktioniert
- mTLS-Handshake mit Client- und Server-Zertifikat erfolgreich
- Private Keys werden im Node-RED Credential Store gespeichert
- Ungültige Zertifikate werden rejected
- RBAC-Rollen aus X.509v3-Extensions extrahierbar

---

## MS-8: Qualitätssicherung & Release

**Ziel:** Enterprise-Ready Veröffentlichung.

**Arbeitspakete:**
- **WP 5.1** – Automatisiertes Test-Framework finalisieren
- **WP 5.2** – UI-Tests, Partial-Deploy-Leak-Tests
- **WP 5.3** – Dokumentation, Beispiel-Flows, Help-Sidebar
- **WP 5.4** – Lizenz-Compliance, npm-Registry, Node-RED Flow Library

**Liefergegenstände:**
- [ ] Vollständige Test-Suite mit >80% Coverage
- [ ] Leak-Tests bei Partial-Deploy verifiziert
- [ ] Node-RED Help-Sidebar Texte für alle Knoten
- [ ] `examples/flows/` mit Beispielen (Watchdog, RBE-Filter, Bitwise Stuffing)
- [ ] npm-Publish-Konfiguration
- [ ] CHANGELOG.md finalisiert
- [ ] README.md finalisiert

**Abnahmekriterien:**
- `npm test` grün, Coverage > 80%
- `npm pack` erzeugt valides Paket
- Alle Node-RED Help-Sidebars vorhanden
- Lizenz-Compliance verifiziert (BSD-3-Clause, ISC, MIT kompatibel)
- Keine Credential-Leaks in flow.json

---

## Fortschrittsprotokoll

| Datum | Meilenstein | Status | Notizen |
|-------|-----------|--------|---------|
| _TBD_ | MS-1 | Offen | — |
| _TBD_ | MS-2 | Offen | — |
| _TBD_ | MS-3 | Offen | — |
| _TBD_ | MS-4 | Offen | — |
| _TBD_ | MS-5 | Offen | — |
| _TBD_ | MS-6 | Offen | — |
| _TBD_ | MS-7 | Offen | — |
| _TBD_ | MS-8 | Offen | — |
