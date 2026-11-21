; =========================================================================
; EJEMPLO 26: CONTADOR BCD 0-99 EN DISPLAYS DE 7 SEGMENTOS
; Muestra conteo en Display de Unidades (Puerto 02H) y Decenas (Puerto 03H)
; Tabla de decodificación cátodo común 8085sim (0=77H, 1=44H, 2=3EH, 3=6EH, ...)
; =========================================================================

    .data 0800H
    ; Tabla de 7 segmentos cátodo común (0 a 9)
    dB 77H, 44H, 3EH, 6EH, 4DH, 6BH, 7BH, 46H, 7FH, 6FH

    .org 0000H
    JMP INICIO

    .org 0100H
INICIO:
    LXI SP, 20FFH
    MVI C, 00H              ; C = Decenas (0 a 9)

BUCLE_DECENAS:
    ; Obtener código 7-seg para decenas
    LXI H, 0800H
    MOV E, C
    MVI D, 00H
    DAD D
    MOV A, M
    OUT 03H                 ; Salida Display Decenas (Puerto 03H)

    MVI B, 00H              ; B = Unidades (0 a 9)

BUCLE_UNIDADES:
    ; Obtener código 7-seg para unidades
    LXI H, 0800H
    MOV E, B
    MVI D, 00H
    DAD D
    MOV A, M
    OUT 02H                 ; Salida Display Unidades (Puerto 02H)

    CALL RETARDO

    INR B
    MOV A, B
    CPI 0AH
    JNZ BUCLE_UNIDADES

    INR C
    MOV A, C
    CPI 0AH
    JNZ BUCLE_DECENAS

    ; Reiniciar contador
    JMP INICIO

; Subrutina de retardo corto para simulación
RETARDO:
    PUSH B
    MVI B, 20H
LAZO:
    DCR B
    JNZ LAZO
    POP B
    RET
