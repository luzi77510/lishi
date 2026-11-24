import { QUESTIONS } from './questions.js';
import { DIMENSIONS, SCHEMA_VERSION, calculateResult, validDraft } from './engine.js';
import { PROFILES } from './profiles.js';

const SAVE_KEY = 'jiyou.test.v1';
const app = document.querySelector('#app');
const toast = document.querySelector('#toast');
const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let view = 'home';
let answers = Array(QUESTIONS.length).fill(null);
let activeQuestion = 0;
let notice = '';
let toastTimer;
let currentResult = null;

const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const icon = (name, size = 20) => {
  const paths = {
    arrow: '<path d="M7 17 17 7M7 7h10v10"/>',
    left: '<path d="m15 18-6-6 6-6"/>',
    right: '<path d="M5 12h14m-6-7 7 7-7 7"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    book: '<path d="M12 7v14m0-14C9 4 5 4 3 5v14c3-1 6-1 9 2m0-14c3-3 7-3 9-2v14c-3-1-6-1-9 2"/>',
    spark: '<path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2ZM19 14l1.1 3.9L24 19l-3.9 1.1L19 24l-1.1-3.9L14 19l3.9-1.1L19 14Z"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6 6-2Z"/>',
    restart: '<path d="M3 12a9 9 0 1 0 2.64-6.36L3 8m0-5v5h5"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M5 17v4h14v-4"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.7 10.7 6.6-4.4m-6.6 7 6.6 4.3"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
    sparkles: '<path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3ZM19 15l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? ''}</svg>`;
};

function readSave() {
  try {
    const data = JSON.parse(localStorage.getItem(SAVE_KEY));
    return data?.version === SCHEMA_VERSION && validDraft(data.answers) ? data : null;
  } catch { return null; }
}
let saved = readSave();

function persistAnswers() {
  saved = { version: SCHEMA_VERSION, answers: [...answers], updated: Date.now() };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(saved)); }
  catch { showToast('浏览器未允许本地存储，离开页面前请完成作答。'); }
}

function saveProgress() {
  if (answers.every(answer => answer === null)) {
    try { localStorage.removeItem(SAVE_KEY); } catch { /* Storage is optional. */ }
    saved = null;
  } else persistAnswers();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2600);
}

function brand() {
  return `<a class="brand" href="#home" data-action="home" aria-label="人生有迹，返回首页"><span class="brand-seal" aria-hidden="true">迹</span><span class="brand-type"><b>人生有迹</b><small>ARCHIVE OF A LIFE</small></span></a>`;
}

function header(compact = false) {
  return `<header class="site-header ${compact ? 'site-header--compact' : ''}"><div class="header-inner">${brand()}<nav class="header-nav" aria-label="主导航">${view === 'home' ? '<span class="header-kicker">一场关于自己的东方漫游</span>' : `<button class="text-button" data-action="home">返回首页</button>`}</nav><a class="edition-mark" href="#about" data-action="about"><span class="edition-dot"></span><span>个人探索 · V1.0</span></a></div></header>`;
}

