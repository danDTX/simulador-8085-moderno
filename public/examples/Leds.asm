;LUZ COCHE FANTASTICO 
;
; requiere 	led en puerto 0
;		interrupcion rst 7.5 cada 1 segundo


.org 1000h

mvi c,128
mov d,0
salto:
mov a,c
out 0h
jmp salto



.org 003ch
;Subrutina cada 1 segundo
sub:
mov a,d
cpi 0
jnz mub

mov a,c		;direccion -->
rar
mov c,a
mov a,c
cpi 0
jnz rub
mvi c,1
mvi d,1

mub:
mov a,c		;direccion <--
ral
mov c,a
mov a,c
cpi 0
jnz rub
mvi c,128
mvi d,0

rub:
ei
ret
