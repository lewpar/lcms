# LCMS — Block Types Reference

Every block must have:
- `"id"` — a UUID v4, unique across the entire project (generate a fresh one for every block)
- `"type"` — one of the types below

---

### `markdown`
Freeform Markdown text. Supports bold, italic, inline code, bullet lists, numbered lists, links.

```json
{
  "id": "a1b2c3d4-0001-0000-0000-000000000000",
  "type": "markdown",
  "content": "**Bold**, *italic*, `code`, and [links](https://example.com).\n\n- Bullet\n- List"
}
```

**Required:** `id`, `type`, `content`

---

### `heading`
A section heading rendered as `<h2>` or `<h3>`. Also appears in the page's table of contents.

```json
{
  "id": "a1b2c3d4-0002-0000-0000-000000000000",
  "type": "heading",
  "level": 2,
  "text": "Heading Text",
  "id_attr": "heading-text"
}
```

**Required:** `id`, `type`, `level` (must be `2` or `3`), `text`  
**Optional:** `id_attr` — the HTML anchor `id`; defaults to a slugified version of `text` (lowercase, hyphens). Set explicitly when you need a stable anchor link.

---

### `code`
A syntax-highlighted, read-only code block.

```json
{
  "id": "a1b2c3d4-0003-0000-0000-000000000000",
  "type": "code",
  "language": "javascript",
  "content": "const x = 1;\nconsole.log(x);",
  "caption": "Optional caption shown below the block"
}
```

**Required:** `id`, `type`, `content`  
**Optional:** `language` — enables syntax highlighting; common values: `javascript`, `typescript`, `python`, `html`, `css`, `json`, `bash`, `sql`, `markdown`. `caption` — short label displayed below the block.

---

### `callout`
A highlighted notice box.

```json
{
  "id": "a1b2c3d4-0004-0000-0000-000000000000",
  "type": "callout",
  "title": "Note",
  "content": "This is important information.",
  "color": "blue"
}
```

**Required:** `id`, `type`, `content`  
**Optional:** `title` — bold heading inside the callout. `color` — defaults to `"blue"`; options: `"blue"`, `"green"`, `"yellow"`, `"red"`, `"purple"`, `"gray"`.

---

### `table`
A data table.

```json
{
  "id": "a1b2c3d4-0005-0000-0000-000000000000",
  "type": "table",
  "headers": ["Column A", "Column B", "Column C"],
  "rows": [
    ["row1-col1", "row1-col2", "row1-col3"],
    ["row2-col1", "row2-col2", "row2-col3"]
  ],
  "caption": "Optional table caption"
}
```

**Required:** `id`, `type`, `headers` (array of column heading strings), `rows` (array of arrays, each inner array must have the same length as `headers`)  
**Optional:** `caption` — displayed above the table.

---

### `image`
An image from a URL or uploaded asset.

```json
{
  "id": "a1b2c3d4-0006-0000-0000-000000000000",
  "type": "image",
  "src": "https://example.com/image.png",
  "alt": "Description of the image",
  "caption": "Optional caption",
  "align": "center",
  "width": "100%",
  "height": "400px"
}
```

**Required:** `id`, `type`, `src`  
**Optional:** `alt` — screen-reader description (strongly recommended). `caption` — text shown below the image. `align` — `"left"`, `"center"` (default), or `"right"`. `width` / `height` — any CSS value (e.g. `"600px"`, `"100%"`); omit to use the image's natural size.

---

### `video`
An embedded YouTube video.

```json
{
  "id": "a1b2c3d4-0007-0000-0000-000000000000",
  "type": "video",
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "caption": "Optional caption"
}
```

**Required:** `id`, `type`, `url` — must be a valid YouTube URL; the video ID is extracted automatically.  
**Optional:** `caption` — displayed below the video.

---

### `embed`
A generic iframe embed (e.g. CodePen, Google Slides, interactive demo).

```json
{
  "id": "a1b2c3d4-0008-0000-0000-000000000000",
  "type": "embed",
  "src": "https://codepen.io/username/embed/abcdef",
  "height": 400,
  "caption": "Optional caption"
}
```

**Required:** `id`, `type`, `src`  
**Optional:** `height` — iframe height in pixels; defaults to `400`. `caption` — displayed below the iframe.

---

### `playground`
An interactive JavaScript code editor. The learner can edit and run the code in the browser.

```json
{
  "id": "a1b2c3d4-0009-0000-0000-000000000000",
  "type": "playground",
  "starterCode": "async function run() {\n  const res = await fetch('https://dummyjson.com/quotes/1');\n  const data = await res.json();\n  console.log(data.quote);\n}\n\nrun();",
  "title": "Try it yourself"
}
```