function renderHome() {
  const remaining = saved?.answers?.filter(a => a !== null).length ?? 0;
  const hasSavedProgress = remaining > 0;
  app.innerHTML = `
    <div class="site-frame">
      ${header()}
      <main id="main">
        <section class="hero" aria-labelledby="hero-title">
          <div class="hero-copy">
            <div class="eyebrow"><span class="eyebrow-rule"></span><span>一份照见自己的历史手稿</span></div>
            <h1 id="hero-title">历史上早有人<br>替你走完<span>一生。</span></h1>
            <p class="hero-intro">有些人生的困境，似乎总在反复出现。<br>18道题，遇见那些与你有着相似心迹的古人。</p>
            <div class="hero-action-row">
              <button class="button button--primary" data-action="start">${remaining === 18 ? '查看上次结果' : hasSavedProgress ? '继续上次探索' : '开启一场自我探索'}<span class="button-icon">${icon('right', 17)}</span></button>
              <span class="action-caption">${hasSavedProgress ? `已为你留存 ${remaining} / 18 题` : '约 4—6 分钟 · 无需登录'}</span>
            </div>
            <div class="trust-note">${icon('lock', 15)}<span>答案保存在你的设备中，不上传、不收集</span></div>
            <button class="continue-link" data-action="about">阅读测试说明 <span>↗</span></button>
          </div>
          <div class="hero-art" aria-label="达·芬奇肖像及历史手稿装饰" role="img">
            <div class="hero-art-canvas"><img class="hero-portrait" src="./assets/leonardo.webp" alt="达·芬奇的文艺复兴时期红粉笔肖像" fetchpriority="high"><div class="art-light"></div><div class="art-annotations" aria-hidden="true"><span>OSSERVARE · CONOSCERE · CREARE</span><span>一个人的一生<br>也有迹可循</span></div><div class="art-orbit art-orbit--one"></div><div class="art-orbit art-orbit--two"></div><span class="archive-stamp">原<br>型<br>档<br>案</span><div class="art-nameplate"><span class="nameplate-rule"></span><span>LEONARDO DA VINCI</span><small>1452 — 1519 &nbsp; · &nbsp; 原型人物插画</small></div></div>
            <div class="hero-annotation hero-annotation--left"><span>001</span> / THE POSSIBILITY SEEKER</div>
            <div class="hero-annotation hero-annotation--right">好奇心，是一种生活方式 <span>✳</span></div>
            <span class="float-seal float-seal--one" aria-hidden="true">探<br>索</span>
            <span class="float-seal float-seal--two" aria-hidden="true">六维<br>自观</span>
          </div>
          <div class="hero-meta"><span>《梦溪笔谈》里的观测者</span><span>宋词里的细腻知己</span><span>文艺复兴的造梦人</span></div>
        </section>
        <section class="home-about" id="about" aria-labelledby="about-heading">
          <div class="section-kicker">NOT A LABEL, BUT A LENS &nbsp;·&nbsp; 关于这一次探索</div>
          <h2 id="about-heading">不是给你一个标签。<br>是陪你看看，<span>自己如何成为自己。</span></h2>
          <div class="about-grid">
            <div class="about-intro"><span class="drop-cap">“</span><p>你有没有发现，人生中有些问题似乎总是在反复出现？</p><p>我们也许换过工作、换过环境、做过很多次重要选择，但某些结果却总是惊人地相似。这些看似不同的人生困境背后，可能藏着同一个原因：我们一直在用熟悉的方式，应对陌生的人生。</p><p>历史上有很多人，也曾经以相似的方式思考、感受和选择。他们留下的经历，可以成为观察自己的另一面镜子。</p></div>
            <div class="dimensions-list"><span class="dimensions-label">六种行为线索，拼成一幅个人画像</span>${DIMENSIONS.map((d, i) => `<div class="dimension-line"><span class="dim-number">0${i + 1}</span><span class="dim-label">${d.name}</span><span class="dim-separator"></span><span class="dim-chapter">${d.chapter}</span></div>`).join('')}</div>
          </div>
        </section>
        <footer class="site-footer"><a class="footer-seal" href="#home" data-action="home">迹</a><p>人生有迹 · 一场关于自我的轻探索</p><p class="footer-small">趣味性格映射，仅供自我反思；历史原型不代表真实人格相似度。</p></footer>
      </main>
    </div>`;
}

