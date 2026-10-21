; desplazar led a la izquierda

.org 100h

mvi a, 10000000b
ciclo:
out 01h
call retardo
rrc
jmp ciclo

retardo:

mvi d, 50

cicloA:
mvi e, 255
cicloB:
dcr e
jnz cicloB

dcr d
jnz cicloA
ret


hlt