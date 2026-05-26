// Hepburn romaji → hiragana, so Latin search input ("shin", "mizu", "sui") can be matched
// against the kana readings stored in the database. Characters that are not ASCII letters
// (already-kana input, kanji, spaces) pass through unchanged.
//
// `complete` is false when a Latin letter could not be folded into kana — e.g. the trailing
// consonant while "shink" is still being typed, or an English word like "water". Callers use
// it to decide whether to treat the input as a reading or as English text.

const ROMAJI: Record<string, string> = {
  a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お',
  ka: 'か', ki: 'き', ku: 'く', ke: 'け', ko: 'こ',
  ga: 'が', gi: 'ぎ', gu: 'ぐ', ge: 'げ', go: 'ご',
  sa: 'さ', shi: 'し', si: 'し', su: 'す', se: 'せ', so: 'そ',
  za: 'ざ', ji: 'じ', zi: 'じ', zu: 'ず', ze: 'ぜ', zo: 'ぞ',
  ta: 'た', chi: 'ち', ti: 'ち', tsu: 'つ', tu: 'つ', te: 'て', to: 'と',
  da: 'だ', di: 'ぢ', du: 'づ', de: 'で', do: 'ど',
  na: 'な', ni: 'に', nu: 'ぬ', ne: 'ね', no: 'の',
  ha: 'は', hi: 'ひ', fu: 'ふ', hu: 'ふ', he: 'へ', ho: 'ほ',
  ba: 'ば', bi: 'び', bu: 'ぶ', be: 'べ', bo: 'ぼ',
  pa: 'ぱ', pi: 'ぴ', pu: 'ぷ', pe: 'ぺ', po: 'ぽ',
  ma: 'ま', mi: 'み', mu: 'む', me: 'め', mo: 'も',
  ya: 'や', yu: 'ゆ', yo: 'よ',
  ra: 'ら', ri: 'り', ru: 'る', re: 'れ', ro: 'ろ',
  wa: 'わ', wo: 'を',
  fa: 'ふぁ', fi: 'ふぃ', fe: 'ふぇ', fo: 'ふぉ',
  // Palatalized (youon)
  kya: 'きゃ', kyu: 'きゅ', kyo: 'きょ',
  gya: 'ぎゃ', gyu: 'ぎゅ', gyo: 'ぎょ',
  sha: 'しゃ', shu: 'しゅ', sho: 'しょ', sya: 'しゃ', syu: 'しゅ', syo: 'しょ',
  ja: 'じゃ', ju: 'じゅ', jo: 'じょ', jya: 'じゃ', jyu: 'じゅ', jyo: 'じょ',
  zya: 'じゃ', zyu: 'じゅ', zyo: 'じょ',
  cha: 'ちゃ', chu: 'ちゅ', cho: 'ちょ', cya: 'ちゃ', tya: 'ちゃ', tyu: 'ちゅ', tyo: 'ちょ',
  nya: 'にゃ', nyu: 'にゅ', nyo: 'にょ',
  hya: 'ひゃ', hyu: 'ひゅ', hyo: 'ひょ',
  bya: 'びゃ', byu: 'びゅ', byo: 'びょ',
  pya: 'ぴゃ', pyu: 'ぴゅ', pyo: 'ぴょ',
  mya: 'みゃ', myu: 'みゅ', myo: 'みょ',
  rya: 'りゃ', ryu: 'りゅ', ryo: 'りょ',
};

const isVowel = (c: string) => c === 'a' || c === 'i' || c === 'u' || c === 'e' || c === 'o';
const isLetter = (c: string) => c >= 'a' && c <= 'z';

export function romajiToHiragana(input: string): { kana: string; complete: boolean } {
  const s = input.toLowerCase();
  let out = '';
  let complete = true;
  let i = 0;

  while (i < s.length) {
    const c = s[i];
    if (!isLetter(c)) {
      out += s[i];
      i++;
      continue;
    }

    // Sokuon: a doubled consonant becomes っ + the consonant (e.g. "kitte" → きって).
    if (c !== 'n' && !isVowel(c) && s[i + 1] === c) {
      out += 'っ';
      i++;
      continue;
    }

    // Syllabic ん: an 'n' not starting a na/ni/.../nya syllable. One 'n' is consumed, so
    // "onna" → お + ん + な and "shin" → しん.
    if (c === 'n') {
      const next = s[i + 1];
      if (next === undefined || (!isVowel(next) && next !== 'y')) {
        out += 'ん';
        i++;
        continue;
      }
    }

    // Longest match first: try 3-, then 2-, then 1-character syllables.
    let matched = false;
    for (let len = 3; len >= 1; len--) {
      const chunk = s.substr(i, len);
      if (ROMAJI[chunk]) {
        out += ROMAJI[chunk];
        i += len;
        matched = true;
        break;
      }
    }
    if (!matched) {
      complete = false; // a stray consonant we can't voice yet — drop it from the kana prefix
      i++;
    }
  }

  return { kana: out, complete };
}
