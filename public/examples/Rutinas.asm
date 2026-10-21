;
;SUMA DOS NUMEROS DE 16 BITS
;bc-->1er sumando
;de-->2o sumando 
;bc<--resultado;
;

.org 1000
suma16:
	push psw

	mov a,c	;suma 8 bajos
	add e
	mov c,a

	mov a,b	;suma 8 altos
	adc d
 	mov b,a

	pop psw  ;recupera todo
ret

;
;MULTIPLICA DOS NUMEROS DE 8 BITS Y DEVUELVE 16 BITS
;d-->multiplicando
;e-->multiplicador
;bc<--resultado;
;

multiplica:
	push psw
	push d
	mov a,d		;a=multiplicando
	mvI d,0		;de=multiplicador
mul1:
	jz mul2
	call suma16	;bc=bc+de   (a veces)
	dcr a
	jmp mul1
mul2:	
	pop d
	pop psw

ret

	
