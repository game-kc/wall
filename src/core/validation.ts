import { BankEditorError } from './errors';
import { BankValues, EditableProgress, ValidationResult } from './model';
import { MAP_CONFIG } from './config';
import { requiredXp } from './experience';

export function calculateRequiredCountDiagnostics(
  requiredKeys: string[],
  counts: Map<string, number>,
): { code: string; message: string }[] {
  const diagnostics: { code: string; message: string }[] = [];

  for (const key of requiredKeys) {
    const count = counts.get(key) ?? 0;
    if (count === 0) {
      diagnostics.push({ code: 'MISSING_KEY', message: `필수 키 누락: ${key}` });
    } else if (count > 1) {
      diagnostics.push({ code: 'DUPLICATE_KEY', message: `중복 키: ${key}` });
    }
  }

  return diagnostics;
}

export function validateEditableProgressValues(values: EditableProgress): ValidationResult {
  const diagnostics: { code: string; message: string }[] = [];

  if (!Number.isInteger(values.level)) {
    diagnostics.push({ code: 'INVALID_LEVEL_TYPE', message: '레벨은 정수여야 합니다.' });
  } else if (values.level < MAP_CONFIG.minLevel || values.level > MAP_CONFIG.maxLevel) {
    diagnostics.push({ code: 'INVALID_LEVEL_RANGE', message: '레벨이 허용 범위를 벗어났습니다.' });
  }

  const required = requiredXp(values.level);

  if (!Number.isInteger(values.currentXp)) {
    diagnostics.push({ code: 'INVALID_XP_TYPE', message: '경험치는 정수여야 합니다.' });
  } else if (values.currentXp < 0 || values.currentXp >= required) {
    diagnostics.push({
      code: 'INVALID_XP_RANGE',
      message: `현재 레벨 경험치는 0 이상 ${required - 1} 이하만 가능합니다.`,
    });
  }

  if (!Number.isInteger(values.playCount) || values.playCount < 0 || values.playCount > 2_147_483_647) {
    diagnostics.push({ code: 'INVALID_PLAY_COUNT', message: '플레이 횟수 범위를 벗어났습니다.' });
  }

  if (
    !Number.isInteger(values.clearCount) ||
    values.clearCount < 0 ||
    values.clearCount > values.playCount
  ) {
    diagnostics.push({
      code: 'INVALID_CLEAR_COUNT',
      message: '클리어 횟수는 0 이상 플레이 횟수 이하여야 합니다.',
    });
  }

  return { valid: diagnostics.length === 0, diagnostics };
}

export function validateValuesAreInteger(values: BankValues): ValidationResult {
  const diagnostics: { code: string; message: string }[] = [];
  for (const [key, value] of Object.entries(values) as [keyof BankValues, number][]) {
    if (!Number.isSafeInteger(value)) {
      diagnostics.push({ code: 'NON_SAFE_INTEGER', message: `${key}는 안전한 정수여야 합니다.` });
    }
  }

  return { valid: diagnostics.length === 0, diagnostics };
}

export function assertBankValueInvariants(values: BankValues): void {
  if (values.Data6 !== MAP_CONFIG.codecVersion) {
    throw new BankEditorError('코덱 버전이 13이 아닙니다.', 'INVALID_CODEC_VERSION');
  }

  const result = validateEditableProgressValues({
    level: values.Data1,
    currentXp: values.Data2,
    playCount: values.Data4,
    clearCount: values.Data5,
  });
  if (!result.valid) {
    throw new BankEditorError(result.diagnostics.map((diag) => diag.message).join(' '), 'INVALID_BANK_VALUES');
  }
}
