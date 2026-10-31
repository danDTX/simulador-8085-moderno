import rawInstructions from './instructions_data.json';

export interface InstructionDoc {
  name: string;
  sig: string;
  group: string;
  bytes: string;
  cycles: string;
  flags: string;
  summary: string;
  params: string;
  snippet?: string;
  example?: string;
}

export interface RegisterDoc {
  name: string;
  detail: string;
  doc: string;
}

export const REGISTERS_DOCS: RegisterDoc[] = [
  {
    name: 'A',
    detail: 'Registro Acumulador (8 bits)',
    doc: 'El registro principal del 8085. Participa en todas las operaciones de la ALU (sumas, restas, lógica, rotaciones) y es el único que transfiere con puertos (IN y OUT).'
  },
  {
    name: 'B',
    detail: 'Registro General B / Par BC (8/16 bits)',
    doc: 'Registro general de 8 bits. Junto con el registro C forma el par de 16 bits BC (B = byte alto), utilizado como puntero con LDAX B, STAX B o en operaciones de 16 bits (DAD B, INX B, LXI B).'
  },
  {
    name: 'C',
    detail: 'Registro General C / Par BC (8 bits)',
    doc: 'Registro general de 8 bits. Frecuentemente usado como contador de bucles (DCR C, JNZ). Forma el byte bajo del par BC.'
  },
  {
    name: 'D',
    detail: 'Registro General D / Par DE (8/16 bits)',
    doc: 'Registro general de 8 bits. Junto con el registro E forma el par de 16 bits DE (D = byte alto), usado comúnmente como puntero secundario en LDAX D, STAX D o intercambiable con HL mediante XCHG.'
  },
  {
    name: 'E',
    detail: 'Registro General E / Par DE (8 bits)',
    doc: 'Registro general de 8 bits. Forma el byte bajo del par de 16 bits DE.'
  },
  {
    name: 'H',
    detail: 'Registro General H / Par HL (8/16 bits)',
    doc: 'Registro general de 8 bits. Junto con L forma el par puntero de memoria principal HL (H = byte alto), base del pseudo-registro M.'
  },
  {
    name: 'L',
    detail: 'Registro General L / Par HL (8 bits)',
    doc: 'Registro general de 8 bits. Forma el byte bajo del par de 16 bits HL.'
  },
  {
    name: 'M',
    detail: 'Pseudo-registro de Memoria RAM (8 bits)',
    doc: 'Representa el contenido de la celda de memoria RAM apuntada actualmente por la dirección contenida en el par HL (M = [HL]). Acceso directo a la RAM.'
  },
  {
    name: 'SP',
    detail: 'Stack Pointer (Puntero de Pila, 16 bits)',
    doc: 'Puntero de 16 bits que apunta al tope actual de la Pila en memoria RAM. Inicializado habitualmente al límite superior con LXI SP, 0FFFFH. Decrementa con PUSH y CALL, incrementa con POP y RET.'
  },
  {
    name: 'PSW',
    detail: 'Program Status Word (Palabra de Estado, 16 bits)',
    doc: 'Par de 16 bits formado por el Acumulador (byte alto A) y el Registro de Banderas (byte bajo F: [S, Z, 0, AC, 0, P, 1, CY]). Utilizado con PUSH PSW y POP PSW.'
  }
];

export const PORTS_DOCS: Record<number, string> = {
  0x00: 'Puerto 00H (8085sim): Entrada = Teclado Virtual / Interruptores DIP | Salida = Display 7-seg Decenas / LEDs',
  0x01: 'Puerto 01H (8085sim): Entrada = Interruptores DIP 1 | Salida = Display 7-seg Unidades / Barra de LEDs 1',
  0x02: 'Puerto 02H (8085sim): Salida = Display 7-seg 2 / Display 15-seg (byte bajo)',
  0x03: 'Puerto 03H (8085sim): Salida = Display 7-seg 3 / Display 15-seg (byte alto)',
  0x08: 'Puerto 08H (8085sim): Salida = Display 15 segmentos dígito 4'
};

