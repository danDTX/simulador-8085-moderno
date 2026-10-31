# Changelog - Simulador Moderno Intel 8085

Todas las modificaciones notables de este proyecto están documentadas en este archivo siguiendo el formato [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).

---

## [1.9.10] - 2026-10-31

### 🔌 Control 100% Manual de Interrupciones y Eliminación de Auto-detección Fantasma
- **🚫 Eliminación de la Auto-detección en Ensamblado:**
  - Se eliminó el bloque de código en `assembleCode()` (`main.ts`) que inspeccionaba en segundo plano las direcciones vectoriales (`0024H`, `002CH`, `0034H`, `003CH`) y activaba automáticamente interrupciones de teclado por su cuenta al compilar (`F9`).
  - El compilador ahora se limita con estricta pureza a cargar bytes en la memoria RAM, sin alterar jamás el estado de los periféricos ni de las interrupciones externas, calcando el comportamiento de `8085sim`.
- **🎯 Fuente Única de Verdad para Interrupciones de Teclado:**
  - `pressKey()` despacha única y exclusivamente la línea seleccionada por el usuario en `keyboardInterruptType` (`NONE`, `5.5`, `6.5`, `7.5`, `TRAP` o `INTR`).
  - Se solucionó el bug donde cambiar el teclado de RST 7.5 a RST 5.5 seguía ejecutando 7.5: al eliminar el doble despacho en `peripherals.ts`, conmutar entre vectores aísla al 100% la interrupción elegida, sin disparos residuales ni solapamiento por prioridades.
- **🔄 Sincronización Reactiva:**
  - El selector del panel de teclado escucha reactivamente las actualizaciones de estado para mantenerse siempre sincronizado con el diálogo modal de interrupciones.

---

## [1.9.9] - 2026-10-31

### 💾 Eliminación del Autoguardado Continuo y Corrección Definitiva del Descarte de Cambios
- **⚡ Eliminación del Autoguardado Continuo en Edición:**
  - Se eliminó el temporizador de 300 ms (`scheduleAutoSave`) que sobrescribía el almacenamiento de sesión en disco (`sim8085_config.json`) y `localStorage` con cada pulsación de tecla.
  - El editor adopta el estándar natural de herramientas de desarrollo profesionales (como VS Code): las modificaciones permanecen de forma ligera en memoria RAM con indicador visual `•` de cambios pendientes, sin realizar escrituras innecesarias en disco mientras se escribe.
- **🗑️ Descarte de Cambios 100% Efectivo al Salir:**
  - **Causa Raíz:** Al cerrar la ventana y pulsar *"Descartar Cambios"*, la rutina de salida `exitApp()` llamaba incondicionalmente a `saveAppState()`, volviendo a guardar el borrador sucio en el archivo de sesión `sim8085_config.json`, lo que provocaba que al reabrir la app el documento modificado reapareciera como si se hubiera guardado.
  - **Solución:**
    - Al pulsar *"Descartar Cambios"*, se ejecuta `editor.revertTab(tab)`, restaurando el código al estado limpio original del archivo en disco (`cleanCode`) y removiendo cualquier borrador residual de `localStorage`.
    - `saveAppState()` ahora persiste únicamente el código limpio validado (`cleanCode`), garantizando que los cambios descartados nunca contaminen la sesión ni se almacenen involuntariamente.
    - Los archivos físicos en disco permanecen completamente intactos y sin alteraciones cuando el usuario elige descartar.

---

## [1.9.8] - 2026-10-30

### ⚡ Corrección y Calibración Integral del Sistema de Interrupciones (TRAP, RST 7.5, RST 6.5, RST 5.5)
- **🚫 Inicio en 'NO' por Defecto en Todas las Interrupciones:**
  - El modal de configuración de interrupciones externas generadas automáticamente ahora inicializa estrictamente todos los vectores (`TRAP`, `RST 7.5`, `RST 6.5`, `RST 5.5`) en **"No"** (eliminando la preselección arbitraria de RST 5.5 al pulsar teclado).
  - El panel de teclado virtual (`KeypadPanel`) inicia en **"Ninguna"**.
