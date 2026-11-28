# Gowayy Admin / Business Consoles

One shared Next.js codebase, two independent Vercel projects in the same team.

- **Gowayy Admin**: set `CONSOLE_MODE=admin`, Root Directory `apps/console`.
- **Gowayy Business**: set `CONSOLE_MODE=business`, Root Directory `apps/console`.
- Both require matching `AUTH_SECRET` (32+ chars) and `DATABASE_URL` referencing the existing Gowayy Neon Postgres database. Configure as sensitive Vercel environment variables. Never put secrets in Git.
- Run `migrations/20261128_gowayy_business.sql` and `migrations/20261128_gowayy_cms.sql` on **staging first**, then production after verifying backups. These are additive and never modify existing customer rows.
- Replace the old demo admin login with a verified, rotated administrator. The console rejects the original known `admin@gowayy.in` / `admin123` combination even when it still exists.
- Business signup creates an unapproved organization. Content remains unavailable until admin approves. Real KYC, SMS OTP and public merchant acquisition are not yet operational.
- Current dashboards have limited business CRUD and CMS; genuine payments, hotel room locking, cab dispatch/GPS and true delivery integration still require implementation.
- Customer app remains separately deployed. Independent applications share one database and server-authorized tenant access, but the full separately deployed API service is future work.
