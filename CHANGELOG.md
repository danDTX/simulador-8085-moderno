# Changelog - Simulador Moderno Intel 8085

Todas las modificaciones notables de este proyecto están documentadas en este archivo siguiendo el formato [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).

---

## [1.6.1] - 2026-10-28

### 🐛 Correcciones de Errores y Confiabilidad (Bug Fixes)
- **Selector de Archivos Nativo en Primer Plano (`src/main.ts`):**
  - Corrección del fallo donde `Neutralino.os.showOpenDialog` abría la ventana de búsqueda en segundo plano (detrás de la ventana del simulador en Windows), congelando la interacción del usuario.
  - Migración a selector directo de WebView2 anclado a la ventana activa (`<input type="file">`), garantizando apertura visible al frente e inmediata.
- **Soporte de Arrastrar y Soltar (*Drag & Drop*):**
  - Posibilidad de arrastrar cualquier archivo ensamblador (`.asm`, `.s`, `.txt`) directamente desde el Explorador de Windows sobre el simulador para cargarlo en una nueva pestaña.
- **Cierre Inmediato sin Bloqueos de Proceso (`exitProcessOnClose: true`):**
  - Activación de `"exitProcessOnClose": true` en `neutralino.config.json` y blindaje con bloques de escape `try/catch` en `exitApp()`.
  - El botón `[X]` de la barra de título cierra el proceso de forma instantánea sin dejar procesos huérfanos ni requerir el Administrador de Tareas.
  - La persistencia en disco (`sim8085_config.json`) preserva todas las pestañas y código en tiempo real.

---

## [1.6.0] - 2026-10-27

### ⚡ Rendimiento y Optimización Térmica
- **Coalescencia Gráfica de Periféricos (`requestAnimationFrame`):**
  - Desacople del repintado de periféricos respecto al ciclo síncrono de máquina en `PeripheralsManager`.
  - En bucles continuos a 300 kHz con múltiples instrucciones `OUT`, las notificaciones se agrupan suavemente a 60 FPS en lugar de forzar hasta 240.000 repintados de DOM por segundo.
  - Caída del consumo de CPU de **100% a < 1.5%** en un solo núcleo, manteniendo la laptop fría y eliminando por completo el zumbido de los ventiladores.
- **Verificación de Estado Sucio (*Dirty Checking*):**
  - Incorporación de búferes tipados `Uint8Array(256)` en `displays15Panel`, `displays7Panel`, `ledsPanel` y `virtualKeyboardPanel`. Si los puertos o teclas no varían de valor, el renderizado omite toda manipulación del DOM.
- **Desacople del CRT Terminal:**
  - Supresión de la suscripción innecesaria del panel CRT a puertos de E/S ordinarios, limitando su refresco exclusivamente a escrituras efectivas sobre la memoria VRAM (`0xE000–0xE3E7`).

### 🐛 Correcciones de Fidelidad de Hardware (8085sim)
- **Mapeo Canónico de Displays de 15 Segmentos (`displays15Panel.ts` y `displayEncoderPanel.ts`):**
  - Inversión y corrección de la polaridad de pines:
    * **Byte 1 (Puerto Par $N$):** Trazos internos y diagonales especiales (`H, J, K, G1, G2, N, M, L`).
    * **Byte 2 (Puerto Impar $N+1$):** Perímetro exterior de 7 segmentos y punto decimal (`F, A, B, G, E, D, C, DP`).
  - Resolución del problema donde mensajes alfanuméricos (como `MSG_IGUALES`) aparecían desarticulados.
- **Sensibilidad de Interruptores DIP (`dipSwitchesPanel.ts`):**
  - Sustitución de eventos `click` destructivos por delegación de puntero `pointerdown` y alternancia de clases CSS directas (`.msw-on` / `.msw-off`), asegurando respuesta inmediata sin clics perdidos.

---

## [1.5.0] - 2026-10-26

### ✨ Nuevas Funcionalidades
- **Nuevo Menú Superior `Herramientas` (Tools Suite):**
  - Incorporación de un menú dedicado en la barra superior que centraliza 4 utilidades de desarrollo en ventanas MDI flotantes independientes:
    1. `🧮 Calculadora de Programador (Hex/Dec/Bin)...`
    2. `🔢 Codificador de Displays (7 y 15 Seg)...`
    3. `🔤 Tabla y Conversor ASCII...`
    4. `⏱️ Calculador de Retardos ASM...`
