import { useRef, useState } from 'react';
import { uploadAsset } from '../api.js';
import { v4 as uuidv4 } from '../uuid.js';

function blockSummary(block) {
  switch (block.type) {
    case 'markdown': return block.content?.slice(0, 60) || '(empty)';
    case 'heading':  return `H${block.level}: ${block.text || '(empty)'}`;
    case 'alert':    return `[${block.variant}] ${block.title || block.content?.slice(0, 40) || '(empty)'}`;
    case 'callout':  return block.title || block.content?.slice(0, 40) || '(empty)';
    case 'quiz': {
      const n = block.questions?.length ?? 0;
      return `${block.title || '(no title)'} — ${n} question${n !== 1 ? 's' : ''}`;
    }
    case 'code':       return `${block.language || 'code'}: ${block.content?.slice(0, 40) || '(empty)'}`;
    case 'image':      return block.src || '(no image)';
    case 'case-study': return block.title || '(untitled case study)';
    case 'divider':  return '──────────';
    default:         return block.type;
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

function AlertEditor({ block, onChange }) {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
        <div className="field">
          <label>Variant</label>
          <select value={block.variant || 'info'} onChange={e => onChange({ variant: e.target.value })}>
            <option value="info">Info</option>
            <option value="success">Success</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
          </select>
        </div>
        <div className="field">
          <label>Title (optional)</label>
          <input type="text" value={block.title || ''} onChange={e => onChange({ title: e.target.value })} placeholder="Alert title" />
        </div>
      </div>
      <div className="field">
        <label>Content (markdown supported)</label>
        <textarea rows={3} value={block.content || ''} onChange={e => onChange({ content: e.target.value })} placeholder="Alert message" />
      </div>
    </>
  );
}

function CalloutEditor({ block, onChange }) {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 110px', gap: 10 }}>
        <div className="field">
          <label>Icon</label>
          <input type="text" value={block.icon || '💡'} onChange={e => onChange({ icon: e.target.value })} placeholder="💡" />
        </div>
        <div className="field">
          <label>Title</label>
          <input type="text" value={block.title || ''} onChange={e => onChange({ title: e.target.value })} placeholder="Callout title" />
        </div>
        <div className="field">
          <label>Color</label>
          <select value={block.color || 'blue'} onChange={e => onChange({ color: e.target.value })}>
            <option value="blue">Blue</option>
            <option value="green">Green</option>
            <option value="yellow">Yellow</option>
            <option value="red">Red</option>
            <option value="purple">Purple</option>
            <option value="gray">Gray</option>
          </select>
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
        <label>{questions.length} Question{questions.length !== 1 ? 's' : ''}</label>
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

const CODE_LANGUAGES = [
  'plaintext', 'javascript', 'typescript', 'jsx', 'tsx',
  'python', 'java', 'csharp', 'cpp', 'c', 'go', 'rust',
  'ruby', 'php', 'swift', 'kotlin', 'r', 'scala', 'dart',
  'html', 'css', 'scss', 'sql', 'bash', 'powershell',
  'yaml', 'json', 'xml', 'markdown', 'dockerfile', 'graphql',
];

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
        <input type="text" value={block.title || ''} onChange={e => onChange({ title: e.target.value })} placeholder="Case Study: Company Name" />
      </div>
      <div className="field">
        <label>Summary (one-liner)</label>
        <input type="text" value={block.summary || ''} onChange={e => onChange({ summary: e.target.value })} placeholder="Brief overview" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="field">
          <label>Background</label>
          <textarea rows={4} value={block.background || ''} onChange={e => onChange({ background: e.target.value })} placeholder="Context and background…" />
        </div>
        <div className="field">
          <label>Challenge</label>
          <textarea rows={4} value={block.challenge || ''} onChange={e => onChange({ challenge: e.target.value })} placeholder="The problem or challenge faced…" />
        </div>
        <div className="field">
          <label>Solution</label>
          <textarea rows={4} value={block.solution || ''} onChange={e => onChange({ solution: e.target.value })} placeholder="How it was approached and solved…" />
        </div>
        <div className="field">
          <label>Outcome</label>
          <textarea rows={4} value={block.outcome || ''} onChange={e => onChange({ outcome: e.target.value })} placeholder="Results, impact, and lessons…" />
        </div>
      </div>
      <div className="field">
        <label>Tags (comma-separated)</label>
        <input type="text" value={block.tags || ''} onChange={e => onChange({ tags: e.target.value })} placeholder="strategy, growth, technology" />
      </div>
    </>
  );
}

function ImageEditor({ block, onChange, addToast }) {
  const fileRef = useRef();

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const { url } = await uploadAsset(file);
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
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
        </div>
      </div>
      {block.src && (
        <img src={block.src} alt={block.alt || ''} style={{ maxWidth: '100%', maxHeight: 180, objectFit: 'contain', borderRadius: 4, background: '#00000033' }} />
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
    </>
  );
}

/* ── Main BlockEditor ── */

export default function BlockEditor({
  block, index, total, expanded, onToggle, onChange, onRemove, addToast,
  isDragging, dragOverClass, onDragStart, onDragOver, onDrop, onDragEnd,
}) {
  return (
    <div
      className={`block-card${expanded ? ' expanded' : ''}${isDragging ? ' dragging' : ''}${dragOverClass ? ` ${dragOverClass}` : ''}`}
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
          <span className={`block-type-badge ${block.type}`}>{block.type}</span>
          <span className="block-summary">{blockSummary(block)}</span>
        </div>

        <button
          className="btn btn-danger btn-icon btn-sm block-delete-btn"
          onClick={e => { e.stopPropagation(); onRemove(); }}
          title="Remove block"
        >✕</button>
      </div>

      {expanded && (
        <div className="block-body">
          {block.type === 'markdown' && <MarkdownEditor block={block} onChange={onChange} />}
          {block.type === 'heading'  && <HeadingEditor  block={block} onChange={onChange} />}
          {block.type === 'alert'    && <AlertEditor    block={block} onChange={onChange} />}
          {block.type === 'callout'  && <CalloutEditor  block={block} onChange={onChange} />}
          {block.type === 'quiz'     && <QuizEditor     block={block} onChange={onChange} />}
          {block.type === 'code'     && <CodeEditor     block={block} onChange={onChange} />}
          {block.type === 'image'      && <ImageEditor      block={block} onChange={onChange} addToast={addToast} />}
          {block.type === 'case-study' && <CaseStudyEditor block={block} onChange={onChange} />}
          {block.type === 'divider'  && (
            <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Horizontal divider — no configuration needed.</p>
          )}
        </div>
      )}
    </div>
  );
}