**Required:** `id`, `type`, `starterCode` — the initial code shown in the editor.  
**Optional:** `title` — heading displayed above the editor; defaults to `"Interactive Playground"`.

---

### `fill-in-the-blank`
An interactive exercise where learners type missing words or code. Use `___` (three underscores) as the blank placeholder in `prompt`. The `answers` array maps positionally to each blank.

**Plain text mode** (`language` omitted or `"plaintext"`):
```json
{
  "id": "a1b2c3d4-0010-0000-0000-000000000000",
  "type": "fill-in-the-blank",
  "prompt": "The ___ statement is used to handle errors in JavaScript.\nThe ___ block runs if no error occurs.",
  "answers": ["try", "finally"],
  "title": "Complete the sentence",
  "language": "plaintext"
}
```

**Code mode** (set `language` to any code language — the prompt is syntax-highlighted with inputs rendered inline):
```json
{
  "id": "a1b2c3d4-0011-0000-0000-000000000000",
  "type": "fill-in-the-blank",
  "prompt": "async function load() {\n  const response = await ___(url);\n  const data = await response.___();\n  console.log(data);\n}",
  "answers": ["fetch", "json"],
  "title": "Fill in the blanks",
  "language": "javascript"
}
```

**Required:** `id`, `type`, `prompt`, `answers` (array of strings, one per `___` in `prompt`)  
**Optional:** `language` — defaults to `"plaintext"`; set to a code language (e.g. `"javascript"`) to enable syntax-highlighted code mode. `title` — heading above the exercise; defaults to `"Fill in the Blanks"`.

---

### `quiz`
A multiple-choice quiz with one or more questions.

```json
{
  "id": "a1b2c3d4-0012-0000-0000-000000000000",
  "type": "quiz",
  "questions": [
    {
      "id": "a1b2c3d4-0012-0001-0000-000000000000",
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
  ],
  "title": "Quiz Title",
  "description": "Optional subtitle shown above the questions."
}
```

**Required:** `id`, `type`, `questions` (non-empty array)  
**Optional:** `title` — heading above the quiz; defaults to `"Quiz"`. `description` — subtitle shown below the title.

Each question object:  
**Required:** `id` (UUID), `question`, `options` (array of strings, min 2), `correctIndex` (0-based index of the correct option)  
**Optional:** `explanation` — shown after the learner answers. `media` — content displayed above the question; supported shapes:
- `{ "type": "code", "language": "...", "content": "..." }`
- `{ "type": "image", "src": "...", "alt": "..." }`

Omit `media` entirely if not needed.

---

### `flashcard`
A flippable flashcard deck. Learners click each card to reveal the back.

```json
{
  "id": "a1b2c3d4-0013-0000-0000-000000000000",
  "type": "flashcard",
  "cards": [
    { "front": "What is a Promise?", "back": "An object representing the eventual result of an async operation." },
    { "front": "What does async/await do?", "back": "It lets you write asynchronous code in a synchronous style." }
  ],
  "title": "Key Terms"
}
```

**Required:** `id`, `type`, `cards` (non-empty array of objects each with `front` and `back` strings)  
**Optional:** `title` — heading displayed above the deck.

---

### `accordion`
A set of collapsible sections. The first item is expanded by default. Content supports Markdown.

