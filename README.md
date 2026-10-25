# ResearchPR

## Account registration

New sign-ups require a display name, phone number, and home address. Philippine local phone numbers such as `09972547665` are normalized to `+639972547665`; common spaces, parentheses, dots, and hyphens are accepted. The values are included in Supabase Auth metadata and copied into the user's row in `public.profiles`. The profile table has row-level security so signed-in users can read only their own profile.

After deploying this change, run the updated `supabase/schema.sql` in the Supabase SQL Editor. It creates the profile table and signup trigger and backfills metadata for existing users. If an existing account has no profile metadata, update its profile through a trusted admin process; users should not create duplicate accounts just to fill missing details.

## Research admin dashboard

The research dashboard is hidden from regular participants. It appears in the sidebar and mobile navigation, and is reachable at `/admin`, only when the signed-in account is listed in `public.admin_users`. The schema grants that access to `shyttyplays@gmail.com`:

- The account is added when `supabase/schema.sql` runs if it already exists.
- The profile trigger also adds it automatically when the account is created later, so the order does not matter.

If the dashboard does not appear after signing in, confirm the account exists in Supabase Auth, run `supabase/schema.sql` again, then sign out and back in. If Supabase reports that `is_admin` or `admin_research_dataset` is missing immediately after running the script, refresh the API schema cache with `notify pgrst, 'reload schema';` in the SQL Editor and retry.

### What the dashboard shows

- Participant profile and contact details from `public.profiles`: display name, phone, home address, signup date, email confirmation, and most recent sign-in.
- Billed baseline from `public.households`: billed kWh, bill amount, entered rate, and the effective rate derived from the bill.
- Appliance inventory from `public.appliances`: wattage, quantity, daily hours, monthly days, estimated monthly kWh, estimated cost, and each appliance's share of the household estimate.
- The last optimization scenario from `public.optimization_scenarios`: baseline and projected kWh, planned saving, saving percentage, and the proposed hours for each appliance.
- Engagement from `public.usage_events`: sign-ins, page views, household saves, appliance changes, report exports, and prints, plus a recent activity timeline.
- Study totals, a billed-versus-estimate chart, participant search, data-status filters, and CSV exports for participants, appliances, and activity. Use the browser print action for a printable snapshot.

All reads go through the admin-only `public.admin_research_dataset()` function. It is `SECURITY DEFINER`, rejects callers who are not in `public.admin_users`, and does not widen the existing per-account row-level security policies, so participants still can only read their own household data. Users can insert only their own activity events and can read only their own events.

Activity is recorded by the app under each participant's own session. The database enforces whose events they are but cannot verify that a participant did not fabricate their own events, so treat engagement counts as app-reported behavior.

Before collecting or sharing participant data, confirm that the study consent, storage, and data-protection arrangements cover the personal details shown here. Exported CSV files are generated in the browser and are not stored by the app.

## Progressive Web App

Build and deploy the app over HTTPS to enable installation. Supported browsers show an **Install app** action; on iPhone and iPad, use **How to install** and follow the Safari Home Screen steps.

The service worker provides an offline app shell and caches same-origin static assets after they are requested. After a signed-in online visit, the app also loads its study pages so their code is available offline. It does not cache Supabase requests; the separate offline household-data feature below stores an account-scoped copy in browser IndexedDB.

## Offline household data

After signing in and loading your household while online, the app saves a copy of your household and appliances in this browser's IndexedDB. You can view and edit that copy offline. Queued changes sync to Supabase when the device reconnects. If the online record changed in the meantime, the app pauses that change and lets you choose the device copy or the online copy.

Offline data is stored on the device and is not encrypted by this app. Avoid using offline mode on shared or untrusted devices. Keep the app signed in until queued changes have synced or conflicts have been resolved. A first-time sign-in and the first data download require an internet connection. Browser storage can be cleared by the user or browser, so offline data is not a backup.
