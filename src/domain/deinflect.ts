// Heuristic Japanese de-inflection: turns a conjugated surface form into the set of plain
// (dictionary) forms it might come from, so the sentence parser can look conjugated words up
// in a dictionary that only stores plain forms (かかった → かかる, 食べました → 食べる).
//
// There is no part-of-speech data to validate against, so we deliberately OVER-generate: e.g.
// 買った yields 買う / 買つ / 買る and the caller keeps only the form that exists in the
// dictionary (買う). Every rule rewrites a kana *suffix*, leaving any kanji stem untouched, and
// rules chain via breadth-first search so compound inflections unwind one step at a time
// (食べさせられた → 食べさせられる → 食べさせる → 食べる). Modelled on the rule tables used by
// Yomichan / 10ten Reader, trimmed to the inflections a learner commonly meets.

interface Rule {
  from: string; // inflected kana suffix to match at the end of the term
  to: string; // plain-form suffix to replace it with
}

// Order matters only as a tie-breaker: within a step, candidates are produced in rule order,
// and the parser takes the first one present in the dictionary. So exceptions that collide with
// a regular rule are listed first (って→く before って→う makes 行って resolve to 行く, not 行う).
const RULES: Rule[] = [
  // ── auxiliaries stacked on the te-form: peel them back to て / で ──
  // progressive (ている / てる) with its own tense + politeness, plus てしまう / ちゃう, ておく / とく.
  { from: 'ている', to: 'て' }, { from: 'てる', to: 'て' },
  { from: 'ていた', to: 'て' }, { from: 'てた', to: 'て' },
  { from: 'ています', to: 'て' }, { from: 'ていました', to: 'て' },
  { from: 'てます', to: 'て' }, { from: 'てました', to: 'て' },
  { from: 'てしまう', to: 'て' }, { from: 'てしまった', to: 'て' },
  { from: 'ちゃう', to: 'て' }, { from: 'ちゃった', to: 'て' },
  { from: 'ておく', to: 'て' }, { from: 'とく', to: 'て' },
  { from: 'でいる', to: 'で' }, { from: 'でる', to: 'で' },
  { from: 'でいた', to: 'で' }, { from: 'でた', to: 'で' },
  { from: 'でいます', to: 'で' }, { from: 'でいました', to: 'で' },
  { from: 'でます', to: 'で' }, { from: 'でました', to: 'で' },
  { from: 'でしまう', to: 'で' }, { from: 'でしまった', to: 'で' },
  { from: 'じゃう', to: 'で' }, { from: 'じゃった', to: 'で' },
  { from: 'でおく', to: 'で' }, { from: 'どく', to: 'で' },

  // ── te-form → plain ──
  { from: 'って', to: 'く' }, // exception: 行って → 行く (before って→う)
  { from: 'って', to: 'う' }, { from: 'って', to: 'つ' }, { from: 'って', to: 'る' },
  { from: 'んで', to: 'ぬ' }, { from: 'んで', to: 'ぶ' }, { from: 'んで', to: 'む' },
  { from: 'いて', to: 'く' }, { from: 'いで', to: 'ぐ' }, { from: 'して', to: 'す' },
  { from: 'くて', to: 'い' }, // i-adjective te-form (高くて → 高い)
  { from: 'して', to: 'する' }, { from: 'きて', to: 'くる' },
  { from: 'て', to: 'る' }, // ichidan (食べて → 食べる); also catches 来て → 来る

  // ── past (た / だ) → plain ──
  { from: 'った', to: 'く' }, // 行った → 行く
  { from: 'った', to: 'う' }, { from: 'った', to: 'つ' }, { from: 'った', to: 'る' },
  { from: 'んだ', to: 'ぬ' }, { from: 'んだ', to: 'ぶ' }, { from: 'んだ', to: 'む' },
  { from: 'いた', to: 'く' }, { from: 'いだ', to: 'ぐ' }, { from: 'した', to: 'す' },
  { from: 'かった', to: 'い' }, // i-adjective past (高かった → 高い)
  { from: 'した', to: 'する' }, { from: 'きた', to: 'くる' },
  { from: 'た', to: 'る' }, // ichidan (食べた → 食べる)

  // ── negative (ない) → plain ──
  { from: 'わない', to: 'う' }, { from: 'かない', to: 'く' }, { from: 'がない', to: 'ぐ' },
  { from: 'さない', to: 'す' }, { from: 'たない', to: 'つ' }, { from: 'なない', to: 'ぬ' },
  { from: 'ばない', to: 'ぶ' }, { from: 'まない', to: 'む' }, { from: 'らない', to: 'る' },
  { from: 'しない', to: 'する' }, { from: 'こない', to: 'くる' },
  { from: 'くない', to: 'い' }, // i-adjective negative (高くない → 高い)
  { from: 'なかった', to: 'ない' }, // past negative → negative, then unwinds further
  { from: 'ない', to: 'る' }, // ichidan (食べない → 食べる)

  // ── polite (ます family) → plain ──
  { from: 'ました', to: 'ます' }, { from: 'ません', to: 'ます' },
  { from: 'ませんでした', to: 'ません' }, { from: 'ましょう', to: 'ます' }, { from: 'まして', to: 'ます' },
  { from: 'います', to: 'う' }, { from: 'きます', to: 'く' }, { from: 'ぎます', to: 'ぐ' },
  { from: 'します', to: 'す' }, { from: 'ちます', to: 'つ' }, { from: 'にます', to: 'ぬ' },
  { from: 'びます', to: 'ぶ' }, { from: 'みます', to: 'む' }, { from: 'ります', to: 'る' },
  { from: 'します', to: 'する' }, { from: 'きます', to: 'くる' },
  { from: 'ます', to: 'る' }, // ichidan (食べます → 食べる)

  // ── volitional (おう / よう) → plain ──
  { from: 'おう', to: 'う' }, { from: 'こう', to: 'く' }, { from: 'ごう', to: 'ぐ' },
  { from: 'そう', to: 'す' }, { from: 'とう', to: 'つ' }, { from: 'のう', to: 'ぬ' },
  { from: 'ぼう', to: 'ぶ' }, { from: 'もう', to: 'む' }, { from: 'ろう', to: 'る' },
  { from: 'しよう', to: 'する' }, { from: 'こよう', to: 'くる' },
  { from: 'よう', to: 'る' }, // ichidan (食べよう → 食べる)

  // ── potential (godan -eる, ichidan -られる) → plain ──
  { from: 'ける', to: 'く' }, { from: 'げる', to: 'ぐ' }, { from: 'せる', to: 'す' },
  { from: 'てる', to: 'つ' }, { from: 'ねる', to: 'ぬ' }, { from: 'べる', to: 'ぶ' },
  { from: 'める', to: 'む' }, { from: 'える', to: 'う' }, { from: 'れる', to: 'る' },
  { from: 'られる', to: 'る' }, // ichidan potential / passive (食べられる → 食べる)

  // ── passive / causative → plain ──
  { from: 'かれる', to: 'く' }, { from: 'がれる', to: 'ぐ' }, { from: 'される', to: 'す' },
  { from: 'たれる', to: 'つ' }, { from: 'なれる', to: 'ぬ' }, { from: 'ばれる', to: 'ぶ' },
  { from: 'まれる', to: 'む' }, { from: 'われる', to: 'う' },
  { from: 'かせる', to: 'く' }, { from: 'がせる', to: 'ぐ' }, { from: 'させる', to: 'す' },
  { from: 'たせる', to: 'つ' }, { from: 'なせる', to: 'ぬ' }, { from: 'ばせる', to: 'ぶ' },
  { from: 'ませる', to: 'む' }, { from: 'わせる', to: 'う' }, { from: 'らせる', to: 'る' },
  { from: 'させる', to: 'る' }, // ichidan causative (食べさせる → 食べる)
  { from: 'させられる', to: 'る' }, // ichidan causative-passive (食べさせられる → 食べる)
  { from: 'される', to: 'する' }, { from: 'させる', to: 'する' },

  // ── conditional (ば / たら) → plain ──
  { from: 'えば', to: 'う' }, { from: 'けば', to: 'く' }, { from: 'げば', to: 'ぐ' },
  { from: 'せば', to: 'す' }, { from: 'てば', to: 'つ' }, { from: 'ねば', to: 'ぬ' },
  { from: 'べば', to: 'ぶ' }, { from: 'めば', to: 'む' }, { from: 'れば', to: 'る' },
  { from: 'ければ', to: 'い' }, // i-adjective (高ければ → 高い)
  { from: 'ったら', to: 'う' }, { from: 'ったら', to: 'つ' }, { from: 'ったら', to: 'る' },
  { from: 'んだら', to: 'ぬ' }, { from: 'んだら', to: 'ぶ' }, { from: 'んだら', to: 'む' },
  { from: 'いたら', to: 'く' }, { from: 'いだら', to: 'ぐ' }, { from: 'したら', to: 'す' },
  { from: 'かったら', to: 'い' }, { from: 'たら', to: 'る' },
];

const MAX_DEPTH = 6; // enough to unwind ませんでした → … → plain and similar chains
const MAX_CANDIDATES = 60; // guard against pathological branching

/**
 * Plain-form candidates for a (possibly conjugated) term, the term itself first. Includes forms
 * that may not be real words; the caller filters by dictionary lookup.
 */
export function deinflect(term: string): string[] {
  const results = [term];
  const seen = new Set([term]);
  const queue: { form: string; depth: number }[] = [{ form: term, depth: 0 }];

  while (queue.length > 0) {
    const { form, depth } = queue.shift()!;
    if (depth >= MAX_DEPTH) continue;
    for (const rule of RULES) {
      // Require at least one character of stem so a bare suffix (e.g. した on its own) is left alone.
      if (form.length <= rule.from.length || !form.endsWith(rule.from)) continue;
      const next = form.slice(0, form.length - rule.from.length) + rule.to;
      if (seen.has(next)) continue;
      seen.add(next);
      results.push(next);
      if (results.length >= MAX_CANDIDATES) return results;
      queue.push({ form: next, depth: depth + 1 });
    }
  }
  return results;
}
