; display del 00 a 99

.data 0050h
db 77h, 44h, 3eh, 6eh, 4dh, 6bh, 7bh, 46h, 7fh, 6fh

.org 100h
inicio:


lxi b, 0050h
dig1:
ldax b

out 00h

lxi d, 0050h
dig2:

ldax d
out 01h
call retardo
inx d
mov a, e
cpi 5ah
jnz dig2
inx b
mov a, c
cpi 5ah
jnz dig1
jmp inicio


retardo:

mvi h, 10
bucleA:
mvi l, 255
bucleB:
dcr l
jnz bucleB
dcr h

jnz bucleA
ret
hlt