- **🎛️ Sincronización y Disparo Real de RST 7.5, RST 6.5 y RST 5.5:**
  - **Causa Raíz del Fallo en RST 7.5:** El selector de interrupción del panel de teclado (`#sel-keypad-intr`) actualizaba `keyboardInterruptType = '7.5'`, pero el manejador de pulsaciones `pressKey()` solo evaluaba el tipo `INTR`, ignorando `7.5`, `6.5` y `5.5` salvo que estuvieran configurados en la matriz del modal.
  - **Solución:** `pressKey()` ahora dispara de forma directa e independiente el vector seleccionado (`7.5`, `6.5`, `5.5` o `INTR`) tanto por la matriz de `autoInterrupts` como por el selector directo del panel de teclado, manteniéndolos bidireccionalmente sincronizados.
- **🔓 Des-enmascaramiento por Defecto en CPU (Compatibilidad 8085sim):**
  - En el software original `8085sim` de Jubin Mitra, las máscaras de hardware `mask75`, `mask65` y `mask55` inician en `0` (desenmascaradas) en el arranque/reset para permitir que programas estudiantiles con solo `EI` (como el ejemplo oficial `Leds.asm`) respondan inmediatamente sin obligar a ejecutar `SIM`.
  - Ahora `cpu.reset()` inicializa las máscaras en `false`, manteniendo compatibilidad total si el alumno decide ejecutar `SIM` con `MSE=1` para enmascararlas o reconfigurarlas.
- **✅ Verificación y Validación de los 4 Vectores:**
  - `TRAP` (`0024H`), `RST 7.5` (`003CH`), `RST 6.5` (`0034H`) y `RST 5.5` (`002CH`) verificados con ejecución completa de ISR y retorno limpio con `RET`.

---

## [1.9.7] - 2026-10-30

### 🇪🇸 Soporte Completo para la Letra 'Ñ' y Caracteres en Español en Etiquetas
- **🔡 Soporte Nativo en Analizador Léxico y Tabla de Símbolos:**
  - El compilador (`assembler.ts`), tabla de símbolos (`symbolTable`) y evaluador de expresiones ahora admiten fluidamente identificadores con la letra `Ñ`, `ñ` y vocales con tildes (ej. `CONTRASEÑA:`, `PEQUEÑO:`, `AÑO:`, `SUBRUTÍNA:`).
  - Compatible con saltos y llamadas directas: `CALL CONTRASEÑA`, `JZ PEQUEÑO`, `JMP AÑO`.
  - Resuelto el conflicto de límites de palabra (`\b`) en expresiones regulares de JavaScript mediante aserciones de mirada Unicode (`(?<!...)` y `(?!...)`).
- **🟣 Resaltado, Hover y Autocompletado con 'Ñ':**
  - El resaltador de sintaxis (`editor.ts`), escáner de etiquetas (`DocsHelper.scanLabels`) y validador de saltos (`validateLabels`) ya no fragmentan las palabras con 'Ñ' (evitando que `CONTRASEÑA` se parta erróneamente en `CONTRASE` y `A`).
  - El autocompletado y el salto a la definición (`Ctrl + Clic` / `F12`) identifican la palabra completa con caracteres en español.

### 🐛 Corrección Definitiva del Desfase Vertical del Cursor y Selección
- **📐 Desactivación de Word Wrap por Defecto:**
  - Siguiendo el estándar de desarrollo en ensamblador (donde el código se organiza estrictamente por columnas de etiquetas, mnemónicos, operandos y comentarios), el editor ahora inicia con **Ajuste de Línea desactivado por defecto** (`wordWrap: false`), evitando que los comentarios largos se quiebren y desalineen la vista.
- **🛡️ Blindaje CSS de Alturas Sincronizadas:**
  - Corregida la regla de `.code-line` para permitir alturas dinámicas sin límites fijos de `max-height` si el usuario activa el ajuste de línea con `Alt+Z`, manteniendo una sincronización matemática exacta entre el `<textarea>` nativo y la capa de resaltado visual.

---

## [1.9.6] - 2026-10-30

### 🐛 Corrección Crítica en Deshacer (`Ctrl + Z`) tras Autocompletado y Tabulación
- **↩️ Preservación Nativa del Historial de Deshacer (`Undo Stack`):**
  - **Causa Raíz:** Al autocompletar una instrucción (ej. presionar `Enter` en `CALL` tras tipear `CA`) o presionar `Tab`, se mutaba directamente la propiedad `.value` del elemento `<textarea>`, lo que por estándar de los navegadores (Chromium / Edge WebView2) destruía y vaciaba la pila interna de historial de `Undo / Redo`.
  - **Solución Definitiva:** Se migró la inserción de texto en `insertAutocompleteItem`, tabulación e `insertAtCursor` a la API transaccional nativa `document.execCommand('insertText')` con selección precisa de rango y degradación elegante.
  - **Resultado:** Ahora, al autocompletar cualquier instrucción o insertar código desde el diccionario, presionar **`Ctrl + Z`** revierte de forma instantánea y natural la inserción (volviendo a `CA` o al estado previo) sin perder ninguna acción del historial.

