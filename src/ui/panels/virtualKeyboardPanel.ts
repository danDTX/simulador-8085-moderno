import { PeripheralsManager } from '../../core/peripherals.js';

export function createVirtualKeyboardPanel(perifs: PeripheralsManager): HTMLElement {
  const panel = document.createElement('div');
  panel.className = 'panel-virtual-keyboard';

  panel.innerHTML = `
    <div class="vk-container">
      <div class="vk-main-area">
        <!-- Main alphanumeric keyboard -->
        <div class="vk-alpha-block">
          <!-- Row 1: Numbers -->
          <div class="vk-row">
            <button class="vk-key" data-key="|">|</button>
            <button class="vk-key" data-key="1">1</button>
            <button class="vk-key" data-key="2">2</button>
            <button class="vk-key" data-key="3">3</button>
            <button class="vk-key" data-key="4">4</button>
            <button class="vk-key" data-key="5">5</button>
            <button class="vk-key" data-key="6">6</button>
            <button class="vk-key" data-key="7">7</button>
            <button class="vk-key" data-key="8">8</button>
            <button class="vk-key" data-key="9">9</button>
            <button class="vk-key" data-key="0">0</button>
            <button class="vk-key" data-key="'">'</button>
            <button class="vk-key" data-key="=">=</button>
            <button class="vk-key" data-key="?">?</button>
            <button class="vk-key vk-wide-backspace" data-key="\b">&lt;--</button>
          </div>
          <!-- Row 2: QWERTY -->
          <div class="vk-row">
            <button class="vk-key vk-wide-tab" data-key="\t">TAB</button>
            <button class="vk-key" data-key="Q">Q</button>
            <button class="vk-key" data-key="W">W</button>
            <button class="vk-key" data-key="E">E</button>
            <button class="vk-key" data-key="R">R</button>
            <button class="vk-key" data-key="T">T</button>
            <button class="vk-key" data-key="Y">Y</button>
            <button class="vk-key" data-key="U">U</button>
            <button class="vk-key" data-key="I">I</button>
            <button class="vk-key" data-key="O">O</button>
            <button class="vk-key" data-key="P">P</button>
            <button class="vk-key" data-key="[">[</button>
            <button class="vk-key" data-key="]">]</button>
          </div>
          <!-- Row 3: ASDF -->
          <div class="vk-row">
            <button class="vk-key vk-wide-caps" id="vk-caps">Mays <span class="vk-led" id="vk-caps-led"></span></button>
            <button class="vk-key" data-key="A">A</button>
            <button class="vk-key" data-key="S">S</button>
            <button class="vk-key" data-key="D">D</button>
            <button class="vk-key" data-key="F">F</button>
            <button class="vk-key" data-key="G">G</button>
            <button class="vk-key" data-key="H">H</button>
            <button class="vk-key" data-key="J">J</button>
            <button class="vk-key" data-key="K">K</button>
            <button class="vk-key" data-key="L">L</button>
            <button class="vk-key" data-key="Ñ">Ñ</button>
            <button class="vk-key" data-key="{">{</button>
            <button class="vk-key" data-key="}">}</button>
            <button class="vk-key vk-wide-enter" data-key="\r">Ent</button>
          </div>
          <!-- Row 4: ZXCV -->
          <div class="vk-row">
            <button class="vk-key" data-key="<">&lt;</button>
            <button class="vk-key" data-key=">">&gt;</button>
            <button class="vk-key" data-key="Z">Z</button>
            <button class="vk-key" data-key="X">X</button>
            <button class="vk-key" data-key="C">C</button>
            <button class="vk-key" data-key="V">V</button>
            <button class="vk-key" data-key="B">B</button>
            <button class="vk-key" data-key="N">N</button>
            <button class="vk-key" data-key="M">M</button>
            <button class="vk-key" data-key=",">,</button>
            <button class="vk-key" data-key=".">.</button>
            <button class="vk-key" data-key=";">;</button>
            <button class="vk-key" data-key=":">:</button>
            <button class="vk-key" data-key='"'>"</button>
            <button class="vk-key" data-key="~">~</button>
          </div>
          <!-- Row 5: Space & Arrows -->
          <div class="vk-row">
            <button class="vk-key" data-key="|">|</button>
            <button class="vk-key" data-key="'">'</button>
            <button class="vk-key vk-space" data-key=" ">ESPACIO</button>
            <div class="vk-arrows-box">
              <button class="vk-key vk-arrow" data-key="^">&#9650;</button>
              <div style="display: flex;">
                <button class="vk-key vk-arrow" data-key="<">&#9664;</button>
                <button class="vk-key vk-arrow" data-key="v">&#9660;</button>
                <button class="vk-key vk-arrow" data-key=">">&#9654;</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Numeric Keypad (Keypad) -->
        <div class="vk-num-block">
          <div class="vk-row">
            <button class="vk-key" data-key="^">^</button>
            <button class="vk-key" data-key="/">/</button>
            <button class="vk-key" data-key="*">*</button>
            <button class="vk-key" data-key="-">-</button>
          </div>
          <div class="vk-row">
            <button class="vk-key" data-key="7">7</button>
            <button class="vk-key" data-key="8">8</button>
            <button class="vk-key" data-key="9">9</button>
            <button class="vk-key vk-tall-plus" data-key="+">+</button>
          </div>
          <div class="vk-row">
            <button class="vk-key" data-key="4">4</button>
            <button class="vk-key" data-key="5">5</button>
            <button class="vk-key" data-key="6">6</button>
          </div>
          <div class="vk-row">
            <button class="vk-key" data-key="1">1</button>
            <button class="vk-key" data-key="2">2</button>
            <button class="vk-key" data-key="3">3</button>
            <button class="vk-key vk-tall-enter" data-key="\r">Ent</button>
          </div>
          <div class="vk-row">
            <button class="vk-key vk-wide-zero" data-key="0">0</button>
            <button class="vk-key" data-key=".">.</button>
          </div>
        </div>
      </div>

      <!-- Bottom status bar identical to 8085sim (Image 4) -->
      <div class="vk-bottom-bar">
        <div class="vk-port-badge">
          <span>Asociado a puerto 00H</span>
          <span class="vk-intr-badge">(RST 5.5)</span>
        </div>
        <div class="vk-status-box">
          <button class="vk-key vk-esc-btn" data-key="\x1b">Esc</button>
          <div class="vk-display-null" id="vk-display-key">NULL</div>
        </div>
      </div>
    </div>
  `;

  const displayKey = panel.querySelector('#vk-display-key') as HTMLElement;
  let isCapsOn = false;

  const capsBtn = panel.querySelector('#vk-caps') as HTMLElement;
  const capsLed = panel.querySelector('#vk-caps-led') as HTMLElement;
  capsBtn.addEventListener('click', () => {
    isCapsOn = !isCapsOn;
    capsLed.classList.toggle('led-active', isCapsOn);
  });

  // Handle Virtual Key Clicks (PointerDown -> press, PointerUp -> release)
  panel.querySelectorAll('.vk-key[data-key]').forEach(btn => {
    const rawKey = btn.getAttribute('data-key') || '';

    const handlePress = (e: Event) => {
      e.preventDefault();
      const finalKey = (isCapsOn && rawKey.length === 1) ? rawKey.toUpperCase() : rawKey;
      btn.classList.add('vk-key-pressed');
      perifs.pressKey(finalKey);
      displayKey.textContent = perifs.state.currentKeyLabel;
      displayKey.classList.add('key-active');
    };

    const handleRelease = (e: Event) => {
      e.preventDefault();
      btn.classList.remove('vk-key-pressed');
      perifs.releaseKey();
      displayKey.textContent = 'NULL';
      displayKey.classList.remove('key-active');
    };

    btn.addEventListener('pointerdown', handlePress);
    btn.addEventListener('pointerup', handleRelease);
    btn.addEventListener('pointerleave', handleRelease);
  });

  // Listen to physical keyboard events globally when active!
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    // Avoid interfering if focus is in an input or textarea
    if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
      return;
    }

    let char = e.key;
    if (char === 'Enter') char = '\r';
    if (char === 'Escape') char = '\x1b';
    if (char === 'Backspace') char = '\b';
    if (char === 'Tab') char = '\t';

    if (char.length === 1 || char === '\r' || char === '\x1b' || char === '\b' || char === '\t') {
      perifs.pressKey(char);
      displayKey.textContent = perifs.state.currentKeyLabel;
      displayKey.classList.add('key-active');

      // Highlight corresponding virtual key visually
      const matchingBtn = panel.querySelector(`.vk-key[data-key="${char.toUpperCase()}"]`) ||
                          panel.querySelector(`.vk-key[data-key="${char}"]`);
      matchingBtn?.classList.add('vk-key-pressed');
    }
  });

  window.addEventListener('keyup', (e: KeyboardEvent) => {
    if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
      return;
    }
    perifs.releaseKey();
    displayKey.textContent = 'NULL';
    displayKey.classList.remove('key-active');
    panel.querySelectorAll('.vk-key-pressed').forEach(b => b.classList.remove('vk-key-pressed'));
  });

  return panel;
}
