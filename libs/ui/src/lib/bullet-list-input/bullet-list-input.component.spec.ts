import { GfBulletListInputComponent } from './bullet-list-input.component';

describe('GfBulletListInputComponent', () => {
  describe('parse', () => {
    it('should return no items for empty values', () => {
      expect(GfBulletListInputComponent.parse(null)).toEqual([]);
      expect(GfBulletListInputComponent.parse('')).toEqual([]);
      expect(GfBulletListInputComponent.parse('\n  \n')).toEqual([]);
    });

    it('should handle Windows line endings', () => {
      expect(GfBulletListInputComponent.parse('a\r\nb')).toEqual(['a', 'b']);
    });

    it('should split lines and drop empty ones', () => {
      expect(GfBulletListInputComponent.parse('a\n\n b \nc')).toEqual([
        'a',
        'b',
        'c'
      ]);
    });
  });

  describe('toLines', () => {
    it('should strip bullet markers from pasted lists', () => {
      expect(
        GfBulletListInputComponent.toLines('- a\n• b\n* c\n1. d\n2) e')
      ).toEqual(['a', 'b', 'c', 'd', 'e']);
    });

    it('should keep dashes inside the text', () => {
      expect(GfBulletListInputComponent.toLines('Low-cost producer')).toEqual([
        'Low-cost producer'
      ]);
    });
  });

  describe('serialize', () => {
    it('should join trimmed, non-empty items with newlines', () => {
      expect(GfBulletListInputComponent.serialize([' a', '', 'b ', ' '])).toBe(
        'a\nb'
      );
    });

    it('should round-trip with parse', () => {
      const value = 'Pricing power\nNetwork effects';

      expect(
        GfBulletListInputComponent.serialize(
          GfBulletListInputComponent.parse(value)
        )
      ).toBe(value);
    });
  });
});
