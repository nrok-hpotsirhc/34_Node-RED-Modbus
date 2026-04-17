'use strict';

/**
 * Buffer parser for Modbus register/coil data.
 *
 * Handles the endianness challenge inherent in Modbus communication:
 * - Modbus transmits 16-bit registers in big-endian (MSB first).
 * - 32-bit values (Float32, UInt32, Int32) span two consecutive registers.
 * - The word order of those two registers is device-dependent.
 *
 * Supported byte orders:
 *   BE     – Big-Endian (AB CD)         – high word first (Modbus standard)
 *   LE     – Little-Endian (CD AB)      – low word first
 *   BE_BS  – Big-Endian Byte Swap (BA DC)
 *   LE_BS  – Little-Endian Byte Swap (DC BA)
 *
 * @module parser/buffer-parser
 */

/**
 * Valid byte order identifiers.
 * @readonly
 * @enum {string}
 */
const BYTE_ORDER = Object.freeze({
  BE: 'BE',
  LE: 'LE',
  BE_BS: 'BE_BS',
  LE_BS: 'LE_BS'
});

/**
 * Convert an array of 16-bit register values to a Buffer.
 * Each register occupies two bytes in big-endian order (Modbus standard).
 *
 * @param {number[]} registers - Array of 16-bit unsigned integers.
 * @returns {Buffer}
 */
function registersToBuffer(registers) {
  if (!Array.isArray(registers)) {
    throw new TypeError('registers must be an array');
  }
  const buf = Buffer.alloc(registers.length * 2);
  for (let i = 0; i < registers.length; i++) {
    buf.writeUInt16BE(registers[i] & 0xFFFF, i * 2);
  }
  return buf;
}

/**
 * Rearrange 4 bytes from a pair of registers according to the specified byte order.
 *
 * @param {Buffer} buf - 4-byte buffer (2 registers, big-endian).
 * @param {string} byteOrder - One of BYTE_ORDER values.
 * @returns {Buffer} 4-byte buffer in the canonical big-endian order for DataView.
 * @private
 */
function _reorderBytes(buf, byteOrder) {
  const out = Buffer.alloc(4);
  switch (byteOrder) {
    case BYTE_ORDER.BE: // AB CD – already in order
      out[0] = buf[0];
      out[1] = buf[1];
      out[2] = buf[2];
      out[3] = buf[3];
      break;
    case BYTE_ORDER.LE: // CD AB – swap words
      out[0] = buf[2];
      out[1] = buf[3];
      out[2] = buf[0];
      out[3] = buf[1];
      break;
    case BYTE_ORDER.BE_BS: // BA DC – swap bytes within words
      out[0] = buf[1];
      out[1] = buf[0];
      out[2] = buf[3];
      out[3] = buf[2];
      break;
    case BYTE_ORDER.LE_BS: // DC BA – swap both words and bytes
      out[0] = buf[3];
      out[1] = buf[2];
      out[2] = buf[1];
      out[3] = buf[0];
      break;
    default:
      throw new RangeError(`Unknown byte order: ${byteOrder}`);
  }
  return out;
}

/**
 * Parse a Float32 (IEEE 754) value from two consecutive 16-bit registers.
 *
 * @param {number[]} registers - Array of exactly 2 unsigned 16-bit values.
 * @param {string} [byteOrder='BE'] - Byte order for word arrangement.
 * @returns {number} Parsed 32-bit float.
 */
function parseFloat32(registers, byteOrder = BYTE_ORDER.BE) {
  _validateRegisterPair(registers);
  const buf = registersToBuffer(registers);
  const ordered = _reorderBytes(buf, byteOrder);
  return ordered.readFloatBE(0);
}

/**
 * Parse a UInt32 value from two consecutive 16-bit registers.
 *
 * @param {number[]} registers - Array of exactly 2 unsigned 16-bit values.
 * @param {string} [byteOrder='BE'] - Byte order for word arrangement.
 * @returns {number} Parsed 32-bit unsigned integer.
 */
function parseUInt32(registers, byteOrder = BYTE_ORDER.BE) {
  _validateRegisterPair(registers);
  const buf = registersToBuffer(registers);
  const ordered = _reorderBytes(buf, byteOrder);
  return ordered.readUInt32BE(0);
}

/**
 * Parse an Int32 value from two consecutive 16-bit registers.
 *
 * @param {number[]} registers - Array of exactly 2 unsigned 16-bit values.
 * @param {string} [byteOrder='BE'] - Byte order for word arrangement.
 * @returns {number} Parsed 32-bit signed integer.
 */
