# Templates

This directory is reserved for larger host binding templates that should not
live inline in TypeScript source.

The installer templates are grouped under `src/cli/templates/`. Large prompt,
reference, Markdown, YAML, and JSON assets live as raw files under
`src/cli/templates/assets/` and are copied to `dist/cli/templates/assets/` by
`scripts/copy-template-assets.js` during `npm run build`.

Use this directory only for future template assets that do not belong to the CLI
installer path.
