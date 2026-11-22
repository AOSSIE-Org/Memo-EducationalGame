/**
 * Cards of letters and numbers: the Latin alphabet, the Cyrillic (Russian)
 * alphabet and the numbers from 0 to 9, drawn as SVG by
 * scripts/build-symbol-cards.ts into public/cards/<set>/.
 *
 * No imports, so that Node can run the generator script directly.
 */

export const LATIN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
/** The Russian alphabet, the most widely used Cyrillic alphabet (33 letters). */
export const CYRILLIC = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ'.split('');
export const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

/** Bright colours for letters and digits, in turn. */
const INKS = ['#E4002B', '#FF8200', '#00843D', '#1F6FEB', '#3F2FA8', '#9B3FD9', '#D6247A', '#8B5A2B', '#0E8A8A'];
const FONT = "font-family=\"Inter, 'Helvetica Neue', Helvetica, Arial, 'Noto Sans', sans-serif\" font-weight=\"800\"";

/** Letters much wider than an "A". */
const WIDE = ['M', 'W', 'Ж', 'М', 'Ф', 'Ш', 'Щ', 'Ы', 'Ю', 'Ъ', 'Д', 'Ц'];

/** Card id of a letter: its position in the alphabet ("a01"…), safe as a file name. */
export const letterId = (index: number): string => `l${String(index + 1).padStart(2, '0')}`;

/** A letter in upper and lower case, e.g. "Aa". */
export function letterSvg(letter: string, index: number): string {
  const ink = INKS[index % INKS.length];
  const lower = letter.toLocaleLowerCase();
  // Wide letters are drawn smaller, so that every card has the same margins.
  const scale = WIDE.includes(letter) ? 0.78 : 1;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text x="50" y="${74 - (1 - scale) * 8}" text-anchor="middle" ${FONT} font-size="${64 * scale}" fill="${ink}">${letter}<tspan font-size="${46 * scale}" fill-opacity="0.75">${lower}</tspan></text></svg>\n`;
}

/** Positions of the dots of 0–9 on a 3 × 3 grid (like dice). */
const DOTS: number[][] = [[], [4], [0, 8], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 2, 3, 5, 6, 8], [0, 2, 3, 4, 5, 6, 8], [0, 1, 2, 3, 5, 6, 7, 8], [0, 1, 2, 3, 4, 5, 6, 7, 8]];

/** A digit with as many dots as it counts. */
export function digitSvg(digit: string): string {
  const n = Number(digit);
  const ink = INKS[n % INKS.length];
  const dots = DOTS[n].map((p) => `<circle cx="${60 + (p % 3) * 15}" cy="${35 + Math.floor(p / 3) * 15}" r="6.3"/>`).join('');
  const empty = n === 0 ? '<rect x="52" y="27" width="46" height="46" rx="7" fill="none" stroke="#7A7A7A" stroke-width="1.8" stroke-dasharray="3.5 3.5"/>' : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text x="25" y="75" text-anchor="middle" ${FONT} font-size="68" fill="${ink}">${digit}</text>${empty}<g fill="${ink}">${dots}</g></svg>\n`;
}
