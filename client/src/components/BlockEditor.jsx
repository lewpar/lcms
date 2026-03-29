import { useRef, useState } from 'react';
import { uploadAsset } from '../api.js';
import { v4 as uuidv4 } from '../uuid.js';
import MediaManager from './MediaManager.jsx';
import { BLOCK_TYPES, CALLOUT_COLORS, DIFFICULTY_LABELS, DIFFICULTY_COLORS } from '../blockTypes.js';

function blockSummary(block) {
  switch (block.type) {
    case 'markdown': return block.content?.replace(/^#{1,6}\s+/gm, '').replace(/[*_`~>[\]]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60) || '(empty)';
    case 'heading':  return `H${block.level}: ${block.text || '(empty)'}`;
    case 'callout':  return block.title || block.content?.slice(0, 40) || '(empty)';
    case 'quiz': {
      const n = block.questions?.length ?? 0;
      return `${block.title || '(no title)'} — ${n} question${n !== 1 ? 's' : ''}`;
    }
    case 'code':       return `${block.language || 'code'}: ${block.content?.slice(0, 40) || '(empty)'}`;
    case 'image':      return block.src || '(no image)';
    case 'video':      return block.url || '(no URL)';
    case 'case-study': return block.title || '(no title)';
    case 'page-link': return block.pageTitle || '(no page selected)';
    case 'divider':   return '──────────';
    case 'flashcard': {
      const n = block.cards?.length ?? 0;
      return `${block.title || '(no title)'} — ${n} card${n !== 1 ? 's' : ''}`;
    }
    case 'table': {
      const cols = block.headers?.length ?? 0;
      const rows = block.rows?.length ?? 0;
      return `${cols} col${cols !== 1 ? 's' : ''}, ${rows} row${rows !== 1 ? 's' : ''}${block.caption ? ` — ${block.caption}` : ''}`;
    }
    case 'accordion': {
      const n = block.items?.length ?? 0;
      return `${n} item${n !== 1 ? 's' : ''}`;
    }
    case 'embed':             return block.src || '(no URL)';
    case 'playground':        return block.title || block.starterCode?.slice(0, 50) || '(empty)';
    case 'fill-in-the-blank': {
      const count = (block.prompt || '').split('___').length - 1;
      return block.prompt?.slice(0, 50) || `(${count} blank${count !== 1 ? 's' : ''})`;
    }
    case 'difficulty': {
      const lbl = block.label || DIFFICULTY_LABELS[Math.max(0, (block.level || 2) - 1)];
      return `Level ${block.level || 2}: ${lbl}`;
    }
    default:            return block.type;
  }
}

/* ── Block edit forms ── */

function MarkdownEditor({ block, onChange }) {
  return (
    <div className="field">
      <label>Markdown content</label>
      <textarea
        rows={8}
        value={block.content || ''}
        onChange={e => onChange({ content: e.target.value })}
        placeholder="Write markdown here…"
        style={{ fontFamily: 'monospace', fontSize: '13px' }}
      />
    </div>
  );
}

function HeadingEditor({ block, onChange }) {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: 10 }}>
        <div className="field">
          <label>Level</label>
          <select value={block.level || 2} onChange={e => onChange({ level: Number(e.target.value) })}>
            {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>H{n}</option>)}
          </select>
        </div>
        <div className="field" style={{ gridColumn: '2 / -1' }}>
          <label>Text</label>
          <input type="text" value={block.text || ''} onChange={e => onChange({ text: e.target.value })} placeholder="Heading text" />
        </div>
      </div>
      <div className="field">
        <label>Anchor ID (optional)</label>
        <input type="text" value={block.id_attr || ''} onChange={e => onChange({ id_attr: e.target.value })} placeholder="my-section" />
      </div>
    </>
  );
}

