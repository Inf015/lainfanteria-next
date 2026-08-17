-- Promueve la cuenta del dueño a admin.
--
-- La 0006 ya intentaba esto, pero corrió antes de que el usuario existiera en
-- auth.users, así que no hizo nada. Acá se verifica el resultado: si el correo
-- no está registrado, la migración falla en vez de terminar en silencio
-- dejando un panel al que nadie puede entrar.

-- El correo no se versiona: decir cuál es la cuenta con acceso al panel en un
-- repositorio público es regalar media credencial. Se pasa al aplicar:
--   psql "$DATABASE_URL" -c "set app.admin_email = 'tu@correo'" -f 0007_promover_admin.sql

do $$
declare
    correo constant text := nullif(current_setting('app.admin_email', true), '');
    insertadas int;
begin
    if correo is null then
        raise exception
            'Falta app.admin_email. Definilo antes de aplicar esta migración: set app.admin_email = ''tu@correo''.';
    end if;

    insert into admins (user_id, email)
    select id, email from auth.users where email = correo
    on conflict (user_id) do nothing;

    get diagnostics insertadas = row_count;

    if insertadas = 0 and not exists (
        select 1 from admins a
        join auth.users u on u.id = a.user_id
        where u.email = correo
    ) then
        raise exception
            'No hay ningún usuario con el correo % en auth.users. Crealo desde Authentication > Users (con Auto Confirm User) y volvé a aplicar.',
            correo;
    end if;

    raise notice 'Admin listo para %', correo;
end $$;