```json
{
  "id": "a1b2c3d4-0014-0000-0000-000000000000",
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

**Required:** `id`, `type`, `items` (non-empty array of objects)  
Each item: **Required:** `title`, `content` (supports Markdown)

---

### `case-study`
A structured scenario block with a background context and instructions.

```json
{
  "id": "a1b2c3d4-0015-0000-0000-000000000000",
  "type": "case-study",
  "title": "Building a Weather Dashboard",
  "summary": "Apply your fetch skills to load and display real weather data.",
  "background": "A local council wants a simple web page that displays the current temperature for their city. They have access to a public weather API that returns JSON.",
  "instructions": "1. Use `fetch` to request data from the API URL provided.\n2. Parse the JSON response.\n3. Display the temperature value on the page."
}
```

**Required:** `id`, `type`  
**Optional:** `title` — bold heading at the top of the block. `summary` — short description below the title. `background` — scenario context (supports Markdown). `instructions` — task steps (supports Markdown). At least one of `background` or `instructions` should be provided or the block will render empty.

---

### `page-link`
A prominent card that links to another page within the same site.

```json
{
  "id": "a1b2c3d4-0016-0000-0000-000000000000",
  "type": "page-link",
  "pageSlug": "handling-errors",
  "pageTitle": "Handling Errors",
  "description": "Learn how to handle network failures and HTTP error responses."
}
```

**Required:** `id`, `type`, `pageSlug` — must match the `slug` of an existing page in the same site.  
**Optional:** `pageTitle` — display name for the link card; defaults to the value of `pageSlug`. `description` — short text shown below the title.

---

### `hint`
A collapsed block that the learner can click to reveal. Useful in activities.

```json
{
  "id": "a1b2c3d4-0017-0000-0000-000000000000",
  "type": "hint",
  "body": "Check that you are using `await` in the right places.",
  "title": "Hint"
}
```

**Required:** `id`, `type`, `body` — the hidden content; supports Markdown.  
**Optional:** `title` — label on the collapsed button; defaults to `"Hint"`.

---

### `difficulty`
A visual difficulty indicator shown at the top of an activity or page.

```json
{
  "id": "a1b2c3d4-0018-0000-0000-000000000000",
  "type": "difficulty",
  "level": 2,
  "label": "Medium"
}
```

**Required:** `id`, `type`, `level` — integer `1`–`4` (1 = Easy, 2 = Medium, 3 = Hard, 4 = Very Hard).  
**Optional:** `label` — overrides the default label text for the chosen level.

---

### `divider`
A horizontal rule separating sections of content.

```json
{
  "id": "a1b2c3d4-0019-0000-0000-000000000000",
  "type": "divider"
}
```

**Required:** `id`, `type`

---

### `steps`
A numbered list of steps for any sequential process — recipes, tutorials, deployment guides, etc. Each step has an optional title and a markdown body.

```json
{
  "id": "a1b2c3d4-0020-0000-0000-000000000000",
  "type": "steps",
  "title": "Method",
  "items": [
    {
      "id": "a1b2c3d4-0020-0001-0000-000000000000",
      "title": "Bloom the gum arabic",
      "body": "Combine the gum arabic with 1 cup of filtered water. Stir and let stand for **4 hours** until fully dissolved into a thick, viscous liquid."
    },
    {
      "id": "a1b2c3d4-0020-0002-0000-000000000000",
      "body": "Pour into molds and allow to set at room temperature for at least 2 hours."
    }
  ]
}
```

**Required:** `id`, `type`, `items` (array of step objects)  
**Optional:** `title` — heading above the steps (e.g. `"Method"`, `"Instructions"`, `"How to Deploy"`).

Each item in `items`:
- **Required:** `id` (UUID v4), `body` (markdown string)
- **Optional:** `title` (short step heading shown above the body)

---

### `recipe-detail`
A rich recipe block combining the recipe name, description, an optional hero image, yield/servings, and a formatted ingredient list — all in one block.

```json
{
  "id": "a1b2c3d4-0021-0000-0000-000000000000",
  "type": "recipe-detail",
  "name": "Classic Jelly Beans",
  "description": "Homemade jelly beans with a chewy gum arabic center and sugar-polished shell.",
  "image": {
    "src": "/assets/site-id/jelly-beans.jpg",
    "alt": "A pile of colourful homemade jelly beans"
  },
  "servings": "Makes approximately 80 jelly beans",
  "ingredientsTitle": "Ingredients",
  "items": [
    { "id": "a1b2c3d4-0021-0001-0000-000000000000", "amount": "2", "unit": "cups", "name": "granulated sugar" },
    { "id": "a1b2c3d4-0021-0002-0000-000000000000", "amount": "1", "unit": "cup", "name": "gum arabic", "note": "fully bloomed" },
    { "id": "a1b2c3d4-0021-0003-0000-000000000000", "amount": "1/2", "unit": "tsp", "name": "citric acid" },
    { "id": "a1b2c3d4-0021-0004-0000-000000000000", "name": "food-grade essential oil", "note": "to taste" }
  ]
}
```

**Required:** `id`, `type`, `items` (array of ingredient objects)  
**Optional:** `name` — recipe title displayed prominently. `description` — short description shown below the name. `image` — object with `src` (URL or `/assets/…` path) and `alt` (alt text); omit or set `src` to `""` for no image. `servings` — yield or serving size. `ingredientsTitle` — heading for the ingredients list (defaults to `"Ingredients"`).

Each item in `items`:
- **Required:** `id` (UUID v4), `name`
- **Optional:** `amount` (string, e.g. `"2"`, `"1/2"`), `unit` (string, e.g. `"cups"`, `"tsp"`), `note` (preparation note shown in italics, e.g. `"sifted"`, `"room temperature"`)

---

### `tip`
A visually distinct tip box with a warm amber theme — different from `callout`. Use it to highlight a helpful tip, shortcut, or piece of advice on any page type.

```json
{
  "id": "a1b2c3d4-0022-0000-0000-000000000000",
  "type": "tip",
  "title": "Make ahead",
  "content": "This dish can be prepared up to **24 hours** in advance and stored covered in the fridge."
}
```

**Required:** `id`, `type`, `content` (markdown string)  
**Optional:** `title` — heading displayed in the tip header bar; defaults to `"Tip"`.