function renderQuiz() {
  const question = QUESTIONS[activeQuestion];
  const dimension = DIMENSIONS.find(d => d.code === question.dimension);
  const selected = answers[activeQuestion];
  const completed = answers.filter(answer => answer !== null).length;
  const section = Math.floor(activeQuestion / 3);
  const sectionQuestions = QUESTIONS.slice(section * 3, section * 3 + 3);
  const completeFraction = completed / QUESTIONS.length * 100;
  app.innerHTML = `
    <div class="quiz-app">
      ${header(true)}
      <main id="main" class="quiz-shell">
        <aside class="quiz-aside" aria-label="答题进度">
          <div class="quiz-aside-heading"><span class="section-kicker">THE JOURNEY</span><h1>在问题里，<br>遇见自己。</h1><p>没有正确答案。只选当下真正的你。</p></div>
          <div class="quiz-section-list">${DIMENSIONS.map((d, i) => { const isActive = i === section; const isDone = i < section || (i === section && sectionQuestions.every(q => answers[q.id - 1] !== null)); return `<div class="quiz-section-group"><div class="quiz-section ${isActive ? 'is-active' : ''} ${isDone ? 'is-done' : ''}"><span class="quiz-section-marker">${isDone ? '✓' : String(i + 1).padStart(2, '0')}</span><span>${d.chapter}</span><span class="section-mini-label">${d.short}</span></div><div class="quiz-jump-list">${[0, 1, 2].map(offset => { const qIndex = i * 3 + offset; return `<button class="quiz-jump ${qIndex === activeQuestion ? 'is-current' : ''} ${answers[qIndex] !== null ? 'is-answered' : ''}" data-action="jump" data-question="${qIndex}" aria-label="跳转到第 ${qIndex + 1} 题${answers[qIndex] !== null ? '，已作答' : '，未作答'}" ${qIndex === activeQuestion ? 'aria-current="step"' : ''}>${String(qIndex + 1).padStart(2, '0')}</button>`; }).join('')}</div></div>`; }).join('')}</div>
          <div class="progress-card"><div class="progress-card-title"><span>当前进度</span><strong>${String(completed).padStart(2, '0')} <small>/ 18</small></strong></div><div class="progress-track"><span style="width:${completeFraction}%"></span></div><p>${completed === 18 ? '18题已完成，可以揭开档案。' : completed === 0 ? '慢慢来，答案不会被评判。' : `每一个真实的选择，都让画像清晰一点。`}</p><div class="privacy-pill">${icon('lock', 13)}仅保存在此设备</div></div>
          <div class="quiz-aside-foot"><span class="foot-line"></span>人生有迹 <span class="aside-foot-sub">/ PERSONAL ARCHIVE</span></div>
        </aside>
        <section class="question-panel" aria-label="测试题目">
          <div class="question-top"><div class="chapter-pill"><span class="chapter-number">${String(section + 1).padStart(2, '0')}</span><span>${dimension.chapter}</span></div><span class="question-counter">第 <strong>${String(activeQuestion + 1).padStart(2, '0')}</strong> 题 <span class="counter-divider">/</span> 18</span></div>
          <div class="question-progress"><span style="width:${((activeQuestion + (selected !== null ? 1 : 0)) / 18) * 100}%"></span></div>
          <div class="question-heading-wrap"><span class="question-overline">CHAPTER ${String(section + 1).padStart(2, '0')} &nbsp;—&nbsp; ${dimension.name}</span><h2 id="question-title">${escapeHtml(question.text)}</h2><p class="question-guidance">选最接近你通常反应的一项，不必多想。</p></div>
          <fieldset class="options-fieldset" aria-labelledby="question-title"><legend class="sr-only">请选择你的答案</legend>${question.options.map((option, i) => `<button type="button" class="answer-option ${selected === i ? 'is-selected' : ''}" data-action="answer" data-index="${i}" aria-pressed="${selected === i}"><span class="option-letter">${option.label}</span><span class="option-copy">${escapeHtml(option.text)}</span><span class="option-check" aria-hidden="true">${icon('check', 16)}</span></button>`).join('')}</fieldset>
          <p class="answer-notice ${notice ? 'notice-show' : ''}" aria-live="polite">${escapeHtml(notice)}</p>
          <div class="question-footer"><button class="back-button" data-action="prev" ${activeQuestion === 0 ? 'disabled' : ''}>${icon('left', 17)}<span>上一题</span></button><button class="button ${activeQuestion === 17 ? 'button--final' : 'button--next'} ${selected === null ? 'is-muted' : ''}" data-action="next">${activeQuestion === 17 ? '揭开我的结果' : '下一题'} <span class="button-icon">${icon(activeQuestion === 17 ? 'sparkles' : 'right', 17)}</span></button></div>
          <div class="question-autosave"><span class="autosave-dot"></span>已自动保存作答进度</div>
        </section>
        <aside class="quiz-margin" aria-hidden="true"><span class="margin-seal">第<br>${String(activeQuestion + 1).padStart(2, '0')}<br>页</span><span class="margin-vertical">EVERY ANSWER LEAVES A TRACE</span></aside>
      </main>
    </div>`;
}

function radarChart(scores, strongest, developing) {
  const center = 185;
  const radius = 125;
  const point = (i, r) => { const angle = -Math.PI / 2 + i * (Math.PI * 2 / 6); return [+(center + Math.cos(angle) * r).toFixed(2), +(center + Math.sin(angle) * r).toFixed(2)]; };
  const polygons = [20, 40, 60, 80, 100].map(level => DIMENSIONS.map((_, i) => point(i, radius * level / 100).join(',')).join(' '));
  const axes = DIMENSIONS.map((_, i) => { const [x, y] = point(i, radius); return `<line x1="${center}" y1="${center}" x2="${x}" y2="${y}" class="radar-axis"/>`; }).join('');
  const valuePoints = DIMENSIONS.map((d, i) => point(i, radius * scores[d.code] / 9)).map(point => point.join(',')).join(' ');
  const labels = DIMENSIONS.map((d, i) => { const [x, y] = point(i, radius + 34); const anchor = x < center - 15 ? 'end' : x > center + 15 ? 'start' : 'middle'; const value = Math.round(scores[d.code] / 9 * 100); const special = d.code === strongest ? 'is-strongest' : d.code === developing ? 'is-developing' : ''; return `<text x="${x}" y="${y}" text-anchor="${anchor}" class="radar-label ${special}">${d.name}</text><text x="${x}" y="${y + 16}" text-anchor="${anchor}" class="radar-value ${special}">${value}</text>`; }).join('');
  const nodes = DIMENSIONS.map((d, i) => { const [x, y] = point(i, radius * scores[d.code] / 9); return `<circle cx="${x}" cy="${y}" r="3.4" class="radar-node"/>`; }).join('');
  return `<svg class="radar-svg" viewBox="0 0 370 370" role="img" aria-labelledby="radar-title radar-desc"><title id="radar-title">六维行为倾向图</title><desc id="radar-desc">${DIMENSIONS.map(d => `${d.name} ${Math.round(scores[d.code] / 9 * 100)}%`).join('；')}</desc>${polygons.map((points, i) => `<polygon points="${points}" class="radar-grid ${i === 4 ? 'radar-grid--outer' : ''}"/>`).join('')}${axes}<polygon points="${valuePoints}" class="radar-area"/>${nodes}${labels}</svg>`;
}

