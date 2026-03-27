import { useState, useEffect } from 'react';
import { marked } from 'marked';
import { PREVIEW_STYLES } from '../previewStyles.js';

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

const ALERT_CONFIG = {
  info:    { bg: '#eff6ff', border: '#93c5fd', titleColor: '#1d4ed8' },
  success: { bg: '#f0fdf4', border: '#86efac', titleColor: '#15803d' },
  warning: { bg: '#fffbeb', border: '#fcd34d', titleColor: '#b45309' },
  error:   { bg: '#fef2f2', border: '#fca5a5', titleColor: '#b91c1c' },
};
const CALLOUT_CONFIG = {
  blue:   { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' },
  green:  { bg: '#f0fdf4', border: '#22c55e', text: '#15803d' },
  yellow: { bg: '#fffbeb', border: '#f59e0b', text: '#92400e' },
  red:    { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' },
  purple: { bg: '#faf5ff', border: '#a855f7', text: '#6b21a8' },
  gray:   { bg: '#f8fafc', border: '#94a3b8', text: '#475569' },
};

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

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

  const s = {
    wrap: { border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', background: '#fff' },
    start: { padding: 28, background: 'linear-gradient(135deg, #f8fafc 0%, #f0f4ff 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' },
    badge: { background: '#6c63ff', color: '#fff', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '3px 12px', borderRadius: 20 },
    title: { fontWeight: 800, fontSize: '1.2em', color: '#0f172a' },
    muted: { color: '#64748b', fontSize: '0.87em' },
    startBtn: { background: '#6c63ff', color: '#fff', border: 'none', padding: '11px 26px', borderRadius: 8, fontSize: '0.92em', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginTop: 4 },
    qWrap: { padding: '18px 20px' },
    progressWrap: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 },
    progressBar: { flex: 1, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%', background: '#6c63ff', borderRadius: 3, transition: 'width 0.4s ease', width: `${progress}%` },
    progressText: { fontSize: '0.78em', color: '#64748b', fontWeight: 700, whiteSpace: 'nowrap' },
    qText: { fontSize: '1.02em', fontWeight: 700, marginBottom: 16, lineHeight: 1.45, color: '#0f172a' },
    optionBase: { width: '100%', textAlign: 'left', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '11px 14px', cursor: 'pointer', fontSize: '0.9em', color: '#374151', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, transition: 'all 0.15s' },
    optionSelected: { borderColor: '#6c63ff', background: '#f5f4ff' },
    optionCorrect: { borderColor: '#86efac', background: '#f0fdf4', color: '#15803d' },
    optionIncorrect: { borderColor: '#fca5a5', background: '#fef2f2', color: '#b91c1c' },
    navBtn: { background: '#6c63ff', color: '#fff', border: 'none', padding: '10px 22px', borderRadius: 8, fontSize: '0.9em', fontWeight: 700, cursor: 'pointer', marginTop: 12, fontFamily: 'inherit' },
    submitBtn: { background: selectedOption === -1 ? '#e2e8f0' : '#6c63ff', color: selectedOption === -1 ? '#94a3b8' : '#fff', border: 'none', padding: '10px 22px', borderRadius: 8, fontSize: '0.9em', fontWeight: 700, cursor: selectedOption === -1 ? 'not-allowed' : 'pointer', marginTop: 12, fontFamily: 'inherit' },
    feedback: (ok) => ({ padding: '10px 14px', borderRadius: 8, fontWeight: 700, fontSize: '0.88em', marginTop: 12, background: ok ? '#f0fdf4' : '#fef2f2', color: ok ? '#16a34a' : '#dc2626', border: `1px solid ${ok ? '#86efac' : '#fca5a5'}` }),
    explanation: { padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.85em', color: '#64748b', marginTop: 8 },
    results: { padding: 28, background: 'linear-gradient(135deg, #f8fafc 0%, #f0f4ff 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 },
    ring: { width: 96, height: 96, borderRadius: '50%', border: '5px solid #6c63ff', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' },
    scoreNum: { fontSize: '1.5em', fontWeight: 800, color: '#6c63ff', lineHeight: 1 },
    scoreLbl: { fontSize: '0.6em', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' },
    scorePct: { fontSize: '1em', fontWeight: 700, color: '#1e293b' },
    review: { width: '100%', display: 'flex', flexDirection: 'column', gap: 6 },
    reviewItem: (ok) => ({ display: 'flex', gap: 8, fontSize: '0.83em', padding: '8px 12px', borderRadius: 8, background: ok ? '#f0fdf4' : '#fef2f2', color: ok ? '#15803d' : '#b91c1c', alignItems: 'flex-start' }),
    retryBtn: { background: '#6c63ff', color: '#fff', border: 'none', padding: '10px 22px', borderRadius: 8, fontSize: '0.9em', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  };

  const letterStyle = (i, isAnswered) => {
    const isSelected = !isAnswered && i === selectedOption;
    const isCorrect = isAnswered && i === questions[current]?.correctIndex;
    const isWrong = isAnswered && i === selected && i !== questions[current]?.correctIndex;
    return {
      width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '0.72em', fontWeight: 800,
      background: isSelected ? '#6c63ff' : isCorrect ? '#22c55e' : isWrong ? '#ef4444' : '#f1f5f9',
      color: isSelected || isCorrect || isWrong ? '#fff' : '#94a3b8',
      border: `1.5px solid ${isSelected ? '#6c63ff' : isCorrect ? '#22c55e' : isWrong ? '#ef4444' : '#e2e8f0'}`,
    };
  };

  if (n === 0) return <div style={{ ...s.wrap, padding: 16, color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>No questions added yet.</div>;

  if (phase === 'start') {
    return (
      <div style={s.wrap}>
        <div style={s.start}>
          <span style={s.badge}>Quiz</span>
          <div style={s.title}>{b.title || '(untitled quiz)'}</div>
          {b.description && <div style={s.muted}>{b.description}</div>}
          <div style={s.muted}>{n} question{n !== 1 ? 's' : ''}</div>
          <button style={s.startBtn} onClick={startQuiz}>Start Quiz →</button>
        </div>
      </div>
    );
  }

  if (phase === 'results') {
    return (
      <div style={s.wrap}>
        <div style={{ ...s.qWrap, paddingBottom: 0 }}>
          <div style={s.progressWrap}>
            <div style={s.progressBar}><div style={{ ...s.progressFill, width: '100%' }} /></div>
            <span style={s.progressText}>{n} / {n}</span>
          </div>
        </div>
        <div style={s.results}>
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

// ── Case study ─────────────────────────────────────────

function CaseStudyPreview({ block }) {
  const sections = [
    { key: 'background', label: 'Background', color: '#0ea5e9' },
    { key: 'challenge',  label: 'Challenge',  color: '#f59e0b' },
    { key: 'solution',   label: 'Solution',   color: '#22c55e' },
    { key: 'outcome',    label: 'Outcome',    color: '#6c63ff' },
  ];
  const tags = block.tags ? block.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
  const activeSections = sections.filter(s => block[s.key]);

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ background: '#f8fafc', padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
        {block.title && <div style={{ fontWeight: 700, fontSize: '1.1em', color: '#0f172a', marginBottom: 4 }}>{block.title}</div>}
        {block.summary && <div style={{ color: '#64748b', fontSize: '0.9em' }}>{block.summary}</div>}
        {tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {tags.map((tag, i) => (
              <span key={i} style={{ background: '#eff6ff', color: '#6c63ff', fontSize: '0.7em', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 8px', borderRadius: 20 }}>{tag}</span>
            ))}
          </div>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: activeSections.length === 1 ? '1fr' : '1fr 1fr' }}>
        {activeSections.map(({ key, label, color }, i) => (
          <div key={key} style={{
            padding: '14px 20px',
            borderBottom: activeSections.length > 2 && i < activeSections.length - 2 ? '1px solid #e2e8f0' : undefined,
            borderRight: activeSections.length > 1 && i % 2 === 0 ? '1px solid #e2e8f0' : undefined,
          }}>
            <div style={{ fontSize: '0.68em', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color, marginBottom: 8 }}>{label}</div>
            <div className="prose" style={{ fontSize: '0.9em' }} dangerouslySetInnerHTML={{ __html: md(block[key]) }} />
          </div>
        ))}
      </div>
      {activeSections.length === 0 && (
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

    case 'alert': {
      const cfg = ALERT_CONFIG[block.variant] || ALERT_CONFIG.info;
      return (
        <div style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 8, padding: '12px 16px' }}>
          {block.title && <div style={{ fontWeight: 700, color: cfg.titleColor, marginBottom: 4, fontSize: '0.92em' }}>{block.title}</div>}
          <div style={{ color: '#374151', fontSize: '0.92em' }} dangerouslySetInnerHTML={{ __html: md(block.content) }} />
        </div>
      );
    }

    case 'callout': {
      const cfg = CALLOUT_CONFIG[block.color] || CALLOUT_CONFIG.blue;
      return (
        <div style={{ background: cfg.bg, borderLeft: `4px solid ${cfg.border}`, borderRadius: '0 8px 8px 0', padding: '12px 16px' }}>
          {block.title && <div style={{ fontWeight: 700, color: cfg.text, marginBottom: 4 }}>{block.icon || '💡'} {block.title}</div>}
          <div style={{ color: '#374151', fontSize: '0.92em' }} dangerouslySetInnerHTML={{ __html: md(block.content) }} />
        </div>
      );
    }

    case 'quiz':
      return <QuizPreview block={block} />;

    case 'case-study':
      return <CaseStudyPreview block={block} />;

    case 'code':
      return (
        <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
          {block.language && <div style={{ background: '#1e293b', color: '#94a3b8', padding: '5px 14px', fontSize: '11px', fontFamily: 'monospace' }}>{block.language}</div>}
          <pre style={{ background: '#0f172a', color: '#e2e8f0', padding: '14px', margin: 0, overflowX: 'auto', fontSize: '12px', lineHeight: 1.6, fontFamily: 'monospace' }}><code>{block.content}</code></pre>
          {block.caption && <div style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '5px 14px', fontSize: '12px', color: '#64748b', textAlign: 'center' }}>{block.caption}</div>}
        </div>
      );

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

    case 'divider':
      return <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '4px 0' }} />;

    default:
      return <div style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 12 }}>[{block.type}]</div>;
  }
}

// ── Preview panel ──────────────────────────────────────

export default function Preview({ page }) {
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
