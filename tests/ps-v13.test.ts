import { describe, expect, test } from 'vitest';
import { calculatePsV13, galaxySquareRootIFromInt } from '../src/core/ps-v13';

describe('PS 계산', () => {
  test('galaxySquareRootIFromInt 고정', () => {
    expect(galaxySquareRootIFromInt(5_040_565)).toBe(919);
    expect(galaxySquareRootIFromInt(81_242_861)).toBe(708);
  });

  test('calculatePsV13', () => {
    expect(
      calculatePsV13({
        Data1: 16,
        Data2: 3900,
        Data3: 18545,
        Data4: 39,
        Data5: 11,
        Data6: 13,
        Data7: 18544,
        Data8: 18547,
        Data9: 1_220_341,
        Data10: 0,
        Data11: 0,
        Data12: 0,
      }),
    ).toBe(20_120_278);
  });
});
