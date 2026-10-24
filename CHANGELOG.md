# Changelog - Simulador Moderno Intel 8085

Todas las modificaciones notables de este proyecto están documentadas en este archivo siguiendo el formato [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).

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
