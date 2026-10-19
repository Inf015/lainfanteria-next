-- Reordenar una galería de fotos en una sola operación atómica.
--
-- Hasta acá el orden de las fotos era el de subida y no había forma de
-- cambiarlo desde el panel. Además convivían dos conceptos: la ★ elegía la
-- principal (que el sitio pone siempre primera) y `orden` ordenaba el resto.
-- Se unifican: la primera foto de la galería ES la principal. Esta función es
-- la única que escribe las dos columnas juntas, así quedan siempre alineadas
-- y el orden `principal primero, después orden` de las consultas públicas
-- sigue dando exactamente lo que el admin ve en el panel.
--
-- Por qué una función y no N UPDATE desde el navegador: el navegador no puede
-- abrir una transacción. Mover una foto toca el `orden` de varias filas y,
-- si cambia la primera, también `es_principal` de dos. Un corte a mitad de
-- camino dejaría órdenes repetidos o una galería sin principal. Una función
-- plpgsql corre entera dentro de una transacción: o queda el orden nuevo
-- completo o queda el anterior, nunca una mezcla.
--
-- `marcar_foto_principal` (0012) no se toca: el panel deja de usarla porque
-- «mandar al primer lugar» es un reordenamiento más, pero borrarla es otra
-- decisión y otra migración.
--
-- Códigos de error (todos abortan sin cambiar nada):
--   42501  quien llama no es admin
--   22023  tabla fuera de la allowlist
--   22004  p_padre_id nulo, p_ids nulo o con algún elemento nulo
--   2202E  p_ids multidimensional
--   23505  p_ids con ids repetidos
--   23503  p_ids con un id que no es de esta galería (otro padre, la otra
--          tabla o inexistente)
--   23514  a p_ids le falta alguna foto de la galería
--   25000  el UPDATE no afectó todas las filas (no debería pasar nunca: es la
--          red de seguridad, igual que en 0012)

