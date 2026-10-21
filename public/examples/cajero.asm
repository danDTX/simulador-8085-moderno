; =========================================================================
; PROYECTO: AUTENTICACION EN ATM (CAJERO AUTOMATICO)
; MATERIA: MICROPROCESADORES I (II-2026)
; Periféricos: Pantalla de Texto (0E000H) + Teclado (RST 5.5) + LEDs (01H)
; =========================================================================

; -------------------------------------------------------------------------
; 1. VARIABLES Y CADENAS EN RAM SEGURA (.data 0800H)
; -------------------------------------------------------------------------
    .data 0800H
    ; 0800H: FLAG_TECLA
    ; 0801H: BUFFER_TECLA
    ; 0802H-0805H: CLAVE_SECRETA actual ("7162" -> 37H, 31H, 36H, 32H)
    ; 0806H-0809H: BUFFER_INGRESO (00H, 00H, 00H, 00H)
    ; 080AH: CANT_DIGITOS (00H)
    ; 080BH: INTENTOS_FALLIDOS (00H)
    dB 00H, 00H, 37H, 31H, 36H, 32H, 00H, 00H, 00H, 00H, 00H, 00H

; 0810H: Buffer auxiliar para guardar la nueva clave (4 bytes)
    .data 0810H
    dB 00H, 00H, 00H, 00H

; Textos de Interfaz
    .data 0820H
    dB 2AH, 2AH, 2AH, 20H, 42H, 41H, 4EH, 43H, 4FH, 20H, 55H, 4EH, 49H, 4FH, 4EH, 20H, 41H, 54H, 4DH, 20H, 2AH, 2AH, 2AH, 00H    ; "*** BANCO UNION ATM ***"

    .data 0840H
    dB 49H, 4EH, 53H, 45H, 52H, 54H, 45H, 20H, 53H, 55H, 20H, 54H, 41H, 52H, 4AH, 45H, 54H, 41H, 20H, 5BH, 54H, 5DH, 00H    ; "INSERTE SU TARJETA [T]"

    .data 0860H
    dB 5BH, 53H, 5DH, 20H, 49H, 4EH, 47H, 52H, 45H, 53H, 41H, 52H, 20H, 43H, 4CH, 41H, 56H, 45H, 00H    ; "[S] INGRESAR CLAVE"

    .data 0880H
    dB 5BH, 4DH, 5DH, 20H, 43H, 41H, 4DH, 42H, 49H, 41H, 52H, 20H, 43H, 4CH, 41H, 56H, 45H, 00H    ; "[M] CAMBIAR CLAVE"

    .data 08A0H
    dB 5BH, 4FH, 5DH, 20H, 52H, 45H, 54H, 49H, 52H, 41H, 52H, 20H, 54H, 41H, 52H, 4AH, 45H, 54H, 41H, 00H    ; "[O] RETIRAR TARJETA"

    .data 08C0H
    dB 43H, 4CH, 41H, 56H, 45H, 20H, 28H, 34H, 20H, 44H, 49H, 47H, 29H, 3AH, 20H, 00H    ; "CLAVE (4 DIG): "

    .data 08E0H
    dB 5BH, 41H, 5DH, 41H, 4EH, 4FH, 54H, 20H, 5BH, 42H, 5DH, 42H, 4FH, 52H, 52H, 20H, 5BH, 43H, 5DH, 43H, 41H, 4EH, 43, 00H    ; "[A]ANOT [B]BORR [C]CANC"

    .data 0900H
    dB 41H, 43H, 43H, 45H, 53H, 4FH, 20H, 43H, 4FH, 52H, 52H, 45H, 43H, 54H, 4FH, 21H, 00H    ; "ACCESO CORRECTO!"

    .data 0920H
    dB 43H, 4CH, 41H, 56H, 45H, 20H, 49H, 4EH, 43H, 4FH, 52H, 52H, 45H, 43H, 54H, 41H, 21H, 00H    ; "CLAVE INCORRECTA!"

    .data 0940H
    dB 21H, 42H, 4CH, 4FH, 51H, 55H, 45H, 41H, 44H, 4FH, 21H, 20H, 50H, 55H, 4CH, 53H, 45H, 20H, 5BH, 52H, 5DH, 00H    ; "!BLOQUEADO! PULSE [R]"

    .data 0960H
    dB 4EH, 55H, 45H, 56H, 41H, 20H, 43H, 4CH, 41H, 56H, 45H, 3AH, 20H, 00H    ; "NUEVA CLAVE: "

    .data 0980H
    dB 43H, 4CH, 41H, 56H, 45H, 20H, 41H, 43H, 54H, 55H, 41H, 4CH, 49H, 5AH, 41H, 44H, 41H, 21H, 00H    ; "CLAVE ACTUALIZADA!"

    .data 09A0H
    dB 54H, 41H, 52H, 4AH, 45H, 54H, 41H, 20H, 52H, 45H, 54H, 49H, 52H, 41H, 44H, 41H, 2EH, 00H    ; "TARJETA RETIRADA."

