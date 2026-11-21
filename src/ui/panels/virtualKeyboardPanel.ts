import { PeripheralsManager } from '../../core/peripherals.js';

export interface VirtualKeyboardInstance {
  element: HTMLElement;
  update: () => void;
  destroy: () => void;
}

export function createVirtualKeyboardPanel(perifs: PeripheralsManager): VirtualKeyboardInstance {
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

      <!-- Bottom status bar with interactive port and interrupt selector -->
      <div class="vk-bottom-bar">
        <div class="vk-port-badge">
          <span>Puerto:</span>
          <input type="text" id="vk-port-input" value="00" maxlength="2" style="width: 28px; padding: 1px 3px; font-family: var(--font-mono); font-size: 11px; background: #0d1117; color: #58a6ff; border: 1px solid #30363d; border-radius: 3px; text-align: center;" title="Puerto de entrada IN (hex 00-FF)" />
          <span style="margin-left: 8px;">Interrupción:</span>
          <select id="vk-sel-intr" style="padding: 1px 4px; font-size: 11px; font-family: var(--font-main); background: #0d1117; color: #58a6ff; border: 1px solid #30363d; border-radius: 3px; cursor: pointer;" title="Interrupción que dispara el teclado">
            <option value="NONE">Ninguna</option>
            <option value="5.5">RST 5.5 (002CH)</option>
            <option value="6.5">RST 6.5 (0034H)</option>
            <option value="7.5">RST 7.5 (003CH)</option>
            <option value="TRAP">TRAP (0024H)</option>
            <option value="INTR">INTR</option>
          </select>
        </div>
        <div class="vk-status-box">
          <button class="vk-key vk-esc-btn" data-key="\x1b">Esc</button>
          <div class="vk-display-null" id="vk-display-key">NULL</div>
        </div>
      </div>
    </div>
  `;

  const displayKey = panel.querySelector('#vk-display-key') as HTMLElement;
  const selIntr = panel.querySelector('#vk-sel-intr') as HTMLSelectElement;
  const portInput = panel.querySelector('#vk-port-input') as HTMLInputElement;

  if (selIntr) {
    selIntr.value = perifs.state.keyboardInterruptType;
    selIntr.addEventListener('change', () => {
      perifs.setKeyboardInterrupt(selIntr.value as any);
    });
  }

  if (portInput) {
    portInput.value = perifs.state.keyboardPort.toString(16).toUpperCase().padStart(2, '0');
    portInput.addEventListener('change', () => {
      const p = parseInt(portInput.value, 16);
      if (!isNaN(p)) {
        perifs.state.keyboardPort = p & 0xff;
        portInput.value = (p & 0xff).toString(16).toUpperCase().padStart(2, '0');
      }
    });
  }

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
    };

    const handleRelease = (e: Event) => {
      e.preventDefault();
      btn.classList.remove('vk-key-pressed');
      perifs.releaseKey();
    };

    btn.addEventListener('pointerdown', handlePress);
    btn.addEventListener('pointerup', handleRelease);
    btn.addEventListener('pointerleave', handleRelease);
  });

  let lastKeyLabel = '';
  let lastKeyPressed = -1;

  const render = (force: boolean = false) => {
    if (selIntr && selIntr.value !== perifs.state.keyboardInterruptType) {
      selIntr.value = perifs.state.keyboardInterruptType;
    }
    const curPortHex = perifs.state.keyboardPort.toString(16).toUpperCase().padStart(2, '0');
    if (portInput && portInput.value !== curPortHex) {
      portInput.value = curPortHex;
    }

    const label = perifs.state.currentKeyLabel;
    const pressed = perifs.state.currentKeyPressed;
    if (!force && label === lastKeyLabel && pressed === lastKeyPressed) {
      return;
    }
    lastKeyLabel = label;
    lastKeyPressed = pressed;

    displayKey.textContent = label;
    panel.querySelectorAll('.vk-key-pressed').forEach(b => b.classList.remove('vk-key-pressed'));

    if (label !== 'NULL' && pressed !== 0) {
      displayKey.classList.add('key-active');
      const keys = panel.querySelectorAll<HTMLButtonElement>('.vk-key[data-key]');
      let matchingBtn: HTMLElement | null = null;
      // 1. Exact match first (preserves case and avoids collision between arrow 'v' and letter 'V')
      for (let i = 0; i < keys.length; i++) {
        if (keys[i].getAttribute('data-key') === label) {
          matchingBtn = keys[i];
          break;
        }
      }
      // 2. Fallback case-insensitive
      if (!matchingBtn) {
        const upper = label.toUpperCase();
        for (let i = 0; i < keys.length; i++) {
          if (keys[i].getAttribute('data-key') === upper) {
            matchingBtn = keys[i];
            break;
          }
        }
      }
      matchingBtn?.classList.add('vk-key-pressed');
    } else {
      displayKey.classList.remove('key-active');
    }
  };

  const unsub = perifs.subscribe(() => render());
  render(true);

  return {
    element: panel,
    update: () => render(true),
    destroy: () => {
      unsub();
    }
  };
}
