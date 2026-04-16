# Agent-Leitfaden – node-red-contrib-modbus-forge

> Dieses Dokument dient als primärer Leitfaden für KI-Agenten (z.B. GitHub Copilot, Cursor),
> die an diesem Projekt arbeiten. Es definiert Kontext, Regeln, Verweise und Session-Planung.

---

## 1. Projektüberblick

**Name:** `node-red-contrib-modbus-forge`  
**Lizenz:** BSD-3-Clause  
**Ziel:** Entwicklung eines industrietauglichen Modbus TCP/RTU-Integrationspaketes für Node-RED, das die architektonischen Schwächen des dominierenden Legacy-Pakets `node-red-contrib-modbus` (BiancoRoyal) durch moderne Software-Engineering-Prinzipien eliminiert.

### Kernprinzipien
1. **Deterministisches State-Management** via XState (kein handcodierter FSM)
2. **Zentralisiertes Connection Pooling** (TCP) und **Semaphore-Arbitration** (RTU)
3. **Backpressure-Management** mit konfigurierbarem Queue-Limit und Drop-Strategie
4. **Dynamisches Server-Proxying** – event-basierte Slave-Architektur ohne monolithische Arrays
5. **Modbus/TCP Security** – TLS 1.3, mTLS, X.509v3, Port 802

### Technologie-Stack
- **Runtime:** Node.js >= 18 LTS
- **Plattform:** Node-RED >= 3.0.0
- **State-Machine:** XState v5
- **Transport:** modbus-serial (ISC-Lizenz) als Dependency
- **Seriell (optional):** serialport v13 (als optionale Dependency)
- **Test:** Mocha, Chai, Sinon, node-red-node-test-helper
- **Coverage:** nyc / Istanbul

---

## 2. Verweise auf Dokumentation

| Dokument | Pfad | Beschreibung |
|----------|------|-------------|
| Theoretische Grundlagen | [docs/THEORETISCHE_GRUNDLAGEN.md](docs/THEORETISCHE_GRUNDLAGEN.md) | Modbus-Protokoll, Datenmodell, Endianness, Security – vollständige Theorie |
| Architektur | [docs/ARCHITEKTUR.md](docs/ARCHITEKTUR.md) | Zielarchitektur, Design-Patterns, Komponentendiagramme |
| Arbeitspakete | [docs/ARBEITSPAKETE.md](docs/ARBEITSPAKETE.md) | Alle WP 1.1–5.4 mit Detailbeschreibungen |
| Meilensteine | [MILESTONES.md](MILESTONES.md) | Gruppierung der WPs in Agent-Sessions, Schritt-für-Schritt |
| Testhandbuch | [docs/TESTHANDBUCH.md](docs/TESTHANDBUCH.md) | Teststrategie, Test-Katalog, Mock-Daten-Policy |
| Entwicklerhandbuch | [docs/ENTWICKLERHANDBUCH.md](docs/ENTWICKLERHANDBUCH.md) | Setup, Coding-Standards, Beitrag leisten |
| Rechtsanalyse | [docs/RECHTSANALYSE.md](docs/RECHTSANALYSE.md) | Lizenzkompatibilität, Plagiatsprüfung, Abgrenzung |
| Referenzen | [docs/REFERENZEN.md](docs/REFERENZEN.md) | Alle Quellen, Spezifikationen, Links |

---

## 3. Projektstruktur