function renderProfileHero(profile, result) {
  return `<div class="result-hero result-theme--${profile.theme}"><div class="result-hero-annotation result-hero-annotation--top">LIFE PATTERN STUDIES &nbsp; / &nbsp; A REFLECTIVE MIRROR</div><div class="result-image"><img src="./assets/${escapeHtml(profile.image)}" alt="${escapeHtml(profile.person)}原型艺术插画" loading="eager"><div class="result-image-vignette"></div><span class="result-image-index">FIG. 0${PROFILES.findIndex(p => p.id === profile.id) + 1}</span><span class="result-image-cap">${escapeHtml(profile.roman)}</span></div><div class="result-hero-copy"><span class="result-label"><span class="eyebrow-rule"></span>你的历史人格映射</span><span class="result-roman">YOUR HISTORICAL ARCHETYPE</span><h1>${escapeHtml(profile.person)}<span class="result-type">${escapeHtml(profile.type)}</span></h1><p class="result-era">${escapeHtml(profile.era)}</p><div class="result-match"><span class="match-icon">✳</span><span><small>性格原型匹配度 <i>娱乐性参考指标</i></small><strong>${Math.round(result.match)}<span>%</span></strong></span></div><p class="result-hero-quote">${escapeHtml(profile.quote)}</p><a class="result-scroll" href="#portrait-reading">向下阅读你的个人画像 <span>↓</span></a></div><div class="result-hero-tag"><span>JY</span> NO. ${String(PROFILES.findIndex(p => p.id === profile.id) + 1).padStart(2, '0')} · ${escapeHtml(profile.person)}</div></div>`;
}

function resultActionBar() {
  return `<nav class="result-actions" aria-label="结果操作"><button data-action="save-card">${icon('download', 16)}<span>保存分享卡</span></button><span class="action-divider"></span><button data-action="share-result">${icon('share', 16)}<span>分享此结果</span></button><span class="action-divider"></span><button data-action="restart">${icon('restart', 16)}<span>重新探索</span></button></nav>`;
}