; -------------------------------------------------------------------------
; 2. VECTORES DE RESET E INTERRUPCION
; -------------------------------------------------------------------------
    .org 0000H
    JMP INICIO

    .org 002CH
    JMP ISR_TECLADO                 ; Vector RST 5.5

; -------------------------------------------------------------------------
; 3. PROGRAMA PRINCIPAL
; -------------------------------------------------------------------------
    .org 0100H
INICIO:
    LXI SP, 20FFH                   ; Pila segura en 20FFH
    XRA A
    STA 0800H                       ; FLAG_TECLA = 0
    STA 080BH                       ; INTENTOS_FALLIDOS = 0
    OUT 01H                         ; Apagar LEDs

    ; Configurar RST 5.5: MSE=1, mascaras en 0
    MVI A, 08H
    SIM
    EI

PANTALLA_BIENVENIDA:
    OUT 01H                         ; LEDs apagados
    CALL BORRAR_PANTALLA

    ; Titulo en Fila 1, Col 8 (0E030H)
    ; -------------------------------------------------------------------------
    ; Direccion = 0E000H + (Fila×28H) + Columna
    ; -------------------------------------------------------------------------
    
    LXI H, 0E030H
    LXI D, 0820H
    CALL IMPRIMIR_TEXTO

    ; "INSERTE SU TARJETA [T]" en Fila 4, Col 8 (0E0A8H)
    LXI H, 0E0A8H
    LXI D, 0840H
    CALL IMPRIMIR_TEXTO

ESPERAR_TARJETA:
    CALL LEER_TECLA
    CPI 54H                         ; �Tecla 'T' (TARJETA_IN)?
    JNZ ESPERAR_TARJETA

; -------------------------------------------------------------------------
; 4. MENU DE AUTENTICACION (TARJETA INSERTADA)
; -------------------------------------------------------------------------
MENU_AUTENTICACION:
    CALL BORRAR_PANTALLA

    ; Titulo en Fila 0, Col 8 (0E008H)
    LXI H, 0E008H
    LXI D, 0820H
    CALL IMPRIMIR_TEXTO

    ; [S] INGRESAR CLAVE en Fila 2, Col 4 (0E054H)
    LXI H, 0E054H
    LXI D, 0860H
    CALL IMPRIMIR_TEXTO
    ; [M] CAMBIAR CLAVE en Fila 3, Col 4 (0E07CH)
    LXI H, 0E07CH
    LXI D, 0880H
    CALL IMPRIMIR_TEXTO

    ; [O] RETIRAR TARJETA en Fila 4, Col 4 (0E0A4H)
    LXI H, 0E0A4H
    LXI D, 08A0H
    CALL IMPRIMIR_TEXTO