```
node-red-contrib-modbus-forge/
├── src/
│   ├── nodes/
│   │   ├── config/          # Modbus-Client-Config, Modbus-Server-Config
│   │   ├── client/          # Modbus-Read, Modbus-Write
│   │   └── server/          # Modbus-In, Modbus-Out
│   ├── lib/
│   │   ├── transport/       # TCP/RTU Abstraktion, Socket-Management
│   │   ├── state-machine/   # XState-Definitionen für Verbindungslebenszyklus
│   │   ├── queue/           # Backpressure-Queue mit FIFO/LIFO Drop
│   │   ├── security/        # TLS-Wrapper, Zertifikats-Validierung, RBAC
│   │   └── parser/          # Endianness-Konvertierung, Float32-Parsing
│   └── index.js
├── test/
│   ├── unit/                # Granulare Unit Tests pro Modul
│   │   ├── transport/
│   │   ├── state-machine/
│   │   ├── queue/
│   │   ├── security/
│   │   └── parser/
│   ├── integration/         # End-to-End mit node-red-node-test-helper
│   ├── fixtures/            # Statische Testdaten (DOKUMENTIERT in fixtures/README.md)
│   ├── mocks/               # Mock-Objekte (DOKUMENTIERT in mocks/README.md)
│   └── helpers/             # Shared Test-Utilities
├── examples/flows/          # Importierbare Beispiel-Flows
├── docs/                    # Gesamte Projektdokumentation
├── agents.md                # ← Dieses Dokument
├── MILESTONES.md            # Meilensteinplanung
├── CHANGELOG.md             # Wird bei jedem Release aktualisiert
└── package.json
```

---

## 4. Regeln für Agent-Sessions

### 4.1 Arbeitsweise
1. **Lies MILESTONES.md** vor jeder Session, um den aktuellen Stand zu kennen.
2. **Arbeite einen Meilenstein pro Session** ab. Jeder Meilenstein ist so dimensioniert, dass er in einer Agent-Session abgeschlossen werden kann.
3. **Markiere abgeschlossene Meilensteine** in MILESTONES.md mit `[x]` und Datum.
4. **Schreibe Tests parallel zum Code** – jedes Modul braucht Unit Tests BEVOR es als fertig gilt.
5. **Aktualisiere CHANGELOG.md** bei jedem Feature oder Bugfix.

### 4.2 Coding-Standards
- **Asynchroner Code:** Ausschließlich async/await und Promises – KEIN Callback-Hell, KEINE setTimeout-Kaskaden.
- **State-Management:** Alle Verbindungszustände über XState – KEINE handcodierten if/else-FSMs.
- **Fehlerbehandlung:** Fehler propagieren über XState-Transitionen und Node-RED `node.error()`. Niemals still schlucken.
- **Logging:** `node.warn()` und `node.log()` mit Kontext (Connection-ID, Unit-ID).
- **Node-RED Status:** `this.status()` API konsequent nutzen – Connected (grün), Disconnected (rot), Error (rot/ring), Queue Full (gelb).

### 4.3 Sicherheitsregeln
- **Credentials:** NIEMALS in `flow.json` speichern – ausschließlich Node-RED Credential Store.
- **Private Keys:** PEM-Pfade nur über Credential-Felder (`type: "password"` in HTML).
- **Keine REST→Modbus-Write Bridges** ohne Authentifizierung.
- **TLS-Validierung:** Zertifikate MÜSSEN validiert werden (`rejectUnauthorized: true` als Default).

---

## 5. Mock- und Testdaten-Policy

> **KRITISCH:** Sämtliche Mock- und Testdaten MÜSSEN sichtbar dokumentiert sein, damit sie
> schnell gefunden und bei Bedarf entfernt oder aktualisiert werden können.

### Regeln:
1. **Mock-Dateien** leben ausschließlich in `test/mocks/` und sind in `test/mocks/README.md` katalogisiert.
2. **Test-Fixtures** (statische Daten wie Register-Maps, Zertifikate) leben in `test/fixtures/` und sind in `test/fixtures/README.md` katalogisiert.
3. **Jede Mock-Datei** enthält einen Header-Kommentar:
   ```javascript
   /**
    * MOCK: [Beschreibung]
    * VERWENDET IN: [Test-Dateien die diesen Mock nutzen]
    * ZULETZT AKTUALISIERT: [Datum]
    * ENTFERNBAR: [ja/nein + Begründung]
    */
   ```