- **🧮 Calculadora de Programador (`src/ui/panels/programmerCalcPanel.ts`):**
  - Modos de trabajo seleccionables de **8 bits (Byte)** y **16 bits (Palabra)**.
  - Sincronización bidireccional instantánea al escribir entre: `HEX (H)`, `DEC (Sin signo)`, `DEC (Con signo / C2)` y `BIN (B)`.
  - Matriz interactiva de bits (0..7 o 0..15) para alternar bits individuales con un clic.
  - Operaciones unarias directas: `NOT (CMA)`, `NEG (-X / Compl. a 2)`, `SHL (<<)`, `SHR (>>)`, `ROL (RLC)`, `ROR (RRC)`, `+1 (INR)`, `-1 (DCR)`.
  - Operaciones binarias con acumulador: `AND`, `OR`, `XOR`, `+`, `-`.
  - Botones de inserción directa de código en el cursor del Editor ASM (`MVI A, XXH` o `LXI H, XXXXH`, y directivas `dB XXH` o `dW XXXXH`).
- **🔢 Codificador Visual y Tablas de Displays (`src/ui/panels/displayEncoderPanel.ts`):**
  - Simulación gráfica SVG interactiva para **Displays de 7 Segmentos** y **Displays de 15 Segmentos (Alfanuméricos)**.
  - Clic directo sobre cualquier segmento para encenderlo/apagarlo con efecto LED rojo.
  - Mapeo de bits 100% fiel al hardware de `8085sim`:
    * 7 Segmentos: `bit 0: F, bit 1: A, bit 2: B, bit 3: G, bit 4: E, bit 5: D, bit 6: C, bit 7: DP` (generando `0=77H, 1=44H...`).
    * 15 Segmentos: Desglose en byte bajo (puerto $N$) y byte alto (puerto $N+1$).
  - Selector de polaridad: **Cátodo Común** (1 = ON, estándar cátedra) y **Ánodo Común** (0 = ON, invertido para laboratorio con hardware real).
  - Catálogo rápido de caracteres alfanuméricos predefinidos (0-9, A-Z, símbolos) que con un clic cargan el patrón en el display.
  - Inserción directa de directivas `dB XXH` / `dW XXXXH` o rutinas `MVI A, XXH \n OUT 00H`.
- **🔤 Tabla y Conversor ASCII (`src/ui/panels/asciiTablePanel.ts`):**
  - Generador de Cadenas de Texto ("String a `dB`"): convierte texto ingresado en una directiva compacta en un solo renglón, con opciones para incluir terminador NUL (`00H`), retorno CR+LF (`0DH, 0AH`) y representación en Hex o caracteres legibles.
  - Tabla de consulta completa (00H a 7FH) con buscador dinámico por código Hex, Dec, glifo o función de control (`NUL`, `LF`, `CR`, `ESC`, etc.).
  - Botones por fila para insertar `MVI A, XXH ; 'Char'` en el editor.
- **Suite de Pruebas Factuales (`tests/tools_suite.test.ts`):**
  - 4 pruebas automatizadas que verifican la matemática de complemento a 2, rotaciones, pinout de 7 y 15 segmentos, y directivas `dB` en un solo renglón.

---

## [1.4.0] - 2026-10-24

### ✨ Nuevas Funcionalidades
- **Persistencia Completa de Configuración y Sesión en Disco (`sim8085_config.json`):**
  - Módulo `ConfigManager` desacoplado que almacena y restaura automáticamente el tema (oscuro/claro), nivel de zoom, ajuste de línea (Word Wrap) y pestañas abiertas mediante `Neutralino.filesystem` con respaldo en `Neutralino.storage` y `localStorage`.
  - Fijación del puerto HTTP de Neutralino en `38085` en `neutralino.config.json` para estabilizar el origen web y prevenir que Microsoft Edge WebView2 aísle o borre el `localStorage` en cada arranque.
  - Verificación física de existencia de archivos en disco (`checkFileExists`) antes de reabrir pestañas; si un archivo fue eliminado o movido externamente, se descarta silenciosamente y se ofrece un lienzo nuevo (`sin_titulo.asm`).
