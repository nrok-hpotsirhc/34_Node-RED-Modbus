# Testhandbuch

> Teststrategie, Test-Katalog und Mock-Daten-Policy für node-red-contrib-modbus-forge.
> Verweise: [Agents](../agents.md) | [Arbeitspakete](ARBEITSPAKETE.md) | [Architektur](ARCHITEKTUR.md)

---

## 1. Teststrategie

### Test-Pyramide

```
        ┌─────────────────┐
        │  Integration     │  ← node-red-node-test-helper
        │  (wenige, teuer) │     End-to-End Flows
        ├─────────────────┤
        │   Unit Tests     │  ← Mocha + Chai + Sinon
        │   (viele, schnell)│     Pro Modul, isoliert
        └─────────────────┘
```

### Werkzeuge

| Tool | Version | Zweck |
|------|---------|-------|
| Mocha | ^10.0.0 | Test-Runner |
| Chai | ^4.0.0 | Assertion-Library (expect/should) |
| Sinon | ^17.0.0 | Mocking, Stubbing, Spying |
| nyc | ^15.0.0 | Code Coverage (Istanbul) |
| node-red-node-test-helper | ^0.3.0 | Node-RED Integrationstests |

### Coverage-Ziel

- **Minimum:** 80% Line Coverage
- **Angestrebtes Ziel:** 90%+ für kritische Module (State Machine, Parser, Security)

---

## 2. Mock- und Testdaten-Policy

> **KRITISCHE REGEL:** Sämtliche Mock- und Testdaten MÜSSEN sichtbar dokumentiert sein,
> damit sie schnell gefunden und bei Bedarf entfernt oder aktualisiert werden können.

### Ablagestruktur

```
test/
├── fixtures/              # Statische Testdaten
│   ├── README.md          # ← KATALOG aller Fixtures (PFLICHT)
│   ├── register-maps/     # Beispiel-Register-Maps
│   └── certs/             # Selbstsignierte Test-Zertifikate
├── mocks/                 # Mock-Implementierungen
│   ├── README.md          # ← KATALOG aller Mocks (PFLICHT)
│   ├── mock-serial-port.js
│   ├── mock-tcp-socket.js
│   └── mock-modbus-server.js
└── helpers/               # Shared Test-Utilities
    └── test-utils.js
```

### Header-Pflicht für Mock-Dateien

Jede Mock-Datei MUSS folgenden Header enthalten:

```javascript
/**
 * MOCK: [Kurzbeschreibung des Mocks]
 * SIMULIERT: [Was wird simuliert? z.B. "TCP-Socket mit konfigurierbaren Antworten"]
 * VERWENDET IN: [Liste der Test-Dateien, die diesen Mock importieren]
 * ZULETZT AKTUALISIERT: [Datum der letzten Änderung]
 * ENTFERNBAR: [ja/nein – Begründung]
 * ABHÄNGIGKEITEN: [Welche Module/APIs werden gemockt?]
 */
```

### Inline-Testdaten in Test-Dateien

Testdaten, die direkt in Test-Dateien definiert werden, müssen mit dem Präfix `// TEST-DATA:` markiert werden:

```javascript
// TEST-DATA: Beispiel Holding Register Response (FC 03, 2 Register)
const mockResponse = {
  data: [0x1234, 0x5678],
  buffer: Buffer.from([0x12, 0x34, 0x56, 0x78])
};
```

### Aktualisierungsprozess

1. Bei API-Änderungen: Betroffene Mocks in `test/mocks/README.md` identifizieren
2. Mocks aktualisieren und Header-Datum setzen
3. Betroffene Tests ausführen und verifizieren
4. `test/mocks/README.md` und `test/fixtures/README.md` aktualisieren

---

## 3. Test-Katalog

### 3.1 Transport Layer Tests

**Datei:** `test/unit/transport/tcp-transport.test.js`  
**Arbeitspaket:** WP 1.1

