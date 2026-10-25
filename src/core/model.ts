export interface BankSummary extends EditableProgress {
  userId: string;
  codecVersion: number;
  requiredXp: number;
  ps: number;
  signature: string;
  psValid: boolean;
  signatureValid: boolean;
}

export interface EditableProgress {
  level: number;
  currentXp: number;
  playCount: number;
  clearCount: number;
}

export interface BankValues {
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
  PS: number;
}

export type BankDataField = keyof BankValues;

export interface BankValueNode {
  type: string;
  value: string;
}

export interface BankKeyNode {
  name: string;
  value: BankValueNode;
}

export interface BankSectionNode {
  name: string;
  keys: readonly BankKeyNode[];
}

export interface ParsedBankDocument {
  document: XMLDocument;
  bankElement: Element;
  dataSectionElement: Element;
  signatureElement: Element;
  sections: readonly BankSectionNode[];
  dataKeyValueElements: ReadonlyMap<BankDataField, Element>;
}

export interface FieldChange {
  field: keyof EditableProgress | 'PS' | 'Signature';
  before: number | string;
  after: number | string;
}

export interface EditedBankResult {
  xml: string;
  filename: string;
  before: BankSummary;
  after: BankSummary;
  changes: readonly FieldChange[];
}

export interface Diagnostic {
  code: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  diagnostics: Diagnostic[];
}
