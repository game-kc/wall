import { BankEditorError } from './errors';
import { MAP_CONFIG } from './config';

export function requiredXp(level: number): number {
  if (!Number.isSafeInteger(level)) {
    throw new BankEditorError('레벨은 정수여야 합니다.', 'INVALID_LEVEL');
  }

  if (level < MAP_CONFIG.minLevel || level > MAP_CONFIG.maxLevel) {
    throw new BankEditorError('레벨은 1~75 범위를 넘어갈 수 없습니다.', 'OUT_OF_RANGE_LEVEL');
  }

  return 1500 + (level - 1) * 200;
}
