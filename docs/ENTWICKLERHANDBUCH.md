# Entwicklerhandbuch

> Leitfaden für Entwickler, die an node-red-contrib-modbus-forge arbeiten, es testen oder anwenden möchten.
> Verweise: [Agents](../agents.md) | [Architektur](ARCHITEKTUR.md) | [Testhandbuch](TESTHANDBUCH.md)

---

## 1. Projekt einrichten

### Voraussetzungen

- **Node.js:** >= 18 LTS (empfohlen: 20 LTS)
- **npm:** >= 9
- **Git:** >= 2.30
- **Node-RED:** >= 3.0.0 (für lokale Entwicklung/Tests)

### Installation

```bash
# Repository klonen
git clone https://github.com/[OWNER]/node-red-contrib-modbus-forge.git
cd node-red-contrib-modbus-forge

# Abhängigkeiten installieren
npm install

# Optional: serialport für RTU-Entwicklung
npm install serialport

# Tests ausführen um sicherzustellen, dass alles funktioniert
npm test
```

### Lokale Entwicklung mit Node-RED

```bash
# Im Projektverzeichnis: Link zum globalen npm
npm link

# Im Node-RED Benutzerverzeichnis (~/.node-red):
cd ~/.node-red
npm link node-red-contrib-modbus-forge

# Node-RED starten
node-red

# Nach Code-Änderungen: Node-RED neu starten (Strg+C, dann erneut starten)
```

---

## 2. Projektstruktur

```
node-red-contrib-modbus-forge/
├── src/                    # Quellcode
│   ├── nodes/              # Node-RED Knoten (Paare: .js + .html)
│   │   ├── config/         # Konfigurations-Knoten (Singleton)
│   │   ├── client/         # Client-Knoten (Read, Write)
│   │   └── server/         # Server-Knoten (In, Out)
│   ├── lib/                # Interne Bibliotheken (nicht Node-RED-spezifisch)
│   │   ├── transport/      # TCP/RTU Abstraktion
│   │   ├── state-machine/  # XState Zustandsautomaten
│   │   ├── queue/          # Backpressure, Connection Pool, Semaphore
│   │   ├── security/       # TLS, Zertifikate, RBAC
│   │   ├── parser/         # Buffer-Parsing, Endianness
│   │   └── cache/          # In-Memory Register-Cache
│   └── index.js            # Node-RED Registrierungs-Einstiegspunkt
├── test/                   # Tests (siehe TESTHANDBUCH.md)
├── examples/flows/         # Importierbare Beispiel-Flows (.json)
├── docs/                   # Dokumentation
├── agents.md               # KI-Agent-Leitfaden
├── MILESTONES.md           # Meilensteinplanung
├── CHANGELOG.md            # Änderungsprotokoll
├── package.json            # npm-Konfiguration
├── .mocharc.yml            # Mocha-Konfiguration
└── .gitignore              # Git-Ignore-Regeln
```

---

## 3. Coding-Standards

### Allgemein

- **Sprache:** JavaScript (ES2022+, Node.js >= 18)
- **Module:** CommonJS (`require`/`module.exports`) – Node-RED Standard
- **Strict Mode:** `'use strict';` in jeder Datei
- **Semikolons:** Ja
- **Einrückung:** 2 Spaces
- **Maximale Zeilenlänge:** 120 Zeichen

### Asynchroner Code

```javascript
// ✅ RICHTIG: async/await
async function readRegisters(client, address, length) {
  const result = await client.readHoldingRegisters(address, length);
  return result;
}

// ❌ FALSCH: Callback-Hell
function readRegisters(client, address, length, callback) {
  client.readHoldingRegisters(address, length, function(err, data) {
    if (err) callback(err);
    else callback(null, data);
  });
}

// ❌ FALSCH: setTimeout-Kaskaden für Retry-Logik
setTimeout(() => { retry(); }, 1000);
// Stattdessen: XState Backoff-Zustand verwenden
```

### State-Management

```javascript
// ✅ RICHTIG: XState für Zustandsübergänge
const { createMachine, createActor } = require('xstate');
const machine = createMachine({ /* ... */ });
const actor = createActor(machine);

// ❌ FALSCH: Handcodierte FSM
let state = 'INIT';
if (state === 'INIT') { state = 'CONNECTING'; }
if (state === 'CONNECTING' && success) { state = 'CONNECTED'; }
```

### Node-RED Status-API

```javascript
// Immer this.status() verwenden für visuelle Rückmeldung
node.status({ fill: 'green', shape: 'dot', text: 'connected' });
node.status({ fill: 'red', shape: 'ring', text: 'disconnected' });
node.status({ fill: 'yellow', shape: 'ring', text: 'queue: 85/100' });
node.status({ fill: 'red', shape: 'dot', text: 'error: timeout' });
```

### Fehlerbehandlung