| Test | Beschreibung | Erwartetes Ergebnis |
|------|-------------|-------------------|
| TCP-Connect | Verbindung zu Mock-Server aufbauen | Socket geöffnet, Status: connected |
| TCP-Disconnect | Verbindung trennen | Socket geschlossen, kein Leak |
| TCP-Timeout | Server antwortet nicht | Timeout-Error nach konfigurierter Zeit |
| TCP-Reconnect | Verbindung verloren → automatisch neu | Reconnect nach Backoff |
| TCP-Invalid-Host | Ungültige IP-Adresse | Fehler wird sauber propagiert |
| TCP-Port-Conflict | Port bereits belegt | Aussagekräftige Fehlermeldung |

**Datei:** `test/unit/transport/rtu-transport.test.js`  
**Arbeitspaket:** WP 1.1

| Test | Beschreibung | Erwartetes Ergebnis |
|------|-------------|-------------------|
| RTU-Connect | Serielle Verbindung über Mock | Port geöffnet |
| RTU-No-Serialport | serialport nicht installiert | Graceful Degradation, keine Exception |
| RTU-Baudrate | Verschiedene Baudraten (9600, 19200, etc.) | Korrekt konfiguriert |
| RTU-Parity | None, Even, Odd | Korrekt weitergegeben |

### 3.2 State Machine Tests

**Datei:** `test/unit/state-machine/connection-machine.test.js`  
**Arbeitspaket:** WP 1.3

| Test | Beschreibung | Erwartetes Ergebnis |
|------|-------------|-------------------|
| Initial-State | Maschine startet | Zustand: DISCONNECTED |
| Connect-Success | DISCONNECTED → CONNECT | Transition zu CONNECTED |
| Connect-Failure | CONNECTING → FAILURE | Transition zu ERROR |
| Error-to-Backoff | ERROR → RETRY | Transition zu BACKOFF |
| Backoff-Exponentiell | Mehrere Retries | Wartezeit verdoppelt sich (1s, 2s, 4s, ...) |
| Max-Retries | Retries überschritten | Transition zu DISCONNECTED (endgültig) |
| Guard-isConnected | READ_REQUEST im DISCONNECTED-Zustand | Request abgelehnt |
| Guard-isQueueFull | Request bei voller Queue | Request abgelehnt/gedroppt |
| Read-While-Reading | Zweiter READ während laufendem READ | Queue oder Ablehnung |
| Disconnect-While-Reading | DISCONNECT während READ | Socket geschlossen, READ abgebrochen |
| Rapid-Transitions | Schnelle Event-Folge | Kein undefinierter Zustand |

### 3.3 Queue/Backpressure Tests

**Datei:** `test/unit/queue/backpressure-queue.test.js`  
**Arbeitspaket:** WP 2.3

| Test | Beschreibung | Erwartetes Ergebnis |
|------|-------------|-------------------|
| Enqueue | Nachricht einreihen | Queue-Größe +1 |
| Dequeue | Nachricht entnehmen | FIFO-Reihenfolge |
| Max-Size | Queue voll (z.B. 100) | Nächste Nachricht wird gedroppt |
| Drop-FIFO | Overflow mit FIFO-Strategie | Älteste Nachricht entfernt |
| Drop-LIFO | Overflow mit LIFO-Strategie | Neueste Nachricht wird nicht eingereiht |
| Memory-Constant | 10.000 Messages mit Max=100 | Memory bleibt konstant |
| Empty-Dequeue | Dequeue bei leerer Queue | undefined/null, kein Error |
| Concurrent | Paralleles Enqueue/Dequeue | Thread-sicher (Event-Loop) |

**Datei:** `test/unit/queue/connection-pool.test.js`  
**Arbeitspaket:** WP 1.4

| Test | Beschreibung | Erwartetes Ergebnis |
|------|-------------|-------------------|
| Pool-Create | Pool mit Size=3 erstellen | 3 Sockets verfügbar |
| Acquire-Release | Socket auschecken und zurückgeben | Wiederverwendbar |
| Pool-Exhausted | Alle Sockets ausgeliehen | Warten oder Fehler |
| Pool-Drain | Pool schließen | Alle Sockets geschlossen, kein Leak |

