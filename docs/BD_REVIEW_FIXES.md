# BD review fixes — 1 November 2026

Implementation validated locally. Production deployment was authorised on 1 November 2026.

## Changes and validation

| # | Change | Verification |
|---|---|---|
| 1 | Dashboard consumes `leaveStats.byStatus`; counts and approval percentage exclude pending requests explicitly. No decisions shows an empty state. | Local browser: approved 4, rejected 2, pending 3 displays 67%, with the denominator explained. |
| 2 | Empty monthly attendance returns `attendanceRate: null`; UI shows No data and the record count. Actual 0% remains 0%. | Service tests for empty/nonempty/zero-rate months; local browser shows No data for 0 records. |
| 3 | Invitation requires an explicit active organisation selection. API rejects inactive and soft-deleted organisations before modifying users/invitations, including resend. | Invitation service tests; local browser: no default organisation, inactive company absent, Send Invite disabled until a selection is made. |
| 4 | Notification preferences use authenticated GET/PATCH APIs and a per-user database table. Notification creation/broadcast respects category preferences; email is opt-in and depends on sender configuration. The UI no longer claims Sandbox Mode. | HTTP tests cover validation, persistence across requests and ownership; service tests cover category suppression, broadcast, email opt-in, inactive accounts and email failure. Local browser save/reload retains the setting. |
| 5 | Staff ticket detail links return to management; student links return to personal support. Management search/status/priority are preserved. External return URLs are rejected. | Local browser round trip with all three filters; 9 navigation checks. |
| 6 | FAQ uses SICK/CASUAL/ANNUAL/OTHER, actual training status names and the implemented preference behavior. | Local browser expands the leave answer and confirms enum names. |
| 7 | Users has mobile cards below the md breakpoint, with name, role, status, company, mentor and shared action menus. Desktop retains its table. | Local browser at 390px: 3 cards, desktop table hidden, document width <= viewport, pending-user actions available. |
| 8 | Training cards use Curriculum for the module count. Staff see completion and overdue assignments for active students currently in the team; former members are excluded. No assignments produces no percentage. | Summary/service tests plus local browser: 1/4 completed (25%), 1 overdue assignment. Deadline comparison uses the UTC+7 business date, including the midnight boundary. |

Leave decisions and new/updated curriculum modules now use the preference-aware notification service. Email notifications contain a sign-in link rather than private notification details. Attendance preferences control notifications issued by the system; this change does not add a daily reminder scheduler.

`Email configured` means a non-test sender and API key are configured; it does not claim to have queried Resend's verification status or guarantee inbox delivery.

## Checks completed

- Full API Jest suite: **9 suites, 64 tests passed**.
- `node scripts/test-support-navigation.cjs`: **9 checks passed**.
- API Nest build: passed.
- Web production build: passed, including type checking/lint and all 23 static pages.
- Prisma schema validation and client generation: passed.
- Browser checks for all eight fixes: passed with fictional fixture data.
- `git diff --check`: passed.

Older test fixtures were updated for the existing access-token response, team/module curriculum model and current dashboard contracts. Existing auth, branding and layout work was preserved.

## Test scope

The browser used the actual local frontend with `scripts/bd-review-fixture-server.cjs`. API unit/HTTP tests used Prisma and email mocks. No production accounts, leave decisions, tickets or real emails were modified. The fixture servers have been stopped after testing.

The new notification preferences SQL was applied to the configured production PostgreSQL database on 1 November 2026. Its six columns were verified. The existing database has no Prisma migration history, so only this additive SQL file was executed; historical migrations were not run. Regression tests used fixtures and mocks. Resend inbox delivery was not tested.

## Deployment requirement

Review and apply `packages/database/prisma/migrations/20261101003000_notification_preferences/migration.sql` using the normal migration process **before deploying the new API**. It creates only the `notification_preferences` table and its user foreign key. Then generate the Prisma client and deploy both API and frontend.

Keep the API sender configured as `DevPlus <noreply@devplusintern.com>` and its `FRONTEND_URL` set to the canonical public frontend URL. After deployment, verify saving preferences on a real account and perform an authorised email delivery smoke test.

## Repeat the local checks

```sh
npm test --workspace=api -- --runInBand
node scripts/test-support-navigation.cjs
./node_modules/.bin/prisma validate --schema=packages/database/prisma/schema.prisma
```

For browser QA, run the fixture API and frontend in separate terminals:

```sh
node scripts/bd-review-fixture-server.cjs
NEXT_PUBLIC_API_URL=http://127.0.0.1:4400/api npm run dev --workspace=web -- --hostname 127.0.0.1 --port 3300
```

The fixture-only account is `review.bd@example.test` / `local-review-only`. It is not connected to production, a real database, or Resend.
