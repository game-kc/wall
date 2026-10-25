import { describe, expect, test } from 'vitest';
import { parseBankXml, readBankValues, validateTargetBank } from '../src/core/xml-parser';
import { readFixtureText } from './fixture-loader';
import { verifyGeneratedBank } from '../src/core/edit-bank';

describe('parser', () => {
  test('synthetic fixture parse', async () => {
    const fixture = readFixtureText('fixtures/public/UnlimitedSuviveWall.synthetic.SC2Bank');
    const parsed = parseBankXml(fixture);
    const validation = validateTargetBank(parsed);
    expect(validation.valid).toBe(true);
    const values = readBankValues(parsed);
    expect(values.Data1).toBe(16);
    expect(values.Data2).toBe(3900);
    expect(values.PS).toBe(20_120_278);
  });

  test('verify generated bank', async () => {
    const fixture = readFixtureText('fixtures/public/UnlimitedSuviveWall.synthetic.SC2Bank');
    const result = await verifyGeneratedBank(fixture);
    expect(result.valid).toBe(true);
    expect(result.summary.psValid).toBe(true);
    expect(result.summary.signatureValid).toBe(true);
  });
});
