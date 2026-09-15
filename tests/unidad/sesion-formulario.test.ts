import { describe, expect, it } from 'vitest';
import { crearSesionFormulario } from '@/app/(admin)/(panel)/admin/miembros/sesion-formulario';

describe('crearSesionFormulario — T-002-D06: sobrevive al doble montaje de StrictMode', () => {
  it('montar → desmontar → montar (lo que hace StrictMode) deja vigente el borrador actual', () => {
    const sesion = crearSesionFormulario();
    const borrador = sesion.nuevoBorrador();

    sesion.montar();
    sesion.desmontar();
    sesion.montar();

    expect(sesion.esVigente(borrador)).toBe(true);
    expect(sesion.estaMontado()).toBe(true);
  });

  it('un desmontaje real (sin montar después) deja de estar vigente', () => {
    const sesion = crearSesionFormulario();
    const borrador = sesion.nuevoBorrador();

    sesion.montar();
    sesion.desmontar();
    sesion.montar(); // segunda pasada de StrictMode
    sesion.desmontar(); // desmontaje real: cerrar el modal

    expect(sesion.esVigente(borrador)).toBe(false);
    expect(sesion.estaMontado()).toBe(false);
  });

  it('antes del primer montar no hay nada vigente', () => {
    const sesion = crearSesionFormulario();
    const borrador = sesion.nuevoBorrador();
    expect(sesion.esVigente(borrador)).toBe(false);
    expect(sesion.estaMontado()).toBe(false);
  });

  it('un borrador viejo deja de estar vigente cuando se abre uno nuevo (Cancelar o nueva edición)', () => {
    const sesion = crearSesionFormulario();
    sesion.montar();
    const borradorViejo = sesion.nuevoBorrador();
    const borradorNuevo = sesion.nuevoBorrador();

    expect(sesion.esVigente(borradorViejo)).toBe(false);
    expect(sesion.esVigente(borradorNuevo)).toBe(true);
  });
});

describe('crearSesionFormulario — T-002-D07: candado síncrono de doble envío', () => {
  it('dos iniciarEnvio() seguidos en el mismo tick: solo el primero toma el candado', () => {
    const sesion = crearSesionFormulario();
    expect(sesion.iniciarEnvio()).toBe(true);
    expect(sesion.iniciarEnvio()).toBe(false);
    expect(sesion.iniciarEnvio()).toBe(false);
  });

  it('tras terminarEnvio(), un nuevo envío sí puede empezar', () => {
    const sesion = crearSesionFormulario();
    expect(sesion.iniciarEnvio()).toBe(true);
    sesion.terminarEnvio();
    expect(sesion.iniciarEnvio()).toBe(true);
  });

  it('terminarEnvio() sin un iniciarEnvio() previo no rompe el candado siguiente', () => {
    const sesion = crearSesionFormulario();
    sesion.terminarEnvio();
    expect(sesion.iniciarEnvio()).toBe(true);
  });
});
