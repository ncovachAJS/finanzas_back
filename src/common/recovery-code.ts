import { randomInt } from 'crypto';

// Alfabeto sin caracteres ambiguos (sin 0/O, 1/I/L)
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Código legible tipo XXXX-XXXX-XXXX-XXXX (~80 bits de entropía). */
export function generateRecoveryCode(): string {
  const groups = Array.from({ length: 4 }, () =>
    Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join(''),
  );
  return groups.join('-');
}

/** Código de un solo uso tipo XXXX-XXXX (~40 bits). Para la tanda de códigos de respaldo del 2FA. */
export function generateBackupCode(): string {
  const groups = Array.from({ length: 2 }, () =>
    Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join(''),
  );
  return groups.join('-');
}
