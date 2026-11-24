import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { QUESTIONS } from '../src/questions.js';
import { DIMENSIONS, SCHEMA_VERSION, calculateResult, rankScores, validDraft } from '../src/engine.js';
import { PROFILES } from '../src/profiles.js';

test('the product contains 18 four-choice questions and exactly three items per dimension', () => {
  assert.equal(QUESTIONS.length, 18);
  assert.deepEqual(DIMENSIONS.map(({ code }) => QUESTIONS.filter(q => q.dimension === code).length), Array(6).fill(3));
  for (const [i, q] of QUESTIONS.entries()) {
    assert.equal(q.id, i + 1);
    assert.match(q.text, /[？?:：]$/);
    assert.deepEqual(q.options.map(o => o.label), ['A', 'B', 'C', 'D']);
    assert.equal(q.options.length, 4);
    assert.ok(q.options.every(o => Number.isInteger(o.points) && o.points >= 0 && o.points <= 3));
  }
  assert.equal(PROFILES.length, 3);
  for (const profile of PROFILES) {
    assert.equal(profile.analysis.length, 4);
    assert.equal(profile.advice.length, 5);
    assert.ok(profile.comment.length > 100);
    assert.ok(profile.bio.length > 60);
  }
});

test('the calculator validates the 18 responses, choice indexes, and gaps', () => {
  assert.equal(validDraft(Array(18).fill(null)), true);
  assert.equal(validDraft(Array(17).fill(null)), false);
  assert.equal(validDraft(new Array(18)), false);
  assert.equal(validDraft(Array(18).fill(4)), false);
  assert.equal(validDraft(Array(18).fill('0')), false);
  assert.throws(() => calculateResult(Array(17).fill(0)), /18道/);
  assert.throws(() => calculateResult([null, ...Array(17).fill(0)]), /18道/);
  assert.throws(() => rankScores({ C: 10, A: 0, R: 0, E: 0, D: 0, S: 0 }), /无效/);
  assert.throws(() => rankScores({ C: 0, A: 0, R: 0, E: 0, D: 0 }), /无效/);
  assert.throws(() => rankScores({ C: 0, A: -1, R: 0, E: 0, D: 0, S: 0 }), /无效/);
});

test('all 72 option weights and their order exactly match chapter three of the specification', () => {
  assert.deepEqual(QUESTIONS.map(q => q.options.map(o => o.points)), [
    [2, 0, 3, 1], [1, 3, 0, 2], [0, 2, 1, 3],
    [3, 1, 0, 2], [2, 0, 3, 1], [1, 3, 2, 0],
    [3, 1, 0, 2], [0, 2, 3, 1], [2, 0, 1, 3],
    [2, 0, 3, 1], [1, 3, 0, 2], [0, 2, 1, 3],
    [3, 1, 0, 2], [0, 2, 3, 1], [2, 0, 1, 3],
    [2, 0, 3, 1], [1, 3, 0, 2], [0, 2, 1, 3],
  ]);
  assert.deepEqual(calculateResult(Array(18).fill(0)).scores, { C: 3, A: 6, R: 5, E: 3, D: 5, S: 3 });
});

test('scores each answer only toward its specified behavior dimension', () => {
  const answers = QUESTIONS.map(q => q.options.findIndex(option => option.points === 3));
  const result = calculateResult(answers);
  assert.deepEqual(result.scores, Object.fromEntries(DIMENSIONS.map(d => [d.code, 9])));
  assert.deepEqual(result.percentage, Object.fromEntries(DIMENSIONS.map(d => [d.code, 100])));
  assert.equal(result.primary, 'da_vinci');
  assert.equal(result.indices.da_vinci, 9);
  assert.equal(result.indices.li_qingzhao, 9);
  assert.equal(result.indices.shen_kuo, 9);
  assert.equal(result.match, 65);
  assert.equal(result.secondary, 'li_qingzhao');
  assert.equal(result.easterEgg, false);
  const noPoints = calculateResult(QUESTIONS.map(q => q.options.findIndex(option => option.points === 0)));
  assert.deepEqual(noPoints.scores, Object.fromEntries(DIMENSIONS.map(d => [d.code, 0])));
  assert.deepEqual(noPoints.percentage, Object.fromEntries(DIMENSIONS.map(d => [d.code, 0])));
  assert.equal(noPoints.primary, 'da_vinci');
});