---

## [1.9.5] - 2026-10-30

### 🎯 Resaltado y Tarjetas Flotantes en Llamadas y Saltos (`CALL`, `JMP`, `Jxx`, `Cxx`, `LXI`)
- **🟣 Resaltado Inteligente de Etiquetas Referenciadas:**
  - Las etiquetas utilizadas como operandos tras instrucciones de salto o llamada (`CALL BORRAR_PANTALLA`, `JMP INICIO`, `JNZ BUCLE`, `LXI H, TABLA`, etc.) ahora se colorean con la paleta distintiva de etiquetas (`syn-label`, púrpura `#8250df` en modo claro y `#b392f0` en modo oscuro).
  - Cuentan con un sutil subrayado punteado que se vuelve sólido al pasar el cursor, señalizando claramente que se trata de un enlace interactivo hacia una subrutina o destino.
- **📍 Tarjeta Flotante Interactiva en Puntos de Llamada:**
  - Al posicionar el cursor sobre la etiqueta que acompaña a un `CALL` o `JMP`, se despliega de inmediato la tarjeta informativa indicando la línea exacta donde está definida y recordando los atajos: `(Presiona F12 o Ctrl + Clic para saltar • Alt + ← para volver)`.
  - Si una etiqueta referenciada aún no ha sido declarada en el código, el hover despliega una tarjeta de advertencia preventiva: `⚠️ La etiqueta aún no está declarada en este documento`.
- **🔤 Búsqueda y Navegación Case-Insensitive:**
  - Resolución tolerante a mayúsculas y minúsculas tanto en el hover como en el salto `F12` / `Ctrl + Clic`.

---

## [1.9.4] - 2026-10-30

### 🚀 Navegación Bidireccional en el Editor (Historial de Saltos a Definición)
- **🔙 Retorno Rápido con `Alt + ←` (Navigate Back):**
  - Implementación de la pila de historial de navegación en el editor de código. Al saltar a la definición de una etiqueta (`Ctrl + Clic` o `F12`) o al hacer clic en un mensaje de error, la posición de origen se almacena automáticamente.
  - Al presionar **`Alt + Flecha Izquierda`** (o `Alt + Left`), el cursor y el desplazamiento regresan de forma instantánea a la línea y columna original donde se estaba editando, mostrando confirmación en la barra de estado (`📍 Volvió a Línea X`).
- **🔜 Avance con `Alt + →` (Navigate Forward):**
  - Permite volver a avanzar hacia adelante en la cadena de saltos previos en caso de haber regresado.
- **💡 Indicación Contextual Didáctica en Tarjeta Flotante:**
  - Al pasar el cursor sobre cualquier etiqueta, el mensaje emergente informa: `(Presiona F12 o Ctrl + Clic para saltar • Alt + ← para volver)`.
- **🧪 Cobertura de Pruebas Unitarias:**
  - Incorporada nueva suite automatizada en `tests/editor_navigation.test.ts` validando la preservación de saltos y navegación limpia.

---

## [1.9.3] - 2026-10-30

### 🎨 Modo Claro en Tarjetas Flotantes (Hover Tooltip, Autocompletado y Resaltado)
- **☀️ Adaptabilidad de la Tarjeta Flotante Informativa (Hover Tooltip):**
  - Se adaptó por completo la tarjeta flotante de ayuda contextual que aparece al pasar el cursor sobre instrucciones y registros en el editor cuando el Modo Claro está activo.
  - La tarjeta ahora luce un fondo blanco nítido (`#ffffff`) con bordes suaves (`#d0d7de`), sombra difusa ergonómica y tipografía en gris oscuro de alto contraste (`#24292f`).
  - La cabecera, mnemónico y parámetros destacados utilizan el azul institucional (`#0969da`), la insignia de grupo presenta un chip azul suave y el recuadro de ejemplo técnico muestra el código ensamblador en verde bosque legible (`#1a7f37`) sobre fondo gris suave (`#f6f8fa`).
- **☀️ Menú Desplegable de Autocompletado:**
  - Adaptación completa del dropdown de autocompletado en el editor al Modo Claro con fondo blanco, bordes limpios y selección con acento azul.
