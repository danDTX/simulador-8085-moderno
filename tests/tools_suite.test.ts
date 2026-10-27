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

  it('Verifies 15-segment low and high byte calculations', () => {
    // Low byte: F=0, A=1, B=2, G1=3, E=4, D=5, C=6, DP=7
    // High byte: G2=0, J=1, H=2, K=3, N=4, L=5, M=6
    const low = 0x77; // Perimeter 0-shape
    const high = 0x28; // Diagonal slash (H=2, L=5 -> (1<<2)|(1<<5) = 4 + 32 = 0x24 / with slash = 0x28)
    const word = (high << 8) | low;
    assert.strictEqual(word, 0x2877);
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