**Datei:** `test/unit/queue/rtu-semaphore.test.js`  
**Arbeitspaket:** WP 1.4

| Test | Beschreibung | Erwartetes Ergebnis |
|------|-------------|-------------------|
| Serial-Access | 2 parallele Requests | Strikt sequenzielle Ausführung |
| Release-After-Response | Request abgeschlossen | Semaphore freigegeben |
| Release-After-Timeout | Timeout ohne Response | Semaphore nach Timeout freigegeben |

### 3.4 Parser/Endianness Tests

**Datei:** `test/unit/parser/buffer-parser.test.js`  
**Arbeitspaket:** WP 2.4

| Test | Beschreibung | Erwartetes Ergebnis |
|------|-------------|-------------------|
| UInt16-BE | Buffer [0x12, 0x34] | 4660 (0x1234) |
| UInt16-LE | Buffer [0x34, 0x12] | 4660 (0x1234) |
| Float32-BE | 2 Register → Float32 Big-Endian | IEEE 754 korrekt |
| Float32-LE | 2 Register → Float32 Little-Endian | Word-Swap korrekt |
| Float32-BE-Swap | Byte Swap Big-Endian | Korrekte Byte-Reihenfolge |
| Float32-LE-Swap | Byte Swap Little-Endian | Korrekte Reihenfolge |
| Int32-Signed | Negative Werte über 2 Register | Korrekt als signed interpretiert |
| UInt32 | Große positive Werte | Korrekt als unsigned |
| Zero-Value | Alle Bytes 0x00 | 0 / 0.0 |
| Max-Value | Alle Bytes 0xFF | Korrekte Maximalwerte |
| NaN | Float32 NaN-Repräsentation | NaN erkannt |
| Infinity | Float32 Infinity | Infinity erkannt |

**Datei:** `test/unit/parser/payload-builder.test.js`  
**Arbeitspaket:** WP 2.4

| Test | Beschreibung | Erwartetes Ergebnis |
|------|-------------|-------------------|
| Build-FC03 | Holding Register Response | msg.payload mit data, buffer, fc, address, timestamp |
| Build-FC01 | Coil Response | Boolean-Array in data |
| Metadata | Alle Metadaten vorhanden | unitId, connection, timestamp korrekt |
| Timestamp-Format | ISO 8601 | Gültiges Datum |

### 3.5 Security Tests

**Datei:** `test/unit/security/tls-wrapper.test.js`  
**Arbeitspaket:** WP 4.1

| Test | Beschreibung | Erwartetes Ergebnis |
|------|-------------|-------------------|
| TLS-Connect | Verbindung mit gültigen Zertifikaten | TLS-Handshake erfolgreich |
| TLS-Invalid-Cert | Ungültiges Client-Zertifikat | Verbindung abgelehnt |
| TLS-Expired-Cert | Abgelaufenes Zertifikat | Verbindung abgelehnt |
| TLS-No-CA | Fehlendes CA-Zertifikat | Fehler bei Validierung |
| TLS-Min-Version | TLS < 1.2 | Verbindung abgelehnt |
| TLS-Port-802 | Standard-Port bei TLS | Port 802 |

**Datei:** `test/unit/security/certificate-validator.test.js`  
**Arbeitspaket:** WP 4.3

| Test | Beschreibung | Erwartetes Ergebnis |
|------|-------------|-------------------|
| Valid-Cert | Gültiges X.509v3 | Validierung bestanden |
| RBAC-Extract | Rolle aus Extension | Korrekter Rollen-String |
| Credential-Store | Private Key in Credentials | Nicht in flow.json |

### 3.6 Integration Tests

**Datei:** `test/integration/modbus-read.test.js`  
**Arbeitspaket:** WP 2.1

