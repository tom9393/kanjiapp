import { candidateForms, segment } from '@/domain/sentenceParser';
import { deinflect } from '@/domain/deinflect';
import { Word } from '@/data/types';

const word = (id: number, kanjiForm: string, kana: string): Word => ({
  id,
  kanjiForm,
  kana,
  meaning: '',
  common: true,
});

describe('deinflect', () => {
  it('unwinds common conjugations to their plain form', () => {
    expect(deinflect('食べた')).toContain('食べる'); // past → ichidan plain
    expect(deinflect('行った')).toContain('行く'); // exception: って/った → く before う
    expect(deinflect('食べさせられた')).toContain('食べる'); // chained causative-passive past
  });

  it('always includes the term itself', () => {
    expect(deinflect('日本')).toContain('日本');
  });
});

describe('candidateForms', () => {
  it('lists plain-form candidates for the conjugated substrings of a sentence', () => {
    expect(candidateForms('読んだ')).toContain('読む');
  });
});

describe('segment', () => {
  it('splits a sentence into dictionary words and plain runs, de-conjugating verbs', () => {
    const dict = new Map<string, Word>([
      ['本', word(1, '本', 'ほん')],
      ['読む', word(2, '読む', 'よむ')],
    ]);

    const segments = segment('本を読んだ', dict);

    expect(segments).toHaveLength(3);
    expect(segments[0]).toMatchObject({ text: '本', word: { id: 1 } });
    expect(segments[1]).toMatchObject({ text: 'を', word: null }); // particle: unparsed run
    expect(segments[2]).toMatchObject({ text: '読んだ', word: { id: 2, kanjiForm: '読む' } });
  });

  it('does not match a single kana character as a word', () => {
    const dict = new Map<string, Word>([['を', word(3, 'を', 'を')]]);
    const segments = segment('を', dict);
    expect(segments).toEqual([{ text: 'を', word: null }]);
  });
});
