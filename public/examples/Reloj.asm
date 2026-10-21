; Ejemplo de programa
; Reloj digital
; Asociado a interrupción TRAP

.data DDh
	DB 77h, 44h, 3Eh, 6Eh, 4Dh, 6Bh, 7Bh, 46h, 7Fh, 4Fh		;digitos sin punto
	DB F7h, C4h, BEh, EEh, CDh, EBh, FBh, C6h, FFh, CFh		;digitos con punto

.org 1000h

; -------------------------------
; PROGRAMA PRINCIPAL
; -------------------------------
      mvi B, 00h
      mvi C, DDh
      mvi D, 00h
      mvi E, DDh
      mvi L, E7h
	mvi H, DDh
      mvi A, 77h
      out 6d
      out 7d
      out 4d
      mvi A, F7h
      out 5d
bucle:
      jmp bucle


.org 0024h			; Direccion de interrupción TRAP

; -------------------------------
; RUTINA QUE AUMENTA EL TIEMPO
; -------------------------------
	ldax B
     	cpi 4Fh
     	jz suma_segundo
	inx B
	ldax B
	out 7d
	ret
suma_segundo:
	mvi C,DDh
	ldax B
	out 7d
	ldax D
	cpi 6Bh
	jz suma_minuto1
	inx D
	ldax D
	out 6d
	ret
suma_minuto1:
	mvi E, DDh
	ldax D
	out 6d
	mov D, C
	mov C, L
	ldax B
	cpi CFh
	jz suma_minuto2
	inx B
	ldax B
	out 5d
      mov L, C
	mov C, D
	mov D, 00h
	ret
suma_minuto2:
	mvi L, E7h
	mov D, C
	mov C, L
	ldax B
	out 5d
	mov D, C
	mov C, H
	inx B
	ldax B
	out 4d
      mov H, C
	mov C, D
	mov D, 00h
	ret