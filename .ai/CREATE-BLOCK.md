# LCMS — How to Add a New Block Type

This guide covers every file you must touch when adding a new block type to the CMS. **All steps are mandatory** — skipping any one of them will leave the block broken in a specific way (see the table below). Work through each section in order. The API layer requires **no changes** — blocks are stored and retrieved as plain JSON and the API does not validate block types.

---

## Overview of touch points

| Layer | File | What you add | What breaks if skipped |
|-------|------|--------------|------------------------|
| Block registry | `src/blockTypes.js` | Entry in `BLOCK_TYPES`; case in `defaultBlock()` | Block does not appear in the "Add block" picker at all |
| CMS editor | `src/components/BlockEditor.jsx` | Summary text; editor form component; render wire-up | Block appears in picker but shows no editing controls |
| CMS inline preview | `src/components/Preview.jsx` | Inline React rendering in `BlockPreview` switch | Block renders as a grey `[type]` placeholder in the editor preview panel |
| Static site generator | `src/generator/index.js` | HTML rendering in `renderBlock()`; CSS in `cssFor()` | Block renders as nothing (empty string) in the generated/previewed site |
| AI authoring docs | `.ai/BLOCKS.md` | Full schema with required / optional field tables | AI does not know the block exists and will not use it when generating sites |
| AI context | `CLAUDE.md` | Add type name to the blocks list | AI does not know the block exists and will not use it when generating sites |

---

## Step 1 — `src/blockTypes.js`

### 1a. Register the type in `BLOCK_TYPES`

`BLOCK_TYPES` is the master list used by the "Add block" dialog and the block picker. Each entry needs:

| Field | Description |
|-------|-------------|
| `type` | The string identifier used in JSON — all lowercase, hyphens allowed (e.g. `"my-block"`) |
| `icon` | A single emoji or symbol shown in the block picker |
| `label` | Human-readable name shown in the picker |
| `group` | Picker group heading. Existing groups: `"Content"`, `"Media"`, `"Interactive"`, `"Structure"`, `"Recipe"`. Create a new group name if none fit. |

```js
{ type: 'my-block', icon: '🔲', label: 'My Block', group: 'Content' },
```

Add it next to similar types within the relevant group.

### 1b. Add a `defaultBlock` case

`defaultBlock(type)` returns the initial data object when a user adds a block. Every field the editor form touches should have a sensible empty default here.

```js
case 'my-block': return { id, type, title: '', content: '' };
```

---

## Step 2 — `src/components/BlockEditor.jsx`

Three separate additions in this file.

### 2a. `blockSummary()` — collapsed preview text

The `blockSummary()` function returns a short string shown on the collapsed block card in the editor. Add a `case` that returns a meaningful description:

```js
case 'my-block': return block.title || block.content?.slice(0, 50) || '(empty)';
```

### 2b. Write an editor component

Create a React component (plain function, no hooks required for simple blocks) that renders the editing form. The component receives:

- `block` — the current block data object
- `onChange(patch)` — call with a partial object to update specific fields

Use existing class names for consistent styling:
- `<div className="field">` — wraps a label + input pair
- `<label>` — field label
- `<input type="text">`, `<textarea>`, `<select>` — standard inputs
- `<div className="callout-swatches">` / `<button className="callout-swatch">` — color swatch picker (see `CalloutEditor` for reference)

```jsx
function MyBlockEditor({ block, onChange }) {
  return (
    <>
      <div className="field">
        <label>Title</label>
        <input
          type="text"
          value={block.title || ''}
          onChange={e => onChange({ title: e.target.value })}
          placeholder="Block title"
        />
      </div>
      <div className="field">
        <label>Content (markdown supported)</label>
        <textarea
          rows={4}
          value={block.content || ''}
          onChange={e => onChange({ content: e.target.value })}
        />
      </div>
    </>
  );
}
```

Place the component near other editors of the same complexity (simple blocks near `HintEditor`, complex ones near `QuizEditor`).

### 2c. Wire the editor into the block render dispatch

Inside the `{expanded && ...}` section of the `Block` component, add a line after the other block type checks:

```jsx
{block.type === 'my-block' && <MyBlockEditor block={block} onChange={onChange} />}
```

---

## Step 3 — `src/components/Preview.jsx`

`Preview.jsx` renders an **inline React preview** of each block inside the editor panel (not the full generated site). Add a `case` to the `BlockPreview` switch.

