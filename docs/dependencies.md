# Dependencies

## Surfaces

- `package.json` (`dependencies`, `devDependencies`, `overrides`) and `bun.lock`.
- `packageManager` pins `bun@1.3.11`. Bun is the authority; `package-lock.json` is a tracked leftover that is not maintained.
- `vite` is aliased to `npm:@voidzero-dev/vite-plus-core` in both `devDependencies` and `overrides` (required by `vite-plus` 1.x).

## Clusters

- Kit: `@sveltejs/kit`, `@sveltejs/adapter-auto`, `@sveltejs/adapter-vercel`, `@sveltejs/vite-plugin-svelte`, `svelte`, `svelte-check`.
- Auth: `better-auth`, `@better-auth/passkey` (exact, equal versions), `@convex-dev/better-auth`, `@mmailaender/convex-better-auth-svelte`.
- Convex: `convex`, `@mmailaender/convex-svelte`.
- Tooling: `vite-plus`, `vite` alias, `tailwindcss`, `@tailwindcss/vite`.

## Constraints

- `@sveltejs/kit` 2.x, adapters on 7.x/6.x: Kit 3 removes `svelte.config.js`, `$lib`, `$env/*`, `$app/environment` and moves `Handle` to `@sveltejs/kit/hooks`; adapter-auto 8 and adapter-vercel 7 require Kit 3. Release condition: schedule a Kit 3 migration.
- `typescript` ~6.x: TypeScript 7 has no JS API, and Kit and svelte-check peers cap at 6.
- `better-auth` and `@better-auth/passkey` 1.6.x: `@convex-dev/better-auth` peers `better-auth <1.7.0` (1.7 removes `better-auth/plugins/oidc-provider`, breaking the build). Release condition: a `@convex-dev/better-auth` release supporting 1.7.

## Commands

- Check updates: `bun outdated`; bump: `bun update --latest` then re-pin the constraints above; audit: `bun audit`.
- Verification set: `bun install`, `bun run check`, `bun run test`, `bun run build`.

## Ground rules

- Use Bun only; do not add other lockfiles.
- Keep `better-auth` and `@better-auth/passkey` pinned to the same exact version.
