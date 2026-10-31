/* MSP Confidence Score: quiz logic, scoring, lead capture and tracking. Vanilla JS, no build step. */
(() => {
  'use strict';

  // ---------- Config ----------
  const CONFIG = {
    showEmoji: true,          // kept on by decision, despite the brand guide; false hides answer emoji
    autoAdvance: true,        // move to the next question shortly after an answer is picked
    leadEndpoint: '/api/lead',
    // Calendly event; pre-filled with name, email and a1 (first custom question, which must be "Phone")
    booking: 'https://calendly.com/the-msp-growth-hub/right-fit-clarity-call?hide_event_type_details=1&hide_gdpr_banner=1',
    siteUrl: 'https://themspgrowthhubquiz.com/'  // base for the personal ?report= link
  };

  // One video from Ian per stage (Vimeo embeds). Leave a stage empty to show the placeholder instead.
  const STAGE_VIDEOS = {
    survive: 'https://player.vimeo.com/video/1240740985?h=03c272e4b7&title=0&byline=0&portrait=0&dnt=1',
    drive: 'https://player.vimeo.com/video/1240740987?h=67435567c6&title=0&byline=0&portrait=0&dnt=1',
    thrive: 'https://player.vimeo.com/video/1240740986?h=b490aa01df&title=0&byline=0&portrait=0&dnt=1',
    arrive: 'https://player.vimeo.com/video/1240727261?h=1346ae7c48&title=0&byline=0&portrait=0&dnt=1'
  };

  // ---------- Content ----------
  const PILLARS = [
    { key: 'ambition', name: 'Harness Your Ambition', icon: 'assets/img/icon-summit-climber.webp',
      text: { low: 'You\'re busy all the time, and a plan stays just that: a thought. You may have written one before and never looked at it again. Start by deciding where you want to be in two to three years, then ask honestly: can you get there working the way you do now?',
        mid: 'You have a sense of direction, but it lives in your head and gets lost in the week. Turn it into a simple written plan with clear priorities, and someone to hold you to it, and you\'ll stop drifting and start scaling.',
        high: 'You know where you\'re heading and why. Keep your plan alive with regular reviews and stretch goals so ambition never slips into comfort.' } },
    { key: 'capacity', name: 'Amplify Your Capacity', icon: 'assets/img/icon-team-meeting.webp',
      text: { low: 'You\'re maxed out and nervous about the cost of hiring. You\'re too technical with clients and only work ON the business at night and weekends. If you\'re still doing your own admin and invoicing, that\'s the no-brainer place to start.',
        mid: 'You have a team, but you\'re still the bottleneck. Map the roles your business needs to grow, see how your people fit them, and start handing over the things only you think you can do.',
        high: 'Your team carries the day to day. Now build the leadership layer and processes that let it grow without you. That\'s the road to Owner Not Needed.' } },
    { key: 'opps', name: 'Maximise Your Opportunities', icon: 'assets/img/icon-analytics-search.webp',
      text: { low: 'New business is rare, and when it comes it\'s mostly small, price-driven referrals. Marketing either hasn\'t worked or hasn\'t been tried. One clear sales funnel and one or two focused tactics beat waiting for a silver bullet.',
        mid: 'Leads come in, but not consistently, and your clients don\'t know everything you could do for them. When did you last talk to your top 20 clients about their business goals, not just their tech? Do that and you might be surprised.',
        high: 'You have lead flow and strong client relationships. Now sharpen the engine: track what converts, grow MRR from existing clients and invest where it pays back fastest.' } }
  ];
  const GROUPS = [
    { key: 'start', label: 'Start', name: 'Let\'s Get Started' },
    { key: 'ambition', label: 'Ambition', name: 'Pillar 1 · Harness Your Ambition' },
    { key: 'capacity', label: 'Capacity', name: 'Pillar 2 · Amplify Your Capacity' },
    { key: 'opps', label: 'Opportunities', name: 'Pillar 3 · Maximise Your Opportunities' },
    { key: 'about', label: 'About You', name: 'About Your MSP' }
  ];
  // [emoji, label, points]. Groups 'start' and 'about' are not scored.
  const Q = [
    { g: 'start', t: 'Are you a UK MSP owner?', o: [['👍', 'Yes', 0], ['👋', 'No', 0]] },
    { g: 'ambition', t: 'How clear is your growth plan?', o: [['😵‍💫', 'No plan, too distracted', 1], ['💭', 'It\'s in my head', 3], ['🧗', 'I have one, but don\'t stick to it', 5], ['🎯', 'Total clarity', 10]] },
    { g: 'ambition', t: 'Where do you want to be in 2–3 years?', goalSource: true, o: [['💷', 'Paying myself a decent wage', 1], ['📈', 'Past £1m turnover', 3], ['🔁', '£1m recurring revenue', 5], ['🚀', '£5m and beyond', 8]] },
    { g: 'ambition', t: 'How confident are you of getting there?', goal: true, o: [['😟', 'It\'s a pipe dream', 1], ['😐', 'Not very', 3], ['🙂', 'Mostly, with wobbles', 5], ['💪', 'On track', 10]] },
    { g: 'capacity', t: 'Where do you spend your day?', o: [['🔧', 'On the tools', 1], ['🌀', 'In the detail, needed for most things', 3], ['🧭', 'Directing my team', 5], ['🏝️', 'Not needed day to day', 10]] },
    { g: 'capacity', t: 'Do you have the right people in the right roles?', o: [['🙋', 'No team, I do it all', 1], ['🤷', 'Not really', 3], ['🤔', 'I think so', 6], ['✅', 'Absolutely', 8]] },
    { g: 'capacity', t: 'How easily do you delegate?', o: [['✋', 'I don\'t, I like control', 1], ['🔍', 'A bit, still in the detail', 3], ['📋', 'Most things', 5], ['🙌', 'Fully, I trust my team', 10]] },
    { g: 'opps', t: 'How do new leads come in?', o: [['🌵', 'They barely do', 1], ['🗣️', 'Mostly referrals', 3], ['🎣', 'Lots, but poor quality', 5], ['🔥', 'A steady flow of quality leads', 10]] },
    { g: 'opps', t: 'How often do you talk to existing clients?', o: [['👋', 'We keep losing them', 1], ['📞', 'Only when they call', 3], ['☕', 'Now and then', 5], ['💬', 'Regularly', 6]] },
    { g: 'opps', t: 'How do you feel about investing in marketing?', o: [['🙅', 'Burned before', 1], ['🤞', 'Want proof first', 3], ['🧐', 'Ready, unsure what\'s next', 5], ['💡', 'Confident it pays', 14]] },
    { g: 'about', t: 'How many people are in your team, not counting you?', o: [[null, '1–3', 1], [null, '4–8', 2], [null, '9–19', 3], [null, '20+', 4]] },
    { g: 'about', t: 'What\'s your annual turnover?', o: [[null, 'Under £250k', 1], [null, '£250k–£750k', 2], [null, '£750k–£1.5m', 3], [null, 'Over £1.5m', 4]] }
  ];
  const TEAM_Q = 10, TURNOVER_Q = 11;
  const STAGES = {
    survive: { key: 'survive', name: 'Survive', lede: 'You\'re in the Survive stage, still putting the basics in place.',
      body: 'Right now it\'s the daily grind: long hours on projects, wondering if you\'ll make it to next month, and scratching your head about how to grow. Every MSP starts here. Focus on the next step in your plan and, as confidence and momentum build, you\'ll move into Drive.' },
    drive: { key: 'drive', name: 'Drive', lede: 'You\'re in the Drive stage: growing, but chasing everything.',
      body: 'New clients, staff, projects, payments: you\'re chasing all of it. It\'s exciting at first, but stay here too long and being involved in everything wears you down. Moving beyond Drive is the key to £1m, and to an MSP that works for you rather than you for it. We call that ONN: Owner Not Needed.' },
    thrive: { key: 'thrive', name: 'Thrive', lede: 'You\'re in the Thrive stage. Things are working.',
      body: 'You have momentum in your team, sales and marketing, and you\'re finally stepping back from the day to day. But Thrive is fragile: losing a key client or person, or a touch of complacency, can pull you back into Drive. Now\'s the time to strengthen your team, sales, marketing and systems so you can accelerate.' },
    arrive: { key: 'arrive', name: 'Arrive', lede: 'You\'re in the Arrive stage. Not many MSPs get here.',
      body: 'Your business works for you: a great team, healthy profits and the freedom to give back, shape the future and lead the industry. So the real questions are: what made you take the score, and what\'s next for you?' }
  };
  // Client names are first name + last initial only
  const TESTIMONIALS = [
    { quote: 'In the last three years the business has grown from a stuck and struggling £500K to nearly £2million and from 10 to 22 staff, including having the confidence to merge with another MSP.', name: 'Neil S.', role: 'Managing Director, Reform IT' },
    { quote: 'Through Ian & Stuart\'s support and coaching, we have grown by 35% in year one of the MSP Mastery programme.', name: 'Chris G.', role: 'Co-Owner, Apex Computing' },
    { quote: 'The return on investment has been realised both financially (my turnover has increased 10x) and by getting some time back. I now have time to spend with my family and enjoy my weekends.', name: 'Dave N.', role: 'Better-IT Ltd' }
  ];
  // Shown under the stage video, matched to the person's stage
  const STAGE_QUOTES = {
    survive: { quote: 'My business had hit a ceiling… but with the tools, training and mentorship of MSP Growth Hub, we\'ve been able to remove that ceiling.', name: 'Paul G.', role: 'SystemWise' },
    drive: { quote: 'Stuart & Ian have helped us focus on what WE need to do, which has reduced overwhelm. They also coach our Leadership Team, which has aligned everyone in the vision of the business.', name: 'Jason F.', role: 'ESP Projects' },
    thrive: { quote: 'We\'ve grown from a stuck and struggling £500K to nearly £2million, including having the confidence to merge with another MSP. We have more opportunity and potential today than ever.', name: 'Neil S.', role: 'Managing Director, Reform IT' },
    arrive: { quote: 'My turnover has increased 10x, and I\'ve got time back. I now have time to spend with my family and enjoy my weekends.', name: 'Dave N.', role: 'Better-IT Ltd' }
  };
  // Shown above the booking calendar
  const BOOK_QUOTE = { quote: 'If you\'re thinking about reaching out, you\'re nervous, you\'re not quite sure where you\'re going, then just have a chat with Ian and Stuart because you won\'t regret it.', name: 'Ben S.', role: 'BLS Computer Solutions' };
  // Landing carousel: one review per person
  const REVIEWS_ALL = (() => { const seen = new Set(); return [...TESTIMONIALS, ...Object.values(STAGE_QUOTES), BOOK_QUOTE].filter(r => !seen.has(r.name) && seen.add(r.name)); })();

  // ---------- Helpers ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c]));
  const maxOf = q => Math.max(...q.o.map(x => x[2]));
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const setText = (sel, v) => $$(sel).forEach(el => { el.textContent = v; });

  // Funnel events → Cloudflare Zaraz (forwards to Meta Pixel, LinkedIn, GA etc. as configured in the dashboard)
  function track(name, props) {
    try {
      if (window.zaraz && typeof window.zaraz.track === 'function') window.zaraz.track(name, props || {});
      else (window.__quizEvents = window.__quizEvents || []).push({ name, props: props || {}, at: Date.now() });
    } catch (e) { /* never break the funnel over analytics */ }
  }

  // ---------- State (persisted per tab so a refresh doesn't lose progress) ----------
  const STORE = 'msp-confidence-score';
  let state = { screen: 'landing', qi: 0, answers: {}, form: { name: '', email: '', company: '', phone: '' } };
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORE) || 'null');
    if (saved && saved.screen) state = Object.assign(state, saved);
    // results/report need a submitted lead; fall back to details if it never happened
    if ((state.screen === 'results' || state.screen === 'report') && !state.submitted) state.screen = 'details';
  } catch (e) { /* storage unavailable */ }
  const save = () => { try { sessionStorage.setItem(STORE, JSON.stringify(state)); } catch (e) { /* ignore */ } };

  // ---------- Personal report link: ?report=<base64url {n:name, a:[answer idx], d:date}> ----------
  function reportCode(name, answers) {
    const json = JSON.stringify({ n: name, a: Q.map((x, i) => answers[i] ?? -1), d: new Date().toISOString().slice(0, 10) });
    return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  let fromReportLink = false;
  try {
    const r = new URLSearchParams(location.search).get('report');
    if (r) {
      const d = JSON.parse(decodeURIComponent(escape(atob(r.replace(/-/g, '+').replace(/_/g, '/')))));
      const a = {}; (d.a || []).forEach((v, i) => { if (v != null && v >= 0 && Q[i] && Q[i].o[v]) a[i] = v; });
      state = { screen: 'report', qi: 0, answers: a, form: { name: d.n || '', email: '', company: '', phone: '' }, reportDate: d.d, submitted: true };
      fromReportLink = true;
    }
  } catch (e) { console.warn('Invalid report link'); }

  // ---------- Scoring ----------
  function score() {
    const a = state.answers;
    let total = 0, totalMax = 0;
    const raw = PILLARS.map(p => {
      let s = 0, m = 0;
      Q.forEach((x, i) => { if (x.g === p.key) { m += maxOf(x); if (a[i] != null) s += x.o[a[i]][2]; } });
      total += s; totalMax += m;
      return { p, pct: Math.round(s / m * 100) };
    });
    const minPct = Math.min(...raw.map(r => r.pct));
    let focusSet = false;
    const pillars = raw.map(({ p, pct }, i) => {
      const isFocus = !focusSet && pct === minPct; if (isFocus) focusSet = true;
      const band = pct < 40 ? 'low' : pct < 70 ? 'mid' : 'high';
      return { num: i + 1, name: p.name, icon: p.icon, pct, text: p.text[band], isFocus };
    });
    const overall = Math.round(total / totalMax * 100);
    const stage = STAGES[overall <= 33 ? 'survive' : overall <= 66 ? 'drive' : overall <= 89 ? 'thrive' : 'arrive'];
    return { raw, pillars, overall, stage };
  }
  const answerText = i => state.answers[i] != null ? Q[i].o[state.answers[i]][1] : '';

  function bookingUrl() {
    const f = state.form;
    const pre = { name: f.name.trim(), email: f.email.trim(), a1: f.phone.trim() };
    Object.keys(pre).forEach(k => { if (!pre[k]) delete pre[k]; });
    const qs = new URLSearchParams(pre).toString();
    return CONFIG.booking + (qs ? '&' + qs : '');
  }
  const bookingEmbedUrl = () => bookingUrl() + '&embed_type=Inline&embed_domain=' + encodeURIComponent(location.hostname || 'themspgrowthhubquiz.com');

  // ---------- Navigation ----------
  // restored = re-showing a saved screen after a refresh, so funnel events aren't double-counted
  function go(screen, restored) {
    state.screen = screen; save();
    $$('[data-screen]').forEach(el => { el.hidden = el.dataset.screen !== screen; });
    if (!restored) window.scrollTo(0, 0);
    const t = restored ? () => {} : track;
    if (screen === 'quiz') renderQuiz();
    if (screen === 'details') t('quiz_completed');
    if (screen === 'results') { renderResults(); t('results_viewed'); }
    if (screen === 'report') { renderReport(); t('report_viewed'); }
    document.title = screen === 'landing' ? 'The MSP Confidence Score · The MSP Growth Hub'
      : screen === 'report' ? 'Your MSP Confidence Score Report' : 'The MSP Confidence Score';
  }

  // ---------- Quiz ----------
  let advanceTimer;
  function renderQuiz(focus) {
    const { qi, answers } = state;
    const cur = Q[qi];
    const sel = answers[qi];
    $('#q-num').textContent = qi + 1;
    $('#q-total').textContent = Q.length;
    $('#q-group').textContent = GROUPS.find(g => g.key === cur.g).name;
    $('#q-text').textContent = cur.t;

    const goalQ = Q.findIndex(x => x.goalSource);
    const showGoal = !!cur.goal && answers[goalQ] != null;
    $('#q-goal').hidden = !showGoal;
    if (showGoal) $('#q-goal-label').textContent = answerText(goalQ);

    $('#q-opts').innerHTML = cur.o.map(([e, t], i) => {
      const on = sel === i;
      return `<button type="button" class="opt" role="radio" aria-checked="${on}" tabindex="${on || (sel == null && i === 0) ? 0 : -1}" data-i="${i}">` +
        (CONFIG.showEmoji && e ? `<span class="emoji" aria-hidden="true">${e}</span>` : '') +
        `<span class="label">${esc(t)}</span><span class="ring"><span class="dot"></span></span></button>`;
    }).join('');

    let start = 0;
    $('#segs').innerHTML = GROUPS.map(g => {
      const len = Q.filter(x => x.g === g.key).length;
      const done = Math.max(0, Math.min(len, qi - start + (sel != null ? 1 : 0)));
      const active = qi >= start && qi < start + len;
      start += len;
      return `<div class="seg${active ? ' active' : ''}" style="flex:${Math.max(len, 1.5)}"><div class="seg-track"><div class="seg-fill" style="width:${done / len * 100}%"></div></div><span class="seg-label">${esc(g.label)}</span></div>`;
    }).join('');

    const next = $('#q-next');
    next.disabled = sel == null;
    next.textContent = qi === Q.length - 1 ? 'See My Score →' : 'Next →';
    if (focus) $('#q-text').focus({ preventScroll: true });
  }

  function pick(i) {
    const qi = state.qi, cq = Q[qi];
    track('question_answered', { question: qi + 1, pillar: cq.g, answer: cq.o[i][1] });
    state.answers = Object.assign({}, state.answers, { [qi]: i }); save();
    renderQuiz();
    const btn = $(`#q-opts .opt[data-i="${i}"]`); if (btn) btn.focus({ preventScroll: true });
    if (CONFIG.autoAdvance) { clearTimeout(advanceTimer); advanceTimer = setTimeout(next, 260); }
  }
  function next() {
    clearTimeout(advanceTimer);
    if (state.answers[state.qi] == null) return;
    if (state.qi < Q.length - 1) { state.qi += 1; save(); renderQuiz(true); window.scrollTo(0, 0); }
    else go('details');
  }
  function back() {
    clearTimeout(advanceTimer);
    if (state.qi === 0) go('landing');
    else { state.qi -= 1; save(); renderQuiz(true); }
  }
  function start() {
    track('quiz_started');
    state.qi = 0; state.answers = {}; state.submitted = false; delete state.reportDate;
    // a fresh quiz shouldn't reopen someone's shared report on refresh
    if (location.search.includes('report=')) history.replaceState(null, '', location.pathname);
    go('quiz');
  }

  // ---------- Lead capture ----------
  function validate() {
    const f = state.form;
    const ok = {
      name: !!f.name.trim(),
      email: EMAIL_RE.test(f.email.trim()),
      company: !!(f.company || '').trim(),
      phone: f.phone.replace(/[^\d]/g, '').length >= 10
    };
    return ok;
  }
  const today = () => (state.reportDate ? new Date(state.reportDate) : new Date()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  function showErrors(ok) {
    Object.keys(ok).forEach(k => {
      const field = $(`.field[data-field="${k}"]`);
      field.classList.toggle('invalid', !ok[k]);
      field.querySelector('.err').hidden = ok[k];
      field.querySelector('input').setAttribute('aria-invalid', String(!ok[k]));
    });
  }
  let tried = false;
  function submit(e) {
    e.preventDefault();
    const ok = validate();
    if (!(ok.name && ok.email && ok.company && ok.phone)) {
      tried = true; showErrors(ok);
      const firstBad = Object.keys(ok).find(k => !ok[k]);
      $(`.field[data-field="${firstBad}"] input`).focus();
      return;
    }
    tried = false; showErrors(ok);
    const f = state.form;
    const { raw, pillars, overall, stage } = score();
    const parts = f.name.trim().split(/\s+/);
    const payload = {
      firstName: parts[0], lastName: parts.slice(1).join(' '),
      email: f.email.trim(), phone: f.phone.trim(), company: f.company.trim(),
      overallScore: overall, stage: stage.name,
      ambitionScore: raw[0].pct, capacityScore: raw[1].pct, opportunitiesScore: raw[2].pct,
      biggestConstraint: pillars.find(p => p.isFocus).name,
      teamSize: answerText(TEAM_Q),
      turnover: answerText(TURNOVER_Q),
      answers: Q.map((x, i) => ({ q: x.t, a: answerText(i) })),
      reportLink: CONFIG.siteUrl + '?report=' + reportCode(f.name.trim(), state.answers),
      source: 'msp-confidence-score', submittedAt: new Date().toISOString(),
      pageUrl: location.href, referrer: document.referrer
    };
    if (submitting) return;
    setSubmitState('saving');
    sendLead(payload).then(() => {
      track('lead_submitted', { stage: stage.name, overall_score: overall });
      setSubmitState('idle');
      state.submitted = true;
      go('results');
    }).catch(() => {
      track('lead_submit_failed');
      setSubmitState('error');
    });
  }

  // Button label, disabled state and inline error for the lead form
  let submitting = false;
  function setSubmitState(s) {
    submitting = s === 'saving';
    const btn = $('#lead-submit');
    btn.disabled = submitting;
    btn.textContent = submitting ? 'Saving Your Results…' : s === 'error' ? 'Try Again →' : 'Show My Score →';
    $('#submit-error').hidden = s !== 'error';
  }

  // Waits up to 5s for /api/lead to confirm { ok: true }, retrying once.
  // If Ontraport is slower than that, results show anyway and the save carries on (keepalive).
  // Rejects only when both attempts fail within the 5s.
  function sendLead(payload) {
    const body = JSON.stringify(payload);
    const attempt = async () => {
      const res = await fetch(CONFIG.leadEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) throw new Error(j.error || 'HTTP ' + res.status);
      return j;
    };
    const withRetry = attempt().catch(() => new Promise(r => setTimeout(r, 1200)).then(attempt));
    let timedOut = false;
    const timeout = new Promise(r => setTimeout(() => { timedOut = true; r({ ok: true, slow: true }); }, 5000));
    // A failure after the visitor has moved on still gets reported
    withRetry.catch(e => { if (timedOut) track('lead_submit_failed', { after_timeout: true }); console.error('Lead save failed:', e.message); });
    return Promise.race([withRetry, timeout]);
  }

  // ---------- Results ----------
  // Quote text with bold, coloured quote marks (colour comes from CSS: blue on light, yellow inside .on-navy)
  const quoted = t => `<span class="qm">“</span>${esc(t.quote)}<span class="qm">”</span>`;
  const quoteCard = (t, cls = '', attrs = '') => `<figure class="quote-card ${cls}"${attrs}><blockquote>${quoted(t)}</blockquote><figcaption class="who"><b>${esc(t.name)}</b><small>${esc(t.role)}</small></figcaption></figure>`;
  const captionedQuote = t => `<blockquote>${quoted(t)}</blockquote><figcaption><strong>${esc(t.name)}</strong> · ${esc(t.role)}</figcaption>`;
  const setPill = (sel, stage, outlineSurvive, label) => $$(sel).forEach(el => {
    el.className = `pill ${stage.key}${outlineSurvive && stage.key === 'survive' ? ' outline' : ''} ${sel.slice(1)}`;
    el.textContent = label;
  });

  function renderStageCommon(s) {
    setText('.js-overall', s.overall);
    setText('.js-overall-pct', s.overall + '%');
    setText('.js-stage-lede', s.stage.lede);
    setText('.js-stage-body', s.stage.body);
  }

  function renderResults() {
    const s = score();
    renderStageCommon(s);
    setText('.js-first', state.form.name.trim().split(/\s+/)[0]);
    setPill('.js-stage-pill-results', s.stage, true, s.stage.name + ' Stage');
    $('#res-pillars').innerHTML = s.pillars.map(p => `
      <div class="res-pillar${p.isFocus ? ' focus' : ''}">
        <div class="res-pillar-head">
          <img src="${p.icon}" alt="" width="60" height="60">
          <div class="res-pillar-title">
            ${p.isFocus ? '<span class="focus-tag">Your biggest constraint · focus here first</span>' : ''}
            <h3>${esc(p.name)}</h3>
          </div>
          <span class="res-pct">${p.pct}%</span>
        </div>
        <div class="bar" role="img" aria-label="${p.pct}%"><i style="width:${p.pct}%"></i></div>
        <p>${esc(p.text)}</p>
      </div>`).join('');
    $('#res-testimonials').innerHTML = TESTIMONIALS.map(t => quoteCard(t, 'solid')).join('');
    setText('.js-stage-name', s.stage.name);
    renderVideo(s.stage);
    $('#stage-quote').innerHTML = captionedQuote(STAGE_QUOTES[s.stage.key]);
    $('#book-quote').innerHTML = captionedQuote(BOOK_QUOTE);
    const frame = $('#booking-frame'), url = bookingEmbedUrl();
    if (frame.getAttribute('src') !== url) frame.setAttribute('src', url);
  }

  // ---------- Report ----------
  function renderReport() {
    const s = score();
    renderStageCommon(s);
    setText('.js-full-name', state.form.name.trim());
    setText('.js-today', today());
    setPill('.js-stage-pill-report', s.stage, false, s.stage.name);
    $('#rep-pillars').innerHTML = s.pillars.map(p => `
      <div class="rp-pillar${p.isFocus ? ' focus' : ''}">
        <div class="rp-head">
          <img src="${p.icon}" alt="" width="52" height="52">
          <div class="rp-mid">
            <div class="rp-title"><h3>${p.num}. ${esc(p.name)}</h3>${p.isFocus ? '<span class="focus-tag">Focus here first</span>' : ''}</div>
            <div class="bar"><i style="width:${p.pct}%"></i></div>
          </div>
          <span class="rp-pct">${p.pct}%</span>
        </div>
        <p class="p16">${esc(p.text)}</p>
      </div>`).join('');
    $('#rep-testimonials').innerHTML = TESTIMONIALS.map(t => `<div class="t"><p class="quote-text">${quoted(t)}</p><span><strong>${esc(t.name)}</strong> · ${esc(t.role)}</span></div>`).join('');
    $('#rep-answers').innerHTML = Q.map((x, i) => `<div class="ans-row"><span class="n">${String(i + 1).padStart(2, '0')}</span><span class="q">${esc(x.t)}</span><span class="a">${esc(answerText(i) || '—')}</span></div>`).join('');
  }

  // ---------- Video ----------
  // Stage video from Ian, or the placeholder when that stage has no video yet
  function renderVideo(stage) {
    const url = STAGE_VIDEOS[stage.key] || '';
    const holder = $('#video-frame');
    holder.hidden = !url;
    $('#video').hidden = !!url;
    if (url && holder.dataset.src !== url) {
      holder.dataset.src = url;
      holder.dataset.tracked = '';
      holder.innerHTML = `<iframe src="${esc(url)}" title="${esc(stage.name)} stage video from Ian" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
      // Ask the Vimeo player to tell us when it starts playing, so video_play still fires
      holder.querySelector('iframe').addEventListener('load', e => {
        try { e.target.contentWindow.postMessage(JSON.stringify({ method: 'addEventListener', value: 'play' }), 'https://player.vimeo.com'); } catch (err) { /* ignore */ }
      });
    }
  }
  window.addEventListener('message', e => {
    if (e.origin !== 'https://player.vimeo.com') return;
    let d = e.data;
    try { if (typeof d === 'string') d = JSON.parse(d); } catch (err) { return; }
    const holder = $('#video-frame');
    if (d && d.event === 'play' && !holder.dataset.tracked) {
      holder.dataset.tracked = '1';
      track('video_play', { stage: score().stage.name });
    }
  });
  function playVideo() {
    track('video_play', { stage: score().stage.name });
  }

  // ---------- Wiring ----------
  function init() {
    // Carousel: the list twice so it can loop seamlessly; the copy is hidden from screen readers
    $('#review-track').innerHTML = REVIEWS_ALL.map(t => quoteCard(t)).join('') +
      REVIEWS_ALL.map(t => quoteCard(t, '', ' aria-hidden="true" data-dup')).join('');

    document.addEventListener('click', e => {
      const opt = e.target.closest('#q-opts .opt');
      if (opt) { pick(Number(opt.dataset.i)); return; }
      const el = e.target.closest('[data-action]');
      if (!el) return;
      switch (el.dataset.action) {
        case 'start': start(); break;
        case 'next': next(); break;
        case 'back': back(); break;
        case 'report': go('report'); break;
        case 'results': go('results'); break;
        case 'video': playVideo(); break;
        case 'book-results': {
          track('booking_click', { location: 'results' });
          const book = $('#book');
          window.scrollTo({ top: book.getBoundingClientRect().top + window.scrollY, behavior: 'smooth' });
          break;
        }
        case 'book-report': track('booking_click', { location: 'report' }); window.open(bookingUrl(), '_blank', 'noopener'); break;
        case 'print': track('report_downloaded'); window.print(); break;
      }
    });

    // Keyboard: 1–4 picks an answer, Enter moves on, arrows move within the radio group
    window.addEventListener('keydown', e => {
      if (state.screen !== 'quiz' || e.altKey || e.ctrlKey || e.metaKey) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= Q[state.qi].o.length) { e.preventDefault(); pick(n - 1); return; }
      if (e.key === 'Enter' && !e.target.closest('.opt, button')) { next(); return; }
      if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key) && e.target.closest('#q-opts')) {
        e.preventDefault();
        const opts = $$('#q-opts .opt');
        const cur = opts.indexOf(e.target.closest('.opt'));
        const step = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1;
        opts[(cur + step + opts.length) % opts.length].focus();
      }
    });

    const form = $('#lead-form');
    ['name', 'email', 'company', 'phone'].forEach(k => {
      const input = form.elements[k];
      input.value = state.form[k] || '';
      input.addEventListener('input', () => { state.form[k] = input.value; save(); if (tried) showErrors(validate()); });
    });
    form.addEventListener('submit', submit);

    go(state.screen, true);
    if (fromReportLink) track('report_link_opened');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