- **☀️ Resaltado de Sintaxis Optimizado para Tema Claro:**
  - Reglas de color con contraste WCAG AAA para mnemónicos, directivas, registros, números y comentarios sobre fondo blanco.

---

## [1.9.2] - 2026-10-29

### 🎨 Mejoras Visuales en Diccionario Técnico (Modo Claro)
- **☀️ Adaptabilidad de Ejemplos en Ensamblador al Tema Claro:**
  - Se eliminó el bloque negro oscuro (`#0d1117`) de la sección *"Ejemplo Práctico en Ensamblador"* del Diccionario de Instrucciones (F1) en el modo claro.
  - La caja de código ahora utiliza un fondo gris claro ergonómico (`#f6f8fa`) con borde neutro (`#d0d7de`) y texto oscuro de alto contraste (`#24292f`).
  - La burbuja de parámetros y operandos válidos se estilizó con fondo suave y acento azul institucional (`#0969da`) para una lectura limpia sin deslumbramiento.

---

## [1.9.1] - 2026-10-29

### 🎨 Mejoras Visuales y Modo Claro
- **☀️ Adaptabilidad Completa del Rack de Registros de CPU al Modo Claro:**
  - Se eliminó el fondo negro sólido (`#000000` / `#0a0000`) del panel de registros en el tema claro, reemplazándolo por una tarjeta integrada (`#ffffff`) con rack suave (`#f6f8fa`) y bordes claros acordes a la paleta institucional.
  - Los dígitos LED se presentan en rojo oscuro de alto contraste (`#cf222e`) sin halos de deslumbramiento, mejorando la ergonomía visual y reduciendo la fatiga ocular.
  - Indicadores SP en verde hoja (`#1a7f37`), PC en azul institucional (`#0969da`), escala de bits en gris legible (`#57606a`) y botón Reset adaptado al tema claro.
  - Bits de Estado (Flags LEDs) con soporte nativo de modo claro (LEDs apagados en tono neutro claro y encendidos en verde nítido).

---

## [1.9.0] - 2026-10-29

### 🚀 Nuevas Características (Auto-Actualizador y Ecosistema de Distribución)
- **🔄 Motor de Auto-Actualización 100% Automático con Reinicio Seguro:**
  - **Detección Dual:** Comprobación silenciosa en segundo plano al iniciar (3.5s tras el arranque) y comprobación manual instantánea desde el nuevo elemento de menú `Ayuda -> 🔄 Buscar Actualizaciones...`.
  - **Integración con GitHub Releases API:** Consulta en tiempo real al endpoint público oficial `api.github.com/repos/danDTX/simulador-8085-moderno/releases/latest`.
  - **Insignia Visual Pulsante en Taskbar:** Si existe una versión más reciente, aparece un botón animado `[🚀 ¡Actualización vX.X.X!]` en la barra inferior para acceder al diálogo sin interrumpir el trabajo actual.
  - **Descarga con Barra de Progreso en Vivo:** Diálogo modal informativo con visualización de notas de la versión, cálculo de porcentaje y velocidad de transferencia en megabytes (`MB recibidos / MB totales`).
  - **Proceso de Relevo Transparente (`updater.bat`):** Script temporal que resuelve el bloqueo de archivos en ejecución de Windows (`EBUSY / File Lock`), espera la terminación limpia del proceso, descomprime los binarios con PowerShell (`Expand-Archive`), **preserva fielmente la configuración del usuario (`sim8085_config.json`)** y relanza automáticamente el simulador actualizado antes de autodestruirse.

---

## [1.8.0] - 2026-10-29

### 🚀 Nuevas Características y Mejoras de Interfaz (UX/UI)
- **↔️ Divisor Interactivo Deslizable (Draggable Splitter) con Memoria:**
  - Nuevo divisor vertical interactivo (`#desktop-splitter`) situado entre el Editor ASM y la Consola Central de la CPU.
  - Permite arrastrar libremente hacia la izquierda o derecha para redistribuir el espacio visual según las necesidades del usuario.
  - **Límites de Seguridad y Centrado Rápido:** Protege la legibilidad con anchos mínimos (Editor $\ge 320\text{px}$, Consola $\ge 460\text{px}$). Doble clic en la barra restablece instantáneamente el reparto exacto al 50% / 50%.
  - **Persistencia de Proporción:** La posición (`splitRatio`) se almacena automáticamente en `sim8085_config.json` y se restaura fielmente al reiniciar la aplicación.
