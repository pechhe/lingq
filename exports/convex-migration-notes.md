# Convex Migration Notes

Created: 2026-05-11

## Export files

- `convex-dev-full-export-20260511-195103.zip`
  - Source deployment: dev (`secret-labrador-180`)
  - Includes Convex tables, component tables, and file storage metadata.
  - This is the export containing the current app data.
- `convex-prod-full-export-20260511-195047.zip`
  - Source deployment: prod (`hearty-meerkat-558`)
  - Includes file storage metadata, but currently contains no table or storage documents.

## Import into the new Convex account

1. Log in to the target Convex account locally:

   ```bash
   bunx convex login
   ```

2. Link or create the new Convex project from this repo:

   ```bash
   bunx convex dev
   ```

3. Deploy the Convex schema/functions to the target deployment before importing:

   ```bash
   bunx convex deploy
   ```

4. Import the data export into the target deployment. For a fresh target deployment:

   ```bash
   bunx convex import --replace-all exports/convex-dev-full-export-20260511-195103.zip
   ```

   For production on the target project, add `--prod`:

   ```bash
   bunx convex import --prod --replace-all exports/convex-dev-full-export-20260511-195103.zip
   ```

## Environment variables

Convex environment variables are not included in the ZIP export. Recreate them in the target deployment with:

```bash
bunx convex env set NAME value
```

or through the Convex dashboard.