4. **Keine Mock-Daten im Produktionscode** (`src/`). Prüfe bei jedem PR/Commit.
5. **Inline-Testdaten** in Test-Dateien müssen mit `// TEST-DATA:` markiert werden.
6. **Aktualisierungspflicht:** Bei Änderungen an der API müssen betroffene Mocks und Fixtures aktualisiert werden. Das Testhandbuch ([docs/TESTHANDBUCH.md](docs/TESTHANDBUCH.md)) beschreibt den Prozess.

---

## 6. Verweise auf Arbeitspakete und Meilensteine

Die Implementierung folgt der **Work Breakdown Structure** aus [docs/ARBEITSPAKETE.md](docs/ARBEITSPAKETE.md), gruppiert in 8 Meilensteine (siehe [MILESTONES.md](MILESTONES.md)):

| Meilenstein | Fokus | Arbeitspakete |
|-------------|-------|--------------|
| MS-1 | Projektfundament & Transport | WP 1.1, WP 1.2 |
| MS-2 | Zustandsautomat & Connection | WP 1.3, WP 1.4 |
| MS-3 | Client Lese-Nodes | WP 2.1, WP 2.4 |
| MS-4 | Client Schreib-Nodes & Queue | WP 2.2, WP 2.3 |
| MS-5 | Server Proxy-Architektur | WP 3.1, WP 3.2, WP 3.3 |
| MS-6 | Server-Caching & Optimierung | WP 3.4 |
| MS-7 | Modbus/TCP Security | WP 4.1, WP 4.2, WP 4.3 |
| MS-8 | QA, Dokumentation & Release | WP 5.1, WP 5.2, WP 5.3, WP 5.4 |

### Session-Ablauf pro Meilenstein:
1. MILESTONES.md lesen → aktuellen Status prüfen
2. Zugehörige WPs in ARBEITSPAKETE.md lesen
3. Relevante theoretische Grundlagen in THEORETISCHE_GRUNDLAGEN.md konsultieren
4. Code implementieren in `src/`
5. Unit Tests in `test/unit/` schreiben und ausführen
6. Mock-/Fixture-Dokumentation aktualisieren
7. Meilenstein in MILESTONES.md als abgeschlossen markieren
8. CHANGELOG.md aktualisieren

---

## 7. Theoretische Grundlagen (Kurzreferenz)

Die vollständige Ausarbeitung findet sich in [docs/THEORETISCHE_GRUNDLAGEN.md](docs/THEORETISCHE_GRUNDLAGEN.md). Für Agent-Sessions die wichtigsten Punkte:

- **Modbus-Adressierung:** Zero-based auf dem Bus, One-based in Datenblättern. Register 40108 → Offset 107, FC 03.
- **Endianness:** Modbus überträgt Big-Endian. Float32 über 2 Register → Word-Order ist geräteabhängig.
- **Function Codes:** FC 01-04 (Read), FC 05/06 (Write Single), FC 15/16 (Write Multiple). Max Payload 240 Bytes.
- **RTU vs. TCP:** RTU ist Half-Duplex (Semaphore nötig), TCP ist Full-Duplex (Connection Pool möglich).
- **Security:** TLS 1.3 über Port 802, mTLS mit X.509v3, Credentials im Node-RED Credential Store.

---

## 8. Referenzen (Kurzliste)

Vollständiges Quellenverzeichnis: [docs/REFERENZEN.md](docs/REFERENZEN.md)

- Modbus Application Protocol Specification V1.1b3 – modbus.org
- Modbus/TCP Security Protocol Specification – modbus.org
- modbus-serial (npm, ISC) – github.com/yaacov/node-modbus-serial
- jsmodbus (npm, MIT) – github.com/Cloud-Automation/node-modbus
- XState v5 Dokumentation – stately.ai/docs/xstate-v5
- Node-RED Node Creation Guide – nodered.org/docs/creating-nodes
- node-red-contrib-modbus (BSD-3-Clause) – github.com/BiancoRoyal/node-red-contrib-modbus
- FlowFuse Modbus Best Practices – flowfuse.com/blog
