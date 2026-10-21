; Ejemplo de Programa en ensamblador para el simulador de 8085
; SNAKE 8085
; Comer sin mordenos a nosotros mismos

.define
	memVideo A000h		         ;Origen de la memoria de Video
	sizeVideo 160*100		    	   ;Tamaño de la memoria de Video
      mitadVideo memVideo+sizeVideo/2  ;Posicion intermedia
	teclado 0h			         ;Puerto del teclado
	up	(-160)&FFFFh			
	down	160
	left	-1
	right 1
	tecla_up	1Eh
	tecla_down	1Fh
	tecla_left  11h
	tecla_right 10h
	comienzo	mitadVideo+80	

.data 0b
cuanto: dB 10h
cola:	dW comienzo
pos: dB 0
pos_pantalla: dW memVideo+580H,memVideo+1000H,memVideo+2500H,memVideo+3000H

.org 500H
;	call clear_all
	LXI H, comienzo
	call pon_comida
  repite:
	IN teclado
	jmp repite
	

comparador:				;compara DE con HL (en 16 bits). Devuelve A=1 si igual
	MOV A,E
	CMP L
	JNZ no_igual
	MOV A,D
	CMP H
	JNZ no_igual
	MVI A, 1
	ret
   no_igual:
      MVI A,0
	ret

compar_inf:				;compara DE con HL (en 16 bits). Devuelve A=1 si menor DE
	MOV A,D
	CMP H
	JM menor
	JZ comp_menor
	MVI A, 0
	ret
   menor:
      MVI A,1
	ret
   comp_menor:
	MOV A,E
	CMP L
	JM menor
	MVI A, 0
	ret
	
compar_sup:				;compara DE con HL (en 16 bits). Devuelve A=1 si mayor DE
	MOV A,H
	CMP D
	JM menor
	JZ comp_menor2
	MVI A, 0
	ret
   menor2:
      MVI A,1
	ret
   comp_menor2:
	MOV A,L
	CMP E
	JM menor2
	MVI A, 0
	ret
	

clear_all:
	LXI H, memVideo			;cargamos origen memoria video
	LXI D, memVideo+sizeVideo	;cargamos fin memoria video
   repite_c:
	MVI A,0
	MOV M,A				;borrar punto de memoria
	INX H					;incrementar direccion
	call comparador
	cpi 1
	jz fin_clear
	jmp repite_c
   fin_clear:
	ret
	

moverse:				;en registro A el movimiento
	CPI tecla_up
	cz haz_arriba
	CPI tecla_down
	cz haz_abajo
	CPI tecla_left
	cz haz_izqda
	CPI tecla_right
	cz haz_decha
	ret

comprobador:			;comprueba que no se excede de la memoria de video

      LXI D, memVideo  
	call compar_sup
	cpi 1				;Si es 0 es q DE no es mayor que HL
	jz fin
      LXI D, memVideo+sizeVideo  
	call compar_inf
	cpi 1				;Si es 0 es que DE no es menor que HL
	jz fin
	ret


haz_arriba:				;moverse arriba
	LXI D, up
	call pon_punto
	ret

haz_abajo:				;moverse abajo
	LXI D, down
	call pon_punto
	ret

haz_izqda:				;moverse izda
	LXI D, left
	call pon_punto
	ret

haz_decha:				;moverse decha
	LXI D, right
	call pon_punto
	ret

pon_punto:
      DAD d
	call comprobador
	mov A,M
	cpi FFh
	jz fin
	cpi FFh/2
	CZ pon_comida
	MVI M, FFh			;pintar
	call comp_borra
	ret

comp_borra:
	push psw
	LDA cuanto
	cpi 0
	jz borra_punto		; si el cuanto es 0 hay que borrar
	DCR a
	STA cuanto			; decrementamos y almacenamos el cuanto
	pop psw
	ret

  borra_punto:
	push h
	push d
	lhld cola
	LXI d, up			; mirar arriba
	DAD d
	mov a,M
	cpi FFh			;si hay punto hay que borrarlo
	jz elimina
	lhld cola
	LXI d, down			; mirar abajo
	DAD d
	mov a,M
	cpi FFh			;si hay punto hay que borrarlo
	jz elimina
	lhld cola
	LXI d, left			; mirar izquierda
	dad d
	mov a,M
	cpi FFh			;si hay punto hay que borrarlo
	jz elimina
	lhld cola
	LXI d, right		; mirar izquierda
	DAD d
   elimina:
	MVI a, 00h
	mov M,a
	SHLD cola			;almacenamos la nueva cola
	pop d
	pop h
	pop psw
	ret				;regresa al call de comp_borra

pon_comida:
	push psw
	push d

	LDA cuanto
	adi 10h
	STA cuanto

	LDA pos			;cargamos la posicion actual
	rlc
	Mov e,a
	rrc
	Mvi d,0
	INR a				;incrementamos el desplazamiento
	ANI 11b			;impedimos que sea mayor que 4
	STA pos			;guardamos la posicion  actual

	push h
	LXI h, pos_pantalla
	DAD d				
	Mov E,M
	INX h
	Mov D,M
	XCHG				;ya tenemos la direccion en HL
	mvi a, FFh/2
	mov M, a			;coloreamos el punto
	
	pop h				;recuperamos lo guardado
	pop d
	pop psw
	ret	
	
fin:
	hlt

.org 3Ch		;Interrupcion del timer (RST 7.5)
	call moverse
	EI
	ret