test('implements the documented 0.35 core-sum tie break and stable fallback', () => {
  const close = { C: 0, A: 0, R: 0, E: 0, D: 9, S: 8 };
  const tie = rankScores(close);
  assert.equal(tie.indices.da_vinci, 3.15);
  assert.equal(tie.indices.shen_kuo, 3.2);
  assert.ok(Math.abs(tie.indices.da_vinci - tie.indices.shen_kuo) < .35);
  assert.equal(tie.primary, 'da_vinci'); // core total 9 beats Shen Kuo's 8.

  const outsideTie = rankScores({ C: 0, A: 0, R: 0, E: 0, D: 9, S: 9 });
  assert.ok(Math.abs(outsideTie.indices.da_vinci - outsideTie.indices.shen_kuo) >= .35);
  assert.equal(outsideTie.primary, 'shen_kuo');
  assert.equal(rankScores({ C: 1, A: 2, R: 3, E: 4, D: 5, S: 6 }).primary,
    rankScores({ C: 1, A: 2, R: 3, E: 4, D: 5, S: 6 }).primary);
});

test('shows a secondary archetype only within 1.5 points and calculates capped match', () => {
  const close = rankScores({ C: 3, A: 5, R: 5, E: 5, D: 7, S: 8 });
  const outside = rankScores({ C: 0, A: 0, R: 0, E: 0, D: 9, S: 4 });
  assert.ok(close.secondary);
  assert.equal(outside.secondary, null);
  assert.equal(rankScores({ C: 9, A: 9, R: 0, E: 0, D: 9, S: 0 }).match, 94.25);
  assert.equal(rankScores({ C: 0, A: 0, R: 0, E: 0, D: 9, S: 9 }).match, 67.25);
});

test('unlocks the fourth way only for the exact four required choices', () => {
  const ids = [2, 7, 13, 17]; // Q3=D, Q8=C, Q14=D, Q18=A.
  const answers = Array(18).fill(0);
  answers[2] = 3; answers[7] = 2; answers[13] = 3; answers[17] = 0;
  const bonus = calculateResult(answers);
  assert.equal(bonus.easterEgg, true);
  const wrong = [...answers];
  wrong[2] = 2;
  assert.equal(calculateResult(wrong).easterEgg, false);
  for (const q of ids) {
    const nearMiss = [...answers];
    nearMiss[q] = q === 17 ? 1 : 0;
    assert.equal(calculateResult(nearMiss).easterEgg, false);
  }
  assert.ok(PROFILES.some(profile => profile.id === bonus.primary));
});

test('assigns strongest and developing dimensions without treating them as deficits', () => {
  const answers = QUESTIONS.map(q => q.options.findIndex(o => o.points === (q.dimension === 'C' ? 3 : 0)));
  const result = calculateResult(answers);
  assert.equal(result.strongest, 'C');
  assert.equal(result.developing, 'A'); // stable first-seen tie-break.
  assert.equal(result.balanced, false);
  const even = calculateResult(QUESTIONS.map(q => q.options.findIndex(o => o.points === 1)));
  assert.equal(even.balanced, true);
});

test('keeps user answers on device and does not bundle external font or analytics calls', async () => {
  const source = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const css = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  assert.match(source, /localStorage\.setItem/);
  assert.doesNotMatch(source, /fetch\(|XMLHttpRequest|sendBeacon/);
  assert.doesNotMatch(css, /@import\s+url|fonts\.googleapis|https?:\/\//i);
  assert.doesNotMatch(html, /googletagmanager|google-analytics|facebook\.net/);
  assert.equal(SCHEMA_VERSION, 1);
});