- **📟 Visualización Compacta y Responsiva de Registros de la CPU (Cero Recortes):**
  - Se optimizó la representación de los registros LED de 16 bits agrupándolos por nibbles (`0000 0000   0000 0000`) con su escala de bits perfectamente alineada (`7654 3210   7654 3210`).
  - Reducción de más de 140px de ancho total requerido por el rack de registros (`.digital-regs-rack` pasa de 375px a 232px).
  - La columna hexadecimal (`dreg-hex`) y los 4 bits inferiores (3, 2, 1, 0) ya nunca se recortan ni ocultan, incluso en monitores pequeños de laptop o cuando el usuario arrastra el divisor para agrandar el editor.
- **💡 Corrección Integral del Display de 15 Segmentos (Herramienta y Periférico):**
  - **Corrección Histórica del Número '8':** El valor de Byte 2 para el dígito `'8'` en la tabla oficial de 8085sim era erróneamente `00H, 77H` (idéntico a la letra `'O'`), dejando el segmento horizontal central apagado. Se corrigió a `00H, 7FH` (con el Bit 3 activado a 1).
  - **Mapeo Completo del Segmento Central (Bit 3 de Byte 2):** Se enlazó el Bit 3 del Byte 2 (`segG_b2`) para que active simultáneamente los segmentos internos $G_1$ y $G_2$ en la vista previa interactiva SVG.
  - **Visualización Fiel de 13 Caracteres:** Caracteres como `'8'`, `'F'`, `'A'`, `'E'`, `'H'`, `'P'`, `'R'`, `'2'`, `'3'`, `'4'`, `'5'`, `'6'` y `'9'` ahora iluminan su barra horizontal central con precisión técnica tanto en el codificador como en el periférico de simulación.
- **🖥️ Inicio Siempre Maximizado al Monitor:**
  - Configuración `"maximize": true` en `neutralino.config.json` y llamada nativa segura `Neutralino.window.maximize()` en arranque. La ventana se expande al 100% del área útil del monitor en cualquier pantalla (laptops, monitores HD, 2K o 4K) sin requerir atajos de teclado (`Win + ↑`).
- **📐 Layout Fijo 50/50 y Responsividad Completa:**
  - El Editor ASM (izquierda) y la Consola Central (derecha) ahora operan en un diseño integrado fijo 50% / 50% (`isFixed: true`), eliminando desalineaciones por arrastre accidental.
  - Adaptabilidad continua a cambios de resolución mediante evento de redimensionado dinámico (`window.addEventListener('resize')`).
  - **Extensión Vertical de los 4 Paneles Inferiores:** Se eliminó la altura fija de 210px y el espacio negro muerto inferior; los paneles de E/S Serie & Interrupciones, Puertos (00-FF), Memoria de Datos y Pila ahora se estiran responsivamente (`flex: 1`) hasta el borde inferior, mostrando muchas más filas visibles.
- **📜 Memoria de Instrucciones Completa (Programa Entero sin Límite de 18 Filas):**
  - Reemplazo del bucle fijo de 18 instrucciones por un desensamblado secuencial integral de todo el código de programa ensamblado (hasta 2.500 instrucciones consecutivas).
  - El usuario puede desplazarse libremente con la rueda del ratón por todas las líneas del código.
  - Seguimiento del PC sin destrucción de DOM: cambio instantáneo de la clase `row-pc-active` con desplazamiento automático suave (`scrollIntoView({ block: 'nearest' })`).
- **✏️ Corrección Definitiva del Desfase en Ajuste de Línea (Word Wrap / Alt+Z):**
  - Compensación milimétrica del ancho de la barra de desplazamiento vertical en la capa de resaltado (`highlightOverlay.style.paddingRight = 12px + scrollbarWidth`).
  - Estilización dedicada de `.editor-textarea::selection` con `color: transparent !important;`, eliminando letras superpuestas, mezclas de texto y desfases entre el cursor y el código visualizado.
- **⚠️ Banner Prominente de Error y Detección Didáctica de `ñ` y Acentos:**
  - Nuevo banner visual superior con animación de sacudida (*shake*), título claro y mensaje didáctico inmediato.
  - Detección precisa de caracteres no ASCII en etiquetas y mnemónicos, informando exactamente qué carácter inválido causó el error y recordando la regla histórica de identificadores del 8085 (`[A-Z, 0-9, _]`).
  - Clic en el banner para saltar directamente a la línea culpable.

