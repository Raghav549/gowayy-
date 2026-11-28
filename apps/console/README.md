# Gowayy Admin / Business Consoles

One shared Next.js codebase, two independent Vercel projects in the same team.

- **Gowayy Admin**: set `CONSOLE_MODE=admin`, Root Directory `apps/console`.
- **Gowayy Business**: set `CONSOLE_MODE=business`, Root Directory `apps/console`.
- Both require matching `AUTH_SECRET` (32+ chars) and `DATABASE_URL` referencing the existing Gowayy Neon Postgres database. Configure as sensitive Vercel environment variables. Never put secrets in Git.
- Run `migrations/20261128_gowayy_business.sql` and `migrations/20261128_gowayy_cms.sql` on **staging first**, then production after verifying backups. These are additive and never modify existing customer rows.
- Set a strong `ADMIN_BOOTSTRAP_PASSWORD` only on the Admin project. On the first successful login for `admin@gowayy.in`, it atomically rotates the blocked legacy hash; it is not a permanent authentication bypass. Change it again from Account security after signing in.
- Business signup creates an unapproved organization. Content remains unavailable until admin approves. Real KYC, SMS OTP and public merchant acquisition are not yet operational.
- The dashboards manage tenant-scoped listings, inventory, fulfillment, hotel/tour capacity and verified cab assignment. Live GPS still requires a production driver-location provider.
- Customer app remains separately deployed. Independent applications share one database and server-authorized tenant access, but the full separately deployed API service is future work.
