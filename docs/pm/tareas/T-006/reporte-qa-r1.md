# Reporte QA T-006 — ronda 1

**Veredicto:** FAIL

**Resumen:** La evidencia de CA-8 coincide con el test actual y la mutación fue revertida. Sin embargo, la suite puede omitir todas las pruebas ante una regresión y ejecutar contra un servidor ajeno. Además, quedan huecos en la cobertura de pausa durante la animación y navegación por Tab.

## Alcance cubierto

- **Diff revisado:** 26 archivos; `d2d50109a1ad76e6bbbe11cc31754104eeabe77b..3d255a53e7f9f9065b4db0582a5ca6d960bfbcf2`.
- **Separación de alcance:** respecto de la base T-005, T-006 modifica 10 archivos. El diff de `app`, `lib` y `tests/unidad` contra esa base está vacío: no quedó la mutación del carrusel.
- **Técnicas:** revisión estática, trazabilidad, análisis de mutaciones, transiciones de estado, particiones de datos/desborde, revisión de oráculos y análisis de aislamiento.
- **Ejecutado:** `npx --no-install tsc --noEmit --incremental false` → código **0**, sin errores. Incremental desactivado para evitar escrituras.
- **Ejecutado:** `git diff --check origin/main...HEAD` → sin errores de whitespace.
- **Gate:** `docs/pm/tareas/T-006/gate-r1.txt:4` coincide exactamente con HEAD. Aporta typegen, tipos, lint y **230 tests unitarios en 11 archivos** (`:27`, `:33`, `:37`, `:55`). **No contiene Playwright.**
- **No ejecutado:** Playwright, instalación, build, typegen y Vitest por las restricciones de escritura/servidor del sandbox. No ejecuté pruebas contra servicios remotos.
- **Sin modificaciones:** estado inicial y final: únicamente `?? docs/pm/tareas/T-006/gate-r1.txt`.

En adelante, `spec` significa `tests/navegador/carrusel.spec.ts`; `componente`, `app/(sitio)/_componentes/CarruselEquipo.tsx`; y `entrega`, `docs/pm/tareas/T-006/entrega-dev.md`.

## Trazabilidad de criterios

Los resultados estáticos no equivalen a una ejecución independiente en navegador.

| CA | Resultado | Evidencia |
| -- | --------- | --------- |
| CA-1 | NO CUMPLE en caso de puerto ocupado | Configura build + start, pero puede omitir ambos y reutilizar otro servidor: `playwright.config.ts:37`, `:39`. D02. |
| CA-2 | Cobertura presente; ejecución independiente pendiente | Compara cambio y destino en `spec:106`, `:113`, `:114`. La entrega registra ejecución positiva y negativa; su ejecución puede omitirse por D01. |
| CA-3 | Cobertura presente; ejecución pendiente | Fija y comprueba el máximo antes de esperar; exige cero después: `spec:127`, `:130`, `:134`. |
| CA-4 | INCOMPLETO | Espera 10 segundos y comprueba reanudación, pero no prepara una animación activa antes de entrar: `spec:142`, `:145`, `:150`. D03. |
| CA-5 | NO CUMPLE completamente | Combina foco y puntero, pero usa `.focus()` y no Tab: `spec:161`. Tampoco prepara movimiento activo. D03/D04. |
| CA-6 | Cobertura presente; ejecución pendiente | Verifica ambos extremos, último punto y `aria-current`: `spec:185`, `:188`, `:193`, `:200`, `:201`. |
| CA-7 | Cobertura presente; ejecución pendiente | Emula reducción antes de navegar y avanza 15 segundos: `spec:206`, `:212`, `:213`. |
| CA-8 | Evidencia documental consistente; reproducción pendiente | El fallo pegado corresponde exactamente a `spec:99` y `:113`; `entrega:53`. El componente conserva `animarScroll` en `:91` y no cambia respecto de la base T-005. |
| CA-9 | Implementado con condición excesivamente amplia | Salta sin bloque y sin botón, sin verificar la causa: `spec:50`, `:57`. D01. |
| CA-10 | CUMPLE por inspección del test | No hay escrituras de base ni nombres/cantidades fijados; navegación a `/`, medición DOM y controles: `spec:47`, `:73`, `:196`. El backend depende del entorno configurado. |

