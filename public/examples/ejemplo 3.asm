; utilizar el registro C como contador independiente y 
; el acumulador A unicamente para mandar la señal al panel led

.org 100h

inicio: 

mvi c, 0

bucle:

mov a, c
out 01h
inr c
jmp bucle

hlt