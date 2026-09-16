-- El cambio de foto principal deja de ser dos UPDATE desde el navegador.
--
-- El panel bajaba la principal actual con un UPDATE y subía la nueva con otro.
-- Entre los dos hay una ventana donde la galería no tiene principal, y el
-- navegador no puede abrir una transacción: si el segundo UPDATE falla (red
-- caída, sesión vencida, pestaña cerrada) el registro queda sin foto principal
-- y la tarjeta del sitio sale vacía. El índice único parcial
-- `<tabla>_una_principal_idx` garantiza "como máximo una", nunca "exactamente
-- una", así que no cubre este caso.
--
-- La solución es hacer el swap del lado del servidor: una función plpgsql corre
-- entera dentro de una transacción, así que o quedan los dos UPDATE o no queda
-- ninguno. Nunca un estado intermedio visible.

-- ---------------------------------------------------------------------------
-- marcar_foto_principal
-- ---------------------------------------------------------------------------
-- El nombre de tabla no se puede pasar como parámetro a un UPDATE, hace falta
-- SQL dinámico. Para que eso no sea un agujero de inyección, el parámetro no se
-- interpola nunca: se compara contra una allowlist de dos valores que además
-- devuelve la columna padre correspondiente, y recién ahí se arma la consulta
-- con `format(%I)`. Una tabla fuera de la lista aborta antes de tocar nada.
--
-- SECURITY DEFINER es necesario para poder ejecutar el swap como una unidad,
-- pero eso significa que corre con los privilegios del owner y esquiva las
-- políticas de RLS de 0006. Por eso la autorización se chequea a mano con
-- `es_admin()` en la primera línea: sin ese check, cualquier usuario registrado
-- podría reordenar las galerías del sitio. search_path fijo por el mismo motivo
-- que en `es_admin()`: un esquema malicioso en el path podría suplantar las
-- tablas.
create or replace function marcar_foto_principal(
    p_tabla    text,
    p_padre_id bigint,
    p_foto_id  bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_columna   text;
    v_pertenece boolean;
    v_filas     integer;
begin
    if not es_admin() then
        raise exception 'No autorizado' using errcode = '42501';
    end if;

    -- Allowlist estricta: solo estas dos tablas, y el nombre de la columna
    -- padre sale de acá, no del parámetro.
    v_columna := case p_tabla
        when 'auto_fotos'     then 'auto_id'
        when 'producto_fotos' then 'producto_id'
    end;

    if v_columna is null then
        raise exception 'Tabla de fotos no permitida: %', p_tabla
            using errcode = '22023';
    end if;

    -- Dos admins marcando principal en la misma galería a la vez chocarían
    -- contra el índice único: bajo READ COMMITTED el segundo no llega a ver la
    -- principal que acaba de dejar el primero y su UPDATE de subida reventaría.
    -- El lock de transacción serializa los swaps por galería; se libera solo al
    -- terminar la función.
    perform pg_advisory_xact_lock(hashtext(p_tabla || ':' || p_padre_id));

    -- Que la foto exista no alcanza: tiene que ser de este registro padre. Si
    -- no se valida, un id de otro auto bajaría la principal de esta galería sin
    -- dejar ninguna en su lugar.
    --
    -- FOR UPDATE, no `select exists`: el advisory lock serializa los swaps entre
    -- sí, pero no frena un DELETE ni un cambio de padre que venga por afuera de
    -- esta función. Con `exists` la validación solo diría que la fila existía en
    -- ese instante y la foto podría desaparecer antes de los UPDATE. El FOR
    -- UPDATE bloquea la fila hasta el final de la transacción, así que la foto
    -- que se validó es la misma que se termina marcando.
    execute format(
        'select true from %I where id = $1 and %I = $2 for update',
        p_tabla, v_columna
    ) into v_pertenece using p_foto_id, p_padre_id;

    -- `is not true` y no `not v_pertenece`: sin fila la variable queda en null y
    -- `not null` es null, o sea un if que no dispara y una validación que no
    -- valida nada.
    if v_pertenece is not true then
        raise exception 'La foto % no pertenece al registro % de %',
            p_foto_id, p_padre_id, p_tabla
            using errcode = '23503';
    end if;

    -- Primero baja la anterior y después sube la nueva, en ese orden, porque el
    -- índice único no admite dos principales ni por un instante. La atomicidad
    -- de la función es la que cubre el hueco: si el segundo UPDATE falla, el
    -- primero se deshace con él.
    execute format(
        'update %I set es_principal = false where %I = $1 and es_principal and id <> $2',
        p_tabla, v_columna
    ) using p_padre_id, p_foto_id;

    -- La columna padre va en el WHERE aunque el id ya sea único y la pertenencia
    -- esté validada: defensa en profundidad, para que ni un bug futuro pueda
    -- subir una foto de otra galería.
    --
    -- Sin `and not es_principal`: re-marcar la foto que ya era principal es un
    -- caso normal (doble clic) y con ese filtro el UPDATE afectaría cero filas,
    -- indistinguible de un fallo real para el chequeo de abajo. El write
    -- redundante es más barato que perder la señal.
    execute format(
        'update %I set es_principal = true where id = $1 and %I = $2',
        p_tabla, v_columna
    ) using p_foto_id, p_padre_id;

    -- Un UPDATE que no encuentra su fila no es un error para Postgres: termina
    -- bien y afecta cero filas. Sin este chequeo la función confirmaría una
    -- galería que quedó sin principal, justo lo que vino a evitar. La excepción
    -- revierte también la bajada de la anterior.
    get diagnostics v_filas = row_count;

    if v_filas <> 1 then
        raise exception 'No se pudo marcar la foto % como principal de % (% filas afectadas)',
            p_foto_id, p_padre_id, v_filas
            using errcode = '25000';
    end if;
end;
$$;

-- Por defecto EXECUTE queda concedido a PUBLIC, o sea también a `anon`. Se
-- revoca y se otorga solo a `authenticated`; el check de `es_admin()` sigue
-- siendo la barrera real, esto es la segunda capa.
revoke execute on function marcar_foto_principal(text, bigint, bigint) from public;
grant  execute on function marcar_foto_principal(text, bigint, bigint) to authenticated;