export const INTERRUPTS_DOCS: Record<number, string> = {
  0x0000: 'Vector de Reset por Hardware / RST 0 (Power-on / Reset button)',
  0x0024: 'Vector TRAP (Interrupción por hardware no enmascarable)',
  0x002c: 'Vector RST 5.5 (Interrupción por hardware - Teclado en 8085sim)',
  0x0034: 'Vector RST 6.5 (Interrupción por hardware)',
  0x003c: 'Vector RST 7.5 (Interrupción por hardware)'
};

const instructionsMap = new Map<string, InstructionDoc>();
for (const inst of rawInstructions as InstructionDoc[]) {
  instructionsMap.set(inst.name.toUpperCase(), inst);
  if (inst.name.startsWith('.')) {
    instructionsMap.set(inst.name.substring(1).toUpperCase(), inst);
  }
}

const registersMap = new Map<string, RegisterDoc>();
for (const reg of REGISTERS_DOCS) {
  registersMap.set(reg.name.toUpperCase(), reg);
}

export class DocsHelper {
  public static getAllInstructions(): InstructionDoc[] {
    return rawInstructions as InstructionDoc[];
  }

  public static getInstruction(name: string): InstructionDoc | undefined {
    return instructionsMap.get(name.toUpperCase());
  }

  public static getRegister(name: string): RegisterDoc | undefined {
    return registersMap.get(name.toUpperCase());
  }

  public static getPortDoc(portVal: number): string | undefined {
    return PORTS_DOCS[portVal];
  }

  public static getInterruptDoc(addrVal: number): string | undefined {
    return INTERRUPTS_DOCS[addrVal];
  }

  public static readonly SEVEN_SEG_PATTERNS: Record<number, string> = {
    0x77: '0', 0x44: '1', 0x3E: '2', 0x6E: '3', 0x4D: '4',
    0x6B: '5', 0x7B: '6', 0x46: '7', 0x7F: '8', 0x4F: '9', 0x6F: '9'
  };

  public static renderInstructionHoverHtml(inst: InstructionDoc): string {
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `
      <div class="hover-card">
        <div class="hover-card-header">
          <span class="hover-card-sig">${esc(inst.sig)}</span>
          <span class="hover-card-badge">${esc(inst.group)}</span>
        </div>
        <div class="hover-card-summary">${esc(inst.summary)}</div>
        <div class="hover-card-grid">
          <div class="hover-card-row"><strong>Banderas:</strong> <span>${esc(inst.flags)}</span></div>
          <div class="hover-card-row"><strong>Estados T:</strong> <span>${esc(inst.cycles)}</span></div>
          <div class="hover-card-row"><strong>Tamaño:</strong> <span>${esc(inst.bytes)}</span></div>
          <div class="hover-card-row"><strong>Parámetros:</strong> <span>${esc(inst.params)}</span></div>
        </div>
        ${inst.example ? `
          <div class="hover-card-example">
            <span class="hover-ex-lbl">Ejemplo:</span>
            <pre>${esc(inst.example)}</pre>
          </div>
        ` : ''}
      </div>
    `;
  }

  public static renderRegisterHoverHtml(reg: RegisterDoc): string {
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `
      <div class="hover-card">
        <div class="hover-card-header">
          <span class="hover-card-sig">Registro ${esc(reg.name)}</span>
          <span class="hover-card-badge">Arquitectura 8085</span>
        </div>
        <div class="hover-card-detail"><em>${esc(reg.detail)}</em></div>
        <div class="hover-card-summary" style="margin-top: 6px;">${esc(reg.doc)}</div>
      </div>
    `;
  }