ESPERAR_OPCION:
    CALL LEER_TECLA
    CPI 53H                         ; Tecla 'S' (START)?
    JZ MODO_INGRESAR_CLAVE

    CPI 4DH                         ; �Tecla 'M' (CAMBIO DE CLAVE)?
    JZ MODO_CAMBIAR_CLAVE

    CPI 4FH                         ; �Tecla 'O' (TARJETA_OUT)?
    JZ MODO_RETIRAR_TARJETA

    JMP ESPERAR_OPCION

; -------------------------------------------------------------------------
; 5. PROCESO DE INGRESO Y VALIDACION DE CLAVE
; -------------------------------------------------------------------------
MODO_INGRESAR_CLAVE:
    CALL BORRAR_PANTALLA

    ; Prompt en Fila 2, Col 2 (0E052H)
    LXI H, 0E052H
    ; IMPRIMIR CLAVE
    LXI D, 08C0H
    CALL IMPRIMIR_TEXTO

    ; Ayuda de teclas en Fila 5, Col 2 (0E0CAH)
    LXI H, 0E0CAH
    LXI D, 08E0H
    CALL IMPRIMIR_TEXTO

    ; Capturar 4 d�gitos en buffer 0806H
    LXI D, 0806H
    LXI H, 0E062H                   ; Cursor VRAM (Fila 2, Col 18)
    CALL CAPTURAR_4_DIGITOS

    ; Si presion� 'C' (CANCEL), CY=1 -> volver al men� sin contar fallo
    JC MENU_AUTENTICACION

    ; Validar d�gitos comparando 0806H con CLAVE_SECRETA (0802H)
    CALL VALIDAR_CLAVE
    JZ EXITO_CLAVE

    ; Si fall�:
    LDA 080BH
    INR A
    STA 080BH                       ; INTENTOS++
    CPI 04H
    JNC ESTADO_BLOQUEO              ; Si llega a 4 fallos, bloquear

    ; Mostrar mensaje de error en Fila 3, Col 2 (0E07AH)
    LXI H, 0E07AH
    LXI D, 0920H
    CALL IMPRIMIR_TEXTO
    CALL PAUSA_CORTA
    JMP MENU_AUTENTICACION

EXITO_CLAVE:
    XRA A
    STA 080BH                       ; Resetear contador de fallos
    MVI A, 0FFH
    OUT 01H                         ; Encender barra de LEDs (�xito)

    ; Mostrar "ACCESO CORRECTO!" en Fila 3, Col 2 (0E07AH)
    LXI H, 0E07AH
    LXI D, 0900H
    CALL IMPRIMIR_TEXTO
    CALL PAUSA_CORTA
    JMP MENU_AUTENTICACION

; -------------------------------------------------------------------------
; 6. ESTADO DE BLOQUEO POR 4 INTENTOS FALLIDOS Y RESET
; -------------------------------------------------------------------------
ESTADO_BLOQUEO:
    CALL BORRAR_PANTALLA
    XRA A
    OUT 01H                         ; Apagar LEDs

    ; Mostrar "!BLOQUEADO! PULSE [R]" en Fila 2, Col 4 (0E054H)
    LXI H, 0E054H
    LXI D, 0940H
    CALL IMPRIMIR_TEXTO

BUCLE_BLOQUEO:
    CALL LEER_TECLA
    CPI 52H                         ; �Tecla 'R' (RESET)?
    JNZ BUCLE_BLOQUEO

    ; Reset del sistema: volver a 0 fallos y reiniciar autenticaci�n
    XRA A
    STA 080BH
    JMP MENU_AUTENTICACION