function renderResult(result) {
  currentResult = { result, answers: [...answers], version: SCHEMA_VERSION };
  const profile = PROFILES.find(p => p.id === result.primary);
  const strongest = DIMENSIONS.find(d => d.code === result.strongest);
  const developing = DIMENSIONS.find(d => d.code === result.developing);
  const secondary = result.secondary ? PROFILES.find(p => p.id === result.secondary) : null;
  app.innerHTML = `<div class="site-frame result-frame">${header(true)}<main id="main" class="result-document"><div class="report-index"><span>PERSONAL ARCHIVE &nbsp;/&nbsp; V1.0</span><span>你的行为倾向手稿</span><span>七节个人画像 &nbsp; · &nbsp; 可慢慢阅读</span></div>
      ${renderProfileHero(profile, result)}
      <div class="report-content" id="portrait-reading">
        <section class="reading-intro" aria-labelledby="portrait-reading-title"><span class="reading-number">01</span><div class="reading-body"><span class="section-kicker">A NOTE TO YOURSELF</span><h2 id="portrait-reading-title">在你的选择里，<br>找到一直存在的<span>那条线索。</span></h2><p>${escapeHtml(profile.comment)}</p><div class="profile-tags">${profile.tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}</div><div class="keyword-row">${profile.keywords.map(k => `<span>${escapeHtml(k)}</span>`).join('<i>·</i>')}</div></div><div class="reading-margin-note">只是一面镜子<br>不是一个定论 &nbsp; ✳</div></section>
        <section class="analysis-section"><div class="section-heading"><span class="reading-number">02</span><div><span class="section-kicker">HOW YOU MOVE THROUGH THE WORLD</span><h2>属于你的<span>行为底色</span></h2></div></div><div class="analysis-grid">${profile.analysis.map((item, i) => `<article class="analysis-item"><span class="analysis-index">0${i + 1}</span><div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.text)}</p></div></article>`).join('')}</div></section>
        <section class="dimension-section"><div class="section-heading"><span class="reading-number">03</span><div><span class="section-kicker">YOUR INNER LANDSCAPE</span><h2>六种倾向，<span>一幅独特的你。</span></h2><p class="section-subtitle">更高的分数表示这种行为倾向在本次回答中更突出，不等于能力高低。</p></div></div><div class="dimension-card"><div class="radar-wrap">${radarChart(result.scores, result.strongest, result.developing)}</div><div class="dimension-notes"><span class="legend-mark"><span></span>你的行为倾向</span><p>这不是评判，也没有标准画像。它只是记录你在这些情境里，通常会把注意力放在哪里。</p><div class="strength-note"><span class="strength-symbol">↗</span><div><small>${result.balanced ? '六维得分相同' : '本次回答中最突出的倾向'}</small><strong>${result.balanced ? '每种倾向都留下了线索' : escapeHtml(strongest.name)}</strong><p>${result.balanced ? '本次回答没有唯一的最高或最低维度，不必强行为自己设定优势与短板。' : escapeHtml(strongest.high)}</p></div></div><div class="strength-note strength-note--soft"><span class="strength-symbol">＋</span><div><small>值得温柔尝试的新角度</small><strong>${result.balanced ? '从自己最在意的地方开始' : escapeHtml(developing.name)}</strong><p>${result.balanced ? '选择一项最想实践的小练习，观察它如何改变你的日常。' : escapeHtml(developing.growth)}</p></div></div><div class="balance-note">${icon('compass', 15)} <span>六项分值描述作答倾向，并不代表能力、优劣或固定性格。</span></div></div></div><div class="dimension-score-list">${DIMENSIONS.map((d, i) => `<div class="score-line"><span class="score-line-name"><span class="score-line-number">0${i + 1}</span>${d.name}</span><div class="score-track"><span style="width:${result.percentage[d.code]}%"></span></div><span class="score-value">${result.percentage[d.code]}<small>%</small></span></div>`).join('')}</div></section>
        ${secondary ? `<section class="secondary-note"><span class="section-kicker">ANOTHER NOTE IN YOUR MARGIN</span><div class="secondary-note-copy"><span>你的第二倾向原型</span><strong>${escapeHtml(secondary.person)}<small> · ${escapeHtml(secondary.type)}</small></strong><p>你的选择中，也能看见${escapeHtml(secondary.person)}式的另一种线索。这个副倾向是对画像的补充，不会改变主要结果。</p></div><span class="secondary-note-index">02 / 03</span></section>` : ''}
        <section class="advice-section"><div class="section-heading"><span class="reading-number">04</span><div><span class="section-kicker">SMALL THINGS TO TRY</span><h2>一些可以从今天开始的<span>小练习。</span></h2><p class="section-subtitle">成长不是把自己变成另一个人。只选一个建议，试试看它是否适合你。</p></div></div><div class="advice-list">${profile.advice.map((text, i) => `<article class="advice-item"><span class="advice-index">0${i + 1}</span><span class="advice-star">✳</span><p>${escapeHtml(text)}</p><span class="advice-done">留给自己</span></article>`).join('')}</div></section>
        <section class="history-section"><div class="section-heading"><span class="reading-number">05</span><div><span class="section-kicker">A PERSON FROM THE ARCHIVE</span><h2>一位留下了<span>自己的答案的人。</span></h2></div></div><div class="history-card"><div class="history-image"><img src="./assets/${escapeHtml(profile.image)}" alt="${escapeHtml(profile.person)}人物原型插画" loading="lazy"><span class="history-image-caption">${escapeHtml(profile.era)}</span></div><div class="history-copy"><span class="history-person-index">ARCHIVE ENTRY &nbsp;·&nbsp; ${String(PROFILES.findIndex(p => p.id === profile.id) + 1).padStart(2, '0')}</span><h3>${escapeHtml(profile.person)}<small>${escapeHtml(profile.roman)}</small></h3><p>${escapeHtml(profile.bio)}</p><blockquote>「${escapeHtml(profile.quote)}」</blockquote><span class="archive-asterisk">✳</span></div></div><p class="history-disclaimer">映射说明：历史人物经历与性格的解读具有复杂性。此处人物原型仅供文化联想与个人反思，不构成与历史人物的科学人格相似度判断。</p></section>
        ${result.easterEgg ? `<section class="easter-egg"><span class="egg-star">✳</span><div><span class="section-kicker">A HIDDEN PAGE HAS FOUND YOU</span><h2>你找到了<span>第四条路。</span></h2><span class="egg-stamp">隐藏人格<br>已解锁</span><p class="egg-name">无名的第四种人生 · 不按剧本的人</p><details class="egg-details"><summary>恭喜，你解锁了隐藏人格 <span>＋</span></summary><p>你可能不太愿意按照别人熟悉的方式生活。你不一定喜欢稳定的答案，也不喜欢被简单的性格标签定义。有时候，你甚至会在自己已经找到方向之后，重新提出问题。你更希望通过自己的经历，建立一套真正适合自己的生活方式。</p><p>真正的独立，不是为了反对而反对，而是知道自己为什么选择，以及愿意为自己的选择承担什么。</p><blockquote>你的人生不需要按照某个既定剧本完成，但你需要成为自己人生的真正作者。</blockquote><span class="egg-footnote">隐藏称号：人生的变量 · 非典型选择者｜反常规思维｜自我探索者｜拒绝被定义。<br>此彩蛋独立于主要结果，不改变你的正式原型。</span></details></div></section>` : ''}
        <section class="summary-section"><span class="reading-number">06</span><div><span class="section-kicker">A SMALL REMINDER</span><h2>留一页，给未来的自己。</h2><p>${escapeHtml(profile.summary)}</p></div></section><section class="share-section"><span class="reading-number">07</span><span class="section-kicker">YOUR ARCHIVE, YOUR STORY</span><h2>愿意把这份小发现，<br>分享给<span>另一个你吗？</span></h2><p>也许一次对话，就是重新认识自己的开始。</p>${resultActionBar()}<p class="share-footnote">人物匹配度是娱乐性参考指标，分数不代表概率或科学测量。</p></section>
        <footer class="report-footer"><a class="footer-seal" href="#home" data-action="home">迹</a><p>人生有迹 · 愿你走出自己的轨迹</p><p class="footer-small">趣味性格映射，仅供自我反思，不作为临床诊断或高风险决策依据。</p><a class="sources-link" href="https://commons.wikimedia.org/wiki/File:Leonardo_self.jpg" target="_blank" rel="noreferrer">达·芬奇历史肖像：Wikimedia Commons · Public domain</a></footer>
      </div></main></div>`;
  if (result.easterEgg) requestAnimationFrame(() => document.querySelector('.easter-egg')?.classList.add('is-revealed'));
  setupReveal();
}

