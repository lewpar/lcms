// Styles injected into the preview panel for prose/markdown content and preview UI
export const PREVIEW_STYLES = `
  .preview-meta { display:flex; align-items:center; gap:10px; margin-bottom:24px; font-size:12px; color:#94a3b8; }
  .preview-section-tag { background:#ede9fe; color:#6d28d9; padding:2px 9px; border-radius:20px; font-weight:700; font-size:0.85em; }
  .preview-reading-time {}
  .preview-empty { text-align:center; color:#94a3b8; padding:40px 0; font-size:13px; }

  .prose { color: #374151; line-height: 1.7; }
  .prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6 {
    font-weight: 700; line-height: 1.25; margin: 1.2em 0 0.5em; color: #0f172a;
  }
  .prose h1 { font-size: 1.875em; }
  .prose h2 { font-size: 1.5em; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.3em; }
  .prose h3 { font-size: 1.25em; }
  .prose p { margin: 0.75em 0; }
  .prose ul, .prose ol { padding-left: 1.5em; margin: 0.75em 0; }
  .prose li { margin: 0.25em 0; }
  .prose a { color: #6c63ff; text-decoration: underline; }
  .prose blockquote {
    border-left: 4px solid #e2e8f0; margin: 1em 0; padding: 0.5em 1em;
    color: #64748b; font-style: italic;
  }
  .prose code {
    background: #f1f5f9; padding: 2px 5px; border-radius: 4px;
    font-family: 'SF Mono', 'Fira Code', monospace; font-size: 0.875em; color: #e11d48;
  }
  .prose pre {
    background: #0f172a; color: #e2e8f0; padding: 1em; border-radius: 8px;
    overflow-x: auto; margin: 1em 0;
  }
  .prose pre code { background: none; padding: 0; color: inherit; font-size: 0.875em; }
  .prose table { border-collapse: collapse; width: 100%; margin: 1em 0; }
  .prose th, .prose td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; }
  .prose th { background: #f8fafc; font-weight: 600; }
  .prose img { max-width: 100%; border-radius: 6px; }
  .prose hr { border: none; border-top: 1px solid #e2e8f0; margin: 1.5em 0; }
  .prose strong { font-weight: 700; color: #0f172a; }
`;
