/**
 * Speech text helpers shared by the app and the build-time recorder,
 * so both cut text into exactly the same pieces.
 */
export function clean(t: string): string {
  return t
    .replace(/−/g, ' minus ')
    .replace(/(\d)¢/g, '$1 cents')
    .replace(/¢/g, ' cents')
    .replace(/\bx3\b/g, 'times three')
    .replace(/\s\+\s/g, ' plus ')
    .replace(/\s=\s/g, ' equals ')
    .replace(/\s×\s/g, ' times ')
    .replace(/(\d):(\d\d)\b/g, (_, h, m) => (m === '00' ? `${h} o'clock` : `${h} ${m.startsWith('0') ? 'oh ' + m[1] : m}`))
    .replace(/\s+/g, ' ')
    .trim();
}

/** Split into sentences, keeping the end mark. */
export function sentences(t: string): string[] {
  const out: string[] = [];
  const re = /[^.!?]+[.!?]*/g;
  let m: RegExpExecArray | null;
  const s = clean(t);
  while ((m = re.exec(s))) {
    const x = m[0].trim();
    if (x) out.push(x);
  }
  return out;
}

/** Split a sentence at commas, colons and semicolons. */
export function chunks(s: string): string[] {
  return s.split(/(?<=[,:;])\s+/).map((x) => x.trim()).filter(Boolean);
}

/** Split a chunk into number and word runs: "Count on 3" -> ["Count on", "3"]. */
export function runs(c: string): string[] {
  return c.split(/(\d+)/).map((x) => x.trim()).filter((x) => x && /[a-z0-9]/i.test(x));
}

/** Lookup key: lower case, no punctuation except a final question mark (it changes the tune). */
export function key(s: string): string {
  const q = /\?\s*$/.test(s) ? '?' : '';
  return s.toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim() + q;
}
