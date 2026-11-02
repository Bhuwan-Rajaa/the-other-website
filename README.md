# Midnight Memories

A private scrapbook and date planner for Bhuwan and Pooja. React, Vite, TypeScript, Tailwind, Lucide, Framer Motion, and Supabase. The charcoal, burgundy, and champagne interface includes a dashboard, shared calendar, scrapbook, milestones, and profile page.

For a first deployment with no existing projects, follow [the step-by-step GitHub, Supabase, and Vercel guide](DEPLOYMENT.md).

## Enable photos and voice notes on an existing deployment

1. In your existing Supabase project, open **SQL Editor → New query** and run [`supabase/migrations/002_memory_voice_notes.sql`](supabase/migrations/002_memory_voice_notes.sql) once. It adds voice-note metadata, atomic append/remove functions, and a private `memory-audio` bucket. It preserves existing memories and the photo bucket. Do not rerun migration 001 on an existing project.
2. Commit and push the updated source to `main`, including the new migration, components, services, utilities, and `vercel.json`. Wait for the new Vercel deployment.
3. Add photos directly in **Add memory**, or open an existing memory and choose **Add photos** / **Take photo**. Photos can have captions after saving.
4. Open a saved memory, find **Hear this moment again**, and choose **Record a note** or **Upload audio**. Microphone permission is requested only when Record is selected. Stop the recording, listen to the draft, then choose **Save voice note**. Recording is limited to five minutes, files to 10 MB, and each memory to 20 voice notes.

Audio uploads support MP3, M4A, WebM, OGG, WAV, and AAC. Browser recording chooses a supported codec; playback of an uploaded file depends on the browser supporting that format. Recordings are private and shared between the two accounts, served with expiring signed URLs, and can be deleted with confirmation. Deleting a memory also removes its voice recordings and photos. The microphone is released on stop, cancel, errors, or leaving the memory, including when a permission request finishes after navigation. Unfinished drafts are not persisted.

Recording requires HTTPS (provided by Vercel) or localhost. The deployment permits same-origin microphone access in its Permissions Policy. No new environment variables or dependencies are needed. Real Android/iPhone microphone behavior, audio playback, and the live migration still require verification; unit tests use simulated media devices.

## Run locally

Use **Node.js 22.14 or newer** and npm.

```powershell
npm install
npm run dev
```

Open the Local URL printed by Vite (normally `http://127.0.0.1:5173`). With no Supabase environment variables, the login screen offers **Explore the sample preview**. The preview contains illustrative stories and stock photos; it is read-only, stores nothing, and never connects to your database. Leaving or refreshing the preview returns to login. It is automatically unavailable after Supabase is configured.

```powershell
npm test
npm run build
npm run preview
```

`npm test` checks date configuration, anniversary recurrence, calendar boundaries, timezone conversions including DST, busy/maybe precedence, merging, and cross-midnight overlaps. It uses Node's built-in test runner and type stripping. `npm run build` verifies the lockfile's native platform packages, checks TypeScript, and generates `dist/`.

## Connect Supabase

1. Create a Supabase project. Keep **public signups and anonymous sign-ins disabled**. Enable email/password sign-in. Leave Auth rate limits enabled. Do not enable any public registration or password-reset flow.
2. Run [`supabase/migrations/001_midnight_memories.sql`](supabase/migrations/001_midnight_memories.sql) once in the SQL editor, followed by [`supabase/migrations/002_memory_voice_notes.sql`](supabase/migrations/002_memory_voice_notes.sql). The first creates the four tables, constraints, indexes, RLS policies, independent POV protections, atomic photo functions, and a private `memory-photos` bucket. The second enables voice notes and a private audio bucket.
3. In Authentication, use these two users. If they already exist, reuse them and check they are confirmed; otherwise manually create and confirm them. Each user's PIN is their Auth password, configured **in the Supabase dashboard only**:

   | Login name in the app | Configured Auth email | Profile |
   | --- | --- | --- |
   | `BhuwanPooja` | `bhuwan.rajaa21@gmail.com` | Bhuwan / `person_a` |
   | `PoojaBhuwan` | `hahapooja28@gmail.com` | Pooja / `person_b` |

   PINs are not included in this repository. **The originally proposed four-digit PINs are shorter than Supabase's standard six-character password minimum. Choose longer replacements privately; the specification recommends at least eight numeric digits.** Do not concatenate a public login name with a short PIN to work around password requirements. See [Supabase Auth configuration](https://supabase.github.io/auth/) and [password security](https://supabase.com/docs/guides/auth/password-security).

