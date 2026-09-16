# T-005 — Guía de validación: carrusel del equipo en la portada

Para Oliver. Son 8 pasos cortos sobre la portada. Si algo no se ve como dice
acá, anotá el número del paso y lo arreglamos antes de subir.

**Dónde:** `http://localhost:3014/` (o la preview de Vercel del PR).
No hace falta cargar nada: usa los miembros que ya están en producción.

---

### 1. El bloque está donde corresponde

Bajá por la portada. Después de **SERVICIOS** y antes de **LO ÚLTIMO /
Novedades del equipo** tiene que aparecer un bloque nuevo: **EL EQUIPO — Las
personas detrás**, con el enlace `VER EQUIPO →` a la derecha del título.

### 2. Las tarjetas muestran trofeos

Cada tarjeta lleva foto, nombre, el rol en gris y, si esa persona tiene
trofeos cargados, la línea **🏆 N trofeos**. Quien no tenga ninguno no muestra
la línea (no muestra "0 trofeos").

### 3. La etiqueta de récord

Arriba a la izquierda de la foto, en rojo: **🏁 4 RÉCORDS NACIONALES** en la
tarjeta de quien tiene los cuatro récords cargados. Con uno solo diría
**RÉCORD NACIONAL**, en singular. Los demás no llevan etiqueta.

Es el mismo criterio que la tarjeta de `/equipo`: cuenta solo los récords
**nacionales y vigentes**. Si marcás uno como superado en el panel, el número
baja acá también (hay que recargar: la portada se revalida cada 60 s).

### 4. Rota solo

Dejá el ratón fuera del bloque y esperá. Cada **5 segundos** avanza una
tarjeta, con desplazamiento suave. Al llegar al final vuelve al principio.

### 5. Se frena cuando lo estás mirando

Poné el ratón encima de una tarjeta: tiene que quedarse quieto mientras esté
ahí. Al sacarlo, vuelve a rotar. Lo mismo con el teclado: apretá Tab hasta
entrar al carrusel y no se te va a mover el enlace de abajo del dedo.

### 6. Los controles

Debajo van **‹**, los puntos y **›**. La flecha mueve una tarjeta; el punto
rojo alargado marca en cuál estás; tocando un punto salta a esa persona. Desde
la primera, **‹** va a la última; desde la última, **›** vuelve a la primera.

### 7. En el teléfono

Achicá la ventana a ancho de celular (o abrilo en el teléfono). Se ve **una
tarjeta y el borde de la siguiente asomando** —es lo que avisa que se desliza—
y se puede arrastrar con el dedo. Las flechas y los puntos siguen ahí.

### 8. Los enlaces llevan al perfil

La foto, el nombre y `VER PERFIL →` de cada tarjeta abren `/equipo/<nombre>`,
la página de esa persona. `VER EQUIPO →` arriba abre `/equipo`.

---

## Qué no probé yo

La **rotación automática** (paso 4) y la **captura de pantalla** no se pueden
verificar en el navegador que uso: no anima el desplazamiento suave mientras la
ventana no tiene el foco, y por lo mismo falla la captura. Lo confirmé con una
prueba aparte —un temporizador que pide el mismo desplazamiento fuera de la
aplicación tampoco mueve nada, y el mismo pedido sin temporizador sí—, así que
es del navegador de prueba y no del carrusel. **Los pasos 4, 5 y 6 mirálos vos
en tu navegador**: es lo que no puedo dar por bueno solo.

Lo que sí quedó verificado: el orden del bloque, los trofeos, la etiqueta de
récord y el ancho de las tarjetas en el HTML servido, y la lógica de navegación
(avance, retroceso, vuelta en los extremos, punto activo) con 11 pruebas en
`tests/unidad/carrusel.test.ts`. Gate: tipos ✅ lint ✅ 217/217 ✅ build ✅.
