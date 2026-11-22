import { describe, expect, it } from 'vitest';
import { describeShape, titleCase, type ShapeGrammar } from './shapeNames';

const de: ShapeGrammar = {
  pattern: '{color} {shape}',
  colors: { red: { m: 'roter', f: 'rote', n: 'rotes' }, pink: 'rosa' },
  shapes: { circle: { name: 'Kreis', g: 'm' }, star: { name: 'Stern', g: 'm' }, ellipse: { name: 'Ellipse', g: 'f' }, heart: { name: 'Herz', g: 'n' } },
};

describe('shape names', () => {
  it('agrees colours with the shape and capitalises every word', () => {
    expect(describeShape(de, 'red', 'circle', 'de')).toBe('Roter Kreis');
    expect(describeShape(de, 'red', 'ellipse', 'de')).toBe('Rote Ellipse');
    expect(describeShape(de, 'red', 'heart', 'de')).toBe('Rotes Herz');
    expect(describeShape(de, 'pink', 'heart', 'de')).toBe('Rosa Herz');
  });

  it('capitalises the way each language does', () => {
    expect(titleCase('ince daire', 'tr')).toBe('İnce Daire');
    expect(titleCase('έλλειψη', 'el')).toBe('Έλλειψη');
    expect(titleCase('წითელი წრე', 'ka')).toBe('წითელი წრე');
    expect(titleCase('红色圆形', 'zh')).toBe('红色圆形');
  });
});