function setupReveal() {
  const elements = document.querySelectorAll('.analysis-item, .score-line, .advice-item, .history-card, .secondary-note');
  if (!('IntersectionObserver' in window) || prefersReducedMotion) {
    elements.forEach(el => el.classList.add('is-in-view'));
    return;
  }
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('is-in-view'); observer.unobserve(entry.target); }
  }), { threshold: 0.12 });
  elements.forEach(el => observer.observe(el));
}

function setView(next) {
  view = next;
  notice = '';
  if (view === 'home') renderHome();
  else if (view === 'quiz') renderQuiz();
  window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'instant' : 'smooth' });
}

function startQuiz() {
  const data = readSave() ?? saved;
  answers = data ? [...data.answers] : Array(QUESTIONS.length).fill(null);
  if (answers.every(answer => answer !== null)) {
    view = 'result'; renderResult(calculateResult(answers)); window.scrollTo({ top: 0, behavior: 'instant' }); return;
  }
  activeQuestion = Math.min(answers.findIndex(answer => answer === null) === -1 ? 0 : answers.findIndex(answer => answer === null), QUESTIONS.length - 1);
  view = 'quiz';
  notice = '';
  renderQuiz();
  window.scrollTo({ top: 0, behavior: 'instant' });
  document.querySelector('.answer-option')?.focus({ preventScroll: true });
}

function nextQuestion() {
  if (answers[activeQuestion] === null) { notice = '请先选择最接近你真实想法的一项。'; renderQuiz(); document.querySelector('.answer-option')?.focus(); return; }
  notice = '';
  if (activeQuestion < QUESTIONS.length - 1) {
    activeQuestion++;
    renderQuiz();
    document.querySelector('.answer-option')?.focus({ preventScroll: true });
    return;
  }
  try {
    const result = calculateResult(answers);
    try { localStorage.setItem(`${SAVE_KEY}.result`, JSON.stringify({ version: SCHEMA_VERSION, answers: [...answers], result })); } catch { /* The report remains visible without optional local storage. */ }
    view = 'result';
    renderResult(result);
    window.scrollTo({ top: 0, behavior: 'instant' });
  } catch (error) { const missing = answers.findIndex(answer => answer === null); if (missing !== -1) activeQuestion = missing; notice = error.message; renderQuiz(); }
}

function resetTest() {
  answers = Array(QUESTIONS.length).fill(null);
  saved = null;
  currentResult = null;
  activeQuestion = 0;
  try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(`${SAVE_KEY}.result`); } catch { /* Restart this in-memory session. */ }
  startQuiz();
}

