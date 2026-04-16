# Rechtsanalyse – Lizenz-Compliance und Plagiatsprüfung

> Vollständige rechtliche Bewertung für node-red-contrib-modbus-forge.
> Verweise: [Agents](../agents.md) | [Referenzen](REFERENZEN.md)

---

## 1. Zusammenfassung

**Ergebnis: Keine rechtlichen Probleme identifiziert.**

- Die gewählte BSD-3-Clause-Lizenz ist kompatibel mit allen Abhängigkeiten
- Es wird kein Code aus bestehenden Paketen kopiert
- Das Modbus-Protokoll ist eine offene, lizenzfreie Spezifikation
- Die Architektur ist eine vollständige Eigenentwicklung
- Die Recherche basiert auf öffentlich zugänglichen Informationen

---

## 2. Lizenzanalyse der Abhängigkeiten

### Direkte Abhängigkeiten (Dependencies)

| Paket | Version | Lizenz | Kompatibel mit BSD-3-Clause? | Art der Nutzung |
|-------|---------|--------|------------------------------|----------------|
| modbus-serial | ^8.0.0 | **ISC** | ✅ Ja | npm Dependency (Laufzeit) |
| xstate | ^5.0.0 | **MIT** | ✅ Ja | npm Dependency (Laufzeit) |

### Optionale Abhängigkeiten

| Paket | Version | Lizenz | Kompatibel? | Art der Nutzung |
|-------|---------|--------|-------------|----------------|
| serialport | ^13.0.0 | **MIT** | ✅ Ja | Optionale Dependency (nur für RTU) |

### Entwicklungsabhängigkeiten (devDependencies)

| Paket | Lizenz | Kompatibel? | Anmerkung |
|-------|--------|-------------|----------|
| mocha | MIT | ✅ | Nur Test-Laufzeit, nicht im Paket |
| chai | MIT | ✅ | Nur Test-Laufzeit |
| sinon | BSD-3-Clause | ✅ | Nur Test-Laufzeit |
| nyc | ISC | ✅ | Nur Test-Laufzeit |
| eslint | MIT | ✅ | Nur Entwicklung |
| node-red | Apache-2.0 | ✅ | Nur Entwicklung/Test |
| node-red-node-test-helper | Apache-2.0 | ✅ | Nur Test-Laufzeit |

### Lizenz-Kompatibilitätsmatrix

```
BSD-3-Clause (unser Projekt)
    ├── ISC (modbus-serial)      → ✅ ISC ist kompatibel mit BSD
    ├── MIT (xstate, serialport) → ✅ MIT ist kompatibel mit BSD
    └── Apache-2.0 (node-red)   → ✅ Apache 2.0 ist kompatibel mit BSD
```

**Erklärung:**
- **ISC** ist funktional äquivalent zur MIT-Lizenz und maximal permissiv
- **MIT** erfordert nur die Beibehaltung des Copyright-Hinweises
- **Apache 2.0** bietet zusätzlich Patentschutz und ist mit BSD-3 kompatibel
- **BSD-3-Clause** erfordert zusätzlich die Non-Endorsement-Klausel (Klausel 3)

---

## 3. Plagiatsprüfung

### 3.1 Vergleich mit node-red-contrib-modbus (BiancoRoyal)

**Repository:** github.com/BiancoRoyal/node-red-contrib-modbus  
**Lizenz:** BSD-3-Clause  
**Programmiersprache:** JavaScript (86.1%), HTML (13.8%)

| Aspekt | BiancoRoyal | Forge (Unser Projekt) | Code-Übernahme? |
|--------|------------|----------------------|-----------------|
| State-Management | Handcodierte FSM (if/else) | XState v5 | ❌ Nein – fundamental anderer Ansatz |
| Queue | Keine Limitierung | Backpressure mit FIFO/LIFO | ❌ Nein – Eigenentwicklung |
| Transport | Direkte modbus-serial-Aufrufe | Factory-Pattern mit Abstraktion | ❌ Nein – anderes Design-Pattern |
| Server | jsmodbus + statisches Array | Event-basiertes Proxy-Pattern | ❌ Nein – architektonisch verschieden |
| Security | Kein TLS | TLS 1.3, mTLS, Port 802 | ❌ Nein – existiert dort nicht |
| Test-Framework | Mocha | Mocha + Chai + Sinon | ❌ Nur gleiches Standard-Tooling |
| Nodes | Flex-Getter, Sequencer, etc. | Read, Write, In, Out (minimalistisch) | ❌ Nein – anderer Node-Satz |

**Fazit:** Kein Code wird aus dem BiancoRoyal-Repository kopiert. Die Architektur unterscheidet sich fundamental in allen Kernkomponenten. Es handelt sich um eine vollständige Neuentwicklung.

### 3.2 Vergleich mit modbus-serial (yaacov)

**Repository:** github.com/yaacov/node-modbus-serial  
**Lizenz:** ISC

