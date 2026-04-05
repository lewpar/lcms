import { v4 as uuidv4 } from './uuid.js';

export const CALLOUT_COLORS = {
  blue:   { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' },
  green:  { bg: '#f0fdf4', border: '#22c55e', text: '#15803d' },
  yellow: { bg: '#fffbeb', border: '#f59e0b', text: '#92400e' },
  red:    { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' },
  purple: { bg: '#faf5ff', border: '#a855f7', text: '#6b21a8' },
  gray:   { bg: '#f8fafc', border: '#94a3b8', text: '#475569' },
};

export const DIFFICULTY_LABELS = ['Easy', 'Medium', 'Hard', 'Very Hard'];
export const DIFFICULTY_COLORS = ['#22c55e', '#f59e0b', '#f97316', '#ef4444'];

export const BLOCK_TYPES = [
  { type: 'markdown',          icon: '✏️', label: 'Markdown',          group: 'Content' },
  { type: 'heading',           icon: '𝐇',  label: 'Heading',           group: 'Content' },
  { type: 'callout',           icon: '💡', label: 'Callout',           group: 'Content' },
  { type: 'difficulty',        icon: '⚡', label: 'Difficulty',        group: 'Content' },
  { type: 'divider',           icon: '─',  label: 'Divider',           group: 'Content' },
  { type: 'image',             icon: '🖼️', label: 'Image',             group: 'Media' },
  { type: 'video',             icon: '▶',  label: 'Video',             group: 'Media' },
  { type: 'code',              icon: '⌨️', label: 'Code',              group: 'Media' },
  { type: 'embed',             icon: '⊡',  label: 'Embed',             group: 'Media' },
  { type: 'quiz',              icon: '❓', label: 'Quiz',              group: 'Interactive' },
  { type: 'flashcard',         icon: '🃏', label: 'Flashcard',         group: 'Interactive' },
  { type: 'fill-in-the-blank', icon: '✍️', label: 'Fill in the Blank', group: 'Interactive' },
  { type: 'accordion',         icon: '☰',  label: 'Accordion',         group: 'Interactive' },
  { type: 'hint',              icon: '💭', label: 'Hint',              group: 'Interactive' },
  { type: 'playground',        icon: '▶',  label: 'Playground',        group: 'Interactive' },
  { type: 'table',             icon: '⊞',  label: 'Table',             group: 'Structure' },
  { type: 'page-link',         icon: '→',  label: 'Page Link',         group: 'Structure' },
  { type: 'case-study',        icon: '📋', label: 'Case Study',        group: 'Structure' },
];

export function defaultBlock(type) {
  const id = uuidv4();
  switch (type) {
    case 'markdown':    return { id, type, content: '' };
    case 'heading':     return { id, type, level: 2, text: '' };
    case 'callout':     return { id, type, title: '', content: '', color: 'blue' };
    case 'quiz':        return { id, type, title: '', description: '', questions: [{ id: uuidv4(), question: '', options: ['', ''], correctIndex: 0, explanation: '' }] };
    case 'code':        return { id, type, language: 'plaintext', content: '', caption: '' };
    case 'image':       return { id, type, src: '', alt: '', caption: '' };
    case 'divider':     return { id, type };
    case 'case-study':  return { id, type, title: '', summary: '', background: '', instructions: '' };
    case 'video':       return { id, type, url: '', caption: '' };
    case 'page-link':   return { id, type, pageId: '', pageSlug: '', pageTitle: '', description: '' };
    case 'flashcard':   return { id, type, title: '', cards: [{ id: uuidv4(), front: '', back: '' }] };
    case 'table':       return { id, type, caption: '', headers: ['Column 1', 'Column 2'], rows: [['', '']] };
    case 'accordion':   return { id, type, items: [{ id: uuidv4(), title: '', content: '' }] };
    case 'hint':        return { id, type, title: '', body: '' };
    case 'embed':             return { id, type, src: '', height: 400, caption: '' };
    case 'playground':        return { id, type, title: 'Try it yourself', starterCode: '// Write your JavaScript here\nconsole.log(\'Hello, world!\');' };
    case 'fill-in-the-blank': return { id, type, title: '', prompt: '', answers: [], language: 'plaintext' };
    case 'difficulty':        return { id, type, level: 1, label: '' };
    default:                  return { id, type };
  }
}
