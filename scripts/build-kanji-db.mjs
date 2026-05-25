#!/usr/bin/env node
// Offline generator for the prebuilt kanji-seed database (kanjiseed.db).
//
// The native Android app loaded assets/kanji.json into the Kanji table on first run
// (lib/AssetLoader.kt). The first port (src/data/seed.ts) did the same by require()-ing
// kanji.json — which inlines ~4 MB of JSON into the JS bundle. Like reference.db and
// strokes.db, we move that data into a compact SQLite file built once here; seed.ts then
// copies it into the main DB on first run (via ATTACH) and discards it.
//
// Output schema mirrors the Kanji table in src/data/db.ts exactly. The meanings/on/kun
// arrays are pre-joined into comma-separated strings here — the same transform seed.ts
// used to do at runtime — so the copy into the main DB is a plain INSERT … SELECT.
//
// Usage:
//   node scripts/build-kanji-db.mjs [--src <kanji.json>] [--out <path>]
//
// Requires: Node >= 22 (node:sqlite). No network access — reads the local kanji.json.

import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {
    src: path.join(repoRoot, 'assets', 'data', 'kanji.json'),
    out: path.join(repoRoot, 'assets', 'data', 'kanjiseed.db'),
  };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--src') out.src = path.resolve(args[++i]);
    else if (args[i] === '--out') out.out = path.resolve(args[++i]);
    else throw new Error(`Unknown arg: ${args[i]}`);
  }
  return out;
}

// Matches the runtime Kanji table (src/data/db.ts). "on" is quoted (SQLite keyword).
const SCHEMA = `
CREATE TABLE Kanji (
  character TEXT PRIMARY KEY NOT NULL,
  strokes INTEGER NOT NULL,
  grade INTEGER NOT NULL,
  frequency INTEGER NOT NULL,
  jlpt INTEGER NOT NULL,
  meanings TEXT NOT NULL,
  "on" TEXT NOT NULL,
  kun TEXT NOT NULL
);
`;

function main() {
  const { src, out } = parseArgs();
  if (!fs.existsSync(src)) {
    throw new Error(`kanji.json not found: ${src}\nPass --src <path> pointing at kanji.json.`);
  }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  for (const ext of ['', '-wal', '-shm']) {
    if (fs.existsSync(out + ext)) fs.rmSync(out + ext);
  }

  const data = JSON.parse(fs.readFileSync(src, 'utf8'));
  console.log(`Reading ${data.length.toLocaleString()} kanji from ${src}`);

  const db = new DatabaseSync(out);
  db.exec('PRAGMA journal_mode = OFF; PRAGMA synchronous = OFF;');
  db.exec(SCHEMA);
  // Same column order seed.ts copies with; arrays pre-joined exactly as seed.ts did.
  const insert = db.prepare(
    `INSERT OR IGNORE INTO Kanji (character, strokes, grade, frequency, jlpt, meanings, "on", kun)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  let rows = 0;
  db.exec('BEGIN');
  for (const k of data) {
    insert.run(
      k.character,
      k.strokes,
      k.grade,
      k.frequency,
      k.jlpt,
      (k.meanings ?? []).join(', '),
      (k.on ?? []).join(', '),
      (k.kun ?? []).join(', '),
    );
    rows++;
  }
  db.exec('COMMIT');
  db.exec('VACUUM');
  db.close();

  const mb = (fs.statSync(out).size / (1024 * 1024)).toFixed(1);
  console.log(`\nDone. ${out} = ${mb} MB (${rows.toLocaleString()} kanji)`);
}

main();
