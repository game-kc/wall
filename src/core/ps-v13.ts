import { BankEditorError } from './errors';

const GALAXY_FIXED_INTEGER_MASK = 0x000f_ffff;

export function galaxySquareRootIFromInt(value: number): number {
  if (!Number.isSafeInteger(value)) {
    throw new BankEditorError('SquareRootI 입력은 안전한 정수여야 합니다.', 'INVALID_SQUARE_ROOT_INPUT');
  }

  const wrapped = value & GALAXY_FIXED_INTEGER_MASK;
  if (!Number.isSafeInteger(wrapped)) {
    throw new BankEditorError('SquareRootI 입력 래핑 결과가 유효하지 않습니다.', 'INVALID_SQUARE_ROOT_INPUT');
  }

  return Math.floor(Math.sqrt(wrapped));
}

interface PsInputs {
  Data1: number;
  Data2: number;
  Data3: number;
  Data4: number;
  Data5: number;
  Data6: number;
  Data7: number;
  Data8: number;
  Data9: number;
  Data10: number;
  Data11: number;
  Data12: number;
}

export function calculatePsV13(values: PsInputs): number {
  const sr = galaxySquareRootIFromInt;

  let value = values.Data3;
  value += values.Data5;
  value += values.Data7;
  value += values.Data9;
  value += values.Data11;
  value *= values.Data1;

  value += sr(values.Data2);
  value += sr(values.Data4);
  value += values.Data6;
  value += sr(values.Data8);
  value += sr(values.Data10);
  value += sr(values.Data1);
  value += sr(value);
  value += sr(values.Data5);
  value += sr(values.Data7);
  value += sr(values.Data9);
  value += sr(values.Data11);
  value += sr(values.Data12);
  value += 5;
  value += values.Data12;

  if (!Number.isSafeInteger(value)) {
    throw new BankEditorError('PS 계산 결과가 안전한 정수 범위를 벗어났습니다.', 'PS_OUT_OF_SAFE_INTEGER');
  }

  return value;
}
