---
applyTo: "src/blockTypes.js,src/components/BlockEditor.jsx,src/components/Preview.jsx,src/generator/index.js"
---

# Creating a new CMS block type

When asked to add or create a new block type, read `.github/CREATE-BLOCK.md` for the complete step-by-step guide with code examples. Read `.github/BLOCKS.md` for examples of how existing blocks are documented.

## Files to touch — all six are mandatory

| # | File | What you add |
|---|------|--------------|
| 1 | `src/blockTypes.js` | Entry in `BLOCK_TYPES`; case in `defaultBlock()` |
| 2 | `src/components/BlockEditor.jsx` | Summary text; editor form component; render wire-up |
| 3 | `src/components/Preview.jsx` | Case in `BlockPreview` switch (inline styles only) |
| 4 | `src/generator/index.js` | `renderBlock()` case; light + dark mode CSS |
| 5 | `.github/BLOCKS.md` | Full schema documentation for the new block |
| 6 | `.github/copilot-instructions.md` | Add the type name to the block types list |

Skipping any one of these leaves the block broken. See `.github/CREATE-BLOCK.md` for exactly what to add in each file.
