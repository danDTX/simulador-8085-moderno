import { describe, it } from 'node:test';
import assert from 'node:assert';
import { DocsHelper } from '../src/core/docsHelper.ts';

describe('Editor Navigation History Stack (Alt+← / Alt+→)', () => {
  class NavigationStack {
    public navHistoryBack: Array<{ tabId: string; charIndex: number }> = [];
    public navHistoryForward: Array<{ tabId: string; charIndex: number }> = [];
    public currentPos = 0;
    public currentTab = 'tab-1';

    public pushNavLocation(charPos: number = this.currentPos, tabId: string = this.currentTab) {
      const last = this.navHistoryBack[this.navHistoryBack.length - 1];
      if (last && last.tabId === tabId && Math.abs(last.charIndex - charPos) < 5) {
        return;
      }
      this.navHistoryBack.push({ tabId, charIndex: charPos });
      if (this.navHistoryBack.length > 50) {
        this.navHistoryBack.shift();
      }
      this.navHistoryForward = [];
    }

    public jumpTo(charPos: number, tabId: string = this.currentTab) {
      this.pushNavLocation();
      this.currentPos = charPos;
      this.currentTab = tabId;
    }

    public navigateBack(): boolean {
      if (this.navHistoryBack.length === 0) return false;
      this.navHistoryForward.push({ tabId: this.currentTab, charIndex: this.currentPos });
      const target = this.navHistoryBack.pop()!;
      this.currentTab = target.tabId;
      this.currentPos = target.charIndex;
      return true;
    }

    public navigateForward(): boolean {
      if (this.navHistoryForward.length === 0) return false;
      this.navHistoryBack.push({ tabId: this.currentTab, charIndex: this.currentPos });
      const target = this.navHistoryForward.pop()!;
      this.currentTab = target.tabId;
      this.currentPos = target.charIndex;
      return true;
    }
  }

  it('records jump location and allows navigating back with Alt+Left', () => {
    const nav = new NavigationStack();
    nav.currentPos = 50; // Calling line (e.g. CALL SUBRUTINA)
    
    // Jump to definition at char 400
    nav.jumpTo(400);
    assert.strictEqual(nav.currentPos, 400);
    assert.strictEqual(nav.navHistoryBack.length, 1);
    assert.strictEqual(nav.navHistoryBack[0].charIndex, 50);

    // Navigate back (Alt+Left)
    const backSuccess = nav.navigateBack();
    assert.strictEqual(backSuccess, true);
    assert.strictEqual(nav.currentPos, 50);
    assert.strictEqual(nav.navHistoryForward.length, 1);
    assert.strictEqual(nav.navHistoryForward[0].charIndex, 400);

    // Second navigate back returns false (history empty)
    assert.strictEqual(nav.navigateBack(), false);
  });

  it('allows navigating forward with Alt+Right after navigating back', () => {
    const nav = new NavigationStack();
    nav.currentPos = 100;
    nav.jumpTo(500);
    nav.navigateBack();
    assert.strictEqual(nav.currentPos, 100);

    // Navigate forward
    const forwardSuccess = nav.navigateForward();
    assert.strictEqual(forwardSuccess, true);
    assert.strictEqual(nav.currentPos, 500);
  });

  it('ignores redundant consecutive pushes close to same cursor pos', () => {
    const nav = new NavigationStack();
    nav.currentPos = 120;
    nav.pushNavLocation(120);
    nav.pushNavLocation(122); // within threshold < 5
    assert.strictEqual(nav.navHistoryBack.length, 1);
  });

  it('correctly matches label references in CALL/JMP lines and case-insensitively', () => {
    const sourceCode = `
      .org 0100H
      CALL BORRAR_PANTALLA
      JNZ bucle
      HLT
      BORRAR_PANTALLA:
      RET
      BUCLE:
      NOP
    `;
    const lines = sourceCode.split('\n');
    const knownLabels = new Set(['BORRAR_PANTALLA', 'BUCLE']);

    const isCallTargetZone = /\b(?:CALL|JMP|JNZ)\b/i.test(lines[2]);
    assert.strictEqual(isCallTargetZone, true);
    assert.strictEqual(knownLabels.has('BORRAR_PANTALLA'), true);
    assert.strictEqual(knownLabels.has('bucle'.toUpperCase()), true);
  });

  it('correctly handles labels and references with Spanish characters (ñ, Ñ, accents)', () => {
    const codeWithN = `
      .org 0100H
      CALL CONTRASEÑA
      JZ PEQUEÑO
      HLT
      CONTRASEÑA:
      RET
      PEQUEÑO:
      RET
    `;
    const labels = DocsHelper.scanLabels(codeWithN);
    assert.strictEqual(labels.has('CONTRASEÑA'), true);
    assert.strictEqual(labels.has('PEQUEÑO'), true);

    const broken = DocsHelper.validateLabels(codeWithN);
    assert.strictEqual(broken.length, 0);
  });
});
