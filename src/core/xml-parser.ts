import { BankEditorError } from './errors';
import { parseStrictDecimalInteger } from './strict-integer';
import { calculateRequiredCountDiagnostics } from './validation';
import { BankDataField, BankValues, ParsedBankDocument, ValidationResult } from './model';
import { MAP_CONFIG } from './config';

const BANK_DATA_KEY_SET = [
  'Data1',
  'Data2',
  'Data3',
  'Data4',
  'Data5',
  'Data6',
  'Data7',
  'Data8',
  'Data9',
  'Data10',
  'Data11',
  'Data12',
  'PS',
 ] as const satisfies readonly BankDataField[];

interface ParsedKeyEntry {
  name: string;
  valueType: string;
  value: string;
  valueElement: Element;
}

interface ParsedSectionEntry {
  name: string;
  keys: ParsedKeyEntry[];
  sectionElement: Element;
}

function ensureElement(node: Node | null, message: string): Element {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) {
    throw new BankEditorError(message, 'INVALID_NODE');
  }
  return node as Element;
}

function childElementNodes(element: Element): Element[] {
  return Array.from(element.childNodes).filter(
    (node): node is Element => node.nodeType === Node.ELEMENT_NODE,
  );
}

function parseSection(sectionElement: Element): ParsedSectionEntry {
  const name = sectionElement.getAttribute('name');
  if (!name) {
    throw new BankEditorError('Section name이 없습니다.', 'INVALID_SECTION_NAME');
  }

  const keys = childElementNodes(sectionElement).filter((node) => node.tagName === 'Key');
  const parsedKeys: ParsedKeyEntry[] = [];
  for (const key of keys) {
    const keyName = key.getAttribute('name');
    if (!keyName) {
      throw new BankEditorError('Key name이 비어 있습니다.', 'INVALID_KEY_NAME');
    }

    const valueNodes = childElementNodes(key).filter((node) => node.tagName === 'Value');
    if (valueNodes.length !== 1) {
      throw new BankEditorError(
        `Key ${keyName}에는 Value가 정확히 1개 있어야 합니다.`,
        'INVALID_KEY_VALUE_COUNT',
      );
    }

    const valueNode = valueNodes[0];
    const attrs = Array.from(valueNode.attributes);
    if (attrs.length !== 1) {
      throw new BankEditorError(
        `Key ${keyName}의 Value 속성은 정확히 1개여야 합니다.`,
        'INVALID_VALUE_ATTRIBUTE',
      );
    }

    parsedKeys.push({
      name: keyName,
      valueType: attrs[0].name,
      value: attrs[0].value,
      valueElement: valueNode,
    });
  }

  return { name, keys: parsedKeys, sectionElement };
}

export function parseBankXml(xml: string): ParsedBankDocument {
  if (!xml || !xml.trim()) {
    throw new BankEditorError('XML이 비어 있습니다.', 'EMPTY_XML');
  }

  const parser = new DOMParser();
  const document = parser.parseFromString(xml, 'application/xml');

  if (document.getElementsByTagName('parsererror').length > 0) {
    throw new BankEditorError('XML 파싱 실패', 'INVALID_XML');
  }

  const bankElement = ensureElement(document.documentElement, '최상위 요소가 없습니다.');
  if (bankElement.tagName !== 'Bank') {
    throw new BankEditorError('루트는 Bank여야 합니다.', 'INVALID_ROOT');
  }
  if (bankElement.getAttribute('version') !== '1') {
    throw new BankEditorError('Bank 버전이 1이 아닙니다.', 'UNSUPPORTED_VERSION');
  }

  const children = childElementNodes(bankElement);
  const sectionElements = children.filter((node) => node.tagName === 'Section');
  const signatureElements = children.filter((node) => node.tagName === 'Signature');

  if (signatureElements.length !== 1) {
    throw new BankEditorError('Signature는 정확히 1개여야 합니다.', 'INVALID_SIGNATURE_COUNT');
  }
  if (!sectionElements.length) {
    throw new BankEditorError('Section이 없습니다.', 'INVALID_SECTION_COUNT');
  }

  const parsedSections = sectionElements.map(parseSection);
  const dataSections = parsedSections.filter((section) => section.name === MAP_CONFIG.sectionName);
  if (dataSections.length !== 1) {
    throw new BankEditorError('Data section은 정확히 1개여야 합니다.', 'INVALID_DATA_SECTION_COUNT');
  }
  const dataSection = dataSections[0]!;
  const sectionKeys = new Map(dataSection.keys.map((key) => [key.name, key]));

  return {
    document,
    bankElement,
    dataSectionElement: dataSection.sectionElement,
    signatureElement: signatureElements[0]!,
    sections: parsedSections.map((section) => ({
      name: section.name,
      keys: section.keys.map((key) => ({
        name: key.name,
        value: { type: key.valueType, value: key.value },
      })),
    })),
    dataKeyValueElements: new Map(
      BANK_DATA_KEY_SET.flatMap((keyName) => {
        const key = sectionKeys.get(keyName);
        if (!key) return [];
        return [[keyName, key.valueElement] as const];
      }),
    ),
  };
}

export function readBankValues(parsed: ParsedBankDocument): BankValues {
  const entries = BANK_DATA_KEY_SET.map((keyName) => {
    const valueElement = parsed.dataKeyValueElements.get(keyName);
    if (!valueElement) {
      throw new BankEditorError(`${keyName} 값 노드를 찾을 수 없습니다.`, 'MISSING_REQUIRED_KEY');
    }

    if (valueElement.getAttribute('int') == null) {
      throw new BankEditorError(`${keyName}는 int 속성을 가져야 합니다.`, 'INVALID_VALUE_ATTRIBUTE');
    }

    const value = parseStrictDecimalInteger(valueElement.getAttribute('int')!, `Value@${keyName}`);
    return [keyName, value] as const;
  });

  const values = Object.fromEntries(entries) as Record<keyof BankValues, number>;
  return {
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
    PS: values.PS,
  };
}

export function validateTargetBank(parsed: ParsedBankDocument): ValidationResult {
  const diagnostics: { code: string; message: string }[] = [];

  const sectionCounts = new Map<string, number>();
  const dataSection = parsed.sections.find((section) => section.name === MAP_CONFIG.sectionName);
  if (!dataSection) {
    diagnostics.push({
      code: 'INVALID_DATA_SECTION_COUNT',
      message: 'Data section이 없습니다.',
    });
  } else {
    for (const key of dataSection.keys) {
      sectionCounts.set(key.name, (sectionCounts.get(key.name) ?? 0) + 1);
    }
    const countDiagnostics = calculateRequiredCountDiagnostics(Array.from(BANK_DATA_KEY_SET), sectionCounts);
    diagnostics.push(...countDiagnostics);
  }

  if ((parsed.bankElement.getAttribute('version') ?? '') !== '1') {
    diagnostics.push({
      code: 'UNSUPPORTED_VERSION',
      message: '지원되지 않는 Bank version입니다.',
    });
  }

  if (!parsed.signatureElement?.getAttribute('value')) {
    diagnostics.push({
      code: 'MISSING_SIGNATURE_VALUE',
      message: 'Signature@value가 비어 있습니다.',
    });
  }

  return { valid: diagnostics.length === 0, diagnostics };
}
