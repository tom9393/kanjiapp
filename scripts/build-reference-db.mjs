#!/usr/bin/env node
// Offline generator for the prebuilt reference database (reference.db).
//
// This replaces the native Android app's on-device ReferenceDataDownloader
// (setup/logic/ReferenceDataDownloader.kt). Instead of downloading ~22 MB of zips
// and stream-parsing ~170 MB of JSON on the phone (slow + OOM-prone in Hermes), we
// parse the datasets once here, on a dev machine, and ship the resulting SQLite file.
//
// Output schema mirrors the reference tables in src/data/db.ts exactly:
//   word, example_sentence, word_char_index, sentence_char_index (+ char indexes).
// Parsing rules mirror ReferenceDataDownloader.kt:
//   - JMdict: first kanji form (+ its `common`), first kana, first English gloss of the
//     first sense. Kana-only / non-kanji entries are skipped.
//   - Tatoeba: id + text (japanese) + translation (english); blank entries skipped.
//   - char-index keys are the distinct CJK ideographs (U+4E00..U+9FFF) — matching
//     Kotlin's `filter { it in '一'..'鿿' }`.
//
// Usage:
//   node --max-old-space-size=8192 scripts/build-reference-db.mjs [--out <path>] [--work <dir>]
//
// Requires: Node >= 22 (node:sqlite), the `unzip` CLI, and network access (first run).

import { DatabaseSync } from 'node:sqlite';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Update these when new dataset versions are released (see ReferenceDataDownloader.kt).
const JMDICT_URL =
  'https://github.com/scriptin/jmdict-simplified/releases/download/' +
  '3.6.1%2B20251229123436/jmdict-eng-3.6.1%2B20251229123436.json.zip';
const TATOEBA_URL =
  'https://github.com/mwhirls/tatoeba-json/releases/download/v0.0.52/jpn-eng-examples.zip';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { work: path.join(os.tmpdir(), 'kanjiapp-refdata'), out: path.join(repoRoot, 'assets', 'data', 'reference.db') };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--out') out.out = path.resolve(args[++i]);
    else if (args[i] === '--work') out.work = path.resolve(args[++i]);
    else throw new Error(`Unknown arg: ${args[i]}`);
  }
  return out;
}

