#!/usr/bin/env node
/**
 * The additive gate (DCCG-002).
 *
 * Everything under gaps/ is add-only: any diff line that modifies, deletes,
 * renames, or copies an existing file under gaps/ fails the gate. This is
 * what makes invariants 1–3 structural rather than aspirational.
 *
 * Usage: node scripts/gate.mjs <base-sha> <head-sha>
 * A zero base (branch creation / first push) diffs against the empty tree.
 */
import { execFileSync } from 'node:child_process';

const EMPTY_TREE = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';
const [base, head] = process.argv.slice(2);

if (!head) {
  console.error('usage: gate.mjs <base-sha> <head-sha>');
  process.exit(2);
}

const from = !base || /^0+$/.test(base) ? EMPTY_TREE : base;

const diff = execFileSync(
  'git',
  ['diff', '--name-status', '--no-renames', `${from}..${head}`],
  { encoding: 'utf8' }
);

const violations = [];
for (const line of diff.split('\n')) {
  if (!line.trim()) continue;
  const [status, ...paths] = line.split('\t');
  const path = paths[paths.length - 1];
  if (!path.startsWith('gaps/')) continue;
  if (status !== 'A') {
    violations.push({ status, path });
  }
}

if (violations.length > 0) {
  console.error('GATE FAILED — the Record is append-only.\n');
  for (const v of violations) {
    const verb =
      v.status === 'M' ? 'modified' : v.status === 'D' ? 'deleted' : `changed (${v.status})`;
    console.error(`  ${v.path} was ${verb}. Files under gaps/ are only ever added.`);
  }
  console.error(
    '\nA gap closes by gaining an event file. A motion changes by gaining a new' +
      '\nversion file. Nothing is edited, nothing is removed. If you believe this' +
      '\ncheck is wrong, stop and read SCHEMA.md and the build spec §0 — do not' +
      '\nwork around it.'
  );
  process.exit(1);
}

console.log(`gate: OK — ${from === EMPTY_TREE ? 'initial tree' : from.slice(0, 7)}..${head.slice(0, 7)} adds only under gaps/`);
