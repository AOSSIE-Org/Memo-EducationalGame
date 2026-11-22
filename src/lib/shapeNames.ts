/**
 * Names of the shapes and colours in every language, and the descriptions of
 * the cards of the shapes set ("Red Circle").
 *
 * src/locales/shapes/<lang>.json holds, per language, a small grammar instead
 * of 360 descriptions:
 * - `pattern`: how a colour and a shape combine, e.g. "{color} {shape}"
 *   (English) or "{shape} {color}" (French);
 * - `shapes`: each shape's name, either a string, or `{ "name", "g" }` where
 *   `g` is the grammatical gender (or noun class) that colours agree with,
 *   and optionally a `pattern` of its own;
 * - `colors`: each colour, either a string (the same for every shape), or an
 *   object with one form per gender used by the shapes (`"m"`, `"f"`, `"n"`…).
 * The first letter of every word is then capitalised ("Red Circle").
 *
 * No imports from the app, so that Node scripts can use it directly.
 */

export interface ShapeGrammar {
  pattern: string;
  colors: Record<string, string | Record<string, string>>;
  shapes: Record<string, string | { name: string; g?: string; pattern?: string }>;
}

/** Capitalises the first letter of every word, the way `lang` does it (e.g. Turkish i → İ). */
export function titleCase(text: string, lang: string): string {
  // Georgian has no capital letters in normal text (Mtavruli is for headings only).
  if (lang === 'ka') return text;
  // Greek: the locale-aware upper case drops accents (έ → Ε); single words keep them (Έ).
  const upper = lang === 'el' ? (c: string) => c.toUpperCase() : (c: string) => c.toLocaleUpperCase(lang);
  return text.replace(/(^|[\s(（])(\p{Ll})/gu, (_m, before: string, letter: string) => before + upper(letter));
}

/** The name of a shape on its own, capitalised. */
export function shapeName(grammar: ShapeGrammar, shape: string, lang: string): string {
  const s = grammar.shapes[shape];
  if (s === undefined) return shape;
  return titleCase(typeof s === 'string' ? s : s.name, lang);
}

/** The description of a coloured shape, e.g. "Red Circle". */
export function describeShape(grammar: ShapeGrammar, color: string, shape: string, lang: string): string {
  const s = grammar.shapes[shape];
  const c = grammar.colors[color];
  if (s === undefined || c === undefined) return `${color} ${shape}`;
  const name = typeof s === 'string' ? s : s.name;
  const gender = typeof s === 'string' ? undefined : s.g;
  const colour = typeof c === 'string' ? c : ((gender !== undefined ? c[gender] : undefined) ?? Object.values(c)[0]);
  const pattern = (typeof s !== 'string' && s.pattern) || grammar.pattern;
  return titleCase(pattern.replace('{color}', colour).replace('{shape}', name), lang);
}
