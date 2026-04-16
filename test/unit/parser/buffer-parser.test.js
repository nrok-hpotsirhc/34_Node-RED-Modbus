'use strict';

const { expect } = require('chai');
const {
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
} = require('../../../src/lib/parser/buffer-parser');

describe('BufferParser', function () {

  // ---- BYTE_ORDER constants ----

  describe('BYTE_ORDER', function () {
    it('should expose four byte order constants', function () {
      expect(BYTE_ORDER.BE).to.equal('BE');
      expect(BYTE_ORDER.LE).to.equal('LE');
      expect(BYTE_ORDER.BE_BS).to.equal('BE_BS');
      expect(BYTE_ORDER.LE_BS).to.equal('LE_BS');
    });

    it('should be frozen', function () {
      expect(Object.isFrozen(BYTE_ORDER)).to.be.true;
    });
  });

  // ---- registersToBuffer ----

  describe('registersToBuffer()', function () {
    it('should convert a single register to a 2-byte big-endian buffer', function () {
      const buf = registersToBuffer([0x04D2]);
      expect(buf).to.deep.equal(Buffer.from([0x04, 0xD2]));
    });

    it('should convert multiple registers', function () {
      const buf = registersToBuffer([0x04D2, 0x162E]);
      expect(buf).to.deep.equal(Buffer.from([0x04, 0xD2, 0x16, 0x2E]));
    });

    it('should handle zero values', function () {
      const buf = registersToBuffer([0x0000, 0x0000]);
      expect(buf).to.deep.equal(Buffer.from([0x00, 0x00, 0x00, 0x00]));
    });

    it('should handle max 16-bit value', function () {
      const buf = registersToBuffer([0xFFFF]);
      expect(buf).to.deep.equal(Buffer.from([0xFF, 0xFF]));
    });

    it('should mask values to 16 bits', function () {
      const buf = registersToBuffer([0x1FFFF]); // > 16-bit
      expect(buf).to.deep.equal(Buffer.from([0xFF, 0xFF]));
    });

    it('should throw for non-array input', function () {
      expect(() => registersToBuffer('not-array')).to.throw(TypeError);
    });

    it('should handle empty array', function () {
      const buf = registersToBuffer([]);
      expect(buf.length).to.equal(0);
    });
  });

  // ---- parseFloat32 ----

  describe('parseFloat32()', function () {
    // Known value: 123456.0 as IEEE 754 Float32
    // Hex: 0x47F12000 → registers [0x47F1, 0x2000] in BE

    it('should parse Float32 in BE order (AB CD)', function () {
      const result = parseFloat32([0x47F1, 0x2000], BYTE_ORDER.BE);
      expect(result).to.be.closeTo(123456.0, 0.1);
    });

    it('should parse Float32 in LE order (CD AB)', function () {
      // LE swaps the two words: [low, high] = [0x2000, 0x47F1]
      const result = parseFloat32([0x2000, 0x47F1], BYTE_ORDER.LE);
      expect(result).to.be.closeTo(123456.0, 0.1);
    });

    it('should parse Float32 in BE_BS order (BA DC)', function () {
      // Bytes within each word are swapped: [0xF147, 0x0020]
      const result = parseFloat32([0xF147, 0x0020], BYTE_ORDER.BE_BS);
      expect(result).to.be.closeTo(123456.0, 0.1);
    });

    it('should parse Float32 in LE_BS order (DC BA)', function () {
      // Both word and byte swap: [0x0020, 0xF147]
      const result = parseFloat32([0x0020, 0xF147], BYTE_ORDER.LE_BS);
      expect(result).to.be.closeTo(123456.0, 0.1);
    });

    it('should default to BE when no byte order specified', function () {
      const result = parseFloat32([0x47F1, 0x2000]);
      expect(result).to.be.closeTo(123456.0, 0.1);
    });

    // Known value: 1.0 as IEEE 754 → 0x3F800000 → [0x3F80, 0x0000]
    it('should parse 1.0 correctly', function () {
      const result = parseFloat32([0x3F80, 0x0000], BYTE_ORDER.BE);
      expect(result).to.be.closeTo(1.0, 1e-6);
    });

    // Known value: -1.0 → 0xBF800000 → [0xBF80, 0x0000]
    it('should parse negative float (-1.0)', function () {
      const result = parseFloat32([0xBF80, 0x0000], BYTE_ORDER.BE);
      expect(result).to.be.closeTo(-1.0, 1e-6);
    });

    // Known value: 0.0 → 0x00000000 → [0x0000, 0x0000]
    it('should parse 0.0', function () {
      const result = parseFloat32([0x0000, 0x0000], BYTE_ORDER.BE);
      expect(result).to.equal(0.0);
    });

    // Known value: 3.14 ≈ 0x4048F5C3 → [0x4048, 0xF5C3]
    it('should parse pi approximation (3.14)', function () {
      const result = parseFloat32([0x4048, 0xF5C3], BYTE_ORDER.BE);
      expect(result).to.be.closeTo(3.14, 0.01);
    });

    it('should throw for non-array input', function () {
      expect(() => parseFloat32(1234)).to.throw(RangeError);
    });

    it('should throw for array with wrong length', function () {
      expect(() => parseFloat32([0x47F1])).to.throw(RangeError);
      expect(() => parseFloat32([0x47F1, 0x2000, 0x0000])).to.throw(RangeError);
    });

    it('should throw for non-number register values', function () {
      expect(() => parseFloat32(['a', 'b'])).to.throw(TypeError);
    });

    it('should throw for unknown byte order', function () {
      expect(() => parseFloat32([0x47F1, 0x2000], 'INVALID')).to.throw(RangeError);
    });
  });

  // ---- parseUInt32 ----

  describe('parseUInt32()', function () {
    it('should parse UInt32 in BE order', function () {
      // 0x00010000 = 65536
      const result = parseUInt32([0x0001, 0x0000], BYTE_ORDER.BE);
      expect(result).to.equal(65536);
    });

    it('should parse UInt32 in LE order', function () {
      const result = parseUInt32([0x0000, 0x0001], BYTE_ORDER.LE);
      expect(result).to.equal(65536);
    });

    it('should parse max UInt32 (4294967295)', function () {
      const result = parseUInt32([0xFFFF, 0xFFFF], BYTE_ORDER.BE);
      expect(result).to.equal(4294967295);
    });

    it('should parse zero', function () {
      const result = parseUInt32([0x0000, 0x0000], BYTE_ORDER.BE);
      expect(result).to.equal(0);
    });

    it('should parse 305419896 (0x12345678)', function () {
      const result = parseUInt32([0x1234, 0x5678], BYTE_ORDER.BE);
      expect(result).to.equal(0x12345678);
    });

    it('should throw for non-pair arrays', function () {
      expect(() => parseUInt32([1])).to.throw(RangeError);
    });
  });

  // ---- parseInt32 ----

  describe('parseInt32()', function () {
    it('should parse positive Int32', function () {
      const result = parseInt32([0x0000, 0x0001], BYTE_ORDER.BE);
      expect(result).to.equal(1);
    });

    it('should parse negative Int32', function () {
      // -1 as signed 32-bit: 0xFFFFFFFF → [0xFFFF, 0xFFFF]
      const result = parseInt32([0xFFFF, 0xFFFF], BYTE_ORDER.BE);
      expect(result).to.equal(-1);
    });

    it('should parse -32768 (0xFFFF8000)', function () {
      const result = parseInt32([0xFFFF, 0x8000], BYTE_ORDER.BE);
      expect(result).to.equal(-32768);
    });

    it('should parse max Int32 (2147483647)', function () {
      const result = parseInt32([0x7FFF, 0xFFFF], BYTE_ORDER.BE);
      expect(result).to.equal(2147483647);
    });

    it('should parse min Int32 (-2147483648)', function () {
      const result = parseInt32([0x8000, 0x0000], BYTE_ORDER.BE);
      expect(result).to.equal(-2147483648);
    });
  });

  // ---- parseInt16 ----

  describe('parseInt16()', function () {
    it('should parse positive signed value', function () {
      expect(parseInt16(100)).to.equal(100);
    });

    it('should interpret 0xFFFF as -1', function () {
      expect(parseInt16(0xFFFF)).to.equal(-1);
    });

    it('should interpret 0x8000 as -32768', function () {
      expect(parseInt16(0x8000)).to.equal(-32768);
    });

    it('should interpret 0x7FFF as 32767', function () {
      expect(parseInt16(0x7FFF)).to.equal(32767);
    });

    it('should handle zero', function () {
      expect(parseInt16(0)).to.equal(0);
    });

    it('should throw for non-number', function () {
      expect(() => parseInt16('abc')).to.throw(TypeError);
    });

    it('should throw for NaN', function () {
      expect(() => parseInt16(NaN)).to.throw(TypeError);
    });
  });

  // ---- parseUInt16 ----

  describe('parseUInt16()', function () {
    it('should return unsigned value', function () {
      expect(parseUInt16(0xFFFF)).to.equal(65535);
    });

    it('should handle zero', function () {
      expect(parseUInt16(0)).to.equal(0);
    });

    it('should mask to 16 bits', function () {
      expect(parseUInt16(0x1FFFF)).to.equal(0xFFFF);
    });

    it('should throw for non-number', function () {
      expect(() => parseUInt16(null)).to.throw(TypeError);
    });
  });

  // ---- parseFloat32Array ----

  describe('parseFloat32Array()', function () {
    it('should parse multiple Float32 values', function () {
      // 1.0 = [0x3F80, 0x0000], 123456.0 = [0x47F1, 0x2000]
      const result = parseFloat32Array([0x3F80, 0x0000, 0x47F1, 0x2000], BYTE_ORDER.BE);
      expect(result).to.have.lengthOf(2);
      expect(result[0]).to.be.closeTo(1.0, 1e-6);
      expect(result[1]).to.be.closeTo(123456.0, 0.1);
    });

    it('should throw for odd number of registers', function () {
      expect(() => parseFloat32Array([0x3F80, 0x0000, 0x47F1])).to.throw(RangeError);
    });

    it('should throw for empty array', function () {
      expect(() => parseFloat32Array([])).to.throw(RangeError);
    });
  });

  // ---- parseUInt32Array ----

  describe('parseUInt32Array()', function () {
    it('should parse multiple UInt32 values', function () {
      const result = parseUInt32Array([0x0001, 0x0000, 0x0000, 0x0001], BYTE_ORDER.BE);
      expect(result).to.deep.equal([65536, 1]);
    });

    it('should throw for odd number of registers', function () {
      expect(() => parseUInt32Array([0x0001])).to.throw(RangeError);
    });
  });

  // ---- parseInt32Array ----

  describe('parseInt32Array()', function () {
    it('should parse multiple Int32 values', function () {
      // 1 = [0x0000, 0x0001], -1 = [0xFFFF, 0xFFFF]
      const result = parseInt32Array([0x0000, 0x0001, 0xFFFF, 0xFFFF], BYTE_ORDER.BE);
      expect(result).to.deep.equal([1, -1]);
    });

    it('should throw for odd number of registers', function () {
      expect(() => parseInt32Array([0x0001])).to.throw(RangeError);
    });
  });
});
