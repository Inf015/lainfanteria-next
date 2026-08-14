-- Número de WhatsApp real, reemplaza el placeholder 18095550000.
--
-- Formato para wa.me: código de país + número, sin +, espacios ni guiones.
-- 829-686-3273 (RD) → 1 + 8296863273.
--
-- Nota: esto es dato, no esquema. Va en una migración porque todavía no hay
-- backoffice; cuando exista, se edita desde ahí sin tocar el repo.

update ajustes set valor = '18296863273' where clave = 'whatsapp_numero';
