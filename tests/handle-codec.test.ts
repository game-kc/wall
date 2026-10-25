import { describe, expect, test } from 'vitest';
import { decodeUserId, xorHandlePart } from '../src/core/handle-codec';

describe('handle codec', () => {
  test('xor handle part', () => {
    expect(xorHandlePart(18545)).toBe(3);
    expect(xorHandlePart(18544)).toBe(2);
    expect(xorHandlePart(18547)).toBe(1);
    expect(xorHandlePart(5_040_565)).toBe(5_022_151);
  });

  test('decodeUserId', () => {
    expect(
      decodeUserId({
        Data3: 18545,
        Data7: 18544,
        Data8: 18547,
        Data9: 1_220_341,
      }),
    ).toBe('3-S2-1-1234567');
  });
});
