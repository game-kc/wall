import { describe, expect, test } from 'vitest';
import { calculateBankSignature } from '../src/core/signature';
import { readFixtureText } from './fixture-loader';
import { parseBankXml, readBankValues } from '../src/core/xml-parser';
import { decodeUserId } from '../src/core/handle-codec';
import { MAP_CONFIG } from '../src/core/config';

describe('signature', () => {
  test('synthetic fixture signature 1', async () => {
    const fixture = readFixtureText('fixtures/public/UnlimitedSuviveWall.synthetic.SC2Bank');
    const parsed = parseBankXml(fixture);
    const values = readBankValues(parsed);
    const signature = await calculateBankSignature({
      authorId: MAP_CONFIG.authorId,
      userId: decodeUserId(values),
      bankName: MAP_CONFIG.bankName,
      sections: parsed.sections,
    });
    expect(signature).toBe('05ECA3F623714C0795ED0BFC43526B5CA909AA03');
  });
});
