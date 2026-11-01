// No look-alike characters (0/O, 1/l/I) so a suggested password is easy to copy by hand.
const SETS = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '!@#$%^&*-_=+?'];

/** Uniform random int in [0, n) from a CSPRNG, without modulo bias. */
function randomInt(n: number, fill: (a: Uint32Array) => Uint32Array): number {
  const limit = Math.floor(0x1_0000_0000 / n) * n;
  const buf = new Uint32Array(1);
  do fill(buf); while (buf[0]! >= limit);
  return buf[0]! % n;
}

/** Random password with at least one upper, lower, digit and symbol. */
export function generatePassword(length = 16, fill: (a: Uint32Array) => Uint32Array = (a) => globalThis.crypto.getRandomValues(a)): string {
  const all = SETS.join('');
  const chars = SETS.map((s) => s[randomInt(s.length, fill)]!);
  while (chars.length < length) chars.push(all[randomInt(all.length, fill)]!);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1, fill);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }
  return chars.join('');
}

export type PasswordStrength = { score: 0 | 1 | 2 | 3 | 4; label: 'Too short' | 'Weak' | 'Fair' | 'Good' | 'Strong' };

/** Rough strength from length and character variety; repeated or sequential runs count against it. */
export function passwordStrength(pw: string): PasswordStrength {
  if (pw.length < 8) return { score: 0, label: 'Too short' };
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length;
  let points = variety + (pw.length >= 12 ? 1 : 0) + (pw.length >= 16 ? 1 : 0);
  if (/(.)\1\1/.test(pw) || /(?:0123|1234|2345|3456|4567|5678|6789|abcd|qwer|password)/i.test(pw)) points -= 2;
  const score = Math.max(1, Math.min(4, points - 1)) as 1 | 2 | 3 | 4;
  return { score, label: (['Weak', 'Fair', 'Good', 'Strong'] as const)[score - 1]! };
}
