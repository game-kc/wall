import { describe, expect, test } from 'vitest';
import { requiredXp } from '../src/core/experience';

describe('requiredXp', () => {
  test('레벨별 기준 XP', () => {
    expect(requiredXp(1)).toBe(1500);
    expect(requiredXp(16)).toBe(4500);
    expect(requiredXp(24)).toBe(6100);
    expect(requiredXp(75)).toBe(16300);
  });
});
