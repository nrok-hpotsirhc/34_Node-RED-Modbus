# Test-Fixtures Katalog

> PFLICHTDOKUMENT: Jede Fixture-Datei in diesem Verzeichnis MUSS hier katalogisiert sein.
> Siehe auch: [Testhandbuch](../../docs/TESTHANDBUCH.md) | [agents.md](../../agents.md) §5

---

## Verzeichnisstruktur

```
test/fixtures/
├── README.md              ← Dieses Dokument (Katalog)
├── register-maps/         # Beispiel-Register-Maps verschiedener Geräte
└── certs/                 # Selbstsignierte Test-Zertifikate
```

## Katalog

### register-maps/

| Datei | Beschreibung | Verwendet in | Zuletzt aktualisiert | Entfernbar? |
|-------|-------------|-------------|---------------------|-------------|
| _noch leer_ | Wird in MS-3 (WP 2.1/2.4) befüllt | — | — | — |

### certs/

| Datei | Beschreibung | Verwendet in | Zuletzt aktualisiert | Entfernbar? |
|-------|-------------|-------------|---------------------|-------------|
| _noch leer_ | Wird in MS-7 (WP 4.1–4.3) befüllt | — | — | — |

---

## Richtlinien

1. **Jede neue Fixture-Datei** muss in der obigen Tabelle eingetragen werden
2. **Keine Produktionsdaten** – nur synthetische, generierte Testdaten
3. **Keine echten Zertifikate** – nur selbstsignierte für Tests
4. **Beschreibung** muss klar beschreiben, was die Fixture simuliert
5. **Verwendet in** muss die Test-Dateien auflisten, die diese Fixture nutzen