function CalloutEditor({ block, onChange }) {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: 10 }}>
        <div className="field">
          <label>Title</label>
          <input type="text" value={block.title || ''} onChange={e => onChange({ title: e.target.value })} placeholder="Callout title" />
        </div>
        <div className="field">
          <label>Color</label>
          <div className="callout-swatches">
            {Object.entries(CALLOUT_COLORS).map(([color, cfg]) => (
              <button
                key={color}
                className={`callout-swatch${(block.color || 'blue') === color ? ' callout-swatch--active' : ''}`}
                style={{ background: cfg.bg, borderColor: cfg.border }}
                onClick={() => onChange({ color })}
                title={color[0].toUpperCase() + color.slice(1)}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="field">
        <label>Content (markdown supported)</label>
        <textarea rows={4} value={block.content || ''} onChange={e => onChange({ content: e.target.value })} placeholder="Callout content" />
      </div>
    </>
  );
}

/* ── Quiz: multi-question editor ── */

function QuestionEditor({ question, index, total, onChange, onRemove }) {
  const [open, setOpen] = useState(index === 0);

  const addOption = () => onChange({ options: [...(question.options || []), ''] });
  const removeOption = (i) => {
    const options = question.options.filter((_, j) => j !== i);
    const correctIndex = question.correctIndex >= options.length ? 0 : question.correctIndex;
    onChange({ options, correctIndex });
  };
  const updateOption = (i, val) => {
    const options = [...question.options];
    options[i] = val;
    onChange({ options });
  };

  return (
    <div className="quiz-question-card">
      <div className="quiz-question-header" onClick={() => setOpen(o => !o)}>
        <span style={{ flex: 1 }}>Q{index + 1}: {question.question?.slice(0, 50) || '(no question)'}</span>
        {total > 1 && (
          <button
            className="btn btn-danger btn-sm btn-icon"
            style={{ marginLeft: 4 }}
            onClick={e => { e.stopPropagation(); onRemove(); }}
            title="Remove question"
          >✕</button>
        )}
        <span style={{ marginLeft: 4 }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div className="quiz-question-body">
          <div className="field">
            <label>Question text</label>
            <textarea
              rows={2}
              value={question.question || ''}
              onChange={e => onChange({ question: e.target.value })}
              placeholder="Enter the question"
            />
          </div>

          <div className="field">
            <label>Options — select correct answer with the radio button</label>
            <div className="quiz-options-list">
              {(question.options || []).map((opt, i) => (
                <div key={i} className="quiz-option-row">
                  <input
                    type="radio"
                    name={`correct-${question.id}`}
                    checked={question.correctIndex === i}
                    onChange={() => onChange({ correctIndex: i })}
                    title="Mark as correct"
                  />
                  <input
                    type="text"
                    style={{ flex: 1 }}
                    value={opt}
                    onChange={e => updateOption(i, e.target.value)}
                    placeholder={`Option ${i + 1}`}
                  />
                  {question.options.length > 2 && (
                    <button className="quiz-option-remove" onClick={() => removeOption(i)} title="Remove option">✕</button>
                  )}
                </div>
              ))}
            </div>
            <button className="btn btn-secondary btn-sm" style={{ marginTop: 6, alignSelf: 'flex-start' }} onClick={addOption}>
              + Add Option
            </button>
          </div>

          <div className="field">
            <label>Explanation (shown after answering, optional)</label>
            <textarea
              rows={2}
              value={question.explanation || ''}
              onChange={e => onChange({ explanation: e.target.value })}
              placeholder="Explain the correct answer"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function QuizEditor({ block, onChange }) {
  const questions = block.questions || [];

  const addQuestion = () =>
    onChange({ questions: [...questions, { id: uuidv4(), question: '', options: ['', ''], correctIndex: 0, explanation: '' }] });

  const updateQuestion = (id, changes) =>
    onChange({ questions: questions.map(q => q.id === id ? { ...q, ...changes } : q) });

  const removeQuestion = (id) =>
    onChange({ questions: questions.filter(q => q.id !== id) });

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label>Quiz title</label>
          <input type="text" value={block.title || ''} onChange={e => onChange({ title: e.target.value })} placeholder="e.g. Chapter 1 Review" />
        </div>
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label>Description (optional)</label>
          <input type="text" value={block.description || ''} onChange={e => onChange({ description: e.target.value })} placeholder="Short description shown on the start screen" />
        </div>
      </div>

      <div className="field">
        <span className="block-subsection-count">{questions.length} Question{questions.length !== 1 ? 's' : ''}</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {questions.map((q, i) => (
            <QuestionEditor
              key={q.id}
              question={q}
              index={i}
              total={questions.length}
              onChange={changes => updateQuestion(q.id, changes)}
              onRemove={() => removeQuestion(q.id)}
            />
          ))}
        </div>
        <button className="btn btn-secondary btn-sm" style={{ marginTop: 8, alignSelf: 'flex-start' }} onClick={addQuestion}>
          + Add Question
        </button>
      </div>
    </>
  );
}

const CODE_LANGUAGES = ['plaintext', 'python', 'javascript', 'typescript', 'html', 'css', 'json', 'bash', 'sql', 'yaml', 'rust', 'go', 'markdown'];

function CodeEditor({ block, onChange }) {
  return (
    <>
      <div className="field">
        <label>Language</label>
        <select value={block.language || 'plaintext'} onChange={e => onChange({ language: e.target.value })}>
          {CODE_LANGUAGES.map(lang => (
            <option key={lang} value={lang}>{lang}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Code</label>
        <textarea
          rows={10}
          value={block.content || ''}
          onChange={e => onChange({ content: e.target.value })}
          placeholder="Paste your code here"
          style={{ fontFamily: 'monospace', fontSize: '12px' }}
          onKeyDown={e => {
            if (e.key === 'Tab') {
              e.preventDefault();
              const start = e.target.selectionStart;
              const end = e.target.selectionEnd;
              const newVal = e.target.value.substring(0, start) + '  ' + e.target.value.substring(end);
              onChange({ content: newVal });
              setTimeout(() => { e.target.selectionStart = e.target.selectionEnd = start + 2; }, 0);
            }
          }}
        />
      </div>
      <div className="field">
        <label>Caption (optional)</label>
        <input type="text" value={block.caption || ''} onChange={e => onChange({ caption: e.target.value })} placeholder="Code caption" />
      </div>
    </>
  );
}

function CaseStudyEditor({ block, onChange }) {
  return (
    <>
      <div className="field">
        <label>Title</label>
        <input type="text" value={block.title || ''} onChange={e => onChange({ title: e.target.value })} placeholder="Case Study: Scenario Title" />
      </div>
      <div className="field">
        <label>Summary</label>
        <input type="text" value={block.summary || ''} onChange={e => onChange({ summary: e.target.value })} placeholder="One-line overview of the case study" />
      </div>
      <div className="field">
        <label>Background</label>
        <textarea rows={5} value={block.background || ''} onChange={e => onChange({ background: e.target.value })} placeholder="Context, setting, and relevant background information…" />
      </div>
      <div className="field">
        <label>Instructions</label>
        <textarea rows={5} value={block.instructions || ''} onChange={e => onChange({ instructions: e.target.value })} placeholder="What the learner should do, analyse, or consider…" />
      </div>
    </>
  );
}

function ImageEditor({ block, onChange, addToast, siteId }) {
  const fileRef = useRef();
  const [showPicker, setShowPicker] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const { url } = await uploadAsset(siteId, file);
      setImgError(false);
      onChange({ src: url });
    } catch {
      addToast('Upload failed', 'error');
    }
  };

  return (
    <>
      <div className="field">
        <label>Image source</label>
        <div style={{ display: 'flex', gap: 6 }}>
          <input type="text" value={block.src || ''} onChange={e => onChange({ src: e.target.value })} placeholder="/assets/photo.jpg or https://…" style={{ flex: 1 }} />
          <button className="btn btn-secondary btn-sm" onClick={() => fileRef.current.click()}>Upload</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowPicker(true)}>Browse</button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
        </div>
      </div>
      {block.src && (
        <img
          src={block.src}
          alt={block.alt || ''}
          style={{ maxWidth: '100%', maxHeight: 180, objectFit: 'contain', borderRadius: 4, background: '#00000033', display: imgError ? 'none' : undefined }}
          onLoad={() => setImgError(false)}
          onError={() => setImgError(true)}
        />
      )}
      {block.src && imgError && (
        <span style={{ fontSize: 12, color: 'var(--danger)' }}>⚠ Image failed to load — check the URL or re-upload.</span>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="field">
          <label>Alt text</label>
          <input type="text" value={block.alt || ''} onChange={e => onChange({ alt: e.target.value })} placeholder="Descriptive alt text" />
        </div>
        <div className="field">
          <label>Caption</label>
          <input type="text" value={block.caption || ''} onChange={e => onChange({ caption: e.target.value })} placeholder="Optional caption" />
        </div>
      </div>
      {showPicker && (
        <MediaManager
          mode="picker"
          siteId={siteId}
          onSelect={({ url }) => { onChange({ src: url }); setShowPicker(false); }}
          onClose={() => setShowPicker(false)}
          addToast={addToast}
        />
      )}
    </>
  );
}

function extractYouTubeId(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') {
      return u.pathname.slice(1) || null;
    }
    if (u.hostname === 'www.youtube.com' || u.hostname === 'youtube.com') {
      if (u.pathname.startsWith('/embed/')) {
        return u.pathname.slice(7) || null;
      }
      const v = u.searchParams.get('v');
      return v || null;
    }
  } catch {}
  return null;
}

function VideoEditor({ block, onChange }) {
  const id = extractYouTubeId(block.url || '');
  const hasUrl = (block.url || '').trim().length > 0;
  return (
    <>
      <div className="field">
        <label>YouTube URL</label>
        <input
          type="text"
          value={block.url || ''}
          onChange={e => onChange({ url: e.target.value })}
          placeholder="https://www.youtube.com/watch?v=..."
        />
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
          Paste a YouTube video URL. Only YouTube is supported.
        </span>
        {hasUrl && !id && (
          <span style={{ fontSize: 11, color: 'var(--danger)', marginTop: 3 }}>Invalid YouTube URL</span>
        )}
      </div>
      <div className="field">
        <label>Caption (optional)</label>
        <input
          type="text"
          value={block.caption || ''}
          onChange={e => onChange({ caption: e.target.value })}
          placeholder="Video caption"
        />
      </div>
      {id && (
        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: 6 }}>
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${id}`}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
            allowFullScreen
            title={block.caption || 'Video preview'}
            loading="lazy"
          />
        </div>
      )}
    </>
  );
}

function PageLinkEditor({ block, onChange, pages = [] }) {
  const handlePageSelect = (e) => {
    const page = pages.find(p => p.id === e.target.value);
    if (page) {
      onChange({ pageId: page.id, pageSlug: page.slug, pageTitle: page.title });
    } else {
      onChange({ pageId: '', pageSlug: '', pageTitle: '' });
    }
  };

  return (
    <>
      <div className="field">
        <label>Link to page</label>
        <select value={block.pageId || ''} onChange={handlePageSelect}>
          <option value="">— select a page —</option>
          {pages.map(p => (
            <option key={p.id} value={p.id}>{p.title} (/{p.slug})</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Description (optional)</label>
        <input
          type="text"
          value={block.description || ''}
          onChange={e => onChange({ description: e.target.value })}
          placeholder="Short description shown on the link card"
        />
      </div>
    </>
  );
}

/* ── Flashcard editor ── */

function FlashcardEditor({ block, onChange }) {
  const cards = block.cards || [];

  const addCard = () =>
    onChange({ cards: [...cards, { id: uuidv4(), front: '', back: '' }] });

  const removeCard = (id) =>
    onChange({ cards: cards.filter(c => c.id !== id) });

  const updateCard = (id, field, val) =>
    onChange({ cards: cards.map(c => c.id === id ? { ...c, [field]: val } : c) });

  return (
    <>
      <div className="field">
        <label>Title (optional)</label>
        <input type="text" value={block.title || ''} onChange={e => onChange({ title: e.target.value })} placeholder="Flashcard set title" />
      </div>
      <div className="field">
        <span className="block-subsection-count">{cards.length} Card{cards.length !== 1 ? 's' : ''}</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {cards.map((card, i) => (
            <div key={card.id} style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '10px 12px', background: 'var(--surface)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>Card {i + 1}</span>
                {cards.length > 1 && (
                  <button className="btn btn-danger btn-icon btn-sm" onClick={() => removeCard(card.id)} title="Remove card">✕</button>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Front</label>
                  <textarea rows={2} value={card.front || ''} onChange={e => updateCard(card.id, 'front', e.target.value)} placeholder="Question or term" />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Back</label>
                  <textarea rows={2} value={card.back || ''} onChange={e => updateCard(card.id, 'back', e.target.value)} placeholder="Answer or definition" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <button className="btn btn-secondary btn-sm" style={{ marginTop: 8, alignSelf: 'flex-start' }} onClick={addCard}>
          + Add Card
        </button>
      </div>
    </>
  );
}

/* ── Table editor ── */

function TableEditor({ block, onChange }) {
  const headers = block.headers || [''];
  const rows = block.rows || [];

  const setHeaders = (h) => onChange({ headers: h, rows: rows.map(r => { const nr = [...r]; while (nr.length < h.length) nr.push(''); return nr.slice(0, h.length); }) });
  const setRows = (r) => onChange({ rows: r });

  const addColumn = () => setHeaders([...headers, '']);
  const removeColumn = (ci) => {
    const h = headers.filter((_, i) => i !== ci);
    onChange({ headers: h, rows: rows.map(r => r.filter((_, i) => i !== ci)) });
  };
  const updateHeader = (ci, val) => { const h = [...headers]; h[ci] = val; onChange({ headers: h }); };

  const addRow = () => setRows([...rows, new Array(headers.length).fill('')]);
  const removeRow = (ri) => setRows(rows.filter((_, i) => i !== ri));
  const updateCell = (ri, ci, val) => {
    const r = rows.map((row, i) => i === ri ? row.map((c, j) => j === ci ? val : c) : row);
    setRows(r);
  };

  return (
    <>
      <div className="field">
        <label>Caption (optional)</label>
        <input type="text" value={block.caption || ''} onChange={e => onChange({ caption: e.target.value })} placeholder="Table caption" />
      </div>
      <div className="field">
        <label>Table ({headers.length} col{headers.length !== 1 ? 's' : ''}, {rows.length} row{rows.length !== 1 ? 's' : ''})</label>
        <div className="table-editor-grid" style={{ '--table-cols': headers.length }}>
          {/* Header row */}
          <div className="table-editor-row table-editor-header-row">
            {headers.map((h, ci) => (
              <div key={ci} style={{ display: 'flex', gap: 2 }}>
                <input
                  type="text"
                  value={h}
                  onChange={e => updateHeader(ci, e.target.value)}
                  placeholder={`Col ${ci + 1}`}
                  style={{ flex: 1, minWidth: 0, fontWeight: 600 }}
                />
                {headers.length > 1 && (
                  <button className="btn btn-danger btn-icon btn-sm" onClick={() => removeColumn(ci)} title="Remove column">✕</button>
                )}
              </div>
            ))}
            <button className="btn btn-secondary btn-sm table-editor-add-col" onClick={addColumn} title="Add column">+</button>
          </div>
          {/* Data rows */}
          {rows.map((row, ri) => (
            <div key={ri} className="table-editor-row">
              {headers.map((_, ci) => (
                <input
                  key={ci}
                  type="text"
                  value={(row || [])[ci] || ''}
                  onChange={e => updateCell(ri, ci, e.target.value)}
                  placeholder={`${ri + 1},${ci + 1}`}
                  style={{ minWidth: 0 }}
                />
              ))}
              <button className="btn btn-danger btn-icon btn-sm" onClick={() => removeRow(ri)} title="Remove row">✕</button>
            </div>
          ))}
        </div>
        <button className="btn btn-secondary btn-sm" style={{ marginTop: 6, alignSelf: 'flex-start' }} onClick={addRow}>
          + Add Row
        </button>
      </div>
    </>
  );
}

/* ── Accordion editor ── */

function AccordionEditor({ block, onChange }) {
  const items = block.items || [];

  const addItem = () =>
    onChange({ items: [...items, { id: uuidv4(), title: '', content: '' }] });

  const removeItem = (id) =>
    onChange({ items: items.filter(i => i.id !== id) });

  const updateItem = (id, field, val) =>
    onChange({ items: items.map(i => i.id === id ? { ...i, [field]: val } : i) });

  return (
    <div className="field">
      <span className="block-subsection-count">{items.length} Item{items.length !== 1 ? 's' : ''}</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item, i) => (
          <div key={item.id} style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '10px 12px', background: 'var(--surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>Item {i + 1}</span>
              {items.length > 1 && (
                <button className="btn btn-danger btn-icon btn-sm" onClick={() => removeItem(item.id)} title="Remove item">✕</button>
              )}
            </div>
            <div className="field" style={{ marginBottom: 8 }}>
              <label>Title</label>
              <input type="text" value={item.title || ''} onChange={e => updateItem(item.id, 'title', e.target.value)} placeholder="Item title" />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Content (markdown supported)</label>
              <textarea rows={3} value={item.content || ''} onChange={e => updateItem(item.id, 'content', e.target.value)} placeholder="Item content" />
            </div>
          </div>
        ))}
      </div>
      <button className="btn btn-secondary btn-sm" style={{ marginTop: 8, alignSelf: 'flex-start' }} onClick={addItem}>
        + Add Item
      </button>
    </div>
  );
}

/* ── Embed editor ── */

function EmbedEditor({ block, onChange }) {
  return (
    <>
      <div className="field">
        <label>URL</label>
        <input
          type="text"
          value={block.src || ''}
          onChange={e => onChange({ src: e.target.value })}
          placeholder="https://example.com/embed/..."
        />
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
          Any URL that allows embedding in an iframe.
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 10 }}>
        <div className="field">
          <label>Height (px)</label>
          <input
            type="number"
            min={100}
            max={2000}
            value={block.height || 400}
            onChange={e => onChange({ height: Number(e.target.value) })}
          />
        </div>
        <div className="field">
          <label>Caption (optional)</label>
          <input type="text" value={block.caption || ''} onChange={e => onChange({ caption: e.target.value })} placeholder="Optional caption" />
        </div>
      </div>
    </>
  );
}

/* ── Playground editor ── */

function PlaygroundEditor({ block, onChange }) {
  return (
    <>
      <div className="field">
        <label>Title</label>
        <input
          type="text"
          value={block.title || ''}
          onChange={e => onChange({ title: e.target.value })}
          placeholder="Interactive Playground"
        />
      </div>
      <div className="field">
        <label>Starter code</label>
        <textarea
          rows={12}
          value={block.starterCode || ''}
          onChange={e => onChange({ starterCode: e.target.value })}
          placeholder={'// Write JavaScript here\nconsole.log(\'Hello, world!\');'}
          style={{ fontFamily: 'monospace', fontSize: '12px' }}
          onKeyDown={e => {
            if (e.key === 'Tab') {
              e.preventDefault();
              const s = e.target.selectionStart;
              const en = e.target.selectionEnd;
              const val = e.target.value.substring(0, s) + '  ' + e.target.value.substring(en);
              onChange({ starterCode: val });
              setTimeout(() => { e.target.selectionStart = e.target.selectionEnd = s + 2; }, 0);
            }
          }}
        />
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
          Pre-populate the code editor. Users can edit and run this in the exported site.
        </span>
      </div>
    </>
  );
}

/* ── Fill-in-the-blank editor ── */

function FillInTheBlankEditor({ block, onChange }) {
  const blankCount = (block.prompt || '').split('___').length - 1;
  const answers = block.answers || [];

  const syncAnswers = (prompt) => {
    const count = prompt.split('___').length - 1;
    const newAnswers = Array.from({ length: count }, (_, i) => answers[i] || '');
    onChange({ prompt, answers: newAnswers });
  };

  const updateAnswer = (i, val) => {
    const newAnswers = [...answers];
    newAnswers[i] = val;
    onChange({ answers: newAnswers });
  };

  return (
    <>
      <div className="field">
        <label>Prompt — use ___ for each blank</label>
        <textarea
          rows={4}
          value={block.prompt || ''}
          onChange={e => syncAnswers(e.target.value)}
          placeholder="The capital of France is ___ and it is located in ___ Europe."
        />
        <span style={{ fontSize: 11, color: blankCount === 0 ? 'var(--warning)' : 'var(--text-muted)', marginTop: 3 }}>
          {blankCount === 0 ? 'No blanks found — add ___ where you want an input.' : `${blankCount} blank${blankCount !== 1 ? 's' : ''} detected.`}
        </span>
      </div>
      {blankCount > 0 && (
        <div className="field">
          <label>Correct answers</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {Array.from({ length: blankCount }, (_, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 56 }}>Blank {i + 1}</span>
                <input
                  type="text"
                  value={answers[i] || ''}
                  onChange={e => updateAnswer(i, e.target.value)}
                  placeholder={`Answer for blank ${i + 1}`}
                  style={{ flex: 1 }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

/* ── Difficulty indicator editor ── */

function DifficultyEditor({ block, onChange }) {
  const level = block.level || 2;
  return (
    <>
      <div className="field">
        <label>Difficulty level</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {DIFFICULTY_LABELS.map((lbl, i) => (
            <button
              key={i}
              className={`btn btn-sm${level === i + 1 ? ' btn-primary' : ' btn-secondary'}`}
              onClick={() => onChange({ level: i + 1 })}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label>Custom label (optional)</label>
        <input
          type="text"
          value={block.label || ''}
          onChange={e => onChange({ label: e.target.value })}
          placeholder={DIFFICULTY_LABELS[level - 1]}
        />
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
          Defaults to "{DIFFICULTY_LABELS[level - 1]}" if left blank.
        </span>
      </div>
    </>
  );
}

/* ── Main BlockEditor ── */

export default function BlockEditor({
  block, index, total, expanded, onToggle, onChange, onRemove, addToast, pages, siteId,
  onMoveUp, onMoveDown, onAddBelow,
  isDragging, dragOverClass, onDragStart, onDragOver, onDrop, onDragEnd,
}) {
  const bt = BLOCK_TYPES.find(b => b.type === block.type);

  return (
    <div
      className={`block-card${expanded ? ' expanded' : ''}${isDragging ? ' dragging' : ''}${dragOverClass ? ` ${dragOverClass}` : ''}`}
      data-block-id={block.id}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <div className="block-header">
        {/* Drag handle */}
        <div
          className="block-drag-handle"
          draggable
          onDragStart={e => { e.stopPropagation(); onDragStart(); }}
          title="Drag to reorder"
        >
          ⠿
        </div>

        {/* Clickable area to expand/collapse */}
        <div className="block-header-clickable" onClick={onToggle}>
          <span className={`block-type-badge ${block.type}`}>
            {bt?.icon && <span className="block-type-icon">{bt.icon}</span>}
            {bt?.label || block.type}
          </span>
          <span className="block-summary">{blockSummary(block)}</span>
        </div>

        {/* Move up/down */}
        <div className="block-move-btns">
          <button
            className="btn btn-secondary btn-icon btn-sm"
            onClick={e => { e.stopPropagation(); onMoveUp(); }}
            disabled={index === 0}
            title="Move up"
          >↑</button>
          <button
            className="btn btn-secondary btn-icon btn-sm"
            onClick={e => { e.stopPropagation(); onMoveDown(); }}
            disabled={index === total - 1}
            title="Move down"
          >↓</button>
        </div>

        <button
          className="btn btn-danger btn-icon btn-sm block-delete-btn"
          onClick={e => { e.stopPropagation(); onRemove(); }}
          title="Remove block"
        >✕</button>
      </div>

      {expanded && (
        <div className="block-body">
          {block.type === 'markdown'   && <MarkdownEditor   block={block} onChange={onChange} />}
          {block.type === 'heading'    && <HeadingEditor    block={block} onChange={onChange} />}
          {block.type === 'callout'    && <CalloutEditor    block={block} onChange={onChange} />}
          {block.type === 'quiz'       && <QuizEditor       block={block} onChange={onChange} />}
          {block.type === 'code'       && <CodeEditor       block={block} onChange={onChange} />}
          {block.type === 'image'      && <ImageEditor      block={block} onChange={onChange} addToast={addToast} siteId={siteId} />}
          {block.type === 'video'      && <VideoEditor      block={block} onChange={onChange} />}
          {block.type === 'case-study' && <CaseStudyEditor  block={block} onChange={onChange} />}
          {block.type === 'page-link'  && <PageLinkEditor   block={block} onChange={onChange} pages={pages} />}
          {block.type === 'flashcard'  && <FlashcardEditor  block={block} onChange={onChange} />}
          {block.type === 'table'      && <TableEditor      block={block} onChange={onChange} />}
          {block.type === 'accordion'  && <AccordionEditor  block={block} onChange={onChange} />}
          {block.type === 'embed'             && <EmbedEditor          block={block} onChange={onChange} />}
          {block.type === 'playground'       && <PlaygroundEditor     block={block} onChange={onChange} />}
          {block.type === 'fill-in-the-blank' && <FillInTheBlankEditor block={block} onChange={onChange} />}
          {block.type === 'difficulty'        && <DifficultyEditor     block={block} onChange={onChange} />}
          {block.type === 'divider'    && (
            <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Horizontal divider — no configuration needed.</p>
          )}

          <button className="block-add-below-btn" onClick={() => onAddBelow()}>
            + Insert block below
          </button>
        </div>
      )}
    </div>
  );
}
