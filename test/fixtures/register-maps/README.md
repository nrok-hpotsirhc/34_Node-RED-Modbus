# Register Maps – Test Fixtures

> Static example register maps for testing Modbus read/write operations.
> These represent typical industrial device configurations.

## Files

| File | Description | Used In |
|------|-------------|---------|
| `energy-meter.json` | Typical energy meter register map (Holding Registers) | `test/unit/parser/*.test.js`, `test/integration/modbus-read.test.js` |
| `temperature-sensor.json` | Temperature sensor with Float32 values | `test/unit/parser/buffer-parser.test.js` |
| `digital-io.json` | Digital I/O module with coils and discrete inputs | `test/integration/modbus-read.test.js` |