## Sensibilidad de las pruebas

**“Previsto” indica razonamiento estático, no una mutación ejecutada por QA.** Todas las pruebas están afectadas por los saltos de D01.

| Prueba | Mutación que debería hacerla fallar | ¿Falla? | Evidencia |
| ------ | ----------------------------------- | ------- | --------- |
| CA-2 | Sustituir `animarScroll` por `scrollTo({ behavior: 'smooth' })` | Sí según salida del dev; no reproducido aquí | `entrega:58` registra fallo de `expect(despues).not.toBe(antes)`, idéntico a `spec:113`. |
| CA-3 | Mantenerse en el máximo al dispararse el intervalo | Previsto: sí | Precondición máximo comprobada y resultado cero exigido: `spec:130`, `:134`. |
| CA-4 | Eliminar la pausa por puntero | Previsto: detecta movimiento al muestrear; falta mutación real | Avanza dos intervalos: `spec:145`. No es una comprobación anterior al temporizador. |
| CA-4 | No reanudar al salir | Previsto: sí | Exige cambio tras otros 5550 ms: `spec:149`, `:150`. |
| CA-5 | Volver al booleano compartido de T-005-D01 | Previsto: debería detectar la reanudación | Entra/sale el puntero con foco dentro y espera 10 segundos: `spec:161`, `:166`, `:169`. |
| CA-4/CA-5 | Quitar la cancelación de la animación al pausar | No queda cubierta de forma dirigida | No se inicia ni comprueba una animación antes de hover/foco. D03. |
| CA-5 | Excluir los enlaces del orden de Tab con `tabIndex={-1}` | La entrada por `.focus()` sigue siendo posible | `spec:161`; no hay eventos Tab. D04. |
| CA-6 | Desconectar flechas, último punto o actualización de `aria-current` | Previsto: sí | Aserciones de extremos y atributo en `spec:188`, `:193`, `:200`, `:201`. |
| CA-7 | Ignorar `prefers-reduced-motion` | Previsto: debería detectar movimiento; confirmar distintos ciclos | Única comparación final después de tres intervalos: `spec:212`, `:213`. |
| Todas | Ocultar “Miembro siguiente” aunque exista desborde | No: se omiten las seis | `spec:57` se ejecuta antes de las aserciones funcionales. |

No encontré `try/catch`, `.catch(() => {})` ni `waitForTimeout` en el spec. Los 450 ms proceden de `MS_ANIMACION`; el margen adicional de 100 ms está explicado (`spec:2`, `:30`). El principal problema no es una aserción literalmente tautológica, sino condiciones que evitan ejecutarla y estados relevantes que nunca se preparan.

## Defectos

### T-006-D01 — La ausencia de un control convierte una regresión en seis pruebas omitidas

- **Severidad / Prioridad:** S2 / P1.
- **Área:** testware.
- **Ubicación:** `tests/navegador/carrusel.spec.ts:57`.
- **Pasos / condición:** con pilotos y desborde real, eliminar el botón siguiente, cambiar su etiqueta o impedir que se active `desborda`.
- **Esperado:** detectar el carrusel roto; CA-9 permite omitir por condiciones legítimas de datos.
- **Obtenido:** todas las pruebas salen mediante `test.skip`, atribuyendo la ausencia del botón a falta de desborde.
- **Evidencia:** la condición es únicamente `(await siguiente.count()) === 0`. La geometría se mide después, dentro de las pruebas (`spec:71`), por lo que nunca se consulta en este recorrido.
- **Sugerencia:** comprobar desborde directamente y exigir los controles cuando exista; distinguir ausencia legítima de datos de fallo de renderizado/hidratación.
- **Introducido por:** este cambio.

### T-006-D02 — Fuera de CI se puede probar otro servidor sin compilar HEAD