Use **inline styles only** (no CSS classes — this component has no external stylesheet). Mirror the visual intent of the generator output but keep it simple.

```jsx
case 'my-block': {
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px', background: '#f8fafc' }}>
      {block.title && <div style={{ fontWeight: 700, marginBottom: 6 }}>{block.title}</div>}
      <div style={{ color: '#374151' }} dangerouslySetInnerHTML={{ __html: md(block.content) }} />
    </div>
  );
}
```

If your block has no meaningful visual representation in the inline preview, return `null` or a placeholder:

```jsx
case 'my-block':
  return <div style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 12 }}>[My Block — visible in full preview]</div>;
```

---

## Step 4 — `src/generator/index.js`

The generator is a CommonJS module that produces the final static HTML and CSS.

### 4a. Add a `case` in `renderBlock()`

`renderBlock(block)` returns an HTML string. Add your case before `case 'divider'`.

Guidelines:
- Use `esc(str)` to HTML-escape all user-supplied string values
- Use `md(str)` to render markdown fields to HTML
- Add a CSS class on the outermost element (e.g. `class="my-block"`) — you will style it in Step 4b
- Use `var(--text)`, `var(--primary)`, `var(--surface)`, `var(--border)`, `var(--radius)` CSS variables for theme-aware colours

```js
case 'my-block': {
  const titleHtml = block.title ? `<div class="my-block-title">${esc(block.title)}</div>` : '';
  const bodyHtml = `<div class="my-block-body prose">${md(block.content)}</div>`;
  return `<div class="my-block">${titleHtml}${bodyHtml}</div>`;
}
```

### 4b. Add CSS in `cssFor()`

The `cssFor()` function returns the full CSS string for generated sites. Add your block's styles in two places.

**Light mode styles** — add near the bottom of the CSS string, grouped with other block styles:

```css
.my-block{border:1px solid var(--border);border-radius:var(--radius);overflow:hidden}
.my-block-title{padding:10px 16px;background:var(--surface);border-bottom:1px solid var(--border);font-weight:700;font-size:.9em;color:var(--text)}
.my-block-body{padding:12px 16px}.my-block-body p:first-child{margin-top:0}.my-block-body p:last-child{margin-bottom:0}
```

**Dark mode styles** — add to the `darkModeVars` template literal, alongside the other `[data-theme="dark"]` overrides (near `[data-theme="dark"] .callout-*`):

```css
[data-theme="dark"] .my-block{border-color:var(--border)}
[data-theme="dark"] .my-block-title{background:var(--surface)}
```

---

## Step 5 — `.ai/BLOCKS.md`

Add a new section documenting the block for AI-assisted site creation. Follow the established format exactly.

### Format template

~~~markdown
### `my-block`
One-sentence description of what this block is for.

```json
{
  "id": "a1b2c3d4-XXXX-0000-0000-000000000000",
  "type": "my-block",
  "title": "Example title",
  "content": "Example content with **markdown** support."
}
```

**Required:** `id`, `type`, `content`  
**Optional:** `title` — description of what it does; defaults to `"..."`.
~~~

### Rules for documenting blocks

- List **every field** with its type and meaning
- Clearly mark fields as **Required** or **Optional**
- State default values for optional fields
- Show a realistic, complete JSON example
- If a field is an array of objects, document each sub-object's fields too
- If a field has a fixed set of allowed values, list them all

---

## Step 6 — `CLAUDE.md`

Add the new type name to the comma-separated block types list in the "Blocks" paragraph so the AI knows it exists when generating sites:

```
**Blocks** are the content units on a page. Available types: `markdown`, ..., `my-block`.
```

---

## Checklist

- [ ] `src/blockTypes.js` — entry in `BLOCK_TYPES`
- [ ] `src/blockTypes.js` — case in `defaultBlock()`
- [ ] `src/components/BlockEditor.jsx` — case in `blockSummary()`
- [ ] `src/components/BlockEditor.jsx` — editor component written
- [ ] `src/components/BlockEditor.jsx` — editor wired into block dispatch
- [ ] `src/components/Preview.jsx` — case in `BlockPreview` switch
- [ ] `src/generator/index.js` — case in `renderBlock()`
- [ ] `src/generator/index.js` — light mode CSS in `cssFor()`
- [ ] `src/generator/index.js` — dark mode CSS in `darkModeVars`
- [ ] `.ai/BLOCKS.md` — schema documented with required / optional fields
- [ ] `CLAUDE.md` — type name added to block types list
