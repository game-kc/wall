export class BankEditorError extends Error {
  public readonly code: string;

  public constructor(message: string, code = 'BANK_EDITOR_ERROR') {
    super(message);
    this.name = 'BankEditorError';
    this.code = code;
  }
}

export function isBankEditorError(error: unknown): error is BankEditorError {
  return error instanceof BankEditorError;
}
