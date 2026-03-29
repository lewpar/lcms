import { v4 as uuidv4 } from './uuid.js';

export const BLOCK_TYPES = [
  { type: 'markdown',    icon: '✏️', label: 'Markdown' },
  { type: 'heading',     icon: '𝐇',  label: 'Heading' },
  { type: 'callout',     icon: '💡', label: 'Callout' },
  { type: 'quiz',        icon: '❓', label: 'Quiz' },
  { type: 'code',        icon: '⌨️', label: 'Code' },
  { type: 'image',       icon: '🖼️', label: 'Image' },
  { type: 'video',       icon: '▶',  label: 'Video' },
  { type: 'divider',     icon: '─',  label: 'Divider' },
  { type: 'case-study',  icon: '📋', label: 'Case Study' },
  { type: 'page-link',   icon: '→',  label: 'Page Link' },
  { type: 'flashcard',   icon: '🃏', label: 'Flashcard' },
  { type: 'table',       icon: '⊞',  label: 'Table' },
  { type: 'accordion',   icon: '☰',  label: 'Accordion' },
  { type: 'embed',       icon: '⊡',  label: 'Embed' },
  { type: 'playground',  icon: '▶',  label: 'Playground' },
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
    case 'embed':       return { id, type, src: '', height: 400, caption: '' };
    case 'playground':  return { id, type, title: 'Try it yourself', starterCode: '// Write your JavaScript here\nconsole.log(\'Hello, world!\');' };
    default:            return { id, type };
  }
}