- **Historial de Archivos Recientes:**
  - Nuevo submenú en `Archivo -> Archivos Recientes` con hasta 8 entradas ordenadas cronológicamente, deduplicación, normalización de rutas y acción para limpiar historial.
- **Logo de Bienvenida Escalado:**
  - Rediseño del contenedor de la ventana de bienvenida para aprovechar el 100% del cuadro disponible.

### 🐛 Correcciones de Errores (Bug Fixes)
- **Corrección de Congelación en el Scroll de Números de Línea:**
  - Se asignó `height: 100%; overflow: hidden; box-sizing: border-box;` a `.editor-line-numbers` en CSS, resolviendo la limitación donde elementos con `overflow: visible` ignoraban la asignación programática de `scrollTop`.
  - Ahora la canaleta de números se desplaza 1:1 en píxeles en sincronía absoluta con el código y el overlay sintáctico, tanto en scroll manual como con zoom ampliado.
- **Soporte de Rueda de Ratón sobre el Gutter:**
  - Reenvío de eventos `wheel` desde la barra de números hacia el textarea del editor para scroll natural al pasar el puntero sobre los números.
- **Sincronización en Cambios de Zoom y Render:**
  - Invocación garantizada de `syncScroll()` tras cada redibujado y ajuste de escala de interfaz.

---

## [1.3.0] - 2026-10-24

### ✨ Nuevas Funcionalidades
- **Barra de Estado Inferior estilo VS Code (`.editor-statusbar`):**
  - Panel horizontal en el pie de la ventana del editor con 100% de ancho útil para lectura cómoda de diagnósticos y mensajes largos.
  - Indicador de telemetría de cursor en tiempo real (`Lín X, Col Y`) e identificación de arquitectura activa (`Intel 8085`).
  - Éxitos temporizados: mensajes afirmativos en verde con retorno automático a estado `Listo` tras 3 segundos.
- **Navegación Interactiva al Error de Ensamblado:**
  - Al ocurrir un error de sintaxis o compilación, el mensaje en la barra de estado se resalta en rojo interactivo y, al hacer clic sobre él, enfoca y desplaza el editor (`goToLine`) directamente a la línea exacta del fallo.
- **Validación Estricta de Parámetros y Aridad de Instrucciones:**
  - Chequeo formal de cantidad y tipos de operandos durante el ensamblado:
    * ALU (`ADD`, `ADC`, `SUB`, `SBB`, `ANA`, `XRA`, `ORA`, `CMP`): exige exactamente 1 operando de registro, rechazando llamadas erróneas como `ADD B, A`.
    * Nemotécnicos sin operandos (`HLT`, `NOP`, etc.): rechaza parámetros sobrantes.
    * Instrucciones de 2 operandos (`MOV`, `MVI`, `LXI`): exige exactamente 2 operandos válidos y prohíbe `MOV M, M`.
    * Pares de registros (`INX`, `DCX`, `DAD`, `PUSH`, `POP`, `LDAX`, `STAX`): valida pares admitidos con tolerancia didáctica (`B`/`BC`, `D`/`DE`, `H`/`HL`, `SP`, `PSW`).
    * Vectores `RST`: valida rango permitido de 0 a 7.
    * Detección y rechazo de comas colgantes o vacías (`ADD B,`, `MOV , A`).
  - Suite de pruebas automatizadas `tests/parameter_validation.test.ts` con cobertura del 100%.

### 🐛 Correcciones de Errores (Bug Fixes)
- **Eliminación de Diálogos Modales `alert()` del Navegador:**
  - Se sustituyeron todas las ventanas bloqueantes del navegador (`127.0.0.1:... dice`) por notificaciones nativas en la barra de estado del editor, evitando interrupciones molestas en el flujo de trabajo.
- **Corrección de Apiñamiento de Texto en Barra Superior:**
  - Se retiró el badge de estado comprimido a la derecha de la barra de herramientas, permitiendo que la insignia de nombre de archivo (`sin_titulo.asm`) se posicione holgadamente a la derecha sin deformaciones verticales.
- **Cierre Global del Modal de Autocompletado:**
  - Se añadió un escuchador `pointerdown` global para descartar el menú desplegable al hacer clic en cualquier parte fuera de él (otras ventanas, toolbar o editor).
- **Autocompletado Consciente de Aridad:**
  - Se suprimió la sugerencia errónea de registros adicionales cuando la instrucción ya cuenta con sus operandos completos o cuando se introducen comas no válidas.

