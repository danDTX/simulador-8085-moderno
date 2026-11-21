; =========================================================================
; EJEMPLO 28: LUCES SECUENCIALES TIPO AUTO FANTASTICO (KNIGHT RIDER)
; Efecto visual de vaivén en barra de LEDs (Puerto 01H)
; Demuestra rotaciones de bits RLC / RRC y retardos controlados
; =========================================================================

    .org 0000H
    JMP INICIO

    .org 0100H
INICIO:
    LXI SP, 20FFH

BUCLE_PRINCIPAL:
    ; Barrido izquierda -> derecha
    MVI A, 01H
    MVI C, 07H
BARRE_IZQ:
    OUT 01H                 ; Enviar a barra de LEDs
    CALL RETARDO
    RLC                     ; Rotar bit a la izquierda
    DCR C
    JNZ BARRE_IZQ

    ; Barrido derecha -> izquierda
    MVI C, 07H
BARRE_DER:
    OUT 01H                 ; Enviar a barra de LEDs
    CALL RETARDO
    RRC                     ; Rotar bit a la derecha
    DCR C
    JNZ BARRE_DER

    JMP BUCLE_PRINCIPAL

; Subrutina de retardo
RETARDO:
    PUSH B
    MVI B, 30H
LAZO_R:
    DCR B
    JNZ LAZO_R
    POP B
    RET
