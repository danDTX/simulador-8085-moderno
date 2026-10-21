 .org 100H
 
 
 mvi H, A0H 
 mvi L, 00H  ; en HL la posicion de memoria
 
 otro:
 mvi a, FFh
 SUB M
 
 mov M, a
 INX H
 ;comprueba parte alta
 mvi a, DEH
 cmp H
 JZ comprueba_LO
 jmp otro
 
 comprueba_LO:	 ; comprueba parte baja
 mvi a, 80h
 cmp L
 JZ fin
 jmp otro
 
 fin:
 hlt
 

