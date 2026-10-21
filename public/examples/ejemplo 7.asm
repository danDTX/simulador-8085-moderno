; display

.data 0050h
db 77h, 44h, 3eh, 6eh, 4dh, 6bh, 7bh, 46h, 7fh, 6fh
.org 100h
inicio:

lxi b, 0050h
ciclo:

ldax b
out 00h
call retardo
inx b
mov a, c
cpi 5ah
jnz ciclo
jmp inicio

retardo:

mvi d, 50
bucleA:
mvi e, 255
bucleB:
dcr e
jnz bucleB
dcr d

jnz bucleA
ret

hlt