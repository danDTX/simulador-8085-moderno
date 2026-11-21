; =========================================================================
; EJEMPLO 29: VERIFICADOR DE PALINDROMOS
; Comprueba si la cadena en 0800H es un palíndromo (ej: "RADAR")
; Retorna en Acumulador: A = 01H (Es palíndromo) / A = 00H (No es palíndromo)
; =========================================================================

    .data 0800H
    ; Cadena "RADAR" (52H, 41H, 44H, 41H, 52H, 00H)
    dB 52H, 41H, 44H, 41H, 52H, 00H

    .org 0000H
    JMP INICIO

    .org 0100H
INICIO:
    LXI SP, 20FFH

    ; 1. Calcular longitud y posicionar DE al final de la cadena
    LXI H, 0800H
    LXI D, 0800H

BUSCAR_FIN:
    LDAX D
    CPI 00H
    JZ FIN_HALLADO
    INX D
    JMP BUSCAR_FIN

FIN_HALLADO:
    DCX D                   ; DE apunta al último carácter válido

    ; 2. Comparar caracteres desde los extremos (HL avanza, DE retrocede)
COMPARAR_BUCLE:
    MOV A, H
    CMP D
    JC CONTINUAR_COMP       ; Si HL < DE, seguimos
    JNZ ES_PALINDROMO       ; Si HL > DE, ya cruzamos el centro con éxito
    ; Si H == D, comparar L con E:
    MOV A, L
    CMP E
    JNC ES_PALINDROMO       ; Si L >= E, llegamos o pasamos el centro

CONTINUAR_COMP:
    MOV A, M                ; Carácter del inicio
    LDAX D                  ; Carácter del final
    CMP M                   ; Comparar
    JNZ NO_PALINDROMO

    INX H                   ; Avanzar puntero inicial
    DCX D                   ; Retroceder puntero final
    JMP COMPARAR_BUCLE

ES_PALINDROMO:
    MVI A, 01H              ; A = 1 (Éxito)
    STA 0820H
    OUT 01H                 ; Encender LED indicador (bit 0)
    HLT

NO_PALINDROMO:
    MVI A, 00H              ; A = 0 (Fallo)
    STA 0820H
    OUT 01H                 ; Apagar LEDs
    HLT