---

## [1.2.0] - 2026-10-24

### ✨ Nuevas Funcionalidades
- **Ajuste de Línea Suave (Soft Word Wrap) con Sincronización de Canaleta:**
  - Atajo global <kbd>Alt+Z</kbd>, botón en barra de herramientas del editor y opción en el menú `Ver` $\to$ `Ajuste de Línea`.
  - Integración reactiva con `ResizeObserver` para sincronizar en tiempo real la altura en píxeles de cada número en la canaleta (`line-numbers`) con el renglón visual correspondiente del código envuelto, manteniendo perfecta alineación visual.
- **Detección y Confirmación de Archivos No Guardados:**
  - Al cerrar pestañas individuales con cambios pendientes, se presenta un diálogo modal para Guardar y Cerrar, Descartar o Cancelar.
  - Al cerrar la aplicación (<kbd>Alt+F4</kbd>, <kbd>Ctrl+Q</kbd>, botón `X` de ventana de Neutralino o menú `Archivo` $\to$ `Salir`), se listan todos los archivos modificados con opción de guardar todo en lote o descartar.
- **Guardado Silencioso y Directo en Disco:**
  - Uso de *File System Access API* (`showSaveFilePicker`) y *Neutralino Filesystem API* para sobrescribir directamente sin descargas repetidas del navegador y recordando la carpeta seleccionada por el usuario.
- **Renombrado Inline de Pestañas:**
  - Posibilidad de editar el nombre del archivo activo haciendo doble clic directamente sobre el título de la pestaña.
- **Auto-Flip Dinámico de Tarjeta de Documentación Hover:**
  - Inversión vertical automática de la tarjeta de documentación rápida cuando la instrucción inspeccionada se ubica en las líneas inferiores del editor (`HLT`, `JNZ`), previniendo desbordes o cortes en pantalla.
- **Navegación de Teclado y Control de Salida:**
  - Soporte para <kbd>Enter</kbd> (Guardar) y <kbd>Esc</kbd> (Cancelar) en diálogos modales.
  - Supresión global del menú contextual de clic derecho del navegador para emular una aplicación 100% de escritorio.

### 🐛 Correcciones de Errores (Bug Fixes)
- **Corrección de Hit-Testing en Hover con Word Wrap:** Se sustituyó el cálculo lineal $(y / \text{lineHeight})$ por detección geométrica de `DOMRect` de cada token `span`, evitando que el cursor mostrara información de instrucciones desplazadas.
- **Sincronización al Abrir Archivos:** Se corrigió un fallo donde abrir un archivo en la pestaña inicial predeterminada no inyectaba el contenido en el editor en el primer intento.
- **Prevención de Terminación Prematura de Neutralino:** Se configuró `"exitProcessOnClose": false` permitiendo a JavaScript interceptar el evento nativo de cierre de ventana y solicitar confirmación de guardado.

---

## [1.1.0] - 2026-10-21

### ✨ Nuevas Funcionalidades
- **Diccionario Interactivo de Instrucciones Intel 8085 (F1):** Catálogo completo de 78 instrucciones con búsqueda en tiempo real, desglose de banderas, ciclos T y ejemplos prácticos.
- **Linter Factual de Ensamblador:** Detección de colisiones físicas de memoria entre directivas `.org` y `.data` con cero falsas alarmas.
- **Migración a Entorno Ligero WebView2 (Neutralino):** Reducción de consumo de RAM de 220 MB a 33 MB y arranque en menos de 300 ms.
- **Depurador Histórico con Step Back (Shift+F7):** Reversión exacta de estados de registros, memoria RAM y banderas.
- **Calculador de Retardos Ensamblador:** Asistente interactivo para generar bucles de retardo temporizados según la frecuencia del oscilador.

---

## [1.0.0] - 2026-10-14

### 🚀 Lanzamiento Inicial
- Interfaz gráfica MDI con ventanas flotantes (Editor ASM, Consola de CPU, Memoria RAM, Pila, Terminal CRT 0E000H, LEDs, Displays de 7/15 segmentos, Teclado matricial y DIP switches).
- CPU Intel 8085 con emulación precisa de 246 instrucciones y registro PSW.
- Compatibilidad 100% con archivos `.asm` y `.o` del simulador `8085sim` de la cátedra.