```javascript
// ✅ RICHTIG: Fehler über Node-RED API propagieren
try {
  const result = await transport.read(address, length);
  node.send({ payload: result });
} catch (err) {
  node.error(`Read failed: ${err.message}`, msg);
  // XState-Transition auslösen
  actor.send({ type: 'FAILURE', error: err });
}

// ❌ FALSCH: Fehler still schlucken
try { await transport.read(); } catch (e) { /* nichts */ }
```

---

## 4. Node-RED-Knoten erstellen

### Dateistruktur eines Knotens

Jeder Node-RED-Knoten besteht aus zwei Dateien:

1. **`<name>.js`** – Server-seitige Logik (Node.js)
2. **`<name>.html`** – Client-seitige UI (Browser)

### Registrierung in package.json

```json
{
  "node-red": {
    "nodes": {
      "modbus-client-config": "src/nodes/config/modbus-client-config.js",
      "modbus-read": "src/nodes/client/modbus-read.js",
      "modbus-write": "src/nodes/client/modbus-write.js"
    }
  }
}
```

### Lifecycle Management (KRITISCH)

```javascript
module.exports = function(RED) {
  function MyNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    // Initialisierung...

    // PFLICHT: Cleanup bei Deploy/Undeploy
    node.on('close', function(removed, done) {
      // 1. Timer stoppen
      clearInterval(node.pollInterval);
      // 2. Event-Listener entfernen
      node.transport.removeAllListeners();
      // 3. Sockets schließen
      node.transport.close().then(() => {
        done(); // Node-RED signalisieren: Cleanup abgeschlossen
      }).catch((err) => {
        node.warn(`Cleanup error: ${err.message}`);
        done();
      });
    });
  }

  RED.nodes.registerType('my-node', MyNode);
};
```

> **WARNUNG:** Fehlende Cleanup-Logik in `node.on('close')` führt zu Socket-Leaks bei Partial-Deployments. Dies war ein kritischer Bug im Legacy-Paket (Issue #187).

---

## 5. Beitrag leisten (Contributing)

### Workflow

1. **Fork** erstellen
2. **Feature-Branch** anlegen: `git checkout -b feature/mein-feature`
3. **Code** implementieren + Tests schreiben
4. **Tests** ausführen: `npm test`
5. **Lint** prüfen: `npm run lint`
6. **Coverage** prüfen: `npm run test:coverage` (>= 80%)
7. **Commit**: Konventionelle Commit-Messages
8. **Pull Request** erstellen gegen `main`

### Commit-Message-Format

```
<type>(<scope>): <Beschreibung>

Typen:
  feat     - Neues Feature
  fix      - Bugfix
  docs     - Nur Dokumentation
  test     - Tests hinzufügen/ändern
  refactor - Code-Refactoring ohne Funktionsänderung
  chore    - Build-Prozess, Dependencies

Beispiele:
  feat(client): implement FC03 Read Holding Registers
  fix(state-machine): resolve race condition in BACKOFF state
  test(parser): add Float32 endianness edge cases
  docs(readme): update installation instructions
```

### Pull-Request-Checkliste

- [ ] Tests geschrieben und grün
- [ ] Coverage nicht gesunken
- [ ] Lint-Fehler behoben
- [ ] Neue Mocks in `test/mocks/README.md` dokumentiert
- [ ] Neue Fixtures in `test/fixtures/README.md` dokumentiert
- [ ] CHANGELOG.md aktualisiert
- [ ] Kein Code aus externen Repositories kopiert
- [ ] Keine Credentials im Code

---

## 6. Debugging

### Node-RED Debug-Modus

```bash
# Alle Modbus-Debug-Ausgaben
DEBUG=modbusForge* node-red -v

# Nur Transport-Layer
DEBUG=modbusForge:transport* node-red -v

# Nur State-Machine
DEBUG=modbusForge:state* node-red -v

# Auch modbus-serial Debug
DEBUG=modbusForge*,modbus-serial node-red -v
```

### Häufige Probleme

| Problem | Ursache | Lösung |
|---------|---------|--------|
| "Cannot find module 'serialport'" | serialport nicht installiert | `npm install serialport` oder nur TCP nutzen |
| "FSM Error" | Ungültiger Zustandsübergang | XState Visualizer nutzen (stately.ai/viz) |
| "Queue Full" | Polling-Rate zu hoch | Intervall erhöhen oder Max Queue Size anpassen |
| "TLS Handshake Failed" | Zertifikatsproblem | Zertifikate prüfen, CA korrekt? |
| "ECONNREFUSED" | Ziel-SPS nicht erreichbar | IP/Port prüfen, Firewall? |

---

## 7. Release-Prozess

```bash
# Version erhöhen
npm version patch|minor|major

# CHANGELOG.md aktualisieren

# Tag erstellen
git tag v1.0.0

# Veröffentlichen
npm publish

# Node-RED Flow Library
# → Automatisch nach npm publish (wenn package.json korrekt)
```
