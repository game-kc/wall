import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

export function readFixtureText(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

export function readOptionalFixtureText(relativePath: string): string | null {
  const absolute = path.join(ROOT, relativePath);
  if (!fs.existsSync(absolute)) {
    return null;
  }
  return fs.readFileSync(absolute, 'utf8');
}
