#!/usr/bin/env node
// Детерминированная проверка file-based backlog (docs/ui-system).
// Используется ночным конвейером (.zcode/workflows/night-cycle.dwf.ts, gate)
// и CI (.github/workflows/nightly.yml). Node, без зависимостей.
// История: bash-версия (tools/validate-backlog.sh) на машине владельца падала —
// спавн bash вне Git Bash уходил в WSL-релей; порт на node решает это везде.
// Выход: отчёт в stdout + код 0 (чисто) / 1 (есть проблемы).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ui = join(root, 'docs', 'ui-system');
let problems = 0;
const report = (m) => {
  console.log(m);
  problems += 1;
};

function walk(dir, filter, acc = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, filter, acc);
    else if (filter(e.name)) acc.push(p);
  }
  return acc;
}

console.log('== COUNTS ==');
const taskFiles = walk(join(ui, 'epics'), (n) => n.startsWith('T') && n.endsWith('.md'));
const epicDirNames = readdirSync(join(ui, 'epics'), { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name);
const epicReadmes = epicDirNames.filter((n) => existsSync(join(ui, 'epics', n, 'README.md')));
console.log(`task files: ${taskFiles.length}`);
console.log(`epic dirs:  ${epicDirNames.length}`);
console.log(`epic READMEs: ${epicReadmes.length}`);

console.log('== MISSING SECTIONS ==');
const REQUIRED = [
  '## Epic',
  '## Priority',
  '## Type',
  '## Goal',
  '## Context',
  '## Scope',
  '## Acceptance Criteria',
  '## Dependencies',
  '## Definition of Done',
  '## Complexity',
];
for (const f of taskFiles) {
  const text = readFileSync(f, 'utf8');
  for (const s of REQUIRED) if (!text.includes(s)) report(`MISSING SECTION: ${f} -> ${s}`);
}

console.log('== LINK CHECK ==');
const docsMd = walk(join(root, 'docs'), (n) => n.endsWith('.md'));
let broken = 0;
for (const f of docsMd) {
  const text = readFileSync(f, 'utf8');
  for (const m of text.matchAll(/\]\(([^)#]+\.md)\)/g)) {
    if (!existsSync(join(dirname(f), m[1]))) {
      console.log(`BROKEN LINK: ${f} -> ${m[1]}`);
      broken += 1;
    }
  }
}
problems += broken;

console.log('== ORPHAN CHECK ==');
for (const f of taskFiles) {
  const readmePath = join(dirname(f), 'README.md');
  if (!readFileSync(readmePath, 'utf8').includes(basename(f))) {
    report(`ORPHAN TASK: ${f} not listed in ${readmePath}`);
  }
}

console.log('== SUMMARY ==');
console.log(`broken links: ${broken}`);
if (problems === 0) {
  console.log('RESULT: clean');
  process.exit(0);
}
console.log('RESULT: problems found');
process.exit(1);
