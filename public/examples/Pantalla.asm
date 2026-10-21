; Ejemplo de programa
; Simulador de terminal
; Asociado a interrupción TRAP

.define 
   texto E000h
   tamtexto 25*40
.org 1000h

; -------------------------------
; PROGRAMA PRINCIPAL
; -------------------------------

mvi B, E0h
mvi C, 00h
call clear_all
bucle:
      jmp bucle


.org 0024h			; Direccion de interrupción TRAP

; -------------------------------
; RUTINA QUE LEE DEL TECLADO Y ESCRIBE EN MEMORIA
; -------------------------------
     	in 00h
	cpi 0
	jz no_tecla
	stax B
	inx B
no_tecla:
	ret
	
clear_all:
	LXI H, texto			;cargamos origen 
	LXI D, texto+tamtexto   	;cargamos fin
   repite_c:
	MVI A,32
	MOV M,A				;borrar punto de memoria
	INX H					;incrementar direccion
	call comparador
	cpi 1
	jz fin_clear
	jmp repite_c
   fin_clear:
	ret

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
