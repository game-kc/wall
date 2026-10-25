const DECIMAL_INTEGER_RE = /^-?\d+$/;

export function parseStrictDecimalInteger(value: string, field = 'value'): number {
  if (typeof value !== 'string') {
    throw new RangeError(`${field}: 값은 문자열이어야 합니다.`);
  }

  if (!DECIMAL_INTEGER_RE.test(value)) {
    throw new RangeError(`${field}: 엄격한 10진 정수 형식이 아닙니다.`);
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || String(parsed) !== value) {
    throw new RangeError(`${field}: 정수로 파싱할 수 없습니다.`);
  }

  return parsed;
}

export function parsePositiveStrictDecimalInteger(value: string, field: string): number {
  const parsed = parseStrictDecimalInteger(value, field);
  if (parsed < 0) {
    throw new RangeError(`${field}: 0 이상의 정수여야 합니다.`);
  }
  return parsed;
}