| Test | Beschreibung | Erwartetes Ergebnis |
|------|-------------|-------------------|
| Read-FC03 | Kompletter Flow: Inject → Read → Debug | Korrekte Register-Werte |
| Read-FC01 | Coils lesen | Boolean-Array |
| Read-Polling | Intervall-basiertes Lesen | Regelmäßige Nachrichten |
| Read-Error | Server nicht erreichbar | Error-Output, Status rot |

**Datei:** `test/integration/modbus-write.test.js`  
**Arbeitspaket:** WP 2.2

| Test | Beschreibung | Erwartetes Ergebnis |
|------|-------------|-------------------|
| Write-FC06 | Single Register schreiben | Bestätigung |
| Write-FC16 | Multiple Registers schreiben | Bestätigung |
| Write-FC05 | Single Coil (Boolean) | Bestätigung |

**Datei:** `test/integration/modbus-server-proxy.test.js`  
**Arbeitspaket:** WP 3.1–3.3

| Test | Beschreibung | Erwartetes Ergebnis |
|------|-------------|-------------------|
| Proxy-Read | Client → Server → Flow → Response | Korrekte Daten zurück |
| Proxy-Write | Client → Server → Flow → Bestätigung | Write-Bestätigung |
| Proxy-Timeout | Flow antwortet nicht rechtzeitig | Timeout an Client |

### 3.7 Leak-Tests (Partial Deploy)

**Datei:** `test/integration/lifecycle.test.js`  
**Arbeitspaket:** WP 5.2

| Test | Beschreibung | Erwartetes Ergebnis |
|------|-------------|-------------------|
| Partial-Deploy | Node entfernen und deployen | Keine Listener-Leaks |
| Full-Deploy | Gesamten Flow re-deployen | Alle Sockets geschlossen |
| Rapid-Deploy | 10x schnell hintereinander | Kein Memory-Leak |
| Close-Cleanup | node.on('close') Verifizierung | removeAllListeners aufgerufen |

---

## 4. Tests ausführen

```bash
# Alle Tests
npm test

# Nur Unit Tests
npm run test:unit

# Nur Integration Tests
npm run test:integration

# Mit Coverage
npm run test:coverage

# Einzelnen Test
npx mocha test/unit/parser/buffer-parser.test.js
```

---

## 5. Neue Tests hinzufügen

### Checkliste für neue Tests

- [ ] Testdatei folgt dem Muster `*.test.js`
- [ ] Liegt im korrekten Ordner (`test/unit/<modul>/` oder `test/integration/`)
- [ ] Inline-Testdaten mit `// TEST-DATA:` markiert
- [ ] Neue Mocks in `test/mocks/README.md` dokumentiert
- [ ] Neue Fixtures in `test/fixtures/README.md` dokumentiert
- [ ] Mock-Header-Kommentar vorhanden (falls neue Mock-Datei)
- [ ] Coverage nicht gesunken

### Template für neue Unit Tests

```javascript
'use strict';

const { expect } = require('chai');
const sinon = require('sinon');

// Zu testende Module
// const { myFunction } = require('../../../src/lib/<modul>/<datei>');

describe('<Modulname>', function () {
  // Setup/Teardown
  beforeEach(function () {
    // Mocks und Stubs einrichten
  });

  afterEach(function () {
    sinon.restore();
  });

  describe('<Funktionsname>', function () {
    it('should <erwartetes Verhalten>', function () {
      // TEST-DATA: Beschreibung der Testdaten
      const input = { /* ... */ };
      const expected = { /* ... */ };

      // const result = myFunction(input);
      // expect(result).to.deep.equal(expected);
    });
  });
});
```

---

## 6. Wartung der Test-Dokumentation

> Diese Dokumentation MUSS bei jeder Änderung an der Test-Suite aktualisiert werden.

**Aktualisierungspflicht bei:**
- Neuen Test-Dateien → Test-Katalog (§3) aktualisieren
- Neuen Mocks → `test/mocks/README.md` aktualisieren
- Neuen Fixtures → `test/fixtures/README.md` aktualisieren
- API-Änderungen → Betroffene Tests und Mocks prüfen und anpassen
- Geänderten Anforderungen → Relevante Tests identifizieren und erweitern