4. Copy the two Auth UUIDs into the placeholders in [`supabase/setup-profiles.sql`](supabase/setup-profiles.sql), then run it once. The unique role constraint allows at most two profiles. The script also creates the **November 17, 2025 — The day we met** milestone. It repeats yearly. The relationship anniversary is calculated separately from **August 14, 2026**.
5. Copy `.env.example` to `.env.local` and fill in your project's URL and publishable/anon key:

   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-publishable-or-anon-key
   ```

   These are browser-facing values protected by RLS. **Never use the service-role key or put PINs in a `VITE_` variable.** `.env.local` is ignored by Git. Restart Vite after changing environment variables.
6. Sign in separately as both people and complete the checks below before adding important memories.

The initial migration is for a new database; rerunning it against an existing installation is intentionally not supported. Use a new migration for subsequent schema changes. Configured Auth emails select the existing accounts; the website continues to display the login names. Reuse existing Auth users so their UUIDs still match `profiles.id`.

## How it works

- `src/config.ts` holds the two login selectors, display names, timezone, relationship start, and meeting date. Names are matched ignoring case and surrounding spaces. PINs go directly to Supabase Auth.
- Routes are protected by a verified profile. A third authenticated identity without one of the two profiles cannot access tables or photos. Profiles cannot be created or changed by the frontend.
- Returning to a tab or receiving a token refresh for the same signed-in account preserves the mounted page, scroll position, open forms, selected files, and unsaved in-memory drafts. Profile verification runs when the account actually changes or a failed verification is retried. Logout and account changes clear the old profile immediately; late responses cannot restore a previous session. The Supabase client continues to manage and refresh tokens normally.
- Plans and memories share one record. Editing status preserves its ID, notes, POVs, and photos. Only title and date are required when creating a record.
- Either partner edits shared memory details. Reflection saves submit only that person's POV and rating. A database trigger also rejects inserts and updates that change the other person's reflection or rating.
- Availability is stored as real timestamps. Busy slots override available intervals. Maybe slots are excluded from confirmed shared free time. All-day intervals use local calendar-day boundaries; end times at or before a start time continue into the following day. Ambiguous DST times use the earlier instant; nonexistent local times are rejected with a helpful message.
- Photos are resized in the browser to at most 1920px, converted to JPEG, stored privately, and displayed with expiring signed URLs. JPG, PNG, and WebP up to 20 MB before resizing are accepted. HEIC must be converted first. Captions also serve as accessible image descriptions. Photo attachment and caption updates are atomic to avoid dropping a partner's concurrent upload.
- Voice notes use `memories.voice_notes` and the private `memory-audio` bucket. Append and removal functions change only the selected note. A trigger validates metadata and prevents replacing an existing recording or impersonating the other person when adding a note. Audio uploads and recordings share the same player; no transcription or continuous recording is included.
- Memory deletion reloads the latest media list and removes voice recordings and photos before the record. If cleanup fails, the record is kept and an error is shown. If row deletion fails after cleanup, retry deletion. Database and object storage changes cannot be one browser-side transaction; an interrupted failed upload can leave an unattached object, so review Storage when recovering from an interrupted upload.
- Month and dashboard queries are bounded. The scrapbook shows up to 150 recent matching records; filter by month to browse older records. Title search runs against the database, including older records. The calendar fetches up to 1,000 records across the visible grid; increase or paginate that query if your usage ever reaches that size.
- No service worker, offline write queue, installation prompt, or public registration is included. Connection failures display errors instead of successful saves.

## Deploy to Vercel

1. Create a private GitHub repository and push the source, including `package-lock.json`. Exclude `.env.local`, `node_modules`, and `dist`.
2. Import the repository into Vercel, select the Vite preset, use **Node 22**, build command `npm run build`, and output directory `dist`.
3. Set both Supabase environment variables in Vercel. Add the production HTTPS URL to Supabase's Site URL configuration.
4. Deploy. `vercel.json` includes SPA route rewrites and basic response headers. Confirm that refreshing `/calendar` and `/memories/<id>` works.

No external accounts, projects, repositories, or deployments have been created by this code. Supabase and Vercel provisioning still require your accounts. Review current provider quotas, inactivity behavior, and backup options before storing important content. Keep a separate export of memories and original photos.

## Verification before release

The source has been type-checked and production-built locally; the core logic tests pass. **Live Supabase authentication, RLS, upload/deletion, browser rendering, and actual phone behavior still need verification.** This workspace prevents browser processes from starting, so an automated browser pass is not claimed.

`npm run test:browser` provides a Playwright smoke test against a running, **unconfigured** development server. It uses an installed Google Chrome; install Chrome separately if needed. It checks protected routes, sample preview navigation, calendar and plan forms, title search, POV ownership, delete confirmation, and 320px page overflow. Screenshots go into ignored `.qa/`. Use `PREVIEW_URL` for another server or `BROWSER_CDP_URL` to attach to a Chrome instance you already launched for testing. It does not test real Supabase security.

After setup, verify:

- Both accounts sign in with the correct selector and independently configured PIN. Wrong combinations get a generic error. Refresh restores a valid session; logout clears access.
- With a real signed-in account, open an Add memory form, enter unsaved text and select a photo, switch to another tab/app, and return. The form, selected file, calendar month, and scroll position should remain. Repeat with an unsaved voice-note draft and with a token refresh. Real logout and switching between accounts must still clear access.
- An unauthenticated client and a third authenticated test identity cannot read any of the four tables or the private bucket. Public signups remain disabled.
- Bhuwan cannot change Pooja's POV/rating or availability through direct API requests, and vice versa. Also test attempts to insert the other person's POV and modify `created_by`.
- Two memories on the same date remain separate. Completing a plan changes its existing row. Blank optional fields work.
- Each person can add photos and captions. Refresh preserves them. Deletion requires the memory title in a confirmation and removes its storage objects.
- Record, stop, preview, save, play, and delete voice notes as both users. Test denied microphone permission, a late permission grant after leaving the page, the five-minute recording limit, unsupported audio, interrupted uploads, and deletion of a memory with both photos and audio. Unauthenticated and third-party identities must not read the audio bucket. Confirm that adding photos does not discard an unsaved voice-note draft.
- Availability overlapping a busy or maybe slot is never shown as confirmed shared free time. Check full days and overnight slots.
- The anniversary uses August 14; the meeting milestone uses November 17. A repeating milestone shows its next occurrence; a one-time past milestone stays in the timeline.
- Test on real Android Chrome and iPhone Safari, including the device keyboard, gallery/camera upload, portrait/landscape, 320px widths, focus indicators, keyboard navigation, reduced motion, slow connections, and airplane mode during saves.

## Source layout

```text
src/
  app/          Routing, responsive shell, error boundary
  components/   Accessible dialogs, editors, photo display, memory cards
  context/      Auth/session and small editor/refresh state
  data/         Isolated sample content for the unconfigured preview
  hooks/        Cancellable resource loading and retries
  pages/        Home, calendar, scrapbook, memory detail, milestones, profile, login
  services/     Supabase reads and writes
  styles/       Responsive theme and reusable design tokens
  utils/        Dates, interval calculations, image preparation
supabase/       Initial migration and two-profile setup
tests/          Core logic tests and optional browser smoke test
```
# the-other-website
