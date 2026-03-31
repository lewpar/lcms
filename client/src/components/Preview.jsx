import { useState, useEffect } from 'react';
import { marked } from 'marked';
import { CALLOUT_COLORS, DIFFICULTY_LABELS, DIFFICULTY_COLORS } from '../blockTypes.js';
import { PREVIEW_STYLES } from '../previewStyles.js';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import python from 'highlight.js/lib/languages/python';
import xml from 'highlight.js/lib/languages/xml'; // html
import css from 'highlight.js/lib/languages/css';
import json from 'highlight.js/lib/languages/json';
import plaintext from 'highlight.js/lib/languages/plaintext';
import 'highlight.js/styles/atom-one-dark.css';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('css', css);
hljs.registerLanguage('json', json);
hljs.registerLanguage('plaintext', plaintext);

function highlight(code, language) {
  try {
    const lang = language === 'html' ? 'xml' : language;
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
  } catch {}
  return code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

marked.setOptions({ gfm: true, breaks: true });

function md(text) { return text ? marked.parse(text) : ''; }

function normalizeQuiz(block) {
  if (Array.isArray(block.questions)) return block;
  return {
    ...block,
    title: block.title || 'Quiz',
    description: block.description || '',
    questions: block.question
      ? [{ id: block.id + '-q0', question: block.question, options: block.options || [], correctIndex: block.correctIndex || 0, explanation: block.explanation || '' }]
      : [],
  };
}

function calcReadingTime(blocks) {
  let words = 0;
  for (const b of blocks) {
    const text = [
      b.content || '', b.text || '', b.title || '', b.summary || '',
      b.background || '', b.challenge || '', b.solution || '', b.outcome || '',
      ...(b.questions || []).map(q => q.question + ' ' + (q.options || []).join(' ')),
    ].join(' ');
    words += text.split(/\s+/).filter(Boolean).length;
  }
  return Math.max(1, Math.ceil(words / 200));
}

const CALLOUT_CONFIG = CALLOUT_COLORS;

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

// ── Playground preview ─────────────────────────────────

function PlaygroundPreview({ block }) {
  const [code, setCode] = useState(block.starterCode || '');
  const [output, setOutput] = useState(null);
  const runIdRef = useRef(0);

  useEffect(() => {
    setCode(block.starterCode || '');
    setOutput(null);
  }, [block.id]);

  const run = () => {
    const thisRun = ++runIdRef.current;
    setOutput([]);

    const stringify = (v) => {
      if (v === null) return 'null';
      if (v === undefined) return 'undefined';
      if (typeof v === 'string') return v;
      if (typeof v === 'function') return `[Function: ${v.name || 'anonymous'}]`;
      try { return JSON.stringify(v, null, 2); } catch { return String(v); }
    };

    const append = (s, t) => {
      if (runIdRef.current !== thisRun) return;
      setOutput(prev => {
        const next = (prev || []).filter(l => l.t !== 'empty');
        return [...next, { s, t }];
      });
    };

    const pgConsole = {
      log:   (...args) => append(args.map(stringify).join(' '), 'log'),
      warn:  (...args) => append(args.map(stringify).join(' '), 'warn'),
      error: (...args) => append(args.map(stringify).join(' '), 'error'),
    };

    let hadOutput = false;
    const origAppend = append;
    const trackingConsole = {
      log:   (...args) => { hadOutput = true; pgConsole.log(...args); },
      warn:  (...args) => { hadOutput = true; pgConsole.warn(...args); },
      error: (...args) => { hadOutput = true; pgConsole.error(...args); },
    };

    try { new Function('console', code)(trackingConsole); }
    catch (e) { hadOutput = true; origAppend(`${e.name}: ${e.message}`, 'error'); }

    if (!hadOutput) origAppend('(no output)', 'empty');
  };

  const msgColors   = { log: '#cbd5e1', warn: '#fcd34d', error: '#f87171' };
  const prefixColors = { log: '#475569', warn: '#f59e0b', error: '#ef4444' };

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', fontFamily: 'monospace' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: '#1e293b' }}>
        <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em' }}>
          {block.title || 'Interactive Playground'}
        </span>
        <button className="btn btn-sm" style={{ background: '#22c55e', color: '#fff', border: 'none', fontSize: 11, padding: '4px 12px', borderRadius: 4 }} onClick={run}>▶ Run</button>
        {output !== null && <button className="btn btn-sm btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => setOutput(null)}>⊘ Clear</button>}
      </div>
      <textarea
        value={code}
        onChange={e => setCode(e.target.value)}
        rows={8}
        style={{ width: '100%', background: '#0f172a', color: '#e2e8f0', padding: '12px 14px', fontFamily: "'SF Mono','Fira Code',monospace", fontSize: 12, lineHeight: 1.65, border: 'none', resize: 'vertical', outline: 'none', display: 'block', boxSizing: 'border-box' }}
        spellCheck={false}
        onKeyDown={e => {
          if (e.key === 'Tab') {
            e.preventDefault();
            const s = e.target.selectionStart, en = e.target.selectionEnd;
            const v = e.target.value.substring(0, s) + '  ' + e.target.value.substring(en);
            setCode(v);
            setTimeout(() => { e.target.selectionStart = e.target.selectionEnd = s + 2; }, 0);
          }
        }}
      />
      {output !== null && (
        <div style={{ background: '#0a0f1a', borderTop: '1px solid #1e293b', padding: '8px 14px', minHeight: 40, maxHeight: 180, overflowY: 'auto' }}>
          {output.map((line, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, fontSize: 12, lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {line.t !== 'empty' && (
                <span style={{ color: prefixColors[line.t] || '#475569', fontWeight: 700, flexShrink: 0, fontSize: '0.9em', alignSelf: 'flex-start', marginTop: '0.08em' }}>[{line.t}]</span>
              )}
              <span style={{ color: line.t === 'empty' ? '#334155' : (msgColors[line.t] || '#cbd5e1'), fontStyle: line.t === 'empty' ? 'italic' : 'normal' }}>{line.s}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Interactive quiz ───────────────────────────────────

function QuizPreview({ block }) {
  const b = normalizeQuiz(block);
  const questions = b.questions || [];
  const n = questions.length;

  const [phase, setPhase] = useState('start');
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState(() => new Array(n).fill(-1));
  const [answered, setAnswered] = useState(false);
  const [selectedOption, setSelectedOption] = useState(-1);

  useEffect(() => {
    setPhase('start');
    setCurrent(0);
    setAnswers(new Array(questions.length).fill(-1));
    setAnswered(false);
    setSelectedOption(-1);
  }, [block.id, questions.length]);

  const startQuiz = () => { setPhase('question'); setCurrent(0); setAnswered(false); setSelectedOption(-1); };
  const selectAnswer = (idx) => { if (answered) return; setSelectedOption(idx); };
  const submitAnswer = () => {
    if (selectedOption === -1 || answered) return;
    setAnswered(true);
    setAnswers(prev => { const a = [...prev]; a[current] = selectedOption; return a; });
  };
  const nextQuestion = () => { setCurrent(c => c + 1); setAnswered(false); setSelectedOption(-1); };
  const showResults = () => setPhase('results');
  const retry = () => {
    setPhase('question');
    setCurrent(0);
    setAnswers(new Array(n).fill(-1));
    setAnswered(false);
    setSelectedOption(-1);
  };

  const progress = n > 0 ? (current / n) * 100 : 0;
  const selected = answers[current];
  const correctCount = answers.filter((a, i) => questions[i] && a === questions[i].correctIndex).length;
  const pct = n > 0 ? Math.round((correctCount / n) * 100) : 0;

  const PRIMARY = '#6c63ff';
  const s = {
    wrap: { border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' },
    header: { background: PRIMARY, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    headerTitle: { fontSize: '0.88em', fontWeight: 700, color: '#fff', letterSpacing: '0.01em' },
    headerBadge: { background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: '0.7em', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '3px 10px', borderRadius: 20 },
    start: { padding: '32px 28px', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' },
    title: { fontWeight: 800, fontSize: '1.25em', color: '#0f172a', lineHeight: 1.3 },
    muted: { color: '#64748b', fontSize: '0.88em', lineHeight: 1.6 },
    count: { color: '#64748b', fontSize: '0.82em', display: 'flex', alignItems: 'center', gap: 6 },
    startBtn: { background: PRIMARY, color: '#fff', border: 'none', padding: '11px 28px', borderRadius: 8, fontSize: '0.92em', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginTop: 4, boxShadow: '0 2px 6px rgba(0,0,0,0.14)' },
    qWrap: { padding: '22px 24px', background: '#fff' },
    progressWrap: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, paddingBottom: 18, borderBottom: '1px solid #f1f5f9' },
    progressBar: { flex: 1, height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' },
    progressFill: { height: '100%', background: PRIMARY, borderRadius: 4, transition: 'width 0.5s cubic-bezier(.4,0,.2,1)', width: `${progress}%` },
    progressText: { fontSize: '0.8em', color: '#64748b', fontWeight: 700, whiteSpace: 'nowrap', minWidth: 48, textAlign: 'right' },
    qText: { fontSize: '1.04em', fontWeight: 700, marginBottom: 16, lineHeight: 1.5, color: '#0f172a' },
    optionBase: { width: '100%', textAlign: 'left', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '12px 14px', cursor: 'pointer', fontSize: '0.92em', color: '#374151', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10, transition: 'all 0.15s' },
    optionSelected: { borderColor: PRIMARY, background: '#f5f4ff', boxShadow: `0 0 0 3px rgba(108,99,255,0.1)` },
    optionCorrect: { borderColor: '#22c55e', background: '#f0fdf4', color: '#15803d', fontWeight: 600 },
    optionIncorrect: { borderColor: '#ef4444', background: '#fef2f2', color: '#b91c1c' },
    submitBtn: { background: selectedOption === -1 ? '#e2e8f0' : PRIMARY, color: selectedOption === -1 ? '#94a3b8' : '#fff', border: 'none', padding: '11px 24px', borderRadius: 8, fontSize: '0.9em', fontWeight: 700, cursor: selectedOption === -1 ? 'not-allowed' : 'pointer', marginTop: 14, fontFamily: 'inherit', boxShadow: selectedOption === -1 ? 'none' : '0 2px 6px rgba(0,0,0,0.14)' },
    navBtn: { background: PRIMARY, color: '#fff', border: 'none', padding: '11px 24px', borderRadius: 8, fontSize: '0.9em', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 6px rgba(0,0,0,0.14)' },
    outlineBtn: { background: 'transparent', color: PRIMARY, border: `1.5px solid ${PRIMARY}`, padding: '11px 24px', borderRadius: 8, fontSize: '0.9em', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
    feedback: (ok) => ({ padding: '11px 14px', borderRadius: 8, fontWeight: 600, fontSize: '0.88em', marginTop: 14, lineHeight: 1.5, background: ok ? '#f0fdf4' : '#fef2f2', color: ok ? '#15803d' : '#dc2626', border: `1px solid ${ok ? '#bbf7d0' : '#fecaca'}` }),
    explanation: { padding: '11px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.86em', color: '#64748b', marginTop: 10, lineHeight: 1.6 },
    results: { padding: '36px 28px', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 },
    resultsTitle: { fontSize: '1.2em', fontWeight: 800, color: '#0f172a' },
    ring: { width: 110, height: 110, borderRadius: '50%', border: `6px solid ${PRIMARY}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', boxShadow: `0 0 0 10px rgba(108,99,255,0.1), 0 4px 16px rgba(0,0,0,0.1)` },
    scoreNum: { fontSize: '1.6em', fontWeight: 800, color: PRIMARY, lineHeight: 1 },
    scoreLbl: { fontSize: '0.6em', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 2 },
    scorePct: { fontSize: '0.95em', fontWeight: 600, color: '#64748b' },
    review: { width: '100%', display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 480 },
    reviewItem: (ok) => ({ display: 'flex', gap: 10, fontSize: '0.84em', padding: '9px 14px', borderRadius: 8, background: ok ? '#f0fdf4' : '#fef2f2', color: ok ? '#15803d' : '#b91c1c', alignItems: 'flex-start', lineHeight: 1.5, border: `1px solid ${ok ? '#bbf7d0' : '#fecaca'}` }),
    retryBtn: { background: PRIMARY, color: '#fff', border: 'none', padding: '11px 24px', borderRadius: 8, fontSize: '0.9em', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 6px rgba(0,0,0,0.14)' },
  };

  const letterStyle = (i, isAnswered) => {
    const isSelected = !isAnswered && i === selectedOption;
    const isCorrect = isAnswered && i === questions[current]?.correctIndex;
    const isWrong = isAnswered && i === selected && i !== questions[current]?.correctIndex;
    return {
      width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '0.72em', fontWeight: 800,
      background: isSelected || isCorrect || isWrong ? (isCorrect ? '#22c55e' : isWrong ? '#ef4444' : PRIMARY) : '#f1f5f9',
      color: isSelected || isCorrect || isWrong ? '#fff' : '#94a3b8',
      border: `1.5px solid ${isSelected ? PRIMARY : isCorrect ? '#22c55e' : isWrong ? '#ef4444' : '#e2e8f0'}`,
      transition: 'all 0.15s',
    };
  };

  if (n === 0) return <div style={{ ...s.wrap, padding: 16, color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>No questions added yet.</div>;

  if (phase === 'start') {
    return (
      <div style={s.wrap}>
        <div style={s.header}>
          <span style={s.headerTitle}>{b.title || '(untitled quiz)'}</span>
          <span style={s.headerBadge}>{n} question{n !== 1 ? 's' : ''}</span>
        </div>
        <div style={s.start}>
          <div style={s.title}>{b.title || '(untitled quiz)'}</div>
          {b.description && <div style={s.muted}>{b.description}</div>}
          <div style={s.count}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: PRIMARY, opacity: 0.6, display: 'inline-block' }} />
            {n} question{n !== 1 ? 's' : ''}
          </div>
          <button style={s.startBtn} onClick={startQuiz}>Start Quiz →</button>
        </div>
      </div>
    );
  }

  if (phase === 'results') {
    return (
      <div style={s.wrap}>
        <div style={s.header}>
          <span style={s.headerTitle}>{b.title || 'Quiz'}</span>
          <span style={s.headerBadge}>Complete</span>
        </div>
        <div style={s.results}>
          <div style={s.resultsTitle}>Quiz Complete</div>
          <div style={s.ring}>
            <div style={{ textAlign: 'center' }}>
              <div style={s.scoreNum}>{correctCount}/{n}</div>
              <div style={s.scoreLbl}>correct</div>
            </div>
          </div>
          <div style={s.scorePct}>
            {pct}% — {pct >= 80 ? 'Excellent!' : pct >= 60 ? 'Good effort!' : 'Keep practising!'}
          </div>
          <div style={s.review}>
            {questions.map((q, i) => {
              const ok = answers[i] === q.correctIndex;
              return (
                <div key={q.id || i} style={s.reviewItem(ok)}>
                  <span style={{ fontWeight: 800, flexShrink: 0 }}>{ok ? '✓' : '✗'}</span>
                  <span>{q.question.length > 70 ? q.question.slice(0, 70) + '…' : q.question}</span>
                </div>
              );
            })}
          </div>
          <button style={s.retryBtn} onClick={retry}>↺ Try Again</button>
        </div>
      </div>
    );
  }

  // Question phase
  const q = questions[current];
  const isCorrect = selected === q.correctIndex;

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <span style={s.headerTitle}>{b.title || 'Quiz'}</span>
        <span style={s.headerBadge}>{current + 1} / {n}</span>
      </div>
      <div style={s.qWrap}>
        <div style={s.progressWrap}>
          <div style={s.progressBar}><div style={{ ...s.progressFill, width: `${progress}%` }} /></div>
          <span style={s.progressText}>{current + 1} / {n}</span>
        </div>
        <div style={s.qText}>{q.question || '(no question text)'}</div>
        <div>
          {(q.options || []).map((opt, i) => {
            let style = { ...s.optionBase };
            if (answered) {
              if (i === q.correctIndex) style = { ...style, ...s.optionCorrect };
              else if (i === selected) style = { ...style, ...s.optionIncorrect };
            } else if (i === selectedOption) {
              style = { ...style, ...s.optionSelected };
            }
            return (
              <button key={i} style={style} onClick={() => selectAnswer(i)} disabled={answered}>
                <span style={letterStyle(i, answered)}>{LETTERS[i] || String.fromCharCode(65 + i)}</span>
                <span>{opt || `(option ${i + 1})`}</span>
              </button>
            );
          })}
        </div>
        {!answered && (
          <button style={s.submitBtn} onClick={submitAnswer} disabled={selectedOption === -1}>
            Submit Answer
          </button>
        )}
        {answered && (
          <>
            <div style={s.feedback(isCorrect)}>
              {isCorrect ? '✓ Correct!' : '✗ Incorrect — the correct answer is highlighted.'}
            </div>
            {q.explanation && <div style={s.explanation}>{q.explanation}</div>}
            {current < n - 1
              ? <button style={s.navBtn} onClick={nextQuestion}>Next →</button>
              : <button style={s.navBtn} onClick={showResults}>See Results →</button>
            }
          </>
        )}
      </div>
    </div>
  );
}

// ── Fill-in-the-blank ───────────────────────────────────

function FillInTheBlankPreview({ block }) {
  const correctAnswers = block.answers || [];
  const lang = block.language || 'plaintext';
  const isCode = lang !== 'plaintext';

  const [userAnswers, setUserAnswers] = useState(correctAnswers.map(() => ''));
  const [checked, setChecked] = useState(false);

  const updateAnswer = (i, val) => {
    setChecked(false);
    setUserAnswers(a => { const n = [...a]; n[i] = val; return n; });
  };

  const allCorrect = checked && correctAnswers.every((ans, i) =>
    (userAnswers[i] || '').trim().toLowerCase() === (ans || '').trim().toLowerCase()
  );
  const isCorrect = (i) => (userAnswers[i] || '').trim().toLowerCase() === (correctAnswers[i] || '').trim().toLowerCase();

  const headerTitle = block.title || 'Fill in the Blanks';
  const FITB_HEADER = (
    <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '8px 16px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>
      {headerTitle}
    </div>
  );

  const FITB_FOOTER = (numBlanks, borderColor = '#e2e8f0') => numBlanks > 0 && (
    <div style={{ margin: '0 20px', paddingTop: 14, paddingBottom: 14, borderTop: `1px solid ${borderColor}`, display: 'flex', alignItems: 'center', gap: 10 }}>
      <button
        onClick={() => setChecked(true)}
        style={{ padding: '6px 16px', borderRadius: 6, border: 'none', background: '#6c63ff', color: '#fff', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}
      >
        Check Answers
      </button>
      {checked && (
        <span style={{ fontSize: 13, fontWeight: 600, color: allCorrect ? '#22c55e' : '#ef4444' }}>
          {allCorrect ? '✓ All correct!' : '✗ Not quite — try again.'}
        </span>
      )}
    </div>
  );

  if (isCode) {
    const parts = (block.prompt || '').split('___');
    const numBlanks = parts.length - 1;
    const hljsLang = lang === 'javascript' ? 'javascript' : lang === 'python' ? 'python' : lang === 'json' ? 'json' : 'plaintext';

    return (
      <div style={{ border: '1px solid #282c34', borderRadius: 10, overflow: 'hidden' }}>
        {FITB_HEADER}
        <div style={{ background: '#282c34' }}>
          <pre style={{ margin: 0, padding: '18px 20px', background: 'transparent', overflow: 'auto', fontFamily: "'Fira Code', 'Consolas', monospace", fontSize: '0.875em', lineHeight: 1.9 }}>
            <code>
              {parts.map((part, i) => (
                <span key={i}>
                  <span dangerouslySetInnerHTML={{ __html: highlight(part, hljsLang) }} />
                  {i < parts.length - 1 && (
                    <input
                      type="text"
                      value={userAnswers[i] || ''}
                      onChange={e => updateAnswer(i, e.target.value)}
                      style={{
                        border: `1.5px solid ${checked ? (isCorrect(i) ? '#22c55e' : '#ef4444') : '#4b5563'}`,
                        borderRadius: 4,
                        background: checked ? (isCorrect(i) ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)') : '#3b4252',
                        outline: 'none',
                        textAlign: 'center',
                        padding: '0 8px',
                        fontSize: '0.92em',
                        fontFamily: 'inherit',
                        lineHeight: '1.6',
                        width: Math.max(80, ((correctAnswers[i] || '').length + 4) * 8),
                        verticalAlign: 'middle',
                        color: '#abb2bf',
                      }}
                    />
                  )}
                </span>
              ))}
            </code>
          </pre>
          {FITB_FOOTER(numBlanks, '#3b4252')}
        </div>
      </div>
    );
  }

  // Plain text mode
  let counter = 0;
  const lineData = (block.prompt || '').split('\n').map(line => {
    if (!line.trim()) return { empty: true };
    const parts = line.split('___');
    return {
      empty: false,
      segments: parts.map((text, pi) => ({
        text,
        hasBlank: pi < parts.length - 1,
        idx: pi < parts.length - 1 ? counter++ : null,
      })),
    };
  });

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
      {FITB_HEADER}
      <div style={{ padding: '18px 20px' }}>
        <div>
          {lineData.map((line, li) =>
            line.empty
              ? <div key={li} style={{ height: '0.5em' }} />
              : (
                <p key={li} style={{ fontSize: '0.95em', lineHeight: 2.4, margin: '0 0 2px', color: '#1e293b' }}>
                  {line.segments.map((seg, si) => (
                    <span key={si}>
                      {seg.text}
                      {seg.hasBlank && (
                        <input
                          type="text"
                          value={userAnswers[seg.idx] || ''}
                          onChange={e => updateAnswer(seg.idx, e.target.value)}
                          style={{
                            border: `1.5px solid ${checked ? (isCorrect(seg.idx) ? '#22c55e' : '#ef4444') : '#94a3b8'}`,
                            borderRadius: 4,
                            background: checked ? (isCorrect(seg.idx) ? '#f0fdf4' : '#fef2f2') : '#f8fafc',
                            outline: 'none',
                            textAlign: 'center',
                            padding: '1px 8px',
                            fontSize: '0.92em',
                            width: Math.max(80, ((correctAnswers[seg.idx] || '').length + 4) * 8),
                            verticalAlign: 'middle',
                            color: '#0f172a',
                          }}
                        />
                      )}
                    </span>
                  ))}
                </p>
              )
          )}
        </div>
        {FITB_FOOTER(counter)}
      </div>
    </div>
  );
}

// ── Case study ─────────────────────────────────────────

function CaseStudyPreview({ block }) {
  const hasContent = block.background || block.instructions;

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f0f4ff 100%)', padding: '18px 22px', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: '0.72em', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6c63ff', marginBottom: 6 }}>Case Study</div>
        {block.title && <div style={{ fontWeight: 800, fontSize: '1.15em', color: '#0f172a', marginBottom: 6, lineHeight: 1.3 }}>{block.title}</div>}
        {block.summary && <div style={{ color: '#64748b', fontSize: '0.92em', lineHeight: 1.5 }}>{block.summary}</div>}
      </div>

      {/* Body sections */}
      {hasContent ? (
        <div>
          {block.background && (
            <div style={{ padding: '16px 22px', borderBottom: block.instructions ? '1px solid #e2e8f0' : undefined }}>
              <div style={{ fontSize: '0.68em', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#0ea5e9', marginBottom: 8 }}>Background</div>
              <div className="prose" style={{ fontSize: '0.92em' }} dangerouslySetInnerHTML={{ __html: md(block.background) }} />
            </div>
          )}
          {block.instructions && (
            <div style={{ padding: '16px 22px', background: '#fafbff' }}>
              <div style={{ fontSize: '0.68em', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6c63ff', marginBottom: 8 }}>Instructions</div>
              <div className="prose" style={{ fontSize: '0.92em' }} dangerouslySetInnerHTML={{ __html: md(block.instructions) }} />
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: 16, color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>No content added yet.</div>
      )}
    </div>
  );
}

// ── Other block renderers ──────────────────────────────

function BlockPreview({ block }) {
  switch (block.type) {
    case 'markdown':
      return <div className="prose" dangerouslySetInnerHTML={{ __html: md(block.content) }} />;

    case 'heading': {
      const Tag = `h${block.level || 2}`;
      const sizes = { 1: '2em', 2: '1.5em', 3: '1.25em', 4: '1.1em', 5: '1em', 6: '0.9em' };
      return (
        <Tag id={block.id_attr || undefined} style={{ fontSize: sizes[block.level || 2], fontWeight: 700, lineHeight: 1.25, margin: '0.5em 0 0.2em', color: '#0f172a' }}>
          {block.text || <span style={{ color: '#94a3b8' }}>(empty heading)</span>}
        </Tag>
      );
    }

    case 'callout': {
      const cfg = CALLOUT_CONFIG[block.color] || CALLOUT_CONFIG.blue;
      return (
        <div style={{ background: cfg.bg, borderLeft: `4px solid ${cfg.border}`, borderRadius: '0 8px 8px 0', padding: '12px 16px' }}>
          {block.title && <div style={{ fontWeight: 700, color: cfg.text, marginBottom: 4 }}>{block.title}</div>}
          <div style={{ color: '#374151', fontSize: '0.92em' }} dangerouslySetInnerHTML={{ __html: md(block.content) }} />
        </div>
      );
    }

    case 'quiz':
      return <QuizPreview block={block} />;

    case 'case-study':
      return <CaseStudyPreview block={block} />;

    case 'playground':
      return <PlaygroundPreview block={block} />;

    case 'code': {
      const highlighted = highlight(block.content || '', block.language || 'plaintext');
      return (
        <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
          {block.language && block.language !== 'plaintext' && (
            <div style={{ background: '#1e293b', color: '#94a3b8', padding: '5px 14px', fontSize: '11px', fontFamily: 'monospace' }}>{block.language}</div>
          )}
          <pre style={{ margin: 0, overflowX: 'auto', fontSize: '12px', lineHeight: 1.65, fontFamily: 'monospace' }}
               className="hljs">
            <code dangerouslySetInnerHTML={{ __html: highlighted }} />
          </pre>
          {block.caption && <div style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '5px 14px', fontSize: '12px', color: '#64748b', textAlign: 'center' }}>{block.caption}</div>}
        </div>
      );
    }

    case 'image':
      return (
        <figure style={{ margin: 0, textAlign: 'center' }}>
          {block.src
            ? <img src={block.src} alt={block.alt || ''} style={{ maxWidth: '100%', borderRadius: 8, display: 'block', margin: '0 auto' }} />
            : <div style={{ background: '#f1f5f9', borderRadius: 8, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 12 }}>No image selected</div>
          }
          {block.caption && <figcaption style={{ marginTop: 8, fontSize: '13px', color: '#64748b', fontStyle: 'italic' }}>{block.caption}</figcaption>}
        </figure>
      );

    case 'page-link': {
      const hasPage = block.pageTitle || block.pageSlug;
      return (
        <div style={{ border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: '#fafbff', cursor: hasPage ? 'pointer' : 'default', opacity: hasPage ? 1 : 0.5 }}>
          <div>
            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95em' }}>{block.pageTitle || '(no page selected)'}</div>
            {block.description && <div style={{ color: '#64748b', fontSize: '0.85em', marginTop: 3 }}>{block.description}</div>}
          </div>
          <span style={{ color: '#6c63ff', fontSize: '1.2em', flexShrink: 0 }}>→</span>
        </div>
      );
    }

    case 'video': {
      function extractYTId(url) {
        if (!url) return null;
        try {
          const u = new URL(url);
          if (u.hostname === 'youtu.be') return u.pathname.slice(1) || null;
          if (u.hostname === 'www.youtube.com' || u.hostname === 'youtube.com') {
            if (u.pathname.startsWith('/embed/')) return u.pathname.slice(7) || null;
            return u.searchParams.get('v') || null;
          }
        } catch {}
        return null;
      }
      const ytId = extractYTId(block.url);
      const hasUrl = (block.url || '').trim().length > 0;
      return (
        <figure style={{ margin: 0 }}>
          {ytId ? (
            <div className="video-preview-wrap">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${ytId}`}
                className="video-preview-iframe"
                allowFullScreen
                title={block.caption || 'Video'}
                loading="lazy"
              />
            </div>
          ) : (
            <div style={{ background: '#f1f5f9', borderRadius: 8, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 12 }}>
              {hasUrl ? 'Invalid YouTube URL' : 'No video URL set'}
            </div>
          )}
          {block.caption && <figcaption style={{ marginTop: 8, fontSize: '13px', color: '#64748b', fontStyle: 'italic', textAlign: 'center' }}>{block.caption}</figcaption>}
        </figure>
      );
    }

    case 'flashcard': {
      const cards = block.cards || [];
      const [fcIdx, setFcIdx] = useState(0);
      const [flipped, setFlipped] = useState(false);
      const card = cards[fcIdx] || {};
      const n = cards.length;
      if (!n) return <div style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 12 }}>No cards yet.</div>;
      return (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
          {block.title && <div style={{ background: '#6c63ff', color: '#fff', padding: '10px 16px', fontWeight: 700, fontSize: '.88em' }}>{block.title}</div>}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
            <button className="btn btn-secondary btn-sm" disabled={fcIdx === 0} onClick={() => { setFcIdx(i => i - 1); setFlipped(false); }}>← Prev</button>
            <span style={{ fontSize: '.82em', color: '#64748b', fontWeight: 600 }}>{fcIdx + 1} / {n}</span>
            <button className="btn btn-secondary btn-sm" disabled={fcIdx === n - 1} onClick={() => { setFcIdx(i => i + 1); setFlipped(false); }}>Next →</button>
          </div>
          <div style={{ padding: 20, display: 'flex', justifyContent: 'center' }}>
            <div
              onClick={() => setFlipped(f => !f)}
              style={{ width: '100%', maxWidth: 480, height: 160, border: `1.5px solid ${flipped ? '#6c63ff' : '#e2e8f0'}`, borderRadius: 8, background: flipped ? 'rgba(108,99,255,.08)' : '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 16, textAlign: 'center', transition: 'background .2s,border-color .2s' }}
            >
              <div style={{ fontSize: '.62em', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: flipped ? '#6c63ff' : '#94a3b8' }}>{flipped ? 'Back' : 'Front'}</div>
              <div style={{ fontWeight: 600, lineHeight: 1.5 }}>{flipped ? (card.back || '(empty)') : (card.front || '(empty)')}</div>
            </div>
          </div>
          <div style={{ textAlign: 'center', fontSize: '.72em', color: '#94a3b8', paddingBottom: 10, fontStyle: 'italic' }}>Click card to flip</div>
        </div>
      );
    }

    case 'table': {
      const headers = block.headers || [];
      const rows = block.rows || [];
      if (!headers.length) return <div style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 12 }}>No columns defined.</div>;
      return (
        <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.9em' }}>
            {block.caption && <caption style={{ captionSide: 'bottom', fontSize: '.78em', color: '#64748b', fontStyle: 'italic', padding: 8, textAlign: 'center' }}>{block.caption}</caption>}
            <thead>
              <tr>{headers.map((h, i) => <th key={i} style={{ background: '#f8fafc', fontWeight: 700, padding: '9px 13px', borderBottom: '2px solid #e2e8f0', textAlign: 'left', whiteSpace: 'nowrap' }}>{h || `Col ${i + 1}`}</th>)}</tr>
            </thead>
            {rows.length > 0 && (
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri}>
                    {headers.map((_, ci) => <td key={ci} style={{ padding: '8px 13px', borderBottom: ri < rows.length - 1 ? '1px solid #e2e8f0' : 'none' }}>{(row || [])[ci] || ''}</td>)}
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
      );
    }

    case 'accordion': {
      const items = block.items || [];
      const [openIdx, setOpenIdx] = useState(0);
      if (!items.length) return <div style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 12 }}>No items yet.</div>;
      return (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
          {items.map((item, i) => (
            <div key={item.id || i} style={{ borderBottom: i < items.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
              <button
                onClick={() => setOpenIdx(openIdx === i ? -1 : i)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: openIdx === i ? '#fff' : '#f8fafc', border: 'none', cursor: 'pointer', fontSize: '.93em', fontWeight: 600, color: openIdx === i ? '#6c63ff' : '#0f172a', textAlign: 'left', transition: 'background .15s,color .15s' }}
              >
                <span>{item.title || '(no title)'}</span>
                <span style={{ fontSize: '.7em', color: '#94a3b8', marginLeft: 8, transition: 'transform .2s', transform: openIdx === i ? 'rotate(180deg)' : 'none' }}>▼</span>
              </button>
              {openIdx === i && (
                <div style={{ padding: '4px 16px 16px', borderTop: '1px solid #e2e8f0' }}>
                  <div className="prose" style={{ fontSize: '.92em' }} dangerouslySetInnerHTML={{ __html: md(item.content || '') }} />
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }

    case 'embed': {
      const hasUrl = (block.src || '').trim().length > 0;
      return (
        <figure style={{ margin: 0 }}>
          {hasUrl ? (
            <iframe
              src={block.src}
              height={block.height || 400}
              style={{ display: 'block', width: '100%', border: '1px solid #e2e8f0', borderRadius: 8 }}
              title={block.caption || 'Embedded content'}
              loading="lazy"
            />
          ) : (
            <div style={{ background: '#f1f5f9', borderRadius: 8, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 12 }}>No URL set</div>
          )}
          {block.caption && <figcaption style={{ marginTop: 8, fontSize: '13px', color: '#64748b', fontStyle: 'italic', textAlign: 'center' }}>{block.caption}</figcaption>}
        </figure>
      );
    }

    case 'fill-in-the-blank': {
      return <FillInTheBlankPreview block={block} />;
    }

    case 'difficulty': {
      const level = Math.max(1, Math.min(4, block.level || 1));
      const label = block.label || DIFFICULTY_LABELS[level - 1];
      const color = DIFFICULTY_COLORS[level - 1];
      return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 14, padding: '10px 14px', borderRadius: 8, background: color + '12', borderLeft: `3px solid ${color}` }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: '0.65em', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8' }}>Difficulty</span>
            <span style={{ fontSize: '0.88em', fontWeight: 700, color }}>{label}</span>
          </div>
          <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ width: 18, height: 6, borderRadius: 3, background: i <= level ? color : color + '33' }} />
            ))}
          </div>
        </div>
      );
    }

    case 'divider':
      return <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '4px 0' }} />;

    default:
      return <div style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 12 }}>[{block.type}]</div>;
  }
}

// ── Preview panel ──────────────────────────────────────

export default function Preview({ page, pages = [] }) {
  const readTime = calcReadingTime(page.blocks || []);

  return (
    <div className="preview-panel">
      <style>{PREVIEW_STYLES}</style>
      <h1 className="preview-title">{page.title || 'Untitled'}</h1>
      <div className="preview-meta">
        {page.section && <span className="preview-section-tag">{page.section}</span>}
        <span className="preview-reading-time">⏱ {readTime} min read</span>
      </div>
      {page.blocks.length === 0 ? (
        <div className="preview-empty">No blocks yet — add one from the editor.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {page.blocks.map(block => (
            <BlockPreview key={block.id} block={block} />
          ))}
        </div>
      )}
    </div>
  );
}
