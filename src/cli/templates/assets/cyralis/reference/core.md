# Core Reference

## 1. Layout and naming

`.cyralis/attention.md` is the always-loaded project note entry.

```text
.cyralis/attention.md
.cyralis/
├── requirements/   capability vision docs
├── architecture/   current-state architecture map
├── roadmap/        big-demand planning layer
├── features/       feature spec roots
├── issues/         bug spec roots
├── refactors/      behavior-preserving refactor roots
├── audits/         audit / arch-review roots
├── compound/       learning / trick / decision / explore archive
├── brainstorms/    brainstorm spike scratch space
├── tools/          shared helper scripts
└── reference/      shared reference docs
```

### Naming

- `requirements/{slug}.md`
- `architecture/{type}-{slug}.md`
- `roadmap/{slug}/`
- `features/YYYY-MM-DD-{slug}/`
- `issues/YYYY-MM-DD-{slug}/`
- `refactors/YYYY-MM-DD-{slug}/`
- `audits/YYYY-MM-DD-{slug}/`
- `compound/YYYY-MM-DD-{doc_type}-{slug}.md`

## 2. Metadata and workflow state

Feature specs share `doc_type` / `feature` / `summary` / `tags`. Standard workflow status lives in `work.json.status`.

- `design` / `implement` / `verify` / `done`
- `design.approval`: `draft` or `approved`
- `acceptance.result`: `passed` / `failed` / `skipped`

Issue specs share `doc_type` / `issue` / `status` / `tags`.

Compound docs share `doc_type` plus their own category fields.

## 3. Shared tools

Shared scripts:

- `search-yaml.py`
- `validate-yaml.py`
- `work.py`

Typical calls:

```bash
python .cyralis/tools/search-yaml.py --dir .cyralis/compound --filter doc_type=decision --query "keyword"
python .cyralis/tools/validate-yaml.py --file {path} --require doc_type --require status
python .cyralis/tools/work.py transition <dir> <status>
```

Use `python .cyralis/tools/work.py transition <dir> <status>` for status changes; hooks and prompts only read state.

## 4. Memory projection

- `.cyralis/architecture/` and `.cyralis/compound/` are source of truth
- `.cyralis/memory/projections/` is a rebuildable recall layer
- after write / update / supersede, run `cyralis memory sync`
- compound single-file updates can use `cyralis memory sync --kind compound --source {path}`
- architecture updates can use `cyralis memory sync --kind architecture`
- projection stubs should stay short: title, summary, tags, source path, excerpt
