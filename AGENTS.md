## Quick Rules

- Use British English.
- Be concise, direct, and pragmatic.
- Convex work: read `convex/_generated/ai/guidelines.md` first when present. If it is missing, install the Convex AI files before non-trivial Convex changes.
- Verify with the lightest reliable check before claiming success.
- Prefer targeted checks over broad repo-wide runs.
- Do not use build commands as a default test. Reserve `bun run build` for routing, bundling, adapter, or other production-boundary changes.
- Prefer `fd` over `find` for routine discovery. Use `find` when portability matters or `fd` is unavailable.
- Prefer `xh` over `curl` for interactive HTTP requests. Use `curl` when low-level flags or portability matter.
- Use relevant built-in or project skills when the task clearly matches them.

## Repo Shape

- This is a single SvelteKit app at the repo root.
- The frontend lives in `src`, the Convex backend lives in `convex`, and shared browser/server helpers live in `src/lib`.
- Keep route-specific behaviour collocated under `src/routes`.
- Prefer simple public entrypoints between areas. Avoid reaching across the repo into another area’s internal files when a higher-level interface will do.
- `svelte.config.js` forces runes mode for project files and enables `experimental.async`. Follow the existing Svelte 5 style instead of mixing in older component patterns.
- `src/routes/+layout.svelte` and the current route structure define the app shape. Treat SSR, adapter, and runtime assumptions as architectural, not incidental.

## Convex

- Read `convex/_generated/ai/guidelines.md` before non-trivial Convex changes. Treat it as repo authority when present.
- If Convex AI files are missing, install them with `bunx convex ai-files install`.
- Treat `convex/_generated/api.*`, `convex/_generated/server.*`, and `convex/_generated/dataModel.d.ts` as authoritative for function names, args, and data shapes.
- When changing Convex schema, functions, or validators, run `bun run convex:codegen` before finishing.
- Keep business logic close to Convex when data already lives there. Prefer Convex-backed flows over same-app HTTP hops.
- Use `query` for reads, `mutation` for writes, and `action` only for work that must touch external services or perform other non-database side effects.
- Keep API routes in `src/routes/api` thin. They should usually validate input, call shared parsing code or a Convex function, and return a response.

## SvelteKit

- Use the Svelte MCP only when the task depends on Svelte 5 or SvelteKit framework semantics, diagnostics, or current API behaviour.
- Do not use the Svelte MCP for routine styling, copy, simple component edits, or straightforward refactors that follow existing repo patterns.
- Use remote functions by default for app-to-backend reads and writes unless there is a clear reason not to.
- Do not add `+page.server.ts`, form actions, or same-app API endpoints unless remote functions are a poor fit for the flow.
- Preserve the current Better Auth integration through `@mmailaender/convex-better-auth-svelte` rather than bypassing it with custom auth plumbing.
- Keep shared UI or browser helpers in `src/lib`, and keep route-specific behaviour collocated under the route.

## Verification

- Start with the narrowest relevant command.
- Use `bun test path/to/file.test.ts` for targeted Bun tests.
- Use `bun test` for the Bun test suite when broader coverage is needed.
- Use `bun run check` for SvelteKit and TypeScript validation.
- Use `bun run lint` when the change touches formatting or lint-sensitive code paths.
- Use `bun run verify` only when you genuinely need the combined test, type, lint, and build pass.
- Run `bun run build` only when the change affects routing, bundling, adapter behaviour, or other build-sensitive boundaries.
- For tested business logic, parsers, validators, transforms, or API contracts, run the most targeted relevant `bun test path/to/file.test.ts`.
- For Svelte, TypeScript, domain-boundary, Convex, or script changes, run `bun run check`; for non-trivial changes in those areas, also run the most targeted relevant tests or `bun run lint` as appropriate.
- Use browser testing only for user-visible UI changes, especially auth, routing, responsive layout, or interaction changes.

## Additional Guidance

- Prefer incremental changes that fit the current SvelteKit + Convex architecture rather than introducing SSR-oriented patterns.
- Respect generated files and codegen output; change source files, then regenerate.
- When working on auth, check both the Svelte client entry points and the Convex auth setup so browser and backend behaviour stay aligned.
- Keep changes scoped to the relevant feature area unless there is a clear reason to refactor more broadly.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
