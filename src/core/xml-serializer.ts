import { BankEditorError } from './errors';

export function serializeBankXml(document: XMLDocument): string {
  const serializer = new XMLSerializer();
  const text = serializer.serializeToString(document);
  const trimmed = text.trim();

  if (trimmed.startsWith('<?xml')) {
    return trimmed;
  }

  return '<?xml version="1.0" encoding="utf-8"?>\n' + text;
}

export function downloadTextFile(params: { text: string; filename: string }): void {
  if (typeof document === 'undefined') {
    throw new BankEditorError('브라우저 환경에서만 파일 다운로드가 가능합니다.', 'DOWNLOAD_NOT_AVAILABLE');
  }

  const blob = new Blob([params.text], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  try {
    anchor.href = url;
    anchor.download = params.filename;
    anchor.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}
