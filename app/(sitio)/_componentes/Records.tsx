import type { RecordDeportivo } from '@/lib/types';
import {
  etiquetaRecord,
  formatearTiempo,
  formatearVelocidad,
  recordsVigentes,
  tieneCifras,
} from '@/lib/records';
import { fechaLogro } from '@/lib/palmares';
import { lineaHistorial } from './records-texto';
import s from './records.module.css';

/** Defensa en profundidad: solo http(s), aunque la base ya lo restrinja. */
const FUENTE_PERMITIDA = /^https?:\/\//i;

/**
 * Bloque de récords: fichas vigentes en grilla y, debajo, el historial de
 * superados. Server Component reutilizable entre `/equipo/<slug>` (T-003) y
 * `/nosotros` (T-004, récords del equipo) — por eso no asume nada de la
 * página que lo monta más allá de recibir la lista ya ordenada.
 */
export default function Records({
  records,
  titulo,
}: {
  records: RecordDeportivo[];
  titulo: string;
}) {
  if (records.length === 0) return null;

  const vigentes = recordsVigentes(records);
  const superados = records.filter((r) => !r.vigente);

  return (
    <section className={s.bloque}>
      <h2 className={s.bloqueTitulo}>{titulo}</h2>

      {vigentes.length > 0 && (
        <div className={s.grilla}>
          {vigentes.map((r) => (
            <FichaRecord record={r} key={r.id} />
          ))}
        </div>
      )}

      {superados.length > 0 && (
        <div className={s.historialWrap}>
          <h3 className={s.historialTitulo}>Historial</h3>
          <ul className={s.historial}>
            {superados.map((r) => (
              <li className={s.historialItem} key={r.id}>
                <span className={s.superado}>SUPERADO</span>
                <span className={s.historialTexto}>{lineaHistorial(r)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function FichaRecord({ record }: { record: RecordDeportivo }) {
  const conCifras = tieneCifras(record);
  const tiempo = formatearTiempo(record.tiempo_s);
  const velocidad = formatearVelocidad(record.velocidad, record.unidad_velocidad);
  const principal = tiempo ?? velocidad;
  const secundaria = tiempo && velocidad ? velocidad : null;

  const disciplina = [record.titulo, record.categoria].filter(Boolean).join(' · ');
  const autoLugar = [record.auto, record.lugar].filter(Boolean).join(' · ');
  const fecha = fechaLogro(record);
  const fuenteValida = Boolean(record.fuente_url && FUENTE_PERMITIDA.test(record.fuente_url));

  return (
    <article className={s.ficha}>
      <span className={s.etiqueta}>{etiquetaRecord(record).toUpperCase()}</span>

      {conCifras ? (
        <>
          <div className={s.marca}>
            <span className={s.marcaPrincipal}>{principal}</span>
            {secundaria && <span className={s.marcaSecundaria}>@ {secundaria}</span>}
          </div>
          <p className={s.disciplina}>{disciplina}</p>
        </>
      ) : (
        <>
          <p className={s.hito}>{record.titulo}</p>
          {record.categoria && <p className={s.disciplina}>{record.categoria}</p>}
        </>
      )}

      {autoLugar && <p className={s.meta}>{autoLugar}</p>}
      {fecha && <p className={s.fecha}>{fecha}</p>}
      {fuenteValida && (
        <a
          href={record.fuente_url as string}
          target="_blank"
          rel="noopener noreferrer"
          className={s.fuente}
        >
          Ver fuente ↗
        </a>
      )}
    </article>
  );
}