  public static renderHexHoverHtml(rawHex: string): string | null {
    let clean = rawHex.toUpperCase();
    if (clean.endsWith('H')) clean = clean.slice(0, -1);
    if (clean.startsWith('0X')) clean = clean.slice(2);

    const val = parseInt(clean, 16);
    if (isNaN(val)) return null;

    let binStr = val.toString(2);
    if (val <= 0xff) {
      binStr = binStr.padStart(8, '0');
      binStr = binStr.slice(0, 4) + ' ' + binStr.slice(4);
    } else {
      binStr = binStr.padStart(16, '0');
      binStr = binStr.slice(0, 4) + ' ' + binStr.slice(4, 8) + ' ' + binStr.slice(8, 12) + ' ' + binStr.slice(12);
    }

    let extraHtml = '';
    // Carácter ASCII (32..126)
    if (val >= 32 && val <= 126) {
      extraHtml += `<div class="hover-card-row"><strong>Carácter ASCII:</strong> <code>'${String.fromCharCode(val)}'</code></div>`;
    }
    // Display 7 segmentos cátodo común 8085sim
    if (DocsHelper.SEVEN_SEG_PATTERNS[val] !== undefined) {
      extraHtml += `<div class="hover-card-row"><strong>Display 7-seg (8085sim):</strong> Patrón cátodo común dígito <code>'${DocsHelper.SEVEN_SEG_PATTERNS[val]}'</code></div>`;
    }
    // Vector de CPU
    if (INTERRUPTS_DOCS[val] !== undefined) {
      extraHtml += `<div class="hover-card-row"><strong>Vector CPU:</strong> ⚡ ${INTERRUPTS_DOCS[val]}</div>`;
    }
    // Periférico
    if (PORTS_DOCS[val] !== undefined) {
      extraHtml += `<div class="hover-card-row"><strong>Periférico:</strong> ${PORTS_DOCS[val]}</div>`;
    }
    // VRAM CRT (0E000H - 0E7FFH)
    if (val >= 0x0E000 && val <= 0x0E7FF) {
      const offset = val - 0x0E000;
      if (offset < 1000) {
        const fila = Math.floor(offset / 40);
        const col = offset % 40;
        extraHtml += `<div class="hover-card-row"><strong>Pantalla CRT:</strong> Fila <code>${fila}</code>, Columna <code>${col}</code> <em>(40×25)</em></div>`;
      }
    }

    return `
      <div class="hover-card">
        <div class="hover-card-header">
          <span class="hover-card-sig">${rawHex.toUpperCase()}</span>
          <span class="hover-card-badge">Conversor Hex</span>
        </div>
        <div class="hover-card-grid">
          <div class="hover-card-row"><strong>Decimal:</strong> <code>${val}</code></div>
          <div class="hover-card-row"><strong>Binario:</strong> <code>${binStr}b</code></div>
        </div>
        ${extraHtml}
      </div>
    `;
  }

  public static renderLabelHoverHtml(labelName: string, lineIndex: number): string {
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `
      <div class="hover-card">
        <div class="hover-card-header">
          <span class="hover-card-sig">Etiqueta: ${esc(labelName)}</span>
          <span class="hover-card-badge">Subrutina / Salto</span>
        </div>
        <div class="hover-card-summary" style="margin-top: 6px;">
          📍 Definida en la línea <strong>${lineIndex + 1}</strong>.<br/>
          <em>(Presiona <strong>F12</strong> o <strong>Ctrl + Clic</strong> para saltar • <strong>Alt + ←</strong> para volver)</em>
        </div>
      </div>
    `;
  }

