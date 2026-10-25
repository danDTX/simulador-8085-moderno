# Changelog - Simulador Moderno Intel 8085

Todas las modificaciones notables de este proyecto están documentadas en este archivo siguiendo el formato [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).

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
