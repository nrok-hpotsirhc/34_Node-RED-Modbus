# Test Fixtures Catalog
> MANDATORY DOCUMENT: Every fixture file in this directory MUST be cataloged here.
> See also: [Test Manual](../../docs/TEST_MANUAL.md) | [agents.md](../../agents.md) §5
---
## Directory Structure
```
test/fixtures/
├── README.md              ← This document (catalog)
├── register-maps/         # Example register maps of various devices
└── certs/                 # Self-signed test certificates
```
## Catalog
### register-maps/
| File | Description | Used In | Last Updated | Removable? |
|------|-------------|---------|-------------|------------|
| `energy-meter.json` | Generic energy meter register map with Float32, UInt32, UInt16 values | `test/unit/parser/*.test.js`, `test/integration/modbus-read.test.js` | 2026-04-16 | no – used for parser and integration tests |
| `temperature-sensor.json` | Temperature sensor with Float32 values in all 4 byte order variants | `test/unit/parser/buffer-parser.test.js` | 2026-04-16 | no – used for endianness tests |
| `digital-io.json` | Digital I/O module with coils and discrete inputs | `test/integration/modbus-read.test.js` | 2026-04-16 | no – used for boolean data tests |
### certs/
| File | Description | Used In | Last Updated | Removable? |
|------|-------------|---------|-------------|------------|
| _empty_ | Will be populated in MS-7 (WP 4.1–4.3) | — | — | — |
---
## Guidelines
1. **Every new fixture file** must be registered in the table above
2. **No production data** – only synthetic, generated test data
3. **No real certificates** – only self-signed for tests
4. **Description** must clearly state what the fixture simulates
5. **Used In** must list the test files that use this fixture
