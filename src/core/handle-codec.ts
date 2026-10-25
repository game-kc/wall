import { MAP_CONFIG } from './config';

export function xorHandlePart(value: number): number {
  return value ^ MAP_CONFIG.xorKey;
}

export function decodeUserId(values: Readonly<{
  Data3: number;
  Data7: number;
  Data8: number;
  Data9: number;
}>): string {
  const region = xorHandlePart(values.Data3);
  const product = xorHandlePart(values.Data7);
  const realm = xorHandlePart(values.Data8);
  const account = xorHandlePart(values.Data9);

  return `${region}-S${product}-${realm}-${account}`;
}
