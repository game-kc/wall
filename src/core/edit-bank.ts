import { BankEditorError } from './errors';
import { MAP_CONFIG } from './config';
import { requiredXp } from './experience';
import { decodeUserId } from './handle-codec';
import { calculatePsV13 } from './ps-v13';
import { calculateBankSignature } from './signature';
import { parseBankXml, readBankValues, validateTargetBank } from './xml-parser';
import { serializeBankXml } from './xml-serializer';
import {
  BankSummary,
  Diagnostic,
  EditableProgress,
  EditedBankResult,
  FieldChange,
  ParsedBankDocument,
} from './model';
import { assertBankValueInvariants, validateEditableProgressValues, validateValuesAreInteger } from './validation';

type EditableKey = 'Data1' | 'Data2' | 'Data4' | 'Data5' | 'PS';

function getValueElement(parsed: ParsedBankDocument, key: EditableKey): Element {
  const element = parsed.dataKeyValueElements.get(key);
  if (!element) {
    throw new BankEditorError(`${key} 요소를 찾을 수 없습니다.`, 'MISSING_KEY_ELEMENT');
  }
  return element;
}

function setIntValue(parsed: ParsedBankDocument, key: EditableKey, value: number): void {
  getValueElement(parsed, key).setAttribute('int', String(value));
}

function snapshotSectionsFromDocument(
  document: XMLDocument,
): readonly { name: string; keys: { name: string; value: { type: string; value: string } }[] }[] {
  const bankElement = document.documentElement;
  const sectionElements = Array.from(bankElement.children).filter((element) => element.tagName === 'Section');

  return sectionElements.map((section) => {
    const keys = Array.from(section.children)
      .filter((element) => element.tagName === 'Key')
      .map((keyElement) => {
        const keyName = keyElement.getAttribute('name');
        if (!keyName) {
          throw new BankEditorError('Key name이 비어 있습니다.', 'INVALID_KEY_NAME');
        }

        const valueElements = Array.from(keyElement.children).filter((element) => element.tagName === 'Value');
        if (valueElements.length !== 1) {
          throw new BankEditorError(
            `Key ${keyName}에는 Value가 정확히 1개 있어야 합니다.`,
            'INVALID_KEY_VALUE_COUNT',
          );
        }

        const valueElement = valueElements[0]!;
        const attrs = Array.from(valueElement.attributes);
        if (attrs.length !== 1) {
          throw new BankEditorError(
            `Key ${keyName}의 Value 속성은 정확히 1개여야 합니다.`,
            'INVALID_VALUE_ATTRIBUTE',
          );
        }

        return {
          name: keyName,
          value: {
            type: attrs[0]!.name,
            value: attrs[0]!.value,
          },
        };
      });

    const name = section.getAttribute('name');
    if (!name) {
      throw new BankEditorError('Section name이 없습니다.', 'INVALID_SECTION_NAME');
    }

    return { name, keys };
  });
}

async function computeSignature(parsed: ParsedBankDocument): Promise<string> {
  const values = readBankValues(parsed);
  const userId = decodeUserId(values);

  return calculateBankSignature({
    authorId: MAP_CONFIG.authorId,
    userId,
    bankName: MAP_CONFIG.bankName,
    sections: snapshotSectionsFromDocument(parsed.document),
  });
}

async function summaryFromParsed(parsed: ParsedBankDocument): Promise<BankSummary> {
  const values = readBankValues(parsed);
  const expectedPs = calculatePsV13({
    Data1: values.Data1,
    Data2: values.Data2,
    Data3: values.Data3,
    Data4: values.Data4,
    Data5: values.Data5,
    Data6: values.Data6,
    Data7: values.Data7,
    Data8: values.Data8,
    Data9: values.Data9,
    Data10: values.Data10,
    Data11: values.Data11,
    Data12: values.Data12,
  });
  const expectedSig = await computeSignature(parsed);
  const signature = parsed.signatureElement.getAttribute('value') ?? '';

  return {
    level: values.Data1,
    currentXp: values.Data2,
    playCount: values.Data4,
    clearCount: values.Data5,
    userId: decodeUserId(values),
    codecVersion: values.Data6,
    requiredXp: requiredXp(values.Data1),
    ps: values.PS,
    signature,
    psValid: values.PS === expectedPs,
    signatureValid: signature.toUpperCase() === expectedSig.toUpperCase(),
  };
}

function buildChanges(before: BankSummary, after: BankSummary): FieldChange[] {
  return [
    { field: 'level', before: before.level, after: after.level },
    { field: 'currentXp', before: before.currentXp, after: after.currentXp },
    { field: 'playCount', before: before.playCount, after: after.playCount },
    { field: 'clearCount', before: before.clearCount, after: after.clearCount },
    { field: 'PS', before: before.ps, after: after.ps },
    { field: 'Signature', before: before.signature, after: after.signature },
  ];
}

