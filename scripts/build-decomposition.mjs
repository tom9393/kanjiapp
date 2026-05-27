#!/usr/bin/env node
// Offline generator for the kanji decomposition asset (kanji_decomposition.json).
//
// Produces a flat map { char: [immediate component chars] } used to render the radical
// breakdown tree on the kanji detail screen (線 → 糸 + 泉 → 白 + 水 …). The tree is built
// at runtime by recursing through this map (src/data/decomposition.ts).
//
// Source: cjkvi-ids ids.txt — Ideographic Description Sequences from the CHISE project,
// https://github.com/cjkvi/cjkvi-ids (GNU GPL v2). Each line is
//   U+<cp><TAB><char><TAB><IDS>[REGION] [<TAB><IDS>[REGION] …]
// where IDS is a prefix expression of IDC operators (⿰⿱… U+2FF0–U+2FFF) over component
// characters, e.g. 線 → "⿰糹泉[GT]\t⿰糸泉[JK]". Region tags ([G]China [T]Taiwan [J]Japan
// [K]Korea [V]Vietnam) flag which glyph a variant matches; for a Japanese app we prefer the
// J variant (⿰糸泉, real kanji 糸) over the GT variant (⿰糹泉, radical form 糹).
//
// We keep only the *immediate* components of the chosen IDS (cjkvi already uses the largest
// encoded sub-component, so 線's entry is ⿰糸泉, not the fully-expanded ⿰糸⿱白水), then walk
// the transitive closure from our kanji set so the asset holds only reachable entries.
//
// Usage:
//   node scripts/build-decomposition.mjs [--ids <ids.txt>] [--src <kanji.json>] [--out <path>]
// Without --ids the script fetches ids.txt over the network (Node >= 18 global fetch).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const IDS_URL = 'https://raw.githubusercontent.com/cjkvi/cjkvi-ids/master/ids.txt';

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {
    ids: null,
    src: path.join(repoRoot, 'assets', 'data', 'kanji.json'),
    out: path.join(repoRoot, 'assets', 'data', 'kanji_decomposition.json'),
  };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--ids') out.ids = path.resolve(args[++i]);
    else if (args[i] === '--src') out.src = path.resolve(args[++i]);
    else if (args[i] === '--out') out.out = path.resolve(args[++i]);
    else throw new Error(`Unknown arg: ${args[i]}`);
  }
  return out;
}

async function loadIds(idsPath) {
  if (idsPath) {
    if (!fs.existsSync(idsPath)) throw new Error(`ids.txt not found: ${idsPath}`);
    return fs.readFileSync(idsPath, 'utf8');
  }
  console.log(`Fetching ${IDS_URL}`);
  const res = await fetch(IDS_URL);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  return res.text();
}

const IDC = /[⿰-⿿]/g; // ideographic description characters (binary/ternary operators)
const ENTITY = /&[A-Za-z0-9-]+;/g; // unencoded components, e.g. &CDP-8BBF; — dropped
const ANNO = /\{[0-9]+\}/g; // numeric annotations
const REGION = /\[[^\]]*\]\s*$/; // trailing region tag, e.g. [JK]

function regionOf(field) {
  const m = field.match(/\[([^\]]*)\]\s*$/);
  return m ? m[1] : null;
}

// Prefer the Japanese glyph variant; fall back to an untagged (all-region) entry, then the first.
function chooseField(fields) {
  return (
    fields.find((f) => (regionOf(f) ?? '').includes('J')) ??
    fields.find((f) => regionOf(f) == null) ??
    fields[0]
  );
}

// CJK ideographs (incl. extensions/compatibility), radical forms, and strokes — everything
// a real component can be. Filters out IDS placeholder junk like ② (U+2461).
function isComponent(ch) {
  const cp = ch.codePointAt(0);
  return (
    (cp >= 0x3400 && cp <= 0x9fff) || // CJK Ext A + Unified
    (cp >= 0xf900 && cp <= 0xfaff) || // CJK Compatibility Ideographs
    (cp >= 0x20000 && cp <= 0x3ffff) || // CJK Ext B and beyond (supplementary plane)
    (cp >= 0x2e80 && cp <= 0x2eff) || // CJK Radicals Supplement (氵 etc.)
    (cp >= 0x2f00 && cp <= 0x2fdf) || // Kangxi Radicals
    (cp >= 0x31c0 && cp <= 0x31ef) // CJK Strokes (㇇ etc.)
  );
}

// Immediate component characters of one IDS field, with operators/refs/tags removed.
function componentsOf(field) {
  const body = field.replace(REGION, '').replace(ENTITY, '').replace(ANNO, '').replace(IDC, '');
  return [...body].filter(isComponent);
}

function buildRawMap(text) {
  const map = new Map();
  for (const line of text.split('\n')) {
    if (!line.startsWith('U+')) continue; // skip comments/blank lines
    const parts = line.split('\t');
    if (parts.length < 3) continue;
    const char = parts[1];
    if (char.startsWith('&')) continue; // entry defines an unencoded glyph — unusable as a key
    const comps = componentsOf(chooseField(parts.slice(2).filter(Boolean)));
    if (comps.length === 0) continue;
    if (comps.length === 1 && comps[0] === char) continue; // atomic: char decomposes to itself
    map.set(char, comps);
  }
  return map;
}

// Emit every decomposable char reachable from the kanji set, following components transitively.
function closure(rawMap, kanjiChars) {
  const out = {};
  const visited = new Set();
  const stack = [...kanjiChars];
  while (stack.length) {
    const c = stack.pop();
    if (visited.has(c)) continue;
    visited.add(c);
    const comps = rawMap.get(c);
    if (!comps) continue; // atomic / not in ids.txt — a leaf, not a key
    out[c] = comps;
    for (const comp of comps) if (!visited.has(comp)) stack.push(comp);
  }
  return out;
}

async function main() {
  const { ids, src, out } = parseArgs();
  if (!fs.existsSync(src)) throw new Error(`kanji.json not found: ${src}`);

  const kanji = JSON.parse(fs.readFileSync(src, 'utf8'));
  const kanjiChars = kanji.map((k) => k.character);
  const rawMap = buildRawMap(await loadIds(ids));
  console.log(`Parsed ${rawMap.size.toLocaleString()} decomposable characters from ids.txt`);

  const map = closure(rawMap, kanjiChars);
  const covered = kanjiChars.filter((c) => map[c]).length;
  console.log(
    `${kanjiChars.length.toLocaleString()} kanji: ${covered.toLocaleString()} decompose ` +
      `(${(100 * covered / kanjiChars.length).toFixed(1)}%); ` +
      `${Object.keys(map).length.toLocaleString()} total entries (incl. sub-components)`,
  );

  // Sort keys for a deterministic diff.
  const sorted = {};
  for (const k of Object.keys(map).sort()) sorted[k] = map[k];
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(sorted));
  const kb = (fs.statSync(out).size / 1024).toFixed(0);
  console.log(`\nDone. ${out} = ${kb} KB`);
}

main();
