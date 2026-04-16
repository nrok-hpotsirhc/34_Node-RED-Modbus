# Theoretische Grundlagen

> Vollständige theoretische Fundierung des Projekts node-red-contrib-modbus-forge.
> Dient als Nachschlagewerk für Entwickler und KI-Agenten.
> Verweise: [Agents](../agents.md) | [Architektur](ARCHITEKTUR.md) | [Arbeitspakete](ARBEITSPAKETE.md) | [Referenzen](REFERENZEN.md)

---

## Inhaltsverzeichnis

1. [Historischer Kontext des Modbus-Protokolls](#1-historischer-kontext-des-modbus-protokolls)
2. [Transportschichten: Modbus RTU vs. Modbus TCP](#2-transportschichten-modbus-rtu-vs-modbus-tcp)
3. [Das Modbus-Datenmodell](#3-das-modbus-datenmodell)
4. [Endianness in JavaScript](#4-endianness-in-javascript)
5. [Modbus/TCP Security Protocol (MBTPS)](#5-modbustcp-security-protocol)
6. [Deterministisches State-Management via XState](#6-deterministisches-state-management-via-xstate)
7. [Backpressure-Management](#7-backpressure-management)
8. [Dynamisches Address Space Mapping](#8-dynamisches-address-space-mapping)
9. [Analyse bestehender Implementierungen](#9-analyse-bestehender-implementierungen)
10. [Node.js-Bibliotheken im Vergleich](#10-nodejs-bibliotheken-im-vergleich)
11. [Best Practices für den industriellen Einsatz](#11-best-practices-fuer-den-industriellen-einsatz)

---

## 1. Historischer Kontext des Modbus-Protokolls

### Ursprung und Standardisierung

Das Modbus-Protokoll wurde 1979 von der Firma Modicon (heute Teil von Schneider Electric) für die Kommunikation zwischen speicherprogrammierbaren Steuerungen (SPS) entwickelt. Aufgrund seiner offenen Spezifikation, Einfachheit und lizenzfreien Nutzbarkeit hat es sich zum De-facto-Standard der industriellen Automatisierung entwickelt.

Im April 2004 wurden die Rechte am Protokoll an die unabhängige **Modbus Organization, Inc.** übertragen, was das Bekenntnis zu offener Interoperabilität und der Vermeidung von Vendor-Lock-ins zementierte.

> **Quelle:** Modbus Organization – „Modbus Application Protocol Specification V1.1b3" [REF-01]

### Client-Server-Architektur (ehemals Master-Slave)

Die Architektur basiert auf einem strikten **Request-Response-Paradigma**:

- **Client (ehemals Master):** Initiiert den Datenaustausch, sendet Anfragen
- **Server (ehemals Slave):** Agiert rein reaktiv, antwortet nur auf Anfragen

Diese Asymmetrie hat fundamentale Auswirkungen auf die Node-RED-Implementierung:
- Ein **Client-Node** löst asynchrone Events im Node.js Event-Loop aus
- Ein **Server-Node** lauscht kontinuierlich auf einem Port und verwaltet einen Adressraum

### Geräteadressierung

- Slave-IDs 1–247 auf einem Bus
- Adresse 0: Broadcast (alle Slaves)
- Adressen 248–255: Reserviert
- Bei TCP: Unit-ID typisch 255 oder 1 (außer bei Gateway-Nutzung)

> **Quelle:** Modbus Organization – „MODBUS over Serial Line Specification V1.02" [REF-02]

---

## 2. Transportschichten: Modbus RTU vs. Modbus TCP

### Modbus RTU (Remote Terminal Unit)

- **Physisches Medium:** RS-485 (differenzielle Signalübertragung, >1000m), RS-232
- **Datenformat:** Kompaktes Binärformat, kontinuierliche Datenfolge
- **Fehlerprüfung:** CRC (Cyclic Redundancy Check, 2 Bytes)
- **Knotenlimit:** 32 physische Geräte (Hardware), 247 logische Adressen
- **Kommunikation:** Half-Duplex (sequenziell)
- **Geschwindigkeit:** Typisch 9.600–115.200 bit/s

**Implikation für Node-RED:**
Da serielle Leitungen sequenziell arbeiten, MUSS ein RTU-Client eine Locking-Logik (Semaphore) implementieren. Parallele Leseanfragen aus mehreren Flows müssen in eine Warteschlange überführt werden.

### Modbus TCP/IP

- **Physisches Medium:** Ethernet, Wi-Fi
- **Adaptation:** 1999, Kapselung in TCP/IP-Pakete
- **Fehlerprüfung:** TCP Checksum + Ethernet FCS (kein eigener CRC)
- **Port:** 502 (Standard), 802 (TLS)
- **Kommunikation:** Full-Duplex, Multiplexing möglich
- **Geschwindigkeit:** 10/100/1000 Mbit/s

**Implikation für Node-RED:**
TCP erlaubt parallele Socket-Verbindungen. Ein Connection Pool kann Anfragen auf mehrere Sockets verteilen.

### Vergleichstabelle

| Merkmal | Modbus RTU | Modbus TCP |
|---------|-----------|-----------|
| Medium | RS-485, RS-232 | Ethernet, Wi-Fi |
| Fehlerprüfung | CRC (2 Bytes) | TCP Checksum |
| Adressierung | Slave ID (1–247) | IP + Unit ID |
| Knoten/Netz | 32 (HW), 247 (SW) | Unbegrenzt (IP) |
| Kommunikation | Half-Duplex | Full-Duplex |
| Geschwindigkeit | ≤ 115.200 bit/s | ≤ 1 Gbit/s |
| Einsatz | Legacy, lange Kabel, Störungen | IIoT, Cloud, SCADA |

> **Quellen:** Modbus Application Protocol Specification V1.1b3 [REF-01], MODBUS Messaging on TCP/IP Implementation Guide V1.0b [REF-03]

---

## 3. Das Modbus-Datenmodell

### Vier-Tabellen-Architektur

Das Modbus-Protokoll abstrahiert Maschinendaten über ein vierteiliges Tabellensystem, das sich an der Relaislogik (Ladder Logic) orientiert:

| Tabelle | Typ | Zugriff | Größe | Function Codes |
|---------|-----|---------|-------|---------------|
| **Discrete Inputs** (Contacts) | Boolean | Read-only | 1 Bit | FC 02 |
| **Coils** (Discrete Outputs) | Boolean | Read/Write | 1 Bit | FC 01, 05, 15 |
| **Input Registers** | Numerisch | Read-only | 16 Bit | FC 04 |
| **Holding Registers** | Numerisch | Read/Write | 16 Bit | FC 03, 06, 16 |

### Adressierungsparadoxie: Zero-Based vs. One-Based

Eine der häufigsten Fehlerquellen bei der Modbus-Integration:

- **Protokollebene (Bus):** Streng Null-basiert (zero-based). Das erste Holding Register hat Adresse 0x0000.
- **Datenblatt-Konvention:** Eins-basiert mit Typ-Präfix:
  - Discrete Inputs: 10001–19999
  - Coils: 00001–09999
  - Input Registers: 30001–39999
  - Holding Registers: 40001–49999

**Beispiel:** Datenblatt zeigt Register **40108**
- Führende "4" → Holding Register → FC 03
- Offset auf dem Bus: 108 - 1 = **107** (0x006B)

> Ein architektonisch ausgereifter Node-RED-Knoten muss dieses Offset-Mapping transparent gestalten oder den Nutzer durch eine klare UI-Validierung unterstützen.

### Standardisierte Function Codes (FC)

| FC (Dez) | FC (Hex) | Funktion | Zieltabelle | Aktion |
|----------|----------|----------|-------------|--------|
| 01 | 0x01 | Read Coils | Coils | Liest bis zu 2000 Ausgänge |
| 02 | 0x02 | Read Discrete Inputs | Discrete Inputs | Liest Eingänge für HMI/SCADA |
| 03 | 0x03 | Read Holding Registers | Holding Registers | Liest Parameter/Sollwerte |
| 04 | 0x04 | Read Input Registers | Input Registers | Liest analoge Messwerte |
| 05 | 0x05 | Write Single Coil | Coils | Setzt einen Ausgang |
| 06 | 0x06 | Write Single Register | Holding Registers | Schreibt einen 16-Bit-Wert |
| 15 | 0x0F | Write Multiple Coils | Coils | Schreibt Bit-Sequenzen |
| 16 | 0x10 | Write Multiple Registers | Holding Registers | Beschreibt Registerblöcke |

**Erweiterte Function Codes (optional):**
- FC 08 (0x08): Diagnostics – Serial-Line-Testing
- FC 43 (0x2B): Read Device Identification – automatisierte Geräteerkennung

**Payload-Limitierung:** Die Modbus-Spezifikation begrenzt die Payload auf 240 Bytes, was maximal ~120 Register (à 16 Bit) pro Read-Request bedeutet. Größere Datenmengen erfordern Chunking über mehrere sequentielle Requests.

> **Quelle:** Modbus Application Protocol Specification V1.1b3, Kapitel 6 [REF-01]

---

## 4. Endianness in JavaScript

### Das Problem

Modbus überträgt Datenpakete streng im **Big-Endian-Format** (MSB first). Der Hex-Wert `0x1234` wird als `0x12` gefolgt von `0x34` gesendet.

Viele Industriesensoren generieren **32-Bit-Werte** (Float32 IEEE 754, UInt32), die auf **zwei konsekutive 16-Bit-Register** aufgeteilt werden. Das Modbus-Protokoll definiert jedoch nicht die Reihenfolge dieser beiden Register:

| Variante | Register-Reihenfolge | Beispiel für 123456.0 (Float32) |
|----------|---------------------|--------------------------------|
| Big-Endian (AB CD) | High Word zuerst | [0x47F1, 0x2000] |
| Little-Endian (CD AB) | Low Word zuerst | [0x2000, 0x47F1] |
| Big-Endian Byte Swap (BA DC) | Bytes getauscht | [0xF147, 0x0020] |
| Little-Endian Byte Swap (DC BA) | Bytes + Words getauscht | [0x0020, 0xF147] |

### Lösung in Node.js

JavaScript verarbeitet Zahlen nativ als 64-Bit-Fließkommazahlen. Für die korrekte Konvertierung müssen die ankommenden Buffer-Arrays in 8-Bit-Oktette zerlegt und entsprechend der Gerätekonfiguration zusammengesetzt werden:

```javascript
// Konzeptuelles Beispiel (kein kopierter Code)
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
    // ... weitere Varianten
  }
  return view.getFloat32(0, false);
}
```

> **Hinweis:** Obiger Code ist ein eigenständig entwickeltes Konzeptbeispiel zur Illustration des Byte-Order-Problems. Er basiert auf keiner externen Quelle.

> **Relevanter Arbeitspaket:** [WP 2.4 – Payload-Standardisierung](ARBEITSPAKETE.md#wp-24-payload-standardisierung-und-buffer-parsing)

---

## 5. Modbus/TCP Security Protocol

### Motivation

Modbus TCP überträgt alle Daten im **Klartext** und besitzt **keine Authentifizierung**. Dies ermöglicht:
- Abhören des Datenverkehrs (Paket-Sniffer)
- Man-in-the-Middle (MITM) Angriffe
- Unautorisierte Schreibbefehle (FC 05, 06) an SPS-Systeme

### Modbus/TCP Security (MBTPS)

Die Modbus Organization hat die Spezifikation „Modbus/TCP Security" verabschiedet, die die traditionelle Modbus PDU in einen **TLS-Tunnel** kapselt:

| Element | Beschreibung |
|---------|-------------|
| **Port 802** | IANA-registrierter TCP-Port für gesicherte Verbindungen |
| **TLS 1.2/1.3** | Verschlüsselungsstandard, nativ in Node.js `node:tls` |
| **mTLS (Mutual TLS)** | Gegenseitige Authentifizierung via X.509v3-Zertifikate |
| **RBAC** | Role-Based Access Control über X.509v3-Extensions |

### Zertifikats-Management in Node-RED

**Kritische Architekturentscheidung:** Zertifikate und Private Keys dürfen **niemals** in `flow.json` gespeichert werden, da diese oft unverschlüsselt in Git-Repositories vorliegt.

Stattdessen nutzt die Architektur die **Node-RED Credential API**:
- Credentials werden in einer separaten `*_cred.json` Datei persistiert
- Die Datei wird kryptografisch mit dem Node-RED `credentialSecret` geschützt
- `*_cred.json` ist in `.gitignore` eingetragen

### IEC 62443 Compliance

Die Integration von TLS und mTLS ermöglicht die Einhaltung der Normenreihe **IEC 62443** (Industrial Automation and Control Systems Security), die folgende Anforderungen stellt:
- Authentifizierung aller Netzwerkteilnehmer
- Verschlüsselung der Kommunikation
- Rollenbasierte Zugriffskontrolle
- Audit-Fähigkeit

> **Quellen:** Modbus/TCP Security Protocol Specification [REF-04], IEC 62443 [REF-10]
> **Relevanter Arbeitspaket:** [WP 4 – Modbus/TCP Security](ARBEITSPAKETE.md#wp-4-modbustcp-security-und-credential-management)

---

## 6. Deterministisches State-Management via XState

### Problem: Handcodierte FSM im Legacy-Paket

Das Legacy-Paket `node-red-contrib-modbus` implementiert eine proprietäre, handgeschriebene Finite-State-Machine (FSM) mit Zuständen wie INIT, ACTIVATED, QUEUEING, READING, EMPTY, RECONNECTING. Dies führt zu:

- **"FSM Not Ready To Read" Fehler:** Wenn ein Trigger den Node erreicht, während die FSM im Status READING feststeckt
- **Race Conditions:** Asynchrone Events können die FSM in undefinierte Zustände bringen
- **Log-Fluten:** Minimale Netzwerklatenzen resultieren in massiven Fehlermeldungen

> **Quelle:** GitHub Issues des Legacy-Pakets, dokumentiert in der Community [REF-05]

### Lösung: XState v5

[XState](https://stately.ai/docs/xstate-v5) ermöglicht die grafische und mathematisch korrekte Modellierung von Zuständen. Vorteile:

1. **Determinismus:** Jede Transition ist explizit definiert. Undefinierte Zustände sind mathematisch ausgeschlossen.
2. **Guards:** Bedingungen, die vor einer Transition geprüft werden (z.B. `isConnected`, `hasRetriesLeft`).
3. **Actions:** Seiteneffekte bei Zustandsübergängen (z.B. Socket öffnen, Status aktualisieren).
4. **Visualisierung:** XState-Definitionen können grafisch dargestellt werden (stately.ai/viz).

### Zustandsdiagramm

```
                    ┌──────────────┐
                    │ DISCONNECTED │ ◄──── max retries erreicht
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
              └─────┤   BACKOFF    │ (exponentiell: 1s, 2s, 4s, 8s, ...)
                    └──────────────┘
```

> **Quelle:** XState v5 Documentation [REF-08]
> **Relevanter Arbeitspaket:** [WP 1.3 – XState Zustandsautomat](ARBEITSPAKETE.md#wp-13-xstate-zustandsautomat)

---

## 7. Backpressure-Management

### Problem: Queue Overflow im Legacy-Paket

Wenn die Polling-Rate die physische Verarbeitungsrate übersteigt (z.B. 10ms-Intervall bei 9600 Baud), wächst die interne Warteschlange unkontrolliert. Folgen:
- Massives Speicherleck
- System wird extrem träge
- Eventual: Absturz

> **Quelle:** Community-Reports im Legacy-Repository [REF-05]

### Lösung: Konfigurierbare Queue mit Drop-Strategie

| Parameter | Beschreibung | Standard |
|-----------|-------------|---------|
| **Max Queue Size** | Hartes Limit für Warteschlangengröße | 100 |
| **Drop Strategy: FIFO** | Älteste Nachricht wird verworfen | Sensor-Monitoring |
| **Drop Strategy: LIFO** | Neueste Nachricht wird verworfen | Alarm-Events |
| **Status-Anzeige** | `this.status()` zeigt Queue-Füllstand | Gelb bei >80% |

**Algorithmus:**
```
WENN queue.length >= maxQueueSize:
  WENN dropStrategy == FIFO:
    queue.shift()     // Älteste entfernen
  SONST WENN dropStrategy == LIFO:
    // Neue Nachricht wird verworfen (nicht eingereiht)
    RETURN "dropped"
queue.push(newMessage)
```

Der Memory Footprint bleibt konstant, unabhängig von der Polling-Rate des Flows.

> **Relevanter Arbeitspaket:** [WP 2.3 – Backpressure-Management](ARBEITSPAKETE.md#wp-23-backpressure-management)

---

## 8. Dynamisches Address Space Mapping

### Problem: Monolithische Speicher-Arrays

Traditionelle Modbus-Server-Implementierungen allokieren ein statisches Array für den gesamten Adressraum. Bei nicht-linearen Adressstrukturen (z.B. Daten auf Adresse 6000, 6001, 6005) wird massiv Speicher verschwendet.

### Lösung: Event-basiertes Proxy-Pattern

Der Server-Config-Node agiert als reiner TCP-Listener. Bei eingehenden Requests wird ein Event in den Node-RED-Flow publiziert:

```
Externer Modbus-Client
        │
        ▼ FC 03, Register 40108
┌───────────────────┐
│ Server Config Node │  ← TCP Listener auf Port 502
└────────┬──────────┘
         │ Event: { fc: 3, address: 107, quantity: 2 }
         ▼
┌───────────────────┐
│  Modbus-In Node   │  ← Filtert nach Adresse
└────────┬──────────┘
         │ msg.payload in den Flow
         ▼
┌───────────────────┐
│  Flow-Verarbeitung │  ← HTTP-API, Datenbank, Sensor, ...
└────────┬──────────┘
         │ Ergebnis
         ▼
┌───────────────────┐
│  Modbus-Out Node  │  ← Generiert Response-Frame
└────────┬──────────┘
         │ TCP Response
         ▼
Externer Modbus-Client
```

**Vorteile:**
- Kein verschwendeter Speicher für leere Adressbereiche
- Dynamische Datenquellen (APIs, Datenbanken) als Modbus-Register exponierbar
- Volle Kontrolle über die Response-Logik im Flow

**Optional: In-Memory Cache** für latenzkritische Anfragen (Hashmap statt Array).

> **Relevanter Arbeitspaket:** [WP 3 – Server/Slave Proxy-Nodes](ARBEITSPAKETE.md#wp-3-modbus-server--slave-proxy-nodes)

---

## 9. Analyse bestehender Implementierungen

### node-red-contrib-modbus (BiancoRoyal)

**Lizenz:** BSD-3-Clause  
**Maintainer:** Klaus Landsdorf / P4NR B2B Community  
**Geschichte:** Ursprünglich von Mika Karaila (2015), übernommen von BiancoRoyal (2016)

**Identifizierte architektonische Schwachstellen:**

1. **FSM Bottleneck:** Proprietäre, handcodierte Finite-State-Machine mit Zuständen INIT, ACTIVATED, QUEUEING, READING, EMPTY. Fehlermeldungen wie "FSM Not Ready To Read" bei asynchronen Latenzen.

2. **Queue Overflow:** Fehlende Backpressure-Mechanismen. Bei zu hoher Polling-Rate wächst die Warteschlange unkontrolliert im Arbeitsspeicher.

3. **Deployment-Leaks:** Socket-Listener werden bei Partial-Deployments nicht korrekt deregistriert (`removeListener`), was zu Event-Listener-Multiplikation führt.

> **Hinweis:** Diese Analyse basiert auf öffentlich zugänglichen GitHub Issues und Community-Berichten. Es werden keine Code-Snippets kopiert oder reproduziert. Die Analyse dient ausschließlich der architektonischen Abgrenzung für die Neuentwicklung.
> **Quelle:** GitHub BiancoRoyal/node-red-contrib-modbus [REF-05]

### Abgrenzung unserer Implementierung

| Aspekt | Legacy (BiancoRoyal) | Forge (Unser Ansatz) |
|--------|---------------------|---------------------|
| State-Management | Handcodierte FSM | XState v5 (formal verifizierbar) |
| Queue | Unbegrenzt, kein Backpressure | Konfigurierbar, FIFO/LIFO Drop |
| Server-Speicher | Statisches Array | Event-basiertes Proxy-Pattern |
| Security | Kein TLS | TLS 1.3, mTLS, Port 802 |
| Lifecycle | Leak-anfällig bei Deploy | Strikte Deregistrierung in `node.on('close')` |

---

## 10. Node.js-Bibliotheken im Vergleich

### modbus-serial (ISC-Lizenz)

- **Repository:** github.com/yaacov/node-modbus-serial
- **Fokus:** Client/Master mit exzellentem RTU- und TCP-Support
- **API:** Promise-basiert (async/await kompatibel)
- **Serialport:** Optional dependency (v13, Node.js 20+)
- **Server:** Einfacher ServerTCP mit Vector-Callbacks
- **Nutzung im Projekt:** Als **npm Dependency** für die Transportschicht

### jsmodbus (MIT-Lizenz)

- **Repository:** github.com/Cloud-Automation/node-modbus
- **Fokus:** Event-basierte Server-Architektur
- **API:** Event-Emitter Pattern
- **Nutzung im Projekt:** Als **architektonische Inspiration** für das Event-basierte Server-Proxying. Kein Code wird kopiert.

### Vergleichstabelle

| Kriterium | modbus-serial | jsmodbus |
|-----------|--------------|---------|
| Primärer Fokus | Client-Robustheit | Flexibles Eventing |
| RTU Support | Hervorragend | Gut |
| TCP Support | Sehr gut | Sehr gut |
| Server-Architektur | Callback-basiert | Event-basiert |
| Promise-API | Nativ | Teilweise |
| Lizenz | ISC | MIT |
| Wartung | Aktiv | Relativ langsam |

### Empfohlene Hybridstrategie

- **Client/Master:** `modbus-serial` als Dependency (Promise-API garantiert Stabilität im RTU-Umfeld)
- **Server/Slave:** Eigenständige, event-basierte Implementierung, inspiriert durch das Konzept von `jsmodbus`, aber ohne Code-Übernahme

> **Quellen:** npm Package Pages [REF-06, REF-07]

---

## 11. Best Practices für den industriellen Einsatz

### Strikte Logik-Trennung (Separation of Concerns)

Node-RED ist eine ereignisgesteuerte IT-Software und darf **niemals** harte Echtzeit-Steuerungslogik übernehmen:
- **Nicht mit Node-RED:** Not-Aus-Schaltungen, PID-Regler, sicherheitskritische SPS-Logik
- **Aufgabe von Node-RED:** Daten lesen, kontextualisieren (JSON), an IT-Systeme publizieren (MQTT, UNS)

> **Quelle:** FlowFuse Best Practices [REF-09]

### Effizientes Polling

- **Grouping:** Zusammenhängende Register in einem Request abfragen (z.B. FC 03, Länge 50)
- **Intervall-Anpassung:** HMI: ~1s, Cloud-Dashboard: ~60s
- **Bitwise Stuffing:** 16 Coils in ein Holding Register codieren → Netzwerklast reduzieren

### Systemresilienz

- **RBE (Report By Exception):** Filter-Node nach Modbus-Read → nur geänderte Werte weiterleiten
- **Watchdog:** Status-Überwachung via `this.status()`, Trigger-Node für Connection-Restart
- **DMZ-Platzierung:** Node-RED zwischen IT und OT (Demilitarized Zone)

> **Quelle:** FlowFuse – „Working with Modbus in Node-RED" [REF-09]

---

## Glossar

| Begriff | Definition |
|---------|-----------|
| **ADU** | Application Data Unit – vollständiges Modbus-Datenpaket inkl. Header |
| **PDU** | Protocol Data Unit – Nutzdaten ohne Transportheader |
| **CRC** | Cyclic Redundancy Check – Fehlerprüfsumme bei RTU |
| **FSM** | Finite State Machine – Endlicher Zustandsautomat |
| **mTLS** | Mutual TLS – gegenseitige Zertifikatsauthentifizierung |
| **RBAC** | Role-Based Access Control – rollenbasierte Zugriffskontrolle |
| **SCADA** | Supervisory Control and Data Acquisition |
| **SPS** | Speicherprogrammierbare Steuerung (engl. PLC) |
| **UNS** | Unified Namespace – zentraler Datenhub in IIoT-Architekturen |
| **OT** | Operational Technology – Betriebstechnologie |
| **IIoT** | Industrial Internet of Things |
| **HMI** | Human Machine Interface |
| **RBE** | Report By Exception – nur bei Wertänderung melden |
