import { describe, expect, test } from 'vitest';
import { createEditedBank, verifyGeneratedBank } from '../src/core/edit-bank';
import { readFixtureText } from './fixture-loader';

describe('edit-bank', () => {
  const synthetic = readFixtureText('fixtures/public/UnlimitedSuviveWall.synthetic.SC2Bank');

  test('edit to level 24 xp 3900', async () => {
    const result = await createEditedBank({
      originalXml: synthetic,
      edits: {
        level: 24,
        currentXp: 3900,
        playCount: 39,
        clearCount: 11,
      },
    });
    const second = await verifyGeneratedBank(result.xml);
    expect(result.after.ps).toBe(30_180_267);
    expect(result.after.signature).toBe('6F0F7EC27E8FEC10E691BA2B84A6A126DBEDF65B');
    expect(second.valid).toBe(true);
  });

  test('edit to level 24 xp 0', async () => {
    const result = await createEditedBank({
      originalXml: synthetic,
      edits: {
        level: 24,
        currentXp: 0,
        playCount: 39,
        clearCount: 11,
      },
    });
    const second = await verifyGeneratedBank(result.xml);
    expect(result.after.ps).toBe(30_180_205);
    expect(result.after.signature).toBe('C6E6F8D1D8AABFEAFA1A22AF1D5515C54E2397BA');
    expect(second.valid).toBe(true);
  });
});