export async function verifyGeneratedBank(xml: string): Promise<{
  valid: boolean;
  diagnostics: readonly Diagnostic[];
  summary: BankSummary;
}> {
  const parsed = parseBankXml(xml);
  const structure = validateTargetBank(parsed);
  const diagnostics: Diagnostic[] = [...structure.diagnostics];

  if (!diagnostics.length) {
    const values = readBankValues(parsed);
    const valueCheck = validateValuesAreInteger(values);
    diagnostics.push(...valueCheck.diagnostics);
  }

  const summary = await summaryFromParsed(parsed);
  const values = readBankValues(parsed);

  if (!diagnostics.length) {
    const expectedPs = calculatePsV13({
      Data1: values.Data1,
      Data2: values.Data2,
      Data3: values.Data3,
      Data4: values.Data4,
      Data5: values.Data5,
      Data6: values.Data6,
      Data7: values.Data7,
      Data8: values.Data8,
      Data9: values.Data9,
      Data10: values.Data10,
      Data11: values.Data11,
      Data12: values.Data12,
    });
    const expectedSig = await computeSignature(parsed);

    if (values.PS !== expectedPs) {
      diagnostics.push({ code: 'PS_MISMATCH', message: 'PS 검증에 실패했습니다.' });
    }
    if (summary.signature.toUpperCase() !== expectedSig.toUpperCase()) {
      console.error('[SC2Bank] signature mismatch', {
        actual: summary.signature,
        expected: expectedSig,
        level: values.Data1,
        playCount: values.Data4,
        clearCount: values.Data5,
      });
      diagnostics.push({ code: 'SIGNATURE_MISMATCH', message: 'Signature 검증에 실패했습니다.' });
    }
  }

  return {
    valid: diagnostics.length === 0,
    diagnostics,
    summary,
  };
}

export async function createEditedBank(params: {
  originalXml: string;
  edits: EditableProgress;
}): Promise<EditedBankResult> {
  const parsed = parseBankXml(params.originalXml);
  const baseValidation = validateTargetBank(parsed);
  if (!baseValidation.valid) {
    console.error('[SC2Bank] invalid source bank', {
      file: 'params.originalXml',
      diagnostics: baseValidation.diagnostics,
    });
    throw new BankEditorError(
      `원본 Bank 구조가 유효하지 않습니다: ${baseValidation.diagnostics.map((d) => d.message).join(' / ')}`,
      'INVALID_SOURCE_BANK',
    );
  }

  const originalValues = readBankValues(parsed);
  if (!validateValuesAreInteger(originalValues).valid) {
    throw new BankEditorError('원본 값에 정수형 문제가 있습니다.', 'INVALID_ORIGINAL_VALUES');
  }
  assertBankValueInvariants(originalValues);

  const originalSignatureExpected = await computeSignature(parsed);
  const originalSignatureActual = (parsed.signatureElement.getAttribute('value') ?? '').toUpperCase();
  const originalPsExpected = calculatePsV13({
    Data1: originalValues.Data1,
    Data2: originalValues.Data2,
    Data3: originalValues.Data3,
    Data4: originalValues.Data4,
    Data5: originalValues.Data5,
    Data6: originalValues.Data6,
    Data7: originalValues.Data7,
    Data8: originalValues.Data8,
    Data9: originalValues.Data9,
    Data10: originalValues.Data10,
    Data11: originalValues.Data11,
    Data12: originalValues.Data12,
  });
  if (originalValues.PS !== originalPsExpected) {
    console.error('[SC2Bank] invalid original PS', {
      expected: originalPsExpected,
      actual: originalValues.PS,
      values: originalValues,
    });
    throw new BankEditorError(
      `원본 PS 불일치: expected=${originalPsExpected}, actual=${originalValues.PS}`,
      'INVALID_ORIGINAL_PS',
    );
  }
  if (originalSignatureActual !== originalSignatureExpected.toUpperCase()) {
    console.error('[SC2Bank] original signature mismatch', {
      expected: originalSignatureExpected.toUpperCase(),
      actual: originalSignatureActual,
    });
    throw new BankEditorError('원본 Signature 불일치', 'INVALID_ORIGINAL_SIGNATURE');
  }

  const editsValidation = validateEditableProgressValues(params.edits);
  if (!editsValidation.valid) {
    throw new BankEditorError(
      `편집 입력 오류: ${editsValidation.diagnostics.map((item) => item.message).join(' / ')}`,
      'INVALID_EDIT',
    );
  }

  const before = await summaryFromParsed(parsed);

  setIntValue(parsed, 'Data1', params.edits.level);
  setIntValue(parsed, 'Data2', params.edits.currentXp);
  setIntValue(parsed, 'Data4', params.edits.playCount);
  setIntValue(parsed, 'Data5', params.edits.clearCount);

  const editedValues = readBankValues(parsed);
  const nextPs = calculatePsV13({
    Data1: editedValues.Data1,
    Data2: editedValues.Data2,
    Data3: editedValues.Data3,
    Data4: editedValues.Data4,
    Data5: editedValues.Data5,
    Data6: editedValues.Data6,
    Data7: editedValues.Data7,
    Data8: editedValues.Data8,
    Data9: editedValues.Data9,
    Data10: editedValues.Data10,
    Data11: editedValues.Data11,
    Data12: editedValues.Data12,
  });
  setIntValue(parsed, 'PS', nextPs);

  const nextSignature = await computeSignature(parsed);
  parsed.signatureElement.setAttribute('value', nextSignature);

  const xml = serializeBankXml(parsed.document);
  const verification = await verifyGeneratedBank(xml);
  if (!verification.valid) {
    console.error('[SC2Bank] generated bank invalid', {
      diagnostics: verification.diagnostics,
      xmlPreview: xml.slice(0, 180),
    });
    throw new BankEditorError(
      `생성본 검증 실패: ${verification.diagnostics.map((d) => d.message).join(' / ')}`,
      'GENERATED_BANK_INVALID',
    );
  }

  const after = await summaryFromParsed(parsed);
  return {
    xml,
    filename: `${MAP_CONFIG.bankName}.edited.SC2Bank`,
    before,
    after: {
      ...after,
      signatureValid: true,
    },
    changes: buildChanges(before, after),
  };
}
