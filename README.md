# Simulador Moderno del Microprocesador Intel 8085 (Desktop MDI)

Reimplementación moderna de sala limpia (*Clean-Room Reverse Engineering*) del clásico software `8085sim` (2001, Borland Delphi/VCL), diseñado con tecnologías web de alto rendimiento y empaquetado para escritorio con **Electron + TypeScript + Vite**.

---

## 🚀 Características Principales

- **Interfaz MDI Flotante y Modular:**
  - Ventanas arrastrables, redimensionables, minimizables y maximizables.
  - Barra de tareas inferior y menú superior de aplicación estilo tradicional.
  - Soporte completo de **Tema Oscuro** y **Tema Claro**.

- **Editor de Código con Resaltado Sintáctico:**
  - Coloreado específico para los 246 nemotécnicos del 8085, directivas (`.org`, `.data`, `.define`), registros y números hex/binarios.
  - Indicador visual del puntero `PC` (`▶`) en la línea de ejecución actual durante el depurado.
  - Detección y reporte de errores en tiempo real.
  - Atajos de teclado oficiales:
    - `F9`: Ensamblar código y cargar directamente a memoria RAM.
    - `F7`: Ejecución paso a paso (*Step by step*).
    - `F5`: Ejecución continua (*Run / Pause*).
    - `F2`: Reiniciar CPU (*Reset*).
    - `Ctrl + S`: Guardar archivo `.asm`.

- **Núcleo de CPU Intel 8085:**
  - Emulación exacta de los 246 códigos de operación oficiales.
  - Cálculo de banderas `S` (Signo), `Z` (Cero), `AC` (Acarreo Auxiliar BCD), `P` (Paridad par) y `CY` (Acarreo/Préstamo).
  - Contador de ciclos de reloj (estados T).
  - Pila completa (SP, CALL, RET, PUSH, POP, XTHL, SPHL).
  - Interrupciones: `TRAP` (0024H), `RST 7.5` (003CH), `RST 6.5` (0034H), `RST 5.5` (002CH), `INTR`, `EI`, `DI`, `SIM` y `RIM`.

- **Periféricos Virtuales Integrados:**
  - **Interruptores DIP (Puerto `00H`):** 8 interruptores interactivos con peso binario y valor hex. *(¡Sin el bug de rutas relativas del 8085sim original!)*
  - **Barra de 8 LEDs (Puerto `01H`):** Diodos luminosos circulares con efecto glow dinámico.
  - **8 Displays de 7 Segmentos (Puertos `02H` a `09H`):** Visualizadores cátodo común con segmentos vectoriales (A-G y punto decimal DP).
  - **Terminal CRT / Pantalla de Texto (VRAM `0E000H`):** Emulación de terminal fósforo verde, ámbar y blanco con scanlines para proyectos tipo cajero automático (`cajero.asm`).
  - **Teclado Matricial e Inyector ASCII:** Disparo manual de interrupciones de hardware y temporizador periódico configurable en milisegundos.

- **Compatibilidad 100% hacia atrás con 8085sim:**
  - Acepta directivas `.org`, `.data` con prefijos `dB`, `dW`, `dS` y bloques `.define`.
  - Exportación e importación de archivos binarios objeto `.o` en formato compatible con el software original de la cátedra.
  - Validados 16 ejemplos reales de la materia (`ejemplo 1.asm` a `ejemplo 26.asm`, `Snake.asm`, `Pantalla.asm`, `cajero.asm`).

---

## 💻 Instrucciones de Uso

### 1. Iniciar la aplicación de escritorio
Doble clic en:
```cmd
iniciar_simulador.bat
```
O desde la terminal en este directorio:
```bash
npm start
```

### 2. Modo Desarrollo Web (Navegador)
Para abrirlo en cualquier navegador web a través del servidor Vite:
```bash
npm run dev
```

### 3. Ejecutar la Suite de Pruebas Automatizadas
```bash
npm test
```
Verifica automáticamente la CPU, cálculo de banderas, interrupciones, periféricos y realiza compilación cruzada contra los archivos `.asm` de la materia.
