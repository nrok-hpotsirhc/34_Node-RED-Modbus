# Referenzen und Quellenverzeichnis

> Vollständiges Verzeichnis aller Quellen, Spezifikationen und externen Ressourcen.
> Verwendet in: [Theoretische Grundlagen](THEORETISCHE_GRUNDLAGEN.md) | [Architektur](ARCHITEKTUR.md) | [Rechtsanalyse](RECHTSANALYSE.md)

---

## Modbus-Spezifikationen

| ID | Titel | Herausgeber | URL |
|----|-------|-------------|-----|
| REF-01 | Modbus Application Protocol Specification V1.1b3 | Modbus Organization, Inc. | https://modbus.org/specs.php |
| REF-02 | MODBUS over Serial Line Specification and Implementation Guide V1.02 | Modbus Organization, Inc. | https://modbus.org/specs.php |
| REF-03 | MODBUS Messaging on TCP/IP Implementation Guide V1.0b | Modbus Organization, Inc. | https://modbus.org/specs.php |
| REF-04 | Modbus/TCP Security Protocol Specification | Modbus Organization, Inc. | https://modbus.org/specs.php |

## Node.js-Bibliotheken (Dependencies)

| ID | Paket | Lizenz | Repository | npm |
|----|-------|--------|-----------|-----|
| REF-05 | node-red-contrib-modbus | BSD-3-Clause | https://github.com/BiancoRoyal/node-red-contrib-modbus | https://www.npmjs.com/package/node-red-contrib-modbus |
| REF-06 | modbus-serial | ISC | https://github.com/yaacov/node-modbus-serial | https://www.npmjs.com/package/modbus-serial |
| REF-07 | jsmodbus | MIT | https://github.com/Cloud-Automation/node-modbus | https://www.npmjs.com/package/jsmodbus |
| REF-08 | XState v5 | MIT | https://github.com/statelyai/xstate | https://www.npmjs.com/package/xstate |

## Node-RED Dokumentation

| ID | Titel | URL |
|----|-------|-----|
| REF-09 | FlowFuse – Working with Modbus in Node-RED | https://flowfuse.com/blog/2024/01/connect-modbus-node-red/ |
| REF-10 | IEC 62443 – Industrial Automation and Control Systems Security | https://www.iec.ch/iec-62443 |
| REF-11 | Node-RED – Creating Nodes (Official Guide) | https://nodered.org/docs/creating-nodes/ |
| REF-12 | Open Source Initiative – BSD-3-Clause License | https://opensource.org/licenses/BSD-3-Clause |

## Weitere Referenzen

| ID | Titel | Beschreibung |
|----|-------|-------------|
| REF-13 | IEEE 754 – Floating Point Standard | Standard für Float32/Float64-Repräsentation |
| REF-14 | RS-485 (TIA/EIA-485) | Standard für differenzielle serielle Kommunikation |
| REF-15 | TLS 1.3 (RFC 8446) | Transport Layer Security Protokoll |
| REF-16 | X.509v3 (RFC 5280) | PKI-Zertifikatsstandard |

## Community-Ressourcen

| Ressource | URL | Relevanz |
|-----------|-----|---------|
| Modbus Organization – FAQ | https://modbus.org/faq.php | Allgemeine Protokollfragen |
| Node-RED Forum | https://discourse.nodered.org/ | Community-Support |
| node-red-contrib-modbus Issues | https://github.com/BiancoRoyal/node-red-contrib-modbus/issues | Bekannte Probleme der Legacy-Implementierung |
| XState Visualizer | https://stately.ai/viz | Grafische FSM-Modellierung |
| npm Package Advisories | https://github.com/advisories | Sicherheitswarnungen für Dependencies |

---

## Lizenz-Zusammenfassung der Dependencies

```
node-red-contrib-modbus-forge (BSD-3-Clause)
├── modbus-serial@^8.0.0 (ISC)
│   └── serialport@^13.0.0 (MIT) [optional]
├── xstate@^5.0.0 (MIT)
└── DevDependencies:
    ├── mocha (MIT)
    ├── chai (MIT)
    ├── sinon (BSD-3-Clause)
    ├── nyc (ISC)
    ├── eslint (MIT)
    ├── node-red (Apache-2.0)
    └── node-red-node-test-helper (Apache-2.0)
```

Alle Lizenzen sind mit BSD-3-Clause kompatibel. Siehe [RECHTSANALYSE.md](RECHTSANALYSE.md) für die vollständige rechtliche Bewertung.