function parseInt32(registers, byteOrder = BYTE_ORDER.BE) {
  _validateRegisterPair(registers);
  const buf = registersToBuffer(registers);
  const ordered = _reorderBytes(buf, byteOrder);
  return ordered.readInt32BE(0);
}

/**
 * Parse an Int16 value from a single 16-bit register.
 *
 * @param {number} register - Unsigned 16-bit register value.
 * @returns {number} Signed 16-bit integer.
 */
function parseInt16(register) {
  if (typeof register !== 'number' || !Number.isFinite(register)) {
    throw new TypeError('register must be a finite number');
  }
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(register & 0xFFFF, 0);
  return buf.readInt16BE(0);
}

/**
 * Parse a UInt16 value from a single 16-bit register.
 *
 * @param {number} register - Unsigned 16-bit register value.
 * @returns {number} Unsigned 16-bit integer.
 */
function parseUInt16(register) {
  if (typeof register !== 'number' || !Number.isFinite(register)) {
    throw new TypeError('register must be a finite number');
  }
  return register & 0xFFFF;
}

/**
 * Parse an array of registers into an array of Float32 values.
 * Registers are consumed in pairs (2 registers per Float32).
 *
 * @param {number[]} registers - Array of unsigned 16-bit values (length must be even).
 * @param {string} [byteOrder='BE'] - Byte order for word arrangement.
 * @returns {number[]} Array of parsed Float32 values.
 */
function parseFloat32Array(registers, byteOrder = BYTE_ORDER.BE) {
  if (!Array.isArray(registers) || registers.length === 0 || registers.length % 2 !== 0) {
    throw new RangeError('registers array must be non-empty with an even number of elements');
  }
  const result = [];
  for (let i = 0; i < registers.length; i += 2) {
    result.push(parseFloat32([registers[i], registers[i + 1]], byteOrder));
  }
  return result;
}

/**
 * Parse an array of registers into an array of UInt32 values.
 *
 * @param {number[]} registers - Array of unsigned 16-bit values (length must be even).
 * @param {string} [byteOrder='BE'] - Byte order for word arrangement.
 * @returns {number[]} Array of parsed UInt32 values.
 */
function parseUInt32Array(registers, byteOrder = BYTE_ORDER.BE) {
  if (!Array.isArray(registers) || registers.length === 0 || registers.length % 2 !== 0) {
    throw new RangeError('registers array must be non-empty with an even number of elements');
  }
  const result = [];
  for (let i = 0; i < registers.length; i += 2) {
    result.push(parseUInt32([registers[i], registers[i + 1]], byteOrder));
  }
  return result;
}

/**
 * Parse an array of registers into an array of Int32 values.
 *
 * @param {number[]} registers - Array of unsigned 16-bit values (length must be even).
 * @param {string} [byteOrder='BE'] - Byte order for word arrangement.
 * @returns {number[]} Array of parsed Int32 values.
 */
function parseInt32Array(registers, byteOrder = BYTE_ORDER.BE) {
  if (!Array.isArray(registers) || registers.length === 0 || registers.length % 2 !== 0) {
    throw new RangeError('registers array must be non-empty with an even number of elements');
  }
  const result = [];
  for (let i = 0; i < registers.length; i += 2) {
    result.push(parseInt32([registers[i], registers[i + 1]], byteOrder));
  }
  return result;
}

/**
 * Validate that the input is a pair of registers.
 * @param {number[]} registers
 * @throws {TypeError|RangeError}
 * @private
 */
function _validateRegisterPair(registers) {
  if (!Array.isArray(registers) || registers.length !== 2) {
    throw new RangeError('Expected an array of exactly 2 register values');
  }
  for (let i = 0; i < 2; i++) {
    const v = registers[i];
    if (typeof v !== 'number') {
      throw new TypeError(`Register ${i} must be a number, got: ${typeof v}`);
    }
    if (!Number.isFinite(v) || !Number.isInteger(v) || v < 0 || v > 0xFFFF) {
      throw new RangeError(`Register ${i} must be an integer in [0, 65535], got: ${v}`);
    }
  }
}

module.exports = {
  BYTE_ORDER,
  registersToBuffer,
  parseFloat32,
  parseUInt32,
  parseInt32,
  parseInt16,
  parseUInt16,
  parseFloat32Array,
  parseUInt32Array,
  parseInt32Array
};
