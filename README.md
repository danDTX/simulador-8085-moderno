# Simulador Moderno del Microprocesador Intel 8085 (Desktop MDI v1.8.0)

Reimplementación moderna de sala limpia (*Clean-Room Reverse Engineering*) del clásico software `8085sim` (2001, Borland Delphi/VCL), diseñado con tecnologías web de alto rendimiento y empaquetado como aplicación nativa ligera de escritorio con **Microsoft Edge WebView2 (Neutralinojs) + TypeScript + Vite** (~33 MB RAM).

---

## 🚀 Características Principales

- **🎛️ Espacio de Trabajo Responsivo y Divisor Deslizante (v1.8.0):**
  - **Divisor Interactivo con Snap 50/50:** Barra divisoria horizontal fluida entre el Editor ASM y la Consola CPU con arrastre suave, límites seguros (mínimo 320px/460px), restablecimiento instantáneo a 50/50 mediante doble clic y persistencia automática en `sim8085_config.json`.
  - **Registros de CPU Compactos por Cuartetos:** Formato binario optimizado (`0000 0000   0000 0000`) con escala alineada 1:1, eliminando el corte horizontal en pantallas de laptops y proyectores de baja resolución.
  - **Corrección Canónica en Displays de 15 Segmentos:** Subsanación del bug histórico de `8085sim` en el dígito `'8'` (`00H, 7FH`) e iluminación completa de la barra central ($G_1$ y $G_2$ activadas por el bit 3 del puerto impar) en todos los caracteres alfanuméricos (`8`, `F`, `A`, `E`, `H`, etc.).
  - **Desensamblado Total de Memoria:** Visor de instrucciones desensambladas que cubre todo el rango de programa en memoria RAM.
  - **Detección Preventiva de Caracteres no ASCII:** Advertencia clara e inmediata en el banner si se introduce la letra `ñ` o caracteres incompatibles en etiquetas de ensamblador.
  - **Apertura Optimizada a Pantalla Completa:** Inicialización maximizada automática que aprovecha el 100% del monitor sin desbordes.

- **📋 Prueba de Escritorio y Matriz de Traza de Ejecución (v1.7.0):**
  - **Generación Automática de Matriz de Estados:** Traza de ejecución paso a paso que registra `CODIGO`, registros `A`, `B`, `C`, `D`, `E`, `H`, `L`, `M` *(RAM[HL])*, `SP`, `PC` y banderas `Z`, `S`, `AC`, `CY`, `P`.
  - **Detección Inteligente de Inicio:** Configurable con valor por defecto `0000H` (persistido), saltando automáticamente NOPs vacíos hasta la primera instrucción ensamblada si `0000H` no contiene código.
  - **Resaltado Visual de Cambios:** Celdas modificadas resaltadas en rojo brillante (`#c00000`) con texto blanco, y fila completa en rojo sólido para `HLT`.
  - **Exportación Multi-Formato:** Copiado al portapapeles enriquecido (HTML + TSV para pegar directamente con `Ctrl+V` en Excel/Google Sheets conservando colores y columnas), exportación a hoja de cálculo `.xls` y archivo `.csv`.
  - **Adaptabilidad a Modo Claro:** Barra de pestañas del editor con diseño moderno y nítido, y tabla de traza estilizada estilo Excel verde suave sobre fondo blanco.

- **Parche de Confiabilidad de Sistema y Selector de Archivos (v1.6.1):**
  - **Selector Nativo en Primer Plano Garantizado:** Eliminación del bug de ventanas en segundo plano (`Issue #715`), asegurando que el diálogo de abrir archivo aparezca siempre al frente.
  - **Arrastrar y Soltar (*Drag & Drop*):** Carga instantánea de archivos `.asm`, `.s` y `.txt` soltándolos directamente sobre cualquier parte de la ventana.
  - **Cierre Instantáneo sin Bloqueos (`exitProcessOnClose: true`):** El botón `[X]` de la ventana termina el proceso de forma inmediata y limpia, sin requerir el Administrador de Tareas.

- **Optimización Térmica y Fidelidad de Hardware (v1.6.0):**
  - **Coalescencia Gráfica a 60 FPS con `requestAnimationFrame`:** Notificaciones de periféricos desacopladas del ciclo síncrono de máquina, reduciendo el consumo de CPU de 100% a <1.5% en bucles continuos (laptop fría y silenciosa).
  - **Verificación de Estado Sucio (*Dirty Checking*):** Los paneles de displays, LEDs y teclado solo interactúan con el DOM si el valor de sus puertos asociados ha cambiado efectivamente (0 ms de reflow innecesario).
  - **Mapeo Canónico de Displays de 15 Segmentos:** Corrección de polaridad y pines oficiales de `8085sim` (Byte 1 en puerto par = trazos internos y diagonales; Byte 2 en puerto impar = perímetro exterior de 7 segmentos y punto decimal).
  - **Latencia Cero en Interruptores DIP:** Conmutación reactiva con eventos `pointerdown` y manipulación de clases CSS *in-place*.

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

- **Suite de Herramientas de Desarrollo (v1.5.0):**
  - **Nuevo Menú Superior `Herramientas`:** Acceso centralizado a utilidades especializadas para el alumno y programador.
  - **🧮 Calculadora de Programador:** Conversión simultánea en tiempo real (`HEX`, `DEC sin signo`, `DEC con signo / C2`, `BIN`), matriz de bits interactiva de 8/16 bits y operaciones lógicas/aritméticas (`NOT`, `NEG`, `ROL`, `ROR`, `SHL`, `SHR`, `AND`, `OR`, `XOR`).
  - **🔢 Codificador y Tablas de Displays (7 y 15 Segmentos):** Display SVG interactivo con segmentos clicables LED rojo, fidelidad absoluta al mapeo de `8085sim`, polaridad seleccionable (Cátodo Común / Ánodo Común), desglose de byte bajo/alto en 15 seg, catálogo de caracteres alfanuméricos y generador de directivas `dB` / `dW`.
  - **🔤 Tabla y Conversor ASCII:** Tabla de consulta rápida con buscador instantáneo (00H-7FH) y conversor "String a `dB`" en un solo renglón con terminadores configurables (`00H` NUL, `0DH, 0AH` CR+LF).
  - **⏱️ Calculador de Retardos ASM:** Asistente matemático para cálculo de ciclos T y generación de subrutinas de retardo anidadas.

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
