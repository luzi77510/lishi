import { QUESTIONS } from './questions.js';

export const SCHEMA_VERSION = 1;
export const DIMENSIONS = [
  { code: 'C', name: '探索创造力', chapter: '探索与创造', short: '创造', high: '你更容易看见新的可能，把不同的想法连接起来。', growth: '从一件熟悉的小事开始，试着换一种方法。' },
  { code: 'A', name: '目标执行力', chapter: '目标与执行', short: '执行', high: '你擅长把目标变成具体步骤，让想法持续向前。', growth: '把一个想法拆成今天就能完成的十分钟任务。' },
  { code: 'R', name: '深度思辨力', chapter: '思考与判断', short: '思辨', high: '你愿意追问原因，从细节和不同视角中形成判断。', growth: '在作出判断前，多问一句：还有其他解释吗？' },
  { code: 'E', name: '情感感知力', chapter: '情感与关系', short: '感知', high: '你留意人与人之间的感受，珍惜真实的情感连接。', growth: '先听完对方的感受，再表达自己的想法。' },
  { code: 'D', name: '风险决断力', chapter: '风险与决断', short: '决断', high: '你愿意理解风险，也愿意为值得的机会作出选择。', growth: '给一个小决定设定期限，练习承担可控的不确定性。' },
  { code: 'S', name: '稳定韧性', chapter: '稳定与韧性', short: '韧性', high: '你能够通过调整和积累，在变化中重新建立节奏。', growth: '为自己保留一个轻量但能持续的日常习惯。' },
];

const TYPES = [
  { id: 'da_vinci', core: ['C', 'D', 'A'], lead: 'C', weights: { C: 40, D: 35, A: 25 } },
  { id: 'li_qingzhao', core: ['R', 'E', 'C'], lead: 'R', weights: { R: 40, E: 35, C: 25 } },
  { id: 'shen_kuo', core: ['S', 'A', 'R'], lead: 'S', weights: { S: 40, A: 35, R: 25 } },
];

export function validDraft(answers) {
  return Array.isArray(answers) && answers.length === QUESTIONS.length &&
    Array.from({ length: QUESTIONS.length }, (_, i) => Object.hasOwn(answers, i) &&
      (answers[i] === null || (Number.isInteger(answers[i]) && answers[i] >= 0 && answers[i] <= 3))).every(Boolean);
}

export function rankScores(scores) {
  if (!scores || DIMENSIONS.some(d => !Number.isInteger(scores[d.code]) || scores[d.code] < 0 || scores[d.code] > 9)) {
    throw new Error('维度分数无效，请重新提交答案。');
  }
  const rows = TYPES.map((type, order) => ({
    ...type, order,
    units: Object.entries(type.weights).reduce((sum, [d, weight]) => sum + scores[d] * weight, 0),
    total: type.core.reduce((sum, code) => sum + scores[code], 0),
  }));
  const descending = [...rows].sort((a, b) => b.units - a.units || a.order - b.order);
  const gap = (descending[0].units - descending[1].units) / 100;
  let ranked = descending;
  if (rows.every(row => row.units === rows[0].units)) {
    ranked = rows;
  } else if (descending[0].units - descending[1].units < 35) {
    const [first, second, ...rest] = descending;
    const tied = [first, second].sort((a, b) =>
      b.total - a.total || scores[b.lead] - scores[a.lead] || a.order - b.order,
    );
    ranked = [...tied, ...rest];
  }
  const primary = ranked[0];
  const secondary = descending.find(row => row.id !== primary.id);
  return {
    primary: primary.id,
    secondary: secondary && Math.abs(primary.units - secondary.units) <= 150 ? secondary.id : null,
    indices: Object.fromEntries(rows.map(row => [row.id, row.units / 100])),
    match: Math.min(95, Math.max(65, 65 + 5 * gap)),
  };
}

export function calculateResult(answers) {
  if (!validDraft(answers) || answers.some(answer => answer === null)) throw new Error('请完整回答18道题后再查看结果。');
  const scores = Object.fromEntries(DIMENSIONS.map(d => [d.code, 0]));
  QUESTIONS.forEach((q, i) => { scores[q.dimension] += q.options[answers[i]].points; });
  const percentage = Object.fromEntries(DIMENSIONS.map(d => [d.code, Math.round(scores[d.code] / 9 * 1000) / 10]));
  const ordered = [...DIMENSIONS].sort((a, b) => scores[b.code] - scores[a.code]);
  return {
    ...rankScores(scores), scores, percentage,
    strongest: ordered[0].code,
    developing: DIMENSIONS.find(d => scores[d.code] === scores[ordered.at(-1).code]).code,
    balanced: ordered.every(d => scores[d.code] === scores[ordered[0].code]),
    easterEgg: answers[2] === 3 && answers[7] === 2 && answers[13] === 3 && answers[17] === 0,
  };
}