| Aspekt | Bewertung |
|--------|----------|
| Code-Übernahme | ❌ Nein – `modbus-serial` wird als npm Dependency verwendet, nicht kopiert |
| API-Nutzung | ✅ Erlaubt – ISC-Lizenz erlaubt jegliche Nutzung als Dependency |
| Vendoring | ❌ Nicht geplant – kein Code wird in unser Repository eingebettet |

### 3.3 Vergleich mit jsmodbus (Cloud-Automation)

**Repository:** github.com/Cloud-Automation/node-modbus  
**Lizenz:** MIT

| Aspekt | Bewertung |
|--------|----------|
| Code-Übernahme | ❌ Nein – kein Code wird kopiert |
| Architektur-Inspiration | ⚠️ Das Event-basierte Server-Konzept inspiriert unser Proxy-Pattern |
| Rechtliche Bewertung | ✅ Design-Patterns und architektonische Konzepte sind **nicht urheberrechtlich schützbar**. Nur die konkrete Implementierung (Source Code) unterliegt dem Copyright. |

### 3.4 Modbus-Protokollspezifikation

| Aspekt | Bewertung |
|--------|----------|
| Eigentümer | Modbus Organization, Inc. |
| Nutzungsrechte | **Offen, lizenzfrei, royalty-free** |
| Beschränkungen | Keine – explizit zur freien Implementierung vorgesehen |
| Trademark | „Modbus" ist kein geschütztes Warenzeichen für Software-Implementierungen |

---

## 4. Bewertung der Recherche-Dokumentation

Die dem Projekt zugrundeliegende Recherche (Recherche.txt) enthält:

| Inhalt | Rechtliche Bewertung |
|--------|---------------------|
| Protokollbeschreibung (Modbus) | ✅ Öffentliche Spezifikation, freie Nutzung |
| Tabellarische Vergleiche | ✅ Eigenständig erstellte Zusammenstellungen von Fakten |
| Architekturanalyse Legacy-Paket | ✅ Analyse öffentlicher Information (GitHub Issues, README) |
| Bibliotheksvergleich | ✅ Eigenständige Evaluation öffentlicher npm-Pakete |
| Architekturkonzept | ✅ Eigenständige Neuentwicklung |
| Best Practices (FlowFuse) | ✅ Referenzierung öffentlich verfügbarer Blog-Artikel |

**Fazit:** Die Recherche enthält keine urheberrechtlich geschützten Texte oder Code-Kopien. Alle referenzierten Informationen sind öffentlich zugänglich und werden korrekt attributiert.

---

## 5. Risikobewertung

| Risiko | Wahrscheinlichkeit | Maßnahme |
|--------|-------------------|----------|
| Plagiat-Vorwurf (Code) | **Sehr gering** | Vollständige Neuentwicklung mit fundamental anderer Architektur |
| Lizenz-Inkompatibilität | **Keine** | Alle Deps sind ISC/MIT/Apache 2.0 – kompatibel mit BSD-3 |
| Trademark-Verletzung | **Keine** | „Modbus" ist kein geschütztes Warenzeichen für SW |
| Patent-Verletzung | **Sehr gering** | Modbus-Protokoll ist patentfrei; keine proprietären Algorithmen verwendet |
| White-Label-Missbrauch | **Gering** | BSD-3-Clause Non-Endorsement-Klausel schützt Autoren |

---

## 6. Empfohlene Maßnahmen

1. **Copyright-Inhaber** in LICENSE-Datei eintragen
2. **NOTICE-Datei** erstellen mit Attributionen für Abhängigkeiten (optional aber empfohlen)
3. **Keine Code-Kopie:** Bei der Implementierung darf kein Code aus bestehenden Repositories übernommen werden. Bibliotheken werden ausschließlich als npm Dependencies eingebunden.
4. **Code-Review-Regel:** Jeder PR wird auf versehentliche Code-Übernahmen geprüft
5. **npm audit:** Regelmäßige Sicherheitsprüfung der Dependency-Chain

---

## 7. BSD-3-Clause: Warum diese Lizenz?

Die BSD-3-Clause-Lizenz wurde bewusst gewählt aufgrund der **Non-Endorsement-Klausel** (Klausel 3):

> "Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission."

**Relevanz für industrielle Nutzung:**
- Node-RED wird häufig als White-Label-Lösung in Edge-Gateways vertrieben (z.B. Siemens SIMATIC IoT2050, Opto22 groov)
- Die Klausel verhindert, dass Hardware-Hersteller den Namen der Originalentwickler für Werbezwecke missbrauchen
- Dies schützt vor fälschlichen Haftungsannahmen bei Systemausfällen in kritischen Infrastrukturen
- Das prominente Legacy-Paket (BiancoRoyal) verwendet ebenfalls BSD-3-Clause

> **Quelle:** Open Source Initiative – BSD-3-Clause License [REF-12]