### 🐛 Correcciones de Errores y Confiabilidad (Bug Fixes)
- **Restauración del Diálogo de Confirmación de Cambios no Guardados:**
  - **Corrección de `isDirty` al Ensamblar (`src/main.ts`):** Al compilar con `F9`, `F5` o `F7`, se eliminó la asignación indebida `this.editor.isDirty = false`. Ensamblar a memoria RAM (`needsAssemble = false`) ya no borra el estado de modificación respecto a disco. El indicador de cambios pendientes (punto amarillo `•`) y la protección de archivo permanecen activos hasta que se guarde explícitamente (`Ctrl+S`).
  - **Interceptación Segura del Cierre de Ventana (`[X]` y `Alt+F4`):**
    - Se ajustó `"exitProcessOnClose": false` en `neutralino.config.json` para que el evento nativo `windowClose` sea recibido por el manejador `handleAppExit()`.
    - Si existen archivos abiertos con cambios sin guardar, se despliega el cuadro modal de confirmación con las opciones: *Guardar y Cerrar*, *Descartar Cambios* o *Cancelar*.
    - Si no hay cambios pendientes, la aplicación cierra el proceso limpiamente de inmediato.
- **Sincronización de Versión Oficial:**
  - Actualización oficial a `v1.7.1` en `package.json`, `neutralino.config.json` y el diálogo institucional `Acerca de 8085sim Modern`.

---

## [1.7.0] - 2026-10-28

### 🚀 Nuevas Características (Features)
- **📋 Ventana y Motor de Prueba de Escritorio (Matriz de Traza de Ejecución):**
  - Nueva herramienta didáctica en el Menú **Herramientas $\to$ 📋 Prueba de Escritorio (Tabla de Traza)...** (`src/ui/panels/traceTablePanel.ts` y `src/core/traceEngine.ts`).
  - Ejecución en segundo plano sobre un clon aislado de la CPU para no alterar la sesión activa de depuración del usuario.
  - Registro paso a paso de `CODIGO`, registros `A`, `B`, `C`, `D`, `E`, `H`, `L`, `M` *(RAM en HL)*, `SP`, `PC` y banderas `Z`, `S`, `AC`, `CY`, `P`.
  - Detección inteligente de inicio en memoria: salta automáticamente NOPs vacíos (`00H`) si `0000H` no contiene código, o inicia en la dirección que el usuario defina (persistida en `sim8085_config.json`).
  - Límite de seguridad contra bucles infinitos configurable (por defecto 1,000 instrucciones).
  - Resaltado en **rojo brillante (`#c00000`) con texto blanco** para cada celda de registro o bandera que cambió en esa instrucción, y banda roja completa para la instrucción `HLT`.
  - **Exportación Versátil:**
    - Botón **📋 Copiar Tabla**: Copia formato enriquecido (HTML + TSV) para pegar directamente con `Ctrl+V` en Microsoft Excel o Google Sheets conservando columnas y colores.
    - Botón **📥 Exportar Excel (.xls)**: Hoja de cálculo con colores y estilos.
    - Botón **📄 CSV**: Archivo delimitado por comas.

### 🎨 Mejoras de Interfaz y Modo Claro (UI/UX)
- **Adaptabilidad de la Prueba de Escritorio a Modo Claro:**
  - En modo claro, la tabla adopta el diseño idéntico a una hoja de cálculo Excel (encabezado verde `#548235`, filas alternadas `#e2efda` y `#ffffff`, texto oscuro `#1b3b14` y resaltados rojos legibles).
  - Corrección de la columna `PC` para que no se pinte de rojo innecesariamente en cada instrucción.
  - Textos y botones de la barra de herramientas con contraste óptimo en ambos temas mediante variables CSS.
- **Pestañas del Editor ASM en Modo Claro:**
  - La barra de pestañas `.editor-tab-bar` ahora utiliza fondos adaptables (`#e8eaed` en modo claro en lugar de negro fijo `#0d1117`).
  - Pestañas inactivas con fondo visible (`#dadce0`), pestaña activa en blanco limpio con borde superior de acento, y botón `+` de añadir pestaña de alta visibilidad.
- **Sincronización de Versión en Diálogo "Acerca de":**
  - Actualización de la versión mostrada en `Acerca de 8085sim Modern` a `v1.7.0` dinámicamente vinculada a `APP_VERSION`.

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
