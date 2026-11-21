; =========================================================================
; EJEMPLO 27: SERIE DE FIBONACCI (PRIMEROS 10 TERMINOS)
; Genera: 0, 1, 1, 2, 3, 5, 8, 13 (0DH), 21 (15H), 34 (22H)
; Almacenamiento secuencial en RAM a partir de 0850H
; =========================================================================

    .data 0850H
    dS 0AH                  ; Reservar 10 bytes para la serie

    .org 0000H
    JMP INICIO

    .org 0100H
INICIO:
    LXI SP, 20FFH
    LXI H, 0850H            ; Puntero a buffer de salida

    MVI A, 00H              ; F(0) = 0
    MOV M, A
    INX H

    MVI B, 01H              ; F(1) = 1
    MOV M, B
    INX H

    MVI C, 08H              ; Contador de términos restantes (10 - 2 = 8)

BUCLE_FIBO:
    ; A tiene F(n-2), B tiene F(n-1)
    MOV D, B                ; Guardar copia de F(n-1) en D
    ADD B                   ; A = F(n-2) + F(n-1) = F(n)
    MOV M, A                ; Guardar en RAM
    INX H

    MOV B, A                ; Nuevo F(n-1) = A
    MOV A, D                ; Nuevo F(n-2) = antiguo F(n-1)

    DCR C
    JNZ BUCLE_FIBO

    HLT                     ; Fin de generación
