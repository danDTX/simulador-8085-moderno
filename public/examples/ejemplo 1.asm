; carga de registro y salida de leds
.org 100h

inicio:

mvi a, 07h
mov b, a
out 01h
hlt