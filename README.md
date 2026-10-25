# Simulador Moderno del Microprocesador Intel 8085 (Desktop MDI v1.4.0)

Reimplementación moderna de sala limpia (*Clean-Room Reverse Engineering*) del clásico software `8085sim` (2001, Borland Delphi/VCL), diseñado con tecnologías web de alto rendimiento y empaquetado como aplicación nativa ligera de escritorio con **Microsoft Edge WebView2 (Neutralinojs) + TypeScript + Vite** (~33 MB RAM).

---

## 🚀 Características Principales

- **Interfaz MDI Flotante y Modular:**
  - Ventanas arrastrables, redimensionables, minimizables y maximizables.
  - Barra de tareas inferior y menú superior de aplicación estilo tradicional.
  - Soporte completo de **Tema Oscuro** y **Tema Claro**.
  - **Persistencia Completa de Sesión y Configuración (v1.4.0):** Archivo local `sim8085_config.json` para recordar tema, zoom, ajuste de línea y pestañas abiertas con verificación previa de existencia en disco.
  - **Historial de Archivos Recientes:** Submenú desplegable en `Archivo -> Archivos Recientes` con acceso rápido y limpieza de historial.

- **Editor de Código ASM Multi-Pestaña de Nivel Profesional (v1.4.0):**
  - Coloreado sintáctico para los 246 nemotécnicos del 8085, directivas (`.org`, `.data`, `.define`), registros y constantes.
  - **Numeración de Líneas y Gutter con Scroll Sincronizado 1:1:** Viewport dedicado para números de línea sincronizado al pixel incluso con zoom y soporte de rueda de ratón en el gutter.
  - **Barra de Estado Inferior estilo VS Code:** Diagnóstico de errores a pantalla ancha, cursor interactivo (`Lín X, Col Y`) y salto directo a la línea causante del fallo al hacer clic.
  - **Validación Estricta de Parámetros y Aridad:** Chequeo formal de cantidad y validez de operandos para todo el repertorio 8085 (`ADD B, A` es rechazado, verificación de pares válidos, erradicación de alertas bloqueantes del navegador).
  - **Autocompletado Consciente de Contexto:** Cierre global al hacer clic fuera y supresión de sugerencias redundantes cuando la aridad de la instrucción está satisfecha.
  - **Ajuste de Línea Suave (Soft Word Wrap) con <kbd>Alt+Z</kbd>:** Canaleta de números de línea sincronizada dinámicamente mediante `ResizeObserver`.
  - **Detección y Confirmación de Archivos No Guardados:** Diálogo modal de protección al cerrar pestañas o salir de la aplicación.
  - **Guardado Silencioso Directo:** Integración con *File System Access API* para guardar sin descargas repetidas ni alertas molestas.
  - **Renombrado Rápido:** Doble clic sobre la pestaña activa para renombrar el archivo en caliente.
  - **Documentación Flotante Inteligente (*Hover Tooltip*):** Inspección de instrucciones con auto-flip vertical y protección de bordes.
  - Atajos de teclado:
    - `F9`: Ensamblar código y cargar directamente a memoria RAM.
    - `F7`: Ejecución paso a paso (*Step Into*).
    - `F8`: Paso sin entrar a subrutinas (*Step Over*).
    - `Shift + F7`: Paso atrás / Deshacer ciclo (*Step Back*).
    - `F5`: Ejecución continua (*Run / Pause*).
    - `F2`: Reiniciar CPU (*Reset*).
    - `F1`: Diccionario interactivo de instrucciones.
    - `Ctrl + S`: Guardar archivo `.asm`.
    - `Alt + Z`: Alternar ajuste de línea (*Word Wrap*).
    - `Alt + F4`: Salir de la aplicación con confirmación de seguridad.

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
