# LCMS — Block Types Reference

Every block must have:
- `"id"` — a unique string within the page (e.g. `"intro-1"`, `"q-heading"`)
- `"type"` — one of the types below

---

### `markdown`
Freeform Markdown text. Supports bold, italic, inline code, bullet lists, numbered lists, links.

```json
{
  "id": "b-1",
  "type": "markdown",
  "content": "**Bold**, *italic*, `code`, and [links](https://example.com).\n\n- Bullet\n- List"
}
```

---

### `heading`
A section heading rendered as `<h2>` or `<h3>`. Also appears in the page's table of contents.

```json
{
  "id": "b-2",
  "type": "heading",
  "level": 2,
  "text": "Heading Text",
  "id_attr": "heading-text"
}
```

`level` can be `2` or `3`. `id_attr` is the HTML anchor id — use a slugified version of `text` (lowercase, hyphens).

---

### `code`
A syntax-highlighted, read-only code block.

```json
{
  "id": "b-3",
  "type": "code",
  "language": "javascript",
  "content": "const x = 1;\nconsole.log(x);",
  "caption": "Optional caption shown below the block"
}
```

Common `language` values: `javascript`, `typescript`, `python`, `html`, `css`, `json`, `bash`, `sql`, `markdown`.

---

### `callout`
A highlighted notice box.

```json
{
  "id": "b-4",
  "type": "callout",
  "title": "Note",
  "content": "This is important information.",
  "color": "blue"
}
```

`color` options: `"blue"`, `"yellow"`, `"red"`, `"green"`, `"purple"`.

---

### `table`
A data table.

```json
{
  "id": "b-5",
  "type": "table",
  "caption": "Optional table caption",
  "headers": ["Column A", "Column B", "Column C"],
  "rows": [
    ["row1-col1", "row1-col2", "row1-col3"],
    ["row2-col1", "row2-col2", "row2-col3"]
  ]
}
```

---

### `image`
An image from a URL or uploaded asset.

```json
{
  "id": "b-6",
  "type": "image",
  "src": "https://example.com/image.png",
  "alt": "Description of the image",
  "caption": "Optional caption",
  "align": "center",
  "width": "100%",
  "height": ""
}
```

`align` options: `"left"`, `"center"`, `"right"`. `width` and `height` accept CSS values (e.g. `"600px"`, `"100%"`). Both are optional.

---

### `video`
An embedded YouTube video.

```json
{
  "id": "b-7",
  "type": "video",
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "caption": "Optional caption"
}
```

`url` must be a valid YouTube URL. The video ID is extracted automatically.

---

### `embed`
A generic iframe embed (e.g. CodePen, Google Slides, interactive demo).

```json
{
  "id": "b-8",
  "type": "embed",
  "src": "https://codepen.io/username/embed/abcdef",
  "height": 400,
  "caption": "Optional caption"
}
```

`height` is in pixels (default 400).

---

### `playground`
An interactive JavaScript code editor. The learner can edit and run the code in the browser.

```json
{
  "id": "b-9",
  "type": "playground",
  "title": "Try it yourself",
  "starterCode": "async function run() {\n  const res = await fetch('https://dummyjson.com/quotes/1');\n  const data = await res.json();\n  console.log(data.quote);\n}\n\nrun();"
}
```

`title` is optional. `starterCode` is the initial code shown in the editor.

---

### `fill-in-the-blank`
An interactive exercise where learners type missing words or code. Use `___` (three underscores) as the blank placeholder in `prompt`. The `answers` array maps positionally to each blank.

**Plain text mode:**
```json
{
  "id": "b-10",
  "type": "fill-in-the-blank",
  "title": "Complete the sentence",
  "language": "plaintext",
  "prompt": "The ___ statement is used to handle errors in JavaScript.\nThe ___ block runs if no error occurs.",
  "answers": ["try", "try"]
}
```