async function ensureDownloaded(url, dest) {
  if (fs.existsSync(dest)) {
    console.log(`  ✓ already downloaded: ${path.basename(dest)}`);
    return;
  }
  console.log(`  ↓ downloading ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status}) for ${url}`);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

// Unzips the single JSON entry into <work>/<subdir>/ and returns its path.
function ensureUnzipped(zipPath, subdir, work) {
  const dir = path.join(work, subdir);
  fs.mkdirSync(dir, { recursive: true });
  let json = fs.readdirSync(dir).find((f) => f.endsWith('.json'));
  if (!json) {
    execSync(`unzip -o -q "${zipPath}" -d "${dir}"`);
    json = fs.readdirSync(dir).find((f) => f.endsWith('.json'));
  }
  if (!json) throw new Error(`No .json found in ${zipPath}`);
  return path.join(dir, json);
}

// Distinct CJK ideographs (U+4E00..U+9FFF), matching Kotlin's cjkChars().
function cjkChars(s) {
  const set = new Set();
  for (const ch of s) {
    const code = ch.codePointAt(0);
    if (code >= 0x4e00 && code <= 0x9fff) set.add(ch);
  }
  return set;
}

const SCHEMA = `
CREATE TABLE word (
  id INTEGER PRIMARY KEY NOT NULL,
  kanjiForm TEXT NOT NULL,
  kana TEXT NOT NULL,
  meaning TEXT NOT NULL,
  common INTEGER NOT NULL
);
CREATE TABLE example_sentence (
  id INTEGER PRIMARY KEY NOT NULL,
  japanese TEXT NOT NULL,
  english TEXT NOT NULL
);
-- No composite PRIMARY KEY here (unlike the Room schema): reference.db is read-only and
-- the repository only ever filters these by character, never by (id, character). Each
-- (id, char) pair is already unique by construction (distinct chars per id), so dropping
-- the implicit autoindex saves ~18 MB with no query impact.
CREATE TABLE word_char_index (
  wordId INTEGER NOT NULL,
  character TEXT NOT NULL
);
CREATE INDEX index_word_char_index_character ON word_char_index (character);
CREATE TABLE sentence_char_index (
  sentenceId INTEGER NOT NULL,
  character TEXT NOT NULL
);
CREATE INDEX index_sentence_char_index_character ON sentence_char_index (character);
`;

function buildWords(db, jmdictJson) {
  console.log('  parsing JMdict…');
  const data = JSON.parse(fs.readFileSync(jmdictJson, 'utf8'));
  const insertWord = db.prepare(
    'INSERT OR IGNORE INTO word (id, kanjiForm, kana, meaning, common) VALUES (?, ?, ?, ?, ?)',
  );
  const insertIndex = db.prepare(
    'INSERT INTO word_char_index (wordId, character) VALUES (?, ?)',
  );

  let words = 0;
  let indexes = 0;
  db.exec('BEGIN');
  for (const w of data.words) {
    const id = parseInt(w.id, 10);
    if (!Number.isFinite(id)) continue;

    const kanjiForm = w.kanji?.[0]?.text;
    const common = w.kanji?.[0]?.common ?? false;
    const kana = w.kana?.[0]?.text;

    let meaning = null;
    for (const g of w.sense?.[0]?.gloss ?? []) {
      if (g.lang === 'eng' && g.text != null) {
        meaning = g.text;
        break;
      }
    }

    if (!kanjiForm || !kana || meaning == null) continue;
    const chars = cjkChars(kanjiForm);
    if (chars.size === 0) continue;

    insertWord.run(id, kanjiForm, kana, meaning, common ? 1 : 0);
    words++;
    for (const ch of chars) {
      insertIndex.run(id, ch);
      indexes++;
    }
  }
  db.exec('COMMIT');
  console.log(`  ✓ ${words.toLocaleString()} words, ${indexes.toLocaleString()} index rows`);
}

function buildSentences(db, tatoebaJson) {
  console.log('  parsing Tatoeba…');
  const arr = JSON.parse(fs.readFileSync(tatoebaJson, 'utf8'));
  const insertSentence = db.prepare(
    'INSERT OR IGNORE INTO example_sentence (id, japanese, english) VALUES (?, ?, ?)',
  );
  const insertIndex = db.prepare(
    'INSERT INTO sentence_char_index (sentenceId, character) VALUES (?, ?)',
  );

  let sentences = 0;
  let indexes = 0;
  db.exec('BEGIN');
  for (const e of arr) {
    const id = parseInt(e.id, 10);
    if (!Number.isFinite(id)) continue;
    const jp = e.text;
    const en = e.translation;
    if (!jp?.trim() || !en?.trim()) continue;
    const chars = cjkChars(jp);
    if (chars.size === 0) continue;

    insertSentence.run(id, jp, en);
    sentences++;
    for (const ch of chars) {
      insertIndex.run(id, ch);
      indexes++;
    }
  }
  db.exec('COMMIT');
  console.log(`  ✓ ${sentences.toLocaleString()} sentences, ${indexes.toLocaleString()} index rows`);
}

async function main() {
  const { work, out } = parseArgs();
  fs.mkdirSync(work, { recursive: true });
  fs.mkdirSync(path.dirname(out), { recursive: true });

  console.log('Fetching datasets:');
  const jmdictZip = path.join(work, 'jmdict.zip');
  const tatoebaZip = path.join(work, 'tatoeba.zip');
  await ensureDownloaded(JMDICT_URL, jmdictZip);
  await ensureDownloaded(TATOEBA_URL, tatoebaZip);
  const jmdictJson = ensureUnzipped(jmdictZip, 'jmdict', work);
  const tatoebaJson = ensureUnzipped(tatoebaZip, 'tatoeba', work);

  for (const ext of ['', '-wal', '-shm']) {
    if (fs.existsSync(out + ext)) fs.rmSync(out + ext);
  }

  console.log(`Building ${out}:`);
  const db = new DatabaseSync(out);
  db.exec('PRAGMA journal_mode = OFF; PRAGMA synchronous = OFF;');
  db.exec(SCHEMA);
  buildWords(db, jmdictJson);
  buildSentences(db, tatoebaJson);
  db.exec('VACUUM');
  db.close();

  const mb = (fs.statSync(out).size / (1024 * 1024)).toFixed(1);
  console.log(`\nDone. ${out} = ${mb} MB`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
