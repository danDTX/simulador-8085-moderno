; contador de impares, desde 15 a 1 y repite

.org 100h

inicio:

mvi b, 2
mvi a, 15

bucle:
out 01h
sub b

cpi 255
jz inicio
jmp bucle
hlt