; -------------------------------------------------------------------------
; 7. PROCESO PARA CAMBIAR LA CLAVE
; -------------------------------------------------------------------------
MODO_CAMBIAR_CLAVE:
    CALL BORRAR_PANTALLA

    ; Paso 1: Pedir y validar la clave actual
    LXI H, 0E052H
    LXI D, 08C0H                    ; "CLAVE (4 DIG): "
    CALL IMPRIMIR_TEXTO

    LXI D, 0806H
    LXI H, 0E062H
    CALL CAPTURAR_4_DIGITOS
    JC MENU_AUTENTICACION           ; Si cancel� con 'C'

    CALL VALIDAR_CLAVE
    JNZ CAMBIO_FALLIDO              ; Si la clave actual es incorrecta, no contin�a

    ; Paso 2: Si clave actual es OK, pedir nueva clave
    CALL BORRAR_PANTALLA
    LXI H, 0E052H
    LXI D, 0960H                    ; "NUEVA CLAVE: "
    CALL IMPRIMIR_TEXTO

    LXI D, 0810H                    ; Guardar temporalmente en 0810H
    LXI H, 0E062H
    CALL CAPTURAR_4_DIGITOS
    JC MENU_AUTENTICACION

    ; Copiar nueva clave desde 0810H a CLAVE_SECRETA (0802H)
    LDA 0810H
    STA 0802H
    LDA 0811H
    STA 0803H
    LDA 0812H
    STA 0804H
    LDA 0813H
    STA 0805H

    ; Mensaje de confirmaci�n
    LXI H, 0E07AH
    LXI D, 0980H                    ; "CLAVE ACTUALIZADA!"
    CALL IMPRIMIR_TEXTO
    CALL PAUSA_CORTA
    JMP MENU_AUTENTICACION

CAMBIO_FALLIDO:
    LXI H, 0E07AH
    LXI D, 0920H                    ; "CLAVE INCORRECTA!"
    CALL IMPRIMIR_TEXTO
    CALL PAUSA_CORTA
    JMP MENU_AUTENTICACION

; -------------------------------------------------------------------------
; 8. RETIRAR TARJETA Y FIN DEL PROGRAMA
; -------------------------------------------------------------------------
MODO_RETIRAR_TARJETA:
    CALL BORRAR_PANTALLA
    XRA A
    OUT 01H                         ; Apagar LEDs

    ; Mostrar "TARJETA RETIRADA." en Fila 2, Col 8 (0E058H)
    LXI H, 0E058H
    LXI D, 09A0H
    CALL IMPRIMIR_TEXTO
    DI
    HLT

; =========================================================================
; SUBRUTINAS DE APOYO (PANTALLA, TECLADO Y CAPTURA)
; =========================================================================

; Captura 4 d�gitos en memoria apuntada por DE. Retorna CY=1 si cancela con 'C'.
CAPTURAR_4_DIGITOS:
    XRA A
    STA 080AH                       ; CANT_DIGITOS = 0

BUCLE_CAP:
    PUSH H
    PUSH D
    CALL LEER_TECLA
    MOV B, A                        ; B = tecla le�da
    POP D
    POP H

    ; �Presion� 'C' (CANCEL)?
    MOV A, B
    CPI 43H
    JZ CANCELAR_CAP

    ; �Presion� 'B' (BORRAR)?
    CPI 42H
    JZ BORRAR_DIGITO

    ; �Presion� 'A' (ANOTACION/ENTER)?
    CPI 41H
    JZ CONFIRMAR_CAP

    ; �Es un d�gito '0'-'9'?
    CPI 30H
    JC BUCLE_CAP
    CPI 3AH
    JNC BUCLE_CAP

    ; Si es d�gito: verificar si ya hay 4
    LDA 080AH
    CPI 04H
    JZ BUCLE_CAP                    ; Si ya hay 4 d�gitos, ignorar m�s n�meros

    ; Guardar d�gito en memoria apuntada por DE
    MOV A, B
    STAX D
    INX D

    ; Eco visual en pantalla (se muestra el asterisco '*')
    MVI M, 2AH                      ; C�digo ASCII de '*'
    INX H

    ; Incrementar contador de d�gitos
    LDA 080AH
    INR A
    STA 080AH
    JMP BUCLE_CAP

