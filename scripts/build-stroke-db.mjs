#!/usr/bin/env node
// Offline generator for the prebuilt stroke-order database (strokes.db).
//
// The native Android app bundled the full KanjiVG SVG set (~76 MB, 11,661 files) under
// app/src/main/assets/kanjivg/ and parsed each file at display time (StrokeOrderDiagram.kt).
// Rendering all that XML on-device in RN is wasteful, so — like reference.db — we extract
// just the stroke paths once here and ship a compact SQLite file.
//
// Only the base files (e.g. 04e00.svg) are read: StrokeOrderDiagram.kt only ever opens
// "kanjivg/<codepoint>.svg" with no variant suffix (-VtLst, -Kaisho, …), so the variants
// are never used. Parsing mirrors parseStrokes() exactly:
//   - match <path id="kvg:…-s<n>" … d="…">, sort by <n>, keep the `d` strings.
//
// Output schema (one row per kanji, keyed by the same zero-padded lowercase hex codepoint
// the runtime computes):
//   stroke(codepoint TEXT PRIMARY KEY, paths TEXT)   -- paths = JSON array of `d` strings
//
// Usage:
//   node scripts/build-stroke-db.mjs [--src <kanjivg dir>] [--out <path>]
//
// Requires: Node >= 22 (node:sqlite). No network access — reads local KanjiVG assets.

import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {
    src: path.resolve(repoRoot, '..', 'app', 'src', 'main', 'assets', 'kanjivg'),
    out: path.join(repoRoot, 'assets', 'data', 'strokes.db'),
  };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--src') out.src = path.resolve(args[++i]);
    else if (args[i] === '--out') out.out = path.resolve(args[++i]);
    else throw new Error(`Unknown arg: ${args[i]}`);
  }
  return out;
}

// Same extraction as StrokeOrderDiagram.parseStrokes(): pull each stroke's d attribute,
// ordered by its kvg:…-s<n> stroke number.
const STROKE_RE = /<path[^>]*id="kvg:[^"]*-s(\d+)"[^>]*d="([^"]+)"/g;

function parseStrokes(svg) {
  const strokes = [];
  let m;
  while ((m = STROKE_RE.exec(svg))) strokes.push([parseInt(m[1], 10), m[2]]);
  STROKE_RE.lastIndex = 0;
  strokes.sort((a, b) => a[0] - b[0]);
  return strokes.map((s) => s[1]);
}

const SCHEMA = `
CREATE TABLE stroke (
  codepoint TEXT PRIMARY KEY NOT NULL,
  paths TEXT NOT NULL
);
`;

function main() {
  const { src, out } = parseArgs();
  if (!fs.existsSync(src)) {
    throw new Error(
      `KanjiVG source dir not found: ${src}\n` +
        'Pass --src <dir> pointing at the KanjiVG SVG files (e.g. the native app\'s ' +
        'app/src/main/assets/kanjivg).',
    );
  }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  for (const ext of ['', '-wal', '-shm']) {
    if (fs.existsSync(out + ext)) fs.rmSync(out + ext);
  }

  // Base files only: <codepoint>.svg with no variant suffix.
  const files = fs.readdirSync(src).filter((f) => /^[0-9a-f]{5}\.svg$/.test(f));
  console.log(`Reading ${files.length.toLocaleString()} KanjiVG base files from ${src}`);

  const db = new DatabaseSync(out);
  db.exec('PRAGMA journal_mode = OFF; PRAGMA synchronous = OFF;');
  db.exec(SCHEMA);
  const insert = db.prepare('INSERT INTO stroke (codepoint, paths) VALUES (?, ?)');

  let kanji = 0;
  let totalStrokes = 0;
  db.exec('BEGIN');
  for (const f of files) {
    const paths = parseStrokes(fs.readFileSync(path.join(src, f), 'utf8'));
    if (paths.length === 0) continue;
    insert.run(f.replace('.svg', ''), JSON.stringify(paths));
    kanji++;
    totalStrokes += paths.length;
  }
  db.exec('COMMIT');
  db.exec('VACUUM');
  db.close();

  const mb = (fs.statSync(out).size / (1024 * 1024)).toFixed(1);
  console.log(`\nDone. ${out} = ${mb} MB (${kanji.toLocaleString()} kanji, ${totalStrokes.toLocaleString()} strokes)`);
}

main();
