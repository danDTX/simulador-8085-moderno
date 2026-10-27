import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Developer Tools Suite - Factual Verification', () => {
  it('Verifies 7-segment bit masks and standard 8085sim cathode values', () => {
    // 8085sim mapping:
    // bit 0: F, bit 1: A, bit 2: B, bit 3: G, bit 4: E, bit 5: D, bit 6: C, bit 7: DP
    const D7_MASKS: Record<string, number> = {
      F: 1 << 0,
      A: 1 << 1,
      B: 1 << 2,
      G: 1 << 3,
      E: 1 << 4,
      D: 1 << 5,
      C: 1 << 6,
      DP: 1 << 7
    };

    const calc7 = (segs: string[]) => {
      let val = 0;
      for (const s of segs) val |= D7_MASKS[s];
      return val;
    };

    // '0': A,B,C,D,E,F -> 77H
    assert.strictEqual(calc7(['A', 'B', 'C', 'D', 'E', 'F']), 0x77);
    // '1': B,C -> 44H
    assert.strictEqual(calc7(['B', 'C']), 0x44);
    // '2': A,B,G,E,D -> 3EH
    assert.strictEqual(calc7(['A', 'B', 'G', 'E', 'D']), 0x3E);
    // '3': A,B,G,C,D -> 6EH
    assert.strictEqual(calc7(['A', 'B', 'G', 'C', 'D']), 0x6E);
    // '8': all -> 7FH
    assert.strictEqual(calc7(['A', 'B', 'C', 'D', 'E', 'F', 'G']), 0x7F);

    // Anode common is exact bit inversion (~val & 0xFF)
    const anode0 = ~0x77 & 0xFF;
    assert.strictEqual(anode0, 0x88);
  });

  it('Verifies 15-segment Byte 1 (Internal) and Byte 2 (Perimeter) official mappings', () => {
    // Byte 1 (Puerto Par N): Trazos internos y especiales
    // bit 0: H (Diag Sup-Izq), bit 1: J (Vert Central Sup), bit 2: K (Diag Sup-Der),
    // bit 3: G1 (Media Izq), bit 4: G2 (Media Der), bit 5: N (Diag Inf-Izq),
    // bit 6: M (Vert Central Inf), bit 7: L (Diag Inf-Der)
    //
    // Byte 2 (Puerto Impar N+1): Perímetro exterior y punto decimal
    // bit 0: F (Sup-Izq), bit 1: A (Sup), bit 2: B (Sup-Der), bit 3: G (Media completa),
    // bit 4: E (Inf-Izq), bit 5: D (Inf), bit 6: C (Inf-Der), bit 7: DP (Punto Decimal)

    // Letter 'I': Byte 1 = 42H (J=bit 1, M=bit 6), Byte 2 = 22H (A=bit 1, D=bit 5)
    const b1_I = (1 << 1) | (1 << 6); // 0x42
    const b2_I = (1 << 1) | (1 << 5); // 0x22
    assert.strictEqual(b1_I, 0x42);
    assert.strictEqual(b2_I, 0x22);

    // Letter 'U': Byte 1 = 00H, Byte 2 = 75H (F=0, B=2, E=4, D=5, C=6)
    const b2_U = (1 << 0) | (1 << 2) | (1 << 4) | (1 << 5) | (1 << 6);
    assert.strictEqual(b2_U, 0x75);

    // Little endian word for 'I':
    const word_I = (b2_I << 8) | b1_I;
    assert.strictEqual(word_I, 0x2242);
  });

  it('Verifies ASCII string-to-dB single-line generator rule', () => {
    const text = 'HOLA';
    const hexParts = [];
    for (let i = 0; i < text.length; i++) {
      hexParts.push(text.charCodeAt(i).toString(16).padStart(2, '0').toUpperCase() + 'H');
    }
    hexParts.push('00H'); // null terminator

    const dbLine = `dB ${hexParts.join(', ')}`;
    assert.strictEqual(dbLine, 'dB 48H, 4FH, 4CH, 41H, 00H');
    assert.strictEqual(dbLine.includes('\n'), false, 'Directiva dB must be in a single line');
  });

  it('Verifies Programmer Calculator two-complement and bitwise operations', () => {
    // 8-bit negative numbers
    const val = 0xFE; // 254 unsigned, -2 signed
    const signed8 = val >= 0x80 ? val - 0x100 : val;
    assert.strictEqual(signed8, -2);

    // Two's complement of 1
    const neg1 = (~1 + 1) & 0xFF;
    assert.strictEqual(neg1, 0xFF);

    // ROL on 8-bit: 0x81 -> 0x03
    const rotateLeft = (v: number) => {
      const msb = (v >> 7) & 1;
      return ((v << 1) | msb) & 0xFF;
    };
    assert.strictEqual(rotateLeft(0x81), 0x03);
  });
});