  public static scanLabels(source: string): Map<string, { line: number; col: number }> {
    const labels = new Map<string, { line: number; col: number }>();
    const lines = source.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i].split(';')[0];
      const match = lineText.match(/^\s*([A-Za-z0-9_ÑñÁÉÍÓÚáéíóúüÜ]+)\s*:/u);
      if (match) {
        const labelName = match[1];
        const col = lineText.indexOf(labelName);
        labels.set(labelName, { line: i, col });
      }
    }
    return labels;
  }

  public static validateLabels(source: string): { line: number; label: string }[] {
    const labels = DocsHelper.scanLabels(source);
    const jumpCallRegex = /(?<![A-Za-z0-9_ÑñÁÉÍÓÚáéíóúüÜ])(CALL|CC|CNC|CZ|CNZ|CM|CP|CPE|CPO|JMP|JC|JNC|JZ|JNZ|JM|JP|JPE|JPO)\s+([A-Za-z0-9_ÑñÁÉÍÓÚáéíóúüÜ]+)/giu;
    const errors: { line: number; label: string }[] = [];

    const lines = source.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i].split(';')[0];
      let match;
      while ((match = jumpCallRegex.exec(lineText)) !== null) {
        const targetLabel = match[2];
        if (!labels.has(targetLabel) && !instructionsMap.has(targetLabel.toUpperCase()) && !registersMap.has(targetLabel.toUpperCase())) {
          errors.push({ line: i, label: targetLabel });
        }
      }
    }
    return errors;
  }

  public static formatAssembly(source: string): string {
    const lines = source.split('\n');
    const formatted: string[] = [];
    const COMMENT_COL = 36;
    const INDENT = '    ';

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i].replace(/\r$/, '');
      const stripped = raw.trim();

      if (!stripped) {
        formatted.push('');
        continue;
      }

      // Full comment line
      if (stripped.startsWith(';')) {
        if (raw.startsWith(' ') || raw.startsWith('\t')) {
          formatted.push(INDENT + stripped);
        } else {
          formatted.push(stripped);
        }
        continue;
      }

      // Separate code and comment
      let comment = '';
      let codePart = raw;
      const semiIdx = raw.indexOf(';');
      if (semiIdx !== -1) {
        codePart = raw.substring(0, semiIdx).trimEnd();
        comment = raw.substring(semiIdx);
      }

      let codeLine = '';
      const matchLabel = codePart.match(/^\s*([A-Za-z0-9_ÑñÁÉÍÓÚáéíóúüÜ]+:)(.*)$/u);

      if (matchLabel) {
        const label = matchLabel[1];
        const rest = matchLabel[2].trim();
        if (rest) {
          const restTokens = rest.split(/\s+/);
          const mnemonic = restTokens[0].toUpperCase();
          const operands = restTokens.slice(1).join(' ');
          const cleanOps = operands.replace(/,\s*/g, ', ');
          const normRest = mnemonic + (cleanOps ? ' ' + cleanOps : '');
          codeLine = (label.padEnd(16, ' ') + ' ' + normRest).trimEnd();
        } else {
          codeLine = label;
        }
      } else {
        const codeTokens = codePart.trim().split(/\s+/);
        const mnemonic = codeTokens[0].toUpperCase();
        const operands = codeTokens.slice(1).join(' ');
        const cleanOps = operands.replace(/,\s*/g, ', ');
        const normCode = mnemonic + (cleanOps ? ' ' + cleanOps : '');
        codeLine = INDENT + normCode;
      }

      let formattedLine = codeLine;
      if (comment) {
        if (codeLine.length < COMMENT_COL) {
          formattedLine = codeLine.padEnd(COMMENT_COL, ' ') + comment;
        } else {
          formattedLine = codeLine + '    ' + comment;
        }
      }

      formatted.push(formattedLine);
    }

    return formatted.join('\n');
  }

  public static renderPortOrVectorHtml(title: string, info: string): string {
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `
      <div class="hover-card">
        <div class="hover-card-header">
          <span class="hover-card-sig">${esc(title)}</span>
          <span class="hover-card-badge">8085sim Periféricos</span>
        </div>
        <div class="hover-card-summary" style="margin-top: 6px;">${esc(info)}</div>
      </div>
    `;
  }
}