BORRAR_DIGITO:
    LDA 080AH
    ORA A
    JZ BUCLE_CAP                    ; Si no hay d�gitos, no borra nada

    DCR A
    STA 080AH
    DCX D                           ; Retroceder buffer RAM
    DCX H                           ; Retroceder cursor VRAM
    MVI M, 20H                      ; Borrar asterisco con espacio
    JMP BUCLE_CAP

CONFIRMAR_CAP:
    LDA 080AH
    CPI 04H                         ; �Ingres� los 4 d�gitos completos?
    JNZ BUCLE_CAP                   ; Si faltan d�gitos, no permite confirmar
    ORA A                           ; Limpiar CY (�xito)
    RET

CANCELAR_CAP:
    STC                             ; CY=1 indica cancelaci�n
    RET

; Compara BUFFER_INGRESO (0806H) con CLAVE_SECRETA (0802H). Z=1 si coinciden.
VALIDAR_CLAVE:
    LDA 0806H
    LXI H, 0802H
    CMP M
    JNZ CLAVE_NO_COINCIDE

    LDA 0807H
    LXI H, 0803H
    CMP M
    JNZ CLAVE_NO_COINCIDE

    LDA 0808H
    LXI H, 0804H
    CMP M
    JNZ CLAVE_NO_COINCIDE

    LDA 0809H
    LXI H, 0805H
    CMP M
    JNZ CLAVE_NO_COINCIDE

    XRA A                           ; Z=1
    RET

CLAVE_NO_COINCIDE:
    MVI A, 01H
    ORA A                           ; Z=0
    RET

; Borra las 1000 posiciones de la VRAM (0E000H - 0E3E7H) con espacios (20H)
BORRAR_PANTALLA:
    PUSH H
    PUSH B
    LXI H, 0E000H
    LXI B, E803H                    ; 1000 en decimal
BUCLE_BORRAR:
    MVI M, 20H
    INX H
    DCX B
    MOV A, B
    ORA C
    JNZ BUCLE_BORRAR
    POP B
    POP H
    RET

; Imprime la cadena apuntada por DE en la VRAM apuntada por HL hasta byte 00H
IMPRIMIR_TEXTO:
    PUSH PSW
BUCLE_IMP:
    LDAX D
    CPI 00H
    JZ FIN_IMP
    MOV M, A
    INX H
    INX D
    JMP BUCLE_IMP
FIN_IMP:
    POP PSW
    RET

; Espera una pulsaci�n de tecla y maneja antirrebote
LEER_TECLA:
    LDA 0800H
    CPI 01H
    JNZ LEER_TECLA                  ; Espera activa a que la ISR levante flag

    XRA A
    STA 0800H                       ; Consumir flag

    LDA 0801H
    ANI 7FH                         ; Limpiar bit de paridad
    PUSH PSW

ESPERAR_SOLTAR:
    IN 00H
    CPI 00H
    JNZ ESPERAR_SOLTAR

    ; Peque�a pausa antirrebote
    PUSH B
    MVI B, 60H
PAUSA_REB:
    DCR B
    JNZ PAUSA_REB
    POP B

    POP PSW
    RET

; Pausa visible para lectura de mensajes
PAUSA_CORTA:
    PUSH B
    PUSH D
    LXI B, 0080H
BUCLE_P1:
    LXI D, 00FFH
BUCLE_P2:
    DCX D
    MOV A, D
    ORA E
    JNZ BUCLE_P2
    DCX B
    MOV A, B
    ORA C
    JNZ BUCLE_P1
    POP D
    POP B
    RET

; -------------------------------------------------------------------------
; 9. RUTINA DE ATENCION DE INTERRUPCION (ISR RST 5.5)
; -------------------------------------------------------------------------
ISR_TECLADO:
    PUSH PSW
    IN 00H
    STA 0801H                       ; Guardar ASCII en buffer
    MVI A, 01H
    STA 0800H                       ; Levantar flag
    POP PSW
    EI
    RET