- **Severidad / Prioridad:** S2 / P1.
- **Área:** tooling / aislamiento.
- **Ubicación:** `playwright.config.ts:39`.
- **Pasos / condición:** ejecutar la suite sin `CI`, con un servidor HTTP disponible en `localhost:3015`.
- **Esperado:** probar el build del worktree actual; ante colisión, fallar claramente.
- **Obtenido:** `reuseExistingServer: !process.env.CI` permite reutilizar ese servidor y omitir build + start.
- **Evidencia:** el código instalado de Playwright retorna antes de lanzar el comando si el servidor existe y la reutilización está habilitada: `node_modules/playwright/lib/runner/index.js:862`.
- **Sugerencia:** deshabilitar reutilización también localmente. Registrar una corrida con puerto libre y otra con colisión.
- **Introducido por:** este cambio.

### T-006-D03 — Las pruebas de pausa no protegen la cancelación de un paso en curso

- **Severidad / Prioridad:** S2 / P1.
- **Área:** testware.
- **Ubicación:** `tests/navegador/carrusel.spec.ts:142`, `:161`.
- **Pasos / condición:** eliminar el efecto que cancela la animación al pausar (`componente:119`), conservando la limpieza del intervalo.
- **Esperado:** CA-4/CA-5 y el antecedente T-005-D02 requieren detener el movimiento al entrar el puntero o foco.
- **Obtenido:** los tests introducen hover/foco antes de avanzar deliberadamente el reloj. Cubren impedir futuros pasos, pero no detener uno activo.
- **Evidencia:** no hay avance temporal ni aserción de movimiento entre cargar el carrusel y `hover()`/`.focus()`. Quitar la cancelación no altera el recorrido cuando aún no hay RAF pendiente.
- **Sugerencia:** demostrar movimiento, entrar durante los 450 ms, registrar la posición y comprobar que permanece detenida. Confirmar sensibilidad quitando únicamente la cancelación.
- **Introducido por:** este cambio, como omisión de cobertura del defecto previamente corregido.

### T-006-D04 — CA-5 evita la navegación por Tab exigida

- **Severidad / Prioridad:** S2 / P2.
- **Área:** testware / accesibilidad.
- **Ubicación:** `tests/navegador/carrusel.spec.ts:161`.
- **Pasos / condición:** excluir los enlaces del orden de tabulación con `tabIndex={-1}`.
- **Esperado:** CA-5 introduce el foco mediante Tab; la prueba debe detectar que el teclado ya no alcanza esos enlaces.
- **Obtenido:** `.focus()` puede enfocarlos programáticamente y continuar verificando la pausa.
- **Evidencia:** no se usa `page.keyboard.press('Tab')`; la sustitución está reconocida expresamente en `entrega:167`.
- **Sugerencia:** entrar mediante teclado y comprobar qué elemento conserva el foco tras entrar/salir el puntero.
- **Introducido por:** este cambio.

### T-006-D05 — La dependencia no tiene versión exacta en el manifiesto

- **Severidad / Prioridad:** S3 / P2.
- **Área:** tooling.
- **Ubicación:** `package.json:26`.
- **Pasos / condición:** resolver o actualizar dependencias según el rango del manifiesto.
- **Esperado:** dependencia de desarrollo con versión fijada, según el checklist.
- **Obtenido:** declara `"@playwright/test": "^1.63.0"`.
- **Evidencia:** el rango permite versiones compatibles posteriores. El lock fija actualmente 1.63.0, por lo que **`npm ci` sí conserva reproducibilidad con ese lock**.
- **Sugerencia:** usar versión exacta y mantener coherencia con el lock.
- **Introducido por:** este cambio.

## Riesgos y preguntas (sin evidencia suficiente para defecto)

