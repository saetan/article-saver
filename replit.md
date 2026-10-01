# Running on Replit

- The app uses Node 24 and pnpm 12.4.1.
- The `Start application` workflow runs Nuxt on port 5000, bound to `0.0.0.0`.
- `DB_DIALECT=postgres` is shared by development and production. Replit supplies an environment-specific managed `DATABASE_URL`; do not replace it with a copied URL.
- Apply the checked-in Drizzle migrations to the development database with `pnpm db:migrate`. Replit applies the development schema to its managed production database when publishing; do not run development migrations against production.
- Clerk keys are provided as Replit-managed secrets and mapped to Nuxt runtime config. `ALLOWED_EMAILS` must list the email address(es) permitted to sign in; an empty value denies all users.
- Local uploads use `.data/uploads`. For persistent production files, configure the existing Replit Object Storage adapter separately.