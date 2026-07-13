#!/usr/bin/env node
/**
 * Record schema validation (part of DCCG-003, the invariant harness).
 *
 * Checks, for every entity under gaps/:
 *  - key grammar and key/path agreement
 *  - gap.md has no state field (state is events — invariant 4 lives in the
 *    event enum, never a mutable field)
 *  - gap event types ∈ {minted, closed, dissolved, redirected}; seq gapless
 *  - motion event types ∈ the spec §5 set; seq gapless
 *  - motion versions carry no stored motion-level reversibility (invariant 7
 *    derives it) and no threshold/axis values (invariant 8 — nothing exists
 *    to snapshot yet; when it does, snapshots are added to NEW versions)
 *  - every gap has ≥1 motion (gaps are minted with motions, spec §2)
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.argv[2] || '.';
const GAPS = join(ROOT, 'gaps');
const GAP_EVENTS = new Set(['minted', 'closed', 'dissolved', 'redirected']);
const MOTION_EVENTS = new Set([
  'recorded', 'published', 'tabled', 'seconded', 'not_seconded', 'deferred',
  'withdrawn', 'carried', 'lost', 'enacted', 'reviewed', 'renewed',
  'reversed', 'superseded', 'sunset', 'terminated',
]);

const errors = [];
const fm = (file) => {
  const text = readFileSync(file, 'utf8');
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  // Minimal flat-ish YAML reading sufficient for our contract checks.
  const out = {};
  let currentKey = null;
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (kv) {
      currentKey = kv[1];
      out[currentKey] = kv[2].replace(/^['"]|['"]$/g, '');
    } else if (currentKey && /^\s/.test(line)) {
      out[currentKey] = (out[currentKey] || '') + '\n' + line.trim();
    }
  }
  out.__raw = m[1];
  return out;
};

if (!existsSync(GAPS)) {
  console.log('validate: no gaps/ directory — empty record, OK');
  process.exit(0);
}

const checkEvents = (dir, allowed, label) => {
  if (!existsSync(dir)) {
    errors.push(`${label}: missing events/ directory`);
    return;
  }
  const files = readdirSync(dir).filter((f) => f.endsWith('.md')).sort();
  if (files.length === 0) errors.push(`${label}: no events`);
  files.forEach((f, i) => {
    const meta = fm(join(dir, f));
    if (!meta) return errors.push(`${label}/${f}: no frontmatter`);
    const seq = parseInt(meta.seq, 10);
    if (seq !== i + 1) errors.push(`${label}/${f}: seq ${meta.seq}, expected ${i + 1} (gapless, ordered)`);
    if (!allowed.has(meta.type)) errors.push(`${label}/${f}: event type "${meta.type}" not in the ruled set`);
    if (!meta.date) errors.push(`${label}/${f}: missing date`);
    if (!meta.authority) errors.push(`${label}/${f}: missing authority`);
  });
};

for (const gapDir of readdirSync(GAPS).filter((d) => !d.startsWith('.'))) {
  if (!/^DCCG-\d{3}$/.test(gapDir)) {
    errors.push(`${gapDir}: gap directory does not match DCCG-NNN`);
    continue;
  }
  const base = join(GAPS, gapDir);
  const gapFile = join(base, 'gap.md');
  if (!existsSync(gapFile)) {
    errors.push(`${gapDir}: missing gap.md`);
    continue;
  }
  const gap = fm(gapFile);
  if (!gap) { errors.push(`${gapDir}/gap.md: no frontmatter`); continue; }
  if (gap.key !== gapDir) errors.push(`${gapDir}/gap.md: key "${gap.key}" disagrees with path`);
  if (!gap.statement) errors.push(`${gapDir}/gap.md: missing statement`);
  if ('state' in gap) errors.push(`${gapDir}/gap.md: holds a state field — state is events, never a field`);
  if (!['minutes', 'instrument'].includes(gap.provenance)) errors.push(`${gapDir}/gap.md: provenance must be minutes|instrument`);

  checkEvents(join(base, 'events'), GAP_EVENTS, `${gapDir}/events`);

  const motionsDir = join(base, 'motions');
  const motions = existsSync(motionsDir)
    ? readdirSync(motionsDir).filter((d) => /^\d+$/.test(d)).sort((a, b) => a - b)
    : [];
  if (motions.length === 0) errors.push(`${gapDir}: no motions — gaps are minted with motions (spec §2)`);

  motions.forEach((m, i) => {
    if (parseInt(m, 10) !== i + 1) errors.push(`${gapDir}/motions/${m}: motion numbers must be 1..n gapless`);
    const vDir = join(motionsDir, m, 'versions');
    const versions = existsSync(vDir) ? readdirSync(vDir).filter((f) => /^v\d+\.md$/.test(f)).sort() : [];
    if (versions.length === 0) errors.push(`${gapDir}/motions/${m}: no versions`);
    versions.forEach((vf, vi) => {
      const v = fm(join(vDir, vf));
      if (!v) return errors.push(`${gapDir}/motions/${m}/versions/${vf}: no frontmatter`);
      if (v.key !== `${gapDir}.${m}`) errors.push(`${gapDir}/motions/${m}/versions/${vf}: key "${v.key}" disagrees with path`);
      if (parseInt(v.version, 10) !== vi + 1) errors.push(`${gapDir}/motions/${m}/versions/${vf}: version number/path mismatch`);
      if (/^(irreversible|reversible|reversibility):/m.test(v.__raw.replace(/^\s+.*$/gm, ''))) {
        errors.push(`${gapDir}/motions/${m}/versions/${vf}: stores motion-level reversibility — it must DERIVE from planks (invariant 7)`);
      }
      if (/threshold|axis|axes|majority/i.test(v.__raw)) {
        errors.push(`${gapDir}/motions/${m}/versions/${vf}: carries threshold/axis data — the constitution holds none yet; nothing may be snapshotted or invented (invariants 8, 9)`);
      }
    });
    checkEvents(join(motionsDir, m, 'events'), MOTION_EVENTS, `${gapDir}/motions/${m}/events`);
  });
}

if (errors.length) {
  console.error(`validate: ${errors.length} problem(s)\n`);
  for (const e of errors) console.error('  ' + e);
  process.exit(1);
}
console.log('validate: OK — record conforms to SCHEMA.md');
