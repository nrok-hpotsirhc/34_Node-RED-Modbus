# node-red-contrib-modbus-forge

> Next-Generation Modbus TCP/RTU Integration für Node-RED

[![License: BSD-3-Clause](https://img.shields.io/badge/License-BSD--3--Clause-blue.svg)](LICENSE)
[![Node-RED](https://img.shields.io/badge/Platform-Node--RED-red.svg)](https://nodered.org)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green.svg)](https://nodejs.org)
[![Status](https://img.shields.io/badge/Status-In%20Entwicklung-orange.svg)](#entwicklungsfortschritt)

---

## Entwicklungsfortschritt

> **Aktueller Stand:** Projektfundament & Dokumentation abgeschlossen – Implementierung steht bevor.

| # | Meilenstein | Status | Fortschritt |
|---|-------------|--------|-------------|
| MS-1 | Projektfundament & Transportschicht | 🔲 Offen | `░░░░░░░░░░` 0 % |
| MS-2 | Zustandsautomat & Connection Management | 🔲 Offen | `░░░░░░░░░░` 0 % |
| MS-3 | Client/Master – Lese-Nodes | 🔲 Offen | `░░░░░░░░░░` 0 % |
| MS-4 | Client/Master – Schreib-Nodes & Queue | 🔲 Offen | `░░░░░░░░░░` 0 % |
| MS-5 | Server/Slave – Proxy-Architektur | 🔲 Offen | `░░░░░░░░░░` 0 % |
| MS-6 | Server-Caching & Optimierung | 🔲 Offen | `░░░░░░░░░░` 0 % |
| MS-7 | Modbus/TCP Security | 🔲 Offen | `░░░░░░░░░░` 0 % |
| MS-8 | Qualitätssicherung & Release | 🔲 Offen | `░░░░░░░░░░` 0 % |

**Gesamtfortschritt: 0 / 8 Meilensteine abgeschlossen**

> Details zu jedem Meilenstein: [MILESTONES.md](MILESTONES.md) · Arbeitspakete: [docs/ARBEITSPAKETE.md](docs/ARBEITSPAKETE.md)

---

## Überblick

**node-red-contrib-modbus-forge** ist ein von Grund auf neu entwickeltes Modbus-Integrationspaket für Node-RED, das die architektonischen Schwächen bestehender Legacy-Implementierungen konsequent adressiert. Es bietet:

- **Deterministisches State-Management** via [XState](https://xstate.js.org/) – eliminiert Race Conditions und undefinierte Zustände
- **Zentralisiertes Connection Pooling** – TCP-Multiplexing und RTU-Semaphore-Serialisierung
- **Backpressure-Management** – konfigurierbare Queue-Limits mit FIFO/LIFO-Drop-Strategien
- **Dynamisches Server-Proxying** – event-basierte Verarbeitung ohne monolithische Speicher-Arrays
- **Modbus/TCP Security (MBTPS)** – TLS 1.3, mTLS via X.509v3, Port 802
- **Vollständige Function-Code-Unterstützung** – FC 01-06, 15, 16 und Diagnostik

## Architekturprinzipien

Dieses Projekt basiert auf einer umfassenden Anforderungsanalyse, dokumentiert in:

| Dokument | Beschreibung |
|----------|-------------|
| [agents.md](agents.md) | KI-Agent-Leitfaden für die Entwicklung |
| [docs/THEORETISCHE_GRUNDLAGEN.md](docs/THEORETISCHE_GRUNDLAGEN.md) | Vollständige theoretische Fundierung |
| [docs/ARCHITEKTUR.md](docs/ARCHITEKTUR.md) | Architektur-Dokumentation |
| [docs/ARBEITSPAKETE.md](docs/ARBEITSPAKETE.md) | Detaillierte Arbeitspakete |
| [MILESTONES.md](MILESTONES.md) | Meilensteinplanung |
| [docs/TESTHANDBUCH.md](docs/TESTHANDBUCH.md) | Test-Dokumentation & Strategie |
| [docs/ENTWICKLERHANDBUCH.md](docs/ENTWICKLERHANDBUCH.md) | Entwickler-Leitfaden |
| [docs/RECHTSANALYSE.md](docs/RECHTSANALYSE.md) | Lizenz- & Rechtsanalyse |
| [docs/REFERENZEN.md](docs/REFERENZEN.md) | Quellenverzeichnis |

## Installation

```bash
npm install node-red-contrib-modbus-forge
```

Für serielle RTU-Unterstützung:

```bash
npm install node-red-contrib-modbus-forge serialport
```

## Schnellstart

### Modbus TCP Client (Lesen von Holding Registern)

1. Ziehe einen **Modbus Client Config**-Knoten in den Flow
2. Konfiguriere IP-Adresse und Port (Standard: 502)
3. Füge einen **Modbus Read**-Knoten hinzu und wähle FC 03 (Read Holding Registers)
4. Verbinde mit einem Debug-Knoten zur Ausgabe

### Modbus Server (Slave-Simulation)

1. Ziehe einen **Modbus Server Config**-Knoten in den Flow
2. Verbinde **Modbus-In** und **Modbus-Out** Knoten für dynamisches Adress-Proxying
3. Verarbeite eingehende Anfragen im Flow und sende Antworten zurück

## Unterstützte Function Codes

| FC | Funktion | Datentyp |
|----|----------|----------|
| 01 | Read Coils | Bit (R) |
| 02 | Read Discrete Inputs | Bit (R) |
| 03 | Read Holding Registers | 16-Bit (R) |
| 04 | Read Input Registers | 16-Bit (R) |
| 05 | Write Single Coil | Bit (W) |
| 06 | Write Single Register | 16-Bit (W) |
| 15 | Write Multiple Coils | Bit[] (W) |
| 16 | Write Multiple Registers | 16-Bit[] (W) |

## Projektstruktur

```
node-red-contrib-modbus-forge/
├── src/
│   ├── nodes/          # Node-RED Knoten (HTML + JS)
│   │   ├── config/     # Konfigurations-Knoten (TCP/RTU/Security)
│   │   ├── client/     # Client/Master Knoten (Read/Write)
│   │   └── server/     # Server/Slave Knoten (In/Out)
│   ├── lib/            # Interne Bibliotheken
│   │   ├── transport/  # TCP & RTU Abstraktion
│   │   ├── state-machine/ # XState Zustandsautomat
│   │   ├── queue/      # Backpressure & Queue-Management
│   │   ├── security/   # TLS/mTLS Integration
│   │   └── parser/     # Endianness & Buffer-Parsing
│   └── index.js        # Einstiegspunkt
├── test/
│   ├── unit/           # Unit Tests (Mocha/Chai)
│   ├── integration/    # Integrationstests
│   ├── fixtures/       # Test-Fixtures (dokumentiert!)
│   ├── mocks/          # Mock-Objekte (dokumentiert!)
│   └── helpers/        # Test-Hilfsfunktionen
└── examples/
    └── flows/          # Beispiel-Flows
```

## Entwicklung

```bash
# Abhängigkeiten installieren
npm install

# Tests ausführen
npm test

# Nur Unit-Tests
npm run test:unit

# Code Coverage
npm run test:coverage

# Linting
npm run lint
```

## Lizenz

Dieses Projekt steht unter der **BSD-3-Clause-Lizenz**. Siehe [LICENSE](LICENSE) für Details.

Die BSD-3-Clause wurde bewusst gewählt, um:
- Maximale Kompatibilität mit industriellen White-Label-Anwendungen zu gewährleisten
- Den Non-Endorsement-Schutz (Klausel 3) für die Originalautoren sicherzustellen
- Kompatibilität mit den Lizenzen aller Abhängigkeiten (ISC, MIT, Apache 2.0) zu garantieren

## Abgrenzung zu bestehenden Paketen

Dieses Projekt ist eine **vollständige Neuentwicklung** und enthält keinen kopierten Code aus:
- `node-red-contrib-modbus` (BiancoRoyal, BSD-3-Clause)
- `modbus-serial` (yaacov, ISC) – wird als **Dependency** verwendet, nicht kopiert
- `jsmodbus` (Cloud-Automation, MIT) – architektonische Konzepte als Inspiration

Siehe [docs/RECHTSANALYSE.md](docs/RECHTSANALYSE.md) für die vollständige rechtliche Bewertung.