- **Hidratación:** `count()` no espera a que aparezcan controles creados por efectos. El componente comienza con `desborda=false` (`componente:58`), mientras `spec:58` decide inmediatamente omitir. Puede haber skips dependientes de velocidad; falta reproducir con carga lenta.
- **Reloj y animación nativa:** la salida negativa acredita un fallo bajo `page.clock`, pero no demuestra por sí sola la explicación general de que `smooth` no funciona desde temporizadores. El reloj sustituye temporizadores/RAF; conviene repetir la mutación con tiempo real antes de atribuir causalidad (`spec:102`, `entrega:79`).
- **Pausa observada solo al final:** igualdad inicial/final no demuestra inmovilidad durante todo el período. Un ciclo completo podría ocultar movimiento según cantidad de paradas y fase. Revisar con distintas geometrías (`spec:145`, `:169`, `:212`).
- **Oráculo compartido:** CA-2 calcula el esperado con las mismas funciones de producción (`spec:2`, `:108`). Protege la integración, pero una mutación compartida de navegación puede modificar también el esperado. Los unitarios mitigan parcialmente este riesgo.
- **Paralelismo:** hay contextos `page` separados y no se observan escrituras compartidas; `fullyParallel` está habilitado (`playwright.config.ts:12`). Dos invocaciones simultáneas sí comparten puerto y directorio de build.
- **Backend:** la URL del navegador es local, pero Supabase se selecciona mediante variables de entorno (`lib/supabase.ts:3`). No inspeccioné valores reales. La configuración no garantiza que el backend sea local.
- **Procesos:** Playwright dispone de teardown (`node_modules/playwright/lib/runner/index.js:850`), pero no comprobé liberación efectiva del puerto tras éxito, error o interrupción.

**Checklist adicional verificado:**

- Separación de suites por directorios: Vitest incluye exclusivamente `tests/unidad/**/*.test.ts` (`vitest.config.mts:14`); Playwright usa `tests/navegador` (`playwright.config.ts:11`).
- Selectores por roles/atributos accesibles, sin CSS Modules (`spec:49`, `:56`, `:72`).
- Resultados ignorados y no versionados: `.gitignore:17`; `git ls-files test-results playwright-report blob-report` no devuelve archivos.
- README y contexto incluyen instalación de Chromium y ejecución (`README.md:94`, `docs/pm/contexto.md:74`).
- No se agregan archivos de entorno ni secretos visibles en la configuración. `git ls-files '.env*'` devuelve únicamente `.env.example`, preexistente.

## Pruebas a ejecutar por el PM

Todas las ejecuciones funcionales deben usar **servicios locales y datos sintéticos**. No pude realizarlas porque requieren escrituras, servidor o navegador.

- `npm ci && npx playwright install chromium && npm run test:navegador` — registrar HEAD, compilación, seis pruebas ejecutadas y ausencia de skips con datos suficientes.
- `npm run test:navegador -- -g "CA-2"` — repetir con `smooth`, conservar salida completa y restaurar; comparar además con tiempo real para separar regresión de efectos del reloj.
- `npm run test:navegador` con el botón siguiente eliminado y desborde confirmado — debe fallar, no omitir seis pruebas.
- `npm run test:navegador -- -g "CA-4|CA-5"` — quitar únicamente la cancelación de RAF; las pruebas ampliadas deben detectar movimiento después de pausar durante un paso.
- `npm run test:navegador -- -g "CA-5"` — navegar con Tab y repetir excluyendo enlaces del orden de tabulación; debe detectar la regresión.
- `npm run test:navegador -- --repeat-each=20 --workers=1`, luego con varios workers — comprobar estabilidad, hidratación y ausencia de skips inesperados.
- Repetir con sección apagada, cero pilotos, sin desborde y distintas cantidades de paradas — distinguir skips legítimos y posibles falsos positivos por vuelta completa.
- Ejecutar con puerto 3015 ocupado; después comprobar `lsof -nP -iTCP:3015 -sTCP:LISTEN` tras éxito, fallo e interrupción — no reutilizar servidor ajeno ni dejar procesos propios.
- `npx next typegen && npx tsc --noEmit && npm run lint && npm test` — renovar el gate tras las correcciones; mantener las **230 pruebas unitarias** separadas de Playwright.