; desplazar led a la izquierda

.org 100h

mvi a, 1
ciclo:
out 01h
rlc
jmp ciclo

hlt