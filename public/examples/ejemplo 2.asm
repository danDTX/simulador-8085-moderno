; carga de valores y uso de INR

.org 100h

mvi a, 7
mvi d, 3
mov b, d
mov c, a
inr a
out 01h
hlt