-- ---------------------------------------------------------------------------
-- reordenar_fotos
-- ---------------------------------------------------------------------------
-- `p_ids` es la galería COMPLETA en el orden nuevo. La función deja
-- `orden = posición` (base 0, igual que la subida desde el panel) y
-- `es_principal` solo en la primera.
--
-- Se pide la galería entera y no «mover la foto X a la posición Y» a propósito:
-- con el conjunto completo la base puede validar que el panel y ella están
-- viendo la misma galería. Si alguien borró o agregó una foto desde otra
-- pestaña, el panel manda un conjunto que ya no coincide y la llamada se
-- rechaza en vez de aplicar un orden calculado sobre datos viejos.
--
-- Mismo esquema de seguridad que 0012, por los mismos motivos: SECURITY
-- DEFINER esquiva RLS, así que `es_admin()` va en la primera línea; la tabla
-- se valida contra una allowlist que además da la columna padre, y el SQL
-- dinámico solo interpola con `format(%I)`; search_path fijo para que un
-- esquema malicioso no pueda suplantar las tablas.
create or replace function reordenar_fotos(
    p_tabla    text,
    p_padre_id bigint,
    p_ids      bigint[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_columna text;
    v_galeria bigint[];
    v_primera bigint;
    v_filas   integer;
begin
    if not es_admin() then
        raise exception 'No autorizado' using errcode = '42501';
    end if;

    -- Allowlist idéntica a 0012: el nombre de la columna padre sale de acá,
    -- nunca del parámetro.
    v_columna := case p_tabla
        when 'auto_fotos'     then 'auto_id'
        when 'producto_fotos' then 'producto_id'
    end;

    if v_columna is null then
        raise exception 'Tabla de fotos no permitida: %', p_tabla
            using errcode = '22023';
    end if;

    -- Un padre nulo no es «una galería vacía»: `auto_id = null` no matchea
    -- nada, así que con `p_ids = '{}'` la función terminaría bien sin haber
    -- validado contra ninguna galería. Además `hashtext(... || null)` es null y
    -- `pg_advisory_xact_lock(null)` no bloquea nada: el lock de abajo sería
    -- mentira. Mejor rechazarlo de entrada.
    if p_padre_id is null then
        raise exception 'Falta el registro padre' using errcode = '22004';
    end if;

    -- Un null en el arreglo no es un id: no se puede ubicar ni comparar
    -- (`null <> all(...)` es null, no true), así que se colaría por las
    -- validaciones de pertenencia de abajo.
    if p_ids is null or exists (select 1 from unnest(p_ids) as x where x is null) then
        raise exception 'La lista de fotos no puede ser nula ni tener nulos'
            using errcode = '22004';
    end if;

    -- `unnest` aplana un arreglo de dos dimensiones sin quejarse, y entonces
    -- '{{3,1},{2,4}}' pasaría como si fuera '{3,1,2,4}'. No es un orden que el
    -- panel mande nunca: si llega, es un error de quien llama.
    if array_ndims(p_ids) > 1 then
        raise exception 'La lista de fotos tiene que ser de una dimensión'
            using errcode = '2202E';
    end if;

    -- Misma clave que `marcar_foto_principal`, a propósito: un reordenamiento
    -- y un marcado de principal sobre la misma galería tienen que esperarse uno
    -- al otro. Con claves distintas los dos podrían leer la principal vieja a
    -- la vez y el segundo reventaría contra el índice único. Se libera solo al
    -- terminar la transacción.
    perform pg_advisory_xact_lock(hashtext(p_tabla || ':' || p_padre_id));

    -- Las fotos de la galería, bloqueadas hasta el final de la transacción.
    -- Por qué FOR UPDATE: el advisory lock solo serializa a esta función y a
    -- 0012, no a un DELETE ni a un cambio de padre que venga por afuera. Sin
    -- el bloqueo, la galería contra la que se valida podría cambiar antes de
    -- los UPDATE y la validación no garantizaría nada.
    --
    -- El FOR UPDATE va en la subconsulta porque no se admite en el mismo nivel
    -- que un agregado.
    execute format(
        'select coalesce(array_agg(id), ''{}'') from (select id from %I where %I = $1 for update) as g',
        p_tabla, v_columna
    ) into v_galeria using p_padre_id;

    -- Repetidos: con un id dos veces, el UPDATE de abajo le asignaría dos
    -- posiciones y otra foto quedaría afuera sin orden nuevo.
    if (select count(distinct x) from unnest(p_ids) as x) <> cardinality(p_ids) then
        raise exception 'La lista de fotos tiene ids repetidos'
            using errcode = '23505';
    end if;

    -- Un id ajeno (de otro auto, de la otra tabla o inexistente) no se puede
    -- ordenar en esta galería. `v_galeria` ya viene con coalesce a '{}': contra
    -- un null, `x <> all(null)` sería null y el exists no dispararía nunca.
    if exists (select 1 from unnest(p_ids) as x where x <> all(v_galeria)) then
        raise exception 'Hay fotos que no pertenecen al registro % de %',
            p_padre_id, p_tabla
            using errcode = '23503';
    end if;

    -- Sin repetidos y sin ajenos, la única diferencia posible con la galería
    -- es que falten fotos. Una foto que no viene en la lista quedaría con su
    -- `orden` viejo, mezclado con los nuevos, y si era la principal habría dos.
    if cardinality(p_ids) <> cardinality(v_galeria) then
        raise exception 'Faltan fotos del registro % de %: se esperaban %, llegaron %',
            p_padre_id, p_tabla, cardinality(v_galeria), cardinality(p_ids)
            using errcode = '23514';
    end if;

    -- Galería vacía con '{}': no hay nada que ordenar.
    if cardinality(p_ids) = 0 then
        return;
    end if;

    -- El primero del arreglo por posición y no `p_ids[1]`: un arreglo de
    -- Postgres puede empezar en otro índice ('[0:1]={5,7}') y entonces
    -- `p_ids[1]` sería el segundo.
    select x into v_primera from unnest(p_ids) with ordinality as o(x, pos) order by pos limit 1;

    -- El índice único parcial `<tabla>_una_principal_idx` se chequea fila por
    -- fila, no al final de la sentencia. Si un solo UPDATE subiera la nueva
    -- principal antes de bajar la vieja, chocaría a mitad de camino. Por eso,
    -- igual que 0012, primero se baja la principal vieja (si no es la que va a
    -- quedar primera) y recién después se escribe el orden nuevo.
    execute format(
        'update %I set es_principal = false where %I = $1 and es_principal and id <> $2',
        p_tabla, v_columna
    ) using p_padre_id, v_primera;

    -- Un solo UPDATE para orden y principal: a esta altura la única fila que
    -- puede quedar en true es la primera, así que el índice no tiene con qué
    -- chocar. La columna padre en el WHERE es defensa en profundidad, igual
    -- que en 0012: aunque la pertenencia ya esté validada, ni un bug futuro
    -- puede tocar una foto de otra galería.
    --
    -- Idempotente: llamar dos veces con el mismo orden reescribe los mismos
    -- valores y vuelve a afectar todas las filas, sin error.
    execute format(
        'update %I as t
            set orden        = o.pos - 1,
                es_principal = (o.pos = 1)
           from unnest($2::bigint[]) with ordinality as o(id, pos)
          where t.id = o.id and t.%I = $1',
        p_tabla, v_columna
    ) using p_padre_id, p_ids;

    -- Mismo motivo que en 0012: un UPDATE que no encuentra filas no es un
    -- error para Postgres. Si no se escribieron todas, se aborta y la bajada
    -- de la principal vieja se revierte con lo demás.
    get diagnostics v_filas = row_count;

    if v_filas <> cardinality(p_ids) then
        raise exception 'No se pudo reordenar la galería % de % (% de % filas)',
            p_padre_id, p_tabla, v_filas, cardinality(p_ids)
            using errcode = '25000';
    end if;
end;
$$;

-- Por defecto EXECUTE queda concedido a PUBLIC, o sea también a `anon`. Se
-- revoca y se otorga solo a `authenticated`; `es_admin()` sigue siendo la
-- barrera real, esto es la segunda capa.
revoke execute on function reordenar_fotos(text, bigint, bigint[]) from public;
grant  execute on function reordenar_fotos(text, bigint, bigint[]) to authenticated;
