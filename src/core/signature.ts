import { BankEditorError } from './errors';
import { BankSectionNode } from './model';

export function compareOrdinal(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function buildSignaturePayload(params: {
  authorId: string;
  userId: string;
  bankName: string;
  sections: readonly BankSectionNode[];
}): string {
  let payload = `${params.authorId}${params.userId}${params.bankName}`;

  const sections = [...params.sections].sort((left, right) => compareOrdinal(left.name, right.name));
  for (const section of sections) {
    payload += section.name;

    const keys = [...section.keys].sort((left, right) => compareOrdinal(left.name, right.name));
    for (const key of keys) {
      payload += key.name;
      payload += 'Value';
      payload += key.value.type;
      payload += key.value.value;
    }
  }

  return payload;
}

async function getSubtleCrypto(): Promise<SubtleCrypto> {
  if (globalThis.crypto?.subtle) {
    return globalThis.crypto.subtle;
  }

  const nodeCrypto = await import('node:crypto');
  if (!nodeCrypto.webcrypto?.subtle) {
    throw new BankEditorError(
      '이 환경에서는 SHA-1 계산용 SubtleCrypto를 사용할 수 없습니다.',
      'NO_CRYPTO',
    );
  }

  return nodeCrypto.webcrypto.subtle as SubtleCrypto;
}

export async function sha1UpperHex(payload: string): Promise<string> {
  const subtle = await getSubtleCrypto();
  const bytes = new TextEncoder().encode(payload);
  const digest = await subtle.digest('SHA-1', bytes);
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

export async function calculateBankSignature(params: {
  authorId: string;
  userId: string;
  bankName: string;
  sections: readonly BankSectionNode[];
}): Promise<string> {
  const payload = buildSignaturePayload(params);
  return sha1UpperHex(payload);
}
