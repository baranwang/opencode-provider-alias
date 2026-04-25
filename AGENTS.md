# AGENTS.md

## Repo shape

- Single-package Bun + Rslib OpenCode plugin. The source entrypoint is `src/index.ts`, exporting `providerAlias`.
- Package consumers load `./dist/index.js`: `package.json` sets both `main` and `module` to that file, publishes only `dist/`, and `.gitignore` excludes `dist/`.
- `rslib.config.ts` emits ESM only, targets `node 18`, and sets `dts: false`; do not expect declaration files from `bun run build`.

## Commands

- `bun install` - install dependencies from `bun.lock`.
- `bun run build` - run Rslib once and write `dist/`.
- `bun run dev` - run `rslib --watch` for rebuild-on-change.
- `bun run test` - run the Rstest suite.
- `bun run check` - run `biome check --write`; this may modify files.
- `bun run format` - run `biome format --write`; this modifies files.
- There is no `bun run lint` script; use `check` or `format` from `package.json`.

## Tests and runtime gotchas

- Tests live in `src/index.test.ts` and use `createOpencode`, so they are integration-style plugin tests, not pure unit tests.
- `src/index.ts` reads `~/.cache/opencode/models.json`; if missing, it fetches `https://models.dev/api.json` and writes that cache file. First test/plugin runs may need network and mutate the user cache.

## Tooling conventions

- Biome is the formatter/linter source of truth: space indentation, single quotes for JS/TS, recommended lint rules, and import organization enabled.
- `.vscode/settings.json` uses Biome for TypeScript/JSON/JSONC and enables TypeScript format-on-save with explicit Biome fix/organize/sort import actions.
- `tsconfig.json` is build-support only: `noEmit`, `isolatedModules`, `moduleResolution: "bundler"`, `rootDir: "src"`, and `include: ["src"]`.
- No CI, pre-commit, task-runner, or repo-local `opencode*` config was found; verify changes locally with the relevant `bun run ...` scripts.