async function renderShareCard(result) {
  const profile = PROFILES.find(p => p.id === result.primary);
  const canvas = document.createElement('canvas');
  canvas.width = 1200; canvas.height = 1500;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f4f0e7'; ctx.fillRect(0, 0, 1200, 1500);
  ctx.fillStyle = '#294238'; ctx.fillRect(0, 0, 1200, 570);
  ctx.strokeStyle = 'rgba(239, 227, 195, 0.22)'; ctx.lineWidth = 1;
  ctx.strokeRect(56, 56, 1088, 1388); ctx.strokeRect(72, 72, 1056, 1356);
  ctx.fillStyle = '#e9dfc5'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = '500 25px "PingFang SC", "Microsoft YaHei", sans-serif'; ctx.fillText('迹', 108, 119);
  ctx.font = '500 22px "PingFang SC", "Microsoft YaHei", sans-serif'; ctx.letterSpacing = '5px'; ctx.fillText('人 生 有 迹', 158, 119); ctx.letterSpacing = '0px';
  ctx.fillStyle = '#c7b796'; ctx.font = '500 13px Arial, sans-serif'; ctx.fillText('A PERSONAL ARCHIVE  ·  AN INNER JOURNEY', 108, 181);
  const image = new Image(); image.src = `./assets/${profile.image}`;
  await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; });
  ctx.save(); ctx.beginPath(); ctx.roundRect(110, 230, 350, 465, 8); ctx.clip();
  ctx.fillStyle = '#dfd8c8'; ctx.fillRect(110, 230, 350, 465);
  const scale = Math.max(350 / image.width, 465 / image.height);
  const iw = image.width * scale, ih = image.height * scale;
  ctx.drawImage(image, 110 + (350 - iw) / 2, 230 + (465 - ih) / 2, iw, ih); ctx.restore();
  ctx.fillStyle = '#e6dcc3'; ctx.textAlign = 'left'; ctx.font = '400 17px Arial, sans-serif'; ctx.fillText(profile.roman, 510, 280);
  ctx.font = '700 64px "Noto Serif CJK SC", "Songti SC", "SimSun", serif'; ctx.fillStyle = '#fbf5e7'; ctx.fillText(profile.person, 508, 381);
  ctx.fillStyle = '#d5c5a6'; ctx.font = '400 24px "PingFang SC", "Microsoft YaHei", sans-serif'; ctx.fillText(profile.type, 512, 437);
  ctx.strokeStyle = 'rgba(239,227,195,.28)'; ctx.beginPath(); ctx.moveTo(510, 482); ctx.lineTo(1070, 482); ctx.stroke();
  ctx.fillStyle = '#e9dfc5'; ctx.font = '400 19px "PingFang SC", "Microsoft YaHei", sans-serif'; ctx.fillText('性格原型匹配度  ·  娱乐性参考指标', 510, 530);
  ctx.fillStyle = '#294238'; ctx.font = '600 90px Georgia, serif'; ctx.fillText(`${Math.round(result.match)}%`, 506, 633);
  ctx.textAlign = 'center'; ctx.fillStyle = '#344039'; ctx.font = '400 32px "Noto Serif CJK SC", "Songti SC", "SimSun", serif'; ctx.fillText(profile.quote, 600, 828);
  ctx.strokeStyle = '#c9bfae'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(215, 884); ctx.lineTo(985, 884); ctx.stroke();
  ctx.fillStyle = '#64665b'; ctx.font = '400 19px "PingFang SC", "Microsoft YaHei", sans-serif'; ctx.fillText('18 道情境题 · 六种行为倾向 · 一次自我探索', 600, 945);
  const pillY = 1015;
  DIMENSIONS.forEach((d, i) => { const x = 110 + i * 164; ctx.fillStyle = '#e8e1d4'; ctx.beginPath(); ctx.roundRect(x, pillY, 138, 112, 4); ctx.fill(); ctx.fillStyle = '#8c7755'; ctx.font = '400 16px "PingFang SC", "Microsoft YaHei", sans-serif'; ctx.fillText(d.short, x + 69, pillY + 34); ctx.fillStyle = '#344039'; ctx.font = '600 28px Georgia, serif'; ctx.fillText(String(Math.round(result.percentage[d.code])), x + 69, pillY + 76); });
  ctx.textAlign = 'left'; ctx.fillStyle = '#7d7668'; ctx.font = '400 17px "PingFang SC", "Microsoft YaHei", sans-serif'; ctx.fillText('趣味性格映射，仅供个人反思；不作诊断或高风险决策依据。', 110, 1268);
  ctx.font = '400 18px "PingFang SC", "Microsoft YaHei", sans-serif'; ctx.fillText('邀请你来探索：' + new URL('./', location.href).href, 110, 1210);
  ctx.fillStyle = '#30453c'; ctx.font = '500 16px Arial, sans-serif'; ctx.letterSpacing = '2px'; ctx.fillText('HISTORY AS A MIRROR · 2026', 110, 1375);
  ctx.textAlign = 'right'; ctx.letterSpacing = '0px'; ctx.fillStyle = '#7c755f'; ctx.font = '400 18px "PingFang SC", "Microsoft YaHei", sans-serif'; ctx.fillText('为自己留下一页。', 1080, 1375);
  return new Promise(resolve => canvas.toBlob(blob => resolve(blob), 'image/png'));
}

