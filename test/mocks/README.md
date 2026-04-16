# Mock-Objekte Katalog

> PFLICHTDOKUMENT: Jede Mock-Datei in diesem Verzeichnis MUSS hier katalogisiert sein.
> Siehe auch: [Testhandbuch](../../docs/TESTHANDBUCH.md) | [agents.md](../../agents.md) §5

---

## Verzeichnisstruktur

```
test/mocks/
├── README.md                 ← Dieses Dokument (Katalog)
├── mock-serial-port.js       # Mock für serialport (geplant: MS-1)
├── mock-tcp-socket.js        # Mock für net.Socket (geplant: MS-1)
└── mock-modbus-server.js     # Mock Modbus TCP Server (geplant: MS-3)
```

## Katalog

| Datei | Simuliert | Verwendet in | Zuletzt aktualisiert | Entfernbar? | Abhängigkeiten |
|-------|----------|-------------|---------------------|-------------|---------------|
| _noch leer_ | Wird in MS-1 (WP 1.1) erstellt | — | — | — | — |

---

## Richtlinien

### Header-Pflicht

Jede Mock-Datei MUSS folgenden Header-Kommentar enthalten:

```javascript
/**
 * MOCK: [Kurzbeschreibung]
 * SIMULIERT: [Was wird simuliert?]
 * VERWENDET IN: [Liste der Test-Dateien]
 * ZULETZT AKTUALISIERT: [Datum]
 * ENTFERNBAR: [ja/nein – Begründung]
 * ABHÄNGIGKEITEN: [Welche Module werden gemockt?]
 */
```

### Allgemeine Regeln

1. **Jede neue Mock-Datei** muss in der obigen Tabelle eingetragen werden
2. **Mocks dürfen nur in `test/`** verwendet werden, NIEMALS in `src/`
3. **Naming Convention:** `mock-<was-gemockt-wird>.js`
4. **Mocks müssen deterministisch sein** – keine zufälligen Werte ohne Seed
5. **Mocks müssen die reale API möglichst genau nachbilden** – gleiche Methodennamen und Signaturen
6. **Cleanup:** Mocks die nicht mehr benötigt werden, entfernen und aus diesem Katalog streichen
