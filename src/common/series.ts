import { Recurrence } from '@prisma/client';

/** Meses entre repeticiones según la recurrencia. */
export const RECURRENCE_STEP: Record<Recurrence, number> = {
  NONE: 0,
  MONTHLY: 1,
  BIMONTHLY: 2,
  QUARTERLY: 3,
  SEMIANNUAL: 6,
  ANNUAL: 12,
};

/** Tope de repeticiones creadas de una vez (10 años de un gasto mensual). */
const MAX_OCCURRENCES = 120;

export function monthIndex(month: number, year: number) {
  return year * 12 + (month - 1);
}

function fromIndex(idx: number) {
  return { month: (idx % 12) + 1, year: Math.floor(idx / 12) };
}

/**
 * Meses de las repeticiones posteriores a (month, year) hasta (untilMonth, untilYear) incluido.
 * `k` es el número de pasos desde el mes de origen (1 = la siguiente).
 */
export function nextOccurrences(
  month: number,
  year: number,
  recurrence: Recurrence,
  untilMonth: number,
  untilYear: number,
) {
  const step = RECURRENCE_STEP[recurrence];
  if (!step) return [];
  const start = monthIndex(month, year);
  const end = monthIndex(untilMonth, untilYear);
  const out: { month: number; year: number; k: number }[] = [];
  for (let k = 1; start + k * step <= end && out.length < MAX_OCCURRENCES; k++) {
    out.push({ ...fromIndex(start + k * step), k });
  }
  return out;
}

/** Filtro Prisma: registros de meses posteriores a (month, year). */
export function afterMonth(month: number, year: number) {
  return { OR: [{ year: { gt: year } }, { year, month: { gt: month } }] };
}
