# Implementation status (2026-11-28)

This feature branch is a safe starting point, **not** a completed production super-commerce platform.

**Available on branch:** standalone three-app roadmap, additive SQL for CMS and tenant memberships, server-side tenant scope helpers, pending partner application and admin approval APIs, CMS CRUD API, category backfill script, homepage integration (pending final build/QA).

**Not yet implemented or verified:** separate Business/Admin production apps, live payment gateway, payment provider credentials/webhooks and bank settlement, operational merchant onboarding checks, real store inventory sync, actual hotel room inventory locking, real cab dispatch/GPS, order fulfilment, paid 2.5D image assets, production DB migration. These cannot be marked delivered without providers/partner data and integration tests.

**Important security blocker:** Existing seed includes hard-coded privileged and demo users; the preexisting wallet bonus, sandbox card/UPI success, synthetic riders and timed order progression must not be presented as real service. Rotate/remove privileged seed users only after auditing current live database and provisioning a verified replacement admin account.

**Rollout:** Apply SQL on staging first, run backfill there, verify owner 403 tests and CMS sync, measure performance. Only then apply additive migrations to production and merge app changes.
