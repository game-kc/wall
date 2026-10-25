import './style.css';
import { appMarkup } from './view';
import { MAP_CONFIG, createEditedBank, parseBankXml, readBankValues, verifyGeneratedBank, requiredXp, parseStrictDecimalInteger, validateEditableProgressValues, downloadTextFile } from './core';
import type { BankSummary, EditableProgress, EditedBankResult } from './core';

const root = document.querySelector<HTMLElement>('#app')!;
root.innerHTML = appMarkup;
const el = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const fields = ['level', 'currentXp', 'playCount', 'clearCount'] as const;
let current: { filename: string; xml: string; summary: BankSummary } | null = null;
let result: EditedBankResult | null = null;
let generation = 0;
const error = (message = '') => { el('error').textContent = message; };
function pathHint() {
  const account = el<HTMLInputElement>('account').value.trim() || '[본인 Battle.net 계정 번호]';
  const handle = current?.summary.userId || '[뱅크 데이터의 핸들]';
  const filename = current?.filename || `${MAP_CONFIG.bankName}.SC2Bank`;
  el('path').textContent = `%USERPROFILE%\\Documents\\StarCraft II\\Accounts\\${account}\\${handle}\\Banks\\${MAP_CONFIG.authorId}\\${filename}`;
}
function showDetails() {
  const s = current!.summary;
  const details = el('details'); details.replaceChildren();
  for (const [key, value] of [['파일', current!.filename], ['계정', s.userId], ['코덱', s.codecVersion], ['PS', `${s.psValid ? '정상' : '오류'} (${s.ps})`], ['Signature', `${s.signatureValid ? '정상' : '오류'} (${s.signature})`]]) {
    const dt = document.createElement('dt'); const dd = document.createElement('dd'); dt.textContent = String(key); dd.textContent = String(value); details.append(dt, dd);
  }
}
function progress(): EditableProgress {
  return { level: parseStrictDecimalInteger(el<HTMLInputElement>('level').value, '레벨'), currentXp: parseStrictDecimalInteger(el<HTMLInputElement>('currentXp').value, '현재 경험치'), playCount: parseStrictDecimalInteger(el<HTMLInputElement>('playCount').value, '플레이 횟수'), clearCount: parseStrictDecimalInteger(el<HTMLInputElement>('clearCount').value, '클리어 횟수') };
}
function validate() {
  try {
    const values = progress(); const needed = requiredXp(values.level); const conflict = values.currentXp >= needed && values.level >= MAP_CONFIG.minLevel && values.level <= MAP_CONFIG.maxLevel;
    el('xp-label').firstChild!.textContent = `현재 경험치 (0~${needed - 1})`;
    el('conflict').hidden = !conflict; el('conflict-text').textContent = `레벨 ${values.level}의 경험치는 ${needed - 1} 이하여야 합니다.`;
    const diagnostics = validateEditableProgressValues(values).diagnostics.filter(d => !(conflict && d.code === 'INVALID_XP_RANGE'));
    el('validation').textContent = diagnostics.map(d => d.message).join(' / ');
  } catch { el('conflict').hidden = true; el('validation').textContent = '모든 값을 정수로 입력하세요.'; }
}
async function openFile(file: File) {
  const request = ++generation; error(); current = null; result = null; el('editor').hidden = true; el('review').hidden = true; el('diagnostics').hidden = true; pathHint();
  try {
    if (!file.name.toLowerCase().endsWith('.sc2bank')) throw new Error('확장자가 .SC2Bank인 파일만 처리됩니다.');
    if (!file.size || file.size > MAP_CONFIG.maxFileSizeBytes) throw new Error('파일은 비어 있지 않아야 하며 1MiB 이하여야 합니다.');
    const xml = await file.text(); const verification = await verifyGeneratedBank(xml);
    if (!verification.valid) throw new Error(`편집 불가: ${verification.diagnostics.map(d => d.message).join(' / ')}`);
    const values = readBankValues(parseBankXml(xml));
    if (request !== generation) return;
    current = { filename: file.name, xml, summary: { ...verification.summary, level: values.Data1, currentXp: values.Data2, playCount: values.Data4, clearCount: values.Data5 } };
    for (const field of fields) el<HTMLInputElement>(field).value = String(current.summary[field]);
    showDetails(); pathHint(); el('diagnostics').hidden = false; el('editor').hidden = false; validate();
  } catch (e) { if (request === generation) error(e instanceof Error ? e.message : '파일 처리 오류입니다.'); }
}
el<HTMLInputElement>('file').addEventListener('change', e => { const input = e.currentTarget as HTMLInputElement; if (input.files?.[0]) void openFile(input.files[0]); input.value = ''; });
const drop = el('drop'); drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('dragging'); }); drop.addEventListener('dragleave', () => drop.classList.remove('dragging')); drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('dragging'); if (e.dataTransfer?.files[0]) void openFile(e.dataTransfer.files[0]); });
el('account').addEventListener('input', pathHint);
for (const field of fields) el(field).addEventListener('input', validate);
el<HTMLFormElement>('form').addEventListener('submit', async e => {
  e.preventDefault(); if (!current) return;
  try {
    let values = progress(); const needed = requiredXp(values.level);
    if (values.currentXp >= needed) { const action = document.querySelector<HTMLInputElement>('input[name="xp-action"]:checked')?.value; if (!action) throw new Error('경험치 범위를 벗어났습니다. 처리 방법을 선택하세요.'); values = { ...values, currentXp: action === 'reset' ? 0 : needed - 1 }; }
    const validation = validateEditableProgressValues(values); if (!validation.valid) throw new Error(validation.diagnostics.map(d => d.message).join(' / '));
    const request = generation; const edited = await createEditedBank({ originalXml: current.xml, edits: values }); if (request !== generation) return;
    const filename = current.filename.replace(/\.edited\.sc2bank$/i, '.SC2Bank'); result = { ...edited, filename };
    const body = el('changes'); body.replaceChildren();
    for (const change of result.changes) { const tr = document.createElement('tr'); for (const value of [change.field, change.before, change.after]) { const td = document.createElement('td'); td.textContent = String(value); tr.append(td); } body.append(tr); }
    el('editor').hidden = true; el('review').hidden = false; error();
  } catch (e) { el('validation').textContent = e instanceof Error ? e.message : '수정본 생성 실패'; }
});
el('download').addEventListener('click', () => { if (result) downloadTextFile({ text: result.xml, filename: result.filename }); });
el('back').addEventListener('click', () => { if (result) void openFile(new File([result.xml], result.filename)); });
pathHint();

