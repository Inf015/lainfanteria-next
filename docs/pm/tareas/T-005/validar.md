# T-005 — Guía de validación: carrusel de pilotos en la portada

Para Oliver. Son 9 pasos cortos sobre la portada. Si algo no se ve como dice
acá, anotá el número del paso y lo arreglamos antes de subir.

**Dónde:** `http://localhost:3014/` (o la preview de Vercel del PR).
No hace falta cargar nada: usa los miembros que ya están en producción.

---

### 1. El bloque está donde corresponde

Bajá por la portada. Después de **SERVICIOS** y antes de **LO ÚLTIMO /
Novedades del equipo** tiene que aparecer un bloque nuevo: **NUESTROS PILOTOS —
Los que corren por La Infantería**, con el enlace `VER EQUIPO →` a la derecha
del título.

### 2. Solo pilotos

Son **8 tarjetas**: Oliver Infante, Luz Infante, Manuel Lorenzo Viyella, Gibson
Lee Hellyer Alcantara, Jonathan Mendoza, Edwin campos, Badir Pérez BP y Carlos
Peña Leon. Socios y técnicos no aparecen acá; están en `/equipo`, adonde lleva
el enlace. Si le ponés el rol Piloto a alguien más en el panel, entra solo.

### 3. Las tarjetas muestran trofeos

Cada tarjeta lleva foto, nombre, el rol en gris y, si esa persona tiene
trofeos cargados, la línea **🏆 N trofeos**. Quien no tenga ninguno no muestra
la línea (no muestra "0 trofeos").

### 4. La etiqueta de récord

Arriba a la izquierda de la foto, en rojo: **🏁 4 RÉCORDS NACIONALES** en la
tarjeta de quien tiene los cuatro récords cargados. Con uno solo diría
**RÉCORD NACIONAL**, en singular. Los demás no llevan etiqueta.

Es el mismo criterio que la tarjeta de `/equipo`: cuenta solo los récords
**nacionales y vigentes**. Si marcás uno como superado en el panel, el número
baja acá también (hay que recargar: la portada se revalida cada 60 s).

### 5. Rota solo

Dejá el ratón fuera del bloque y esperá. Cada **5 segundos** avanza una
tarjeta, con desplazamiento suave. Al llegar al final vuelve al principio.

### 6. Se frena cuando lo estás mirando

Poné el ratón encima de una tarjeta: tiene que quedarse quieto mientras esté
ahí. Al sacarlo, vuelve a rotar. Lo mismo con el teclado: apretá Tab hasta
entrar al carrusel y no se te va a mover el enlace de abajo del dedo.

### 7. Los controles

Debajo van **‹**, los puntos y **›**. La flecha mueve una tarjeta; el punto
rojo alargado marca en cuál estás; tocando un punto salta a esa persona. Desde
la primera, **‹** va a la última; desde la última, **›** vuelve a la primera.

En pantalla ancha vas a ver **menos puntos que pilotos**, y está bien: cuando se
ven tres tarjetas a la vez, las últimas nunca llegan a quedar pegadas a la
izquierda, así que hay un punto por **parada real**. El último punto siempre
lleva al final y queda marcado al llegar.

### 8. En el teléfono

Achicá la ventana a ancho de celular (o abrilo en el teléfono). Se ve **una
tarjeta y el borde de la siguiente asomando** —es lo que avisa que se desliza—
y se puede arrastrar con el dedo. Las flechas y los puntos siguen ahí.

### 9. Los enlaces llevan al perfil

La foto, el nombre y `VER PERFIL →` de cada tarjeta abren `/equipo/<nombre>`,
la página de esa persona. `VER EQUIPO →` arriba abre `/equipo`.

---

## Verificado antes de entregar

- **Rota solo** (paso 5): observado en el navegador, una tarjeta cada 5 s
  (0 → 590 → 1180 → … → 4031 → 0).
- **El último punto** (paso 7): lleva al tope (4031) y queda marcado.
- Orden del bloque, las 8 tarjetas de pilotos, los trofeos, la etiqueta de
  récord y el ancho de las tarjetas, en el HTML servido.
- Lógica de navegación, de las paradas y de la animación: 24 pruebas en
  `tests/unidad/carrusel.test.ts`.
- Gate: tipos ✅ lint ✅ 230/230 ✅ build ✅ seguridad 49/49 ✅.

## Lo que mirás vos y yo no pude

**Los pasos 6 (la pausa con el ratón y con el teclado) y 8 (el teléfono).** El
navegador que manejo no tiene el foco de la ventana, y sin eso `focus()` no toma
y el hover no llega a disparar la pausa; por lo mismo falla la captura de
pantalla. Son además los dos defectos P1 que QA encontró y que corregí **por
lectura del código**, sin poder ejercitarlos. Si en el paso 6 el carrusel se te
mueve bajo el ratón o bajo el foco, decímelo: es ahí donde puede quedar algo.

Y **cómo se ve** en general, que no puedo capturar.

## La cicatriz: por qué no rotaba

La primera versión pedía el desplazamiento con
`scrollTo({ behavior: 'smooth' })`. El navegador **no arranca esa animación
cuando el paso lo dispara un temporizador** en vez de un clic: el temporizador
corría, el destino se calculaba bien, y el carrusel se quedaba quieto. Lo
delató que la misma llamada movía el scroll al ejecutarla suelta y no desde el
temporizador.

Ahora la animación la hace el componente cuadro a cuadro con
`requestAnimationFrame` (`posicionAnimada` en `lib/carrusel.ts`), que además
deja cancelar un paso si llega otro encima. Si algún día hay que tocar el
carrusel, no volver a `behavior: 'smooth'`.