**Code mode** (set `language` to a code language):
```json
{
  "id": "b-11",
  "type": "fill-in-the-blank",
  "title": "Fill in the blanks",
  "language": "javascript",
  "prompt": "async function load() {\n  const response = await ___(url);\n  const data = await response.___();\n  console.log(data);\n}",
  "answers": ["fetch", "json"]
}
```

In code mode the prompt is syntax-highlighted with inputs rendered inline.

---

### `quiz`
A multiple-choice quiz with one or more questions.

```json
{
  "id": "b-12",
  "type": "quiz",
  "title": "Quiz Title",
  "description": "Optional subtitle shown above the questions.",
  "questions": [
    {
      "id": "q-1",
      "question": "What does fetch() return?",
      "options": ["A string", "A Promise", "A number", "undefined"],
      "correctIndex": 1,
      "explanation": "fetch() returns a Promise that resolves to a Response object.",
      "media": {
        "type": "code",
        "language": "javascript",
        "content": "const p = fetch('https://example.com');\nconsole.log(p);"
      }
    }
  ]
}
```

- `correctIndex` — 0-based index of the correct answer in `options`.
- `explanation` — shown after the learner answers.
- `media` — optional. Shows content above the question. Supported types:
  - `{ "type": "code", "language": "...", "content": "..." }` — a code block
  - `{ "type": "image", "src": "...", "alt": "..." }` — an image
  - Omit `media` entirely (or set to `null`) if not needed.

---

### `flashcard`
A flippable flashcard deck. Learners click each card to reveal the back.

```json
{
  "id": "b-13",
  "type": "flashcard",
  "title": "Key Terms",
  "cards": [
    { "front": "What is a Promise?", "back": "An object representing the eventual result of an async operation." },
    { "front": "What does async/await do?", "back": "It lets you write asynchronous code in a synchronous style." }
  ]
}
```

---

### `accordion`
A set of collapsible sections. The first item is expanded by default. Content supports Markdown.

```json
{
  "id": "b-14",
  "type": "accordion",
  "items": [
    {
      "title": "What is the Fetch API?",
      "content": "The Fetch API provides a JavaScript interface for making HTTP requests. It returns a Promise."
    },
    {
      "title": "How is fetch different from XMLHttpRequest?",
      "content": "fetch is Promise-based and has a cleaner API. XMLHttpRequest uses callbacks and is more verbose."
    }
  ]
}
```

---

### `case-study`
A structured scenario block with a background context and instructions.

```json
{
  "id": "b-15",
  "type": "case-study",
  "title": "Building a Weather Dashboard",
  "summary": "Apply your fetch skills to load and display real weather data.",
  "background": "A local council wants a simple web page that displays the current temperature for their city. They have access to a public weather API that returns JSON.",
  "instructions": "1. Use `fetch` to request data from the API URL provided.\n2. Parse the JSON response.\n3. Display the temperature value on the page."
}
```

`background` and `instructions` both support Markdown.

---

### `page-link`
A prominent card that links to another page within the same site.

```json
{
  "id": "b-16",
  "type": "page-link",
  "pageSlug": "handling-errors",
  "pageTitle": "Handling Errors",
  "description": "Learn how to handle network failures and HTTP error responses."
}
```

`pageSlug` must match the `slug` of an existing page in the same site. `pageTitle` and `description` are display-only labels.

---

### `hint`
A collapsed block that the learner can click to reveal. Useful in activities.

```json
{
  "id": "b-17",
  "type": "hint",
  "title": "Hint",
  "body": "Check that you are using `await` in the right places."
}
```

`body` supports Markdown.

---

### `difficulty`
A visual difficulty indicator shown at the top of an activity or page.

```json
{
  "id": "b-18",
  "type": "difficulty",
  "level": 2,
  "label": "Medium"
}
```

`level` is `1`–`4` (Easy / Medium / Hard / Very Hard). `label` overrides the default label text if provided.

---

### `divider`
A horizontal rule separating sections of content.

```json
{
  "id": "b-19",
  "type": "divider"
}
```