async function shareResult() {
  const stored = currentResult ?? readResult();
  if (!stored) { showToast('请先完成测试，生成个人档案。'); return; }
  const profile = PROFILES.find(p => p.id === stored.result.primary);
  const pageUrl = new URL('./', location.href).href;
  const shareData = { url: pageUrl, title: `人生有迹 · ${profile.person}型`, text: `我测出了自己的历史人物性格原型——${profile.person} · ${profile.type}。${profile.quote} 18道题，遇见历史中的自己。` };
  if (navigator.share) {
    try { await navigator.share(shareData); return; }
    catch (error) { if (error.name === 'AbortError') return; }
  }
  try { await navigator.clipboard.writeText(`${shareData.text}\n邀请你也来探索：${pageUrl}\n人物匹配度是娱乐性参考指标，不代表科学概率。`); showToast('结果文案已复制，可以分享给朋友。'); }
  catch { showToast('请使用“保存分享卡”，分享你的结果卡片。'); }
}

function readResult() {
  try {
    const data = JSON.parse(localStorage.getItem(`${SAVE_KEY}.result`));
    return data?.version === SCHEMA_VERSION && data?.result?.primary ? data : null;
  } catch { return null; }
}

async function saveShareCard() {
  const stored = currentResult ?? readResult();
  if (!stored) { showToast('完成18道题后，就可以保存专属卡片。'); return; }
  try {
    const blob = await renderShareCard(stored.result);
    if (!blob) throw new Error('无法生成分享图片。');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = '人生有迹-我的历史人物画像.png';
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    showToast('你的专属画像卡已保存到设备。');
  } catch { showToast('分享卡片生成失败，请稍后重试。'); }
}

function onAction(event) {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  if (button.tagName === 'A') event.preventDefault();
  if (action === 'home' || action === 'about') { setView('home'); if (action === 'about') setTimeout(() => document.querySelector('#about')?.scrollIntoView({ behavior: prefersReducedMotion ? 'instant' : 'smooth' }), 50); }
  else if (action === 'start') startQuiz();
  else if (action === 'answer') {
    answers[activeQuestion] = Number(button.dataset.index);
    notice = ''; saveProgress(); renderQuiz();
    document.querySelector(`.answer-option[data-index="${answers[activeQuestion]}"]`)?.focus({ preventScroll: true });
  }
  else if (action === 'next') nextQuestion();
  else if (action === 'prev' && activeQuestion > 0) { activeQuestion--; notice = ''; renderQuiz(); }
  else if (action === 'jump') { activeQuestion = Number(button.dataset.question); notice = ''; renderQuiz(); document.querySelector('.answer-option')?.focus({ preventScroll: true }); }
  else if (action === 'restart') resetTest();
  else if (action === 'share-result') shareResult();
  else if (action === 'save-card') saveShareCard();
}

function onKeydown(event) {
  if (view !== 'quiz' || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key === 'ArrowLeft' && activeQuestion > 0) { activeQuestion--; notice = ''; renderQuiz(); }
  if (event.key === 'ArrowRight' && answers[activeQuestion] !== null) nextQuestion();
  if (/^[1-4]$/.test(event.key) && document.activeElement?.tagName !== 'INPUT') {
    const index = Number(event.key) - 1; answers[activeQuestion] = index; notice = ''; saveProgress(); renderQuiz(); document.querySelector(`.answer-option[data-index="${index}"]`)?.focus({ preventScroll: true });
  }
}

app.addEventListener('click', onAction);
document.addEventListener('keydown', onKeydown);

if (saved?.answers?.filter(a => a !== null).length === QUESTIONS.length) {
  try {
    const result = calculateResult(saved.answers);
    localStorage.setItem(`${SAVE_KEY}.result`, JSON.stringify({ version: SCHEMA_VERSION, answers: [...saved.answers], result }));
  } catch { /* Invalid or obsolete saved answers should not block a fresh session. */ }
}
renderHome();
