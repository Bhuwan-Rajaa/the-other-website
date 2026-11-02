# Midnight Memories — Project Specification

> A private, two-person space to plan dates, record what happened, and revisit the memories together.

**Document status:** Product and implementation specification  
**Working title:** Midnight Memories (name can be changed)  
**Product type:** Responsive private web application  
**Users:** Exactly two preconfigured people  
**Primary goal:** Make it effortless to add a memory or availability entry from a phone.

### Confirmed setup decisions

- Person A: **Bhuwan**, login name `BhuwanPooja`.
- Person B: **Pooja**, login name `PoojaBhuwan`.
- Configure each person's PIN privately in Supabase Auth; do not record PINs in project files.
- Relationship start date: **August 14, 2026** (`2026-08-14`). The relationship anniversary repeats annually on August 14.
- Day we met: **November 17, 2025** (`2025-11-17`), recorded as a separate milestone.
- Application timezone: `Asia/Kolkata`.
- Supabase, GitHub, and Vercel have not yet been set up for this project.
- Busy time slots override overlapping full-day availability when calculating shared free time.
- Each milestone has a `Repeat yearly` option.

---

## 1. Product vision

Midnight Memories is a shared digital scrapbook and date planner for two people. It combines:

- A relationship dashboard with upcoming plans, recent memories, and important milestones.
- A calendar that combines date plans, completed memories, and each person's availability.
- A scrapbook where a single day can contain several separate activities or memories.
- Two independent points of view (POVs) on every memory: one from each person.

The product should feel personal, polished, and nostalgic—not like a generic calendar or social network.

### Product principles

1. **Designed for two people only.** Do not build groups, invitations, public profiles, comments, followers, or multi-tenant account management.
2. **Fast data entry.** Adding a memory should take only a few taps. Avoid long forms and unnecessary confirmation steps.
3. **Simple data model.** Use a few understandable tables and flexible JSON fields for optional scrapbook details. Avoid an elaborate schema, ORM layer, or complex query system.
4. **Mobile-first responsive design.** The application must work comfortably in Android Chrome and iPhone Safari, as well as desktop browsers.
5. **Private by default.** Only the two authenticated accounts can access the application and its data.
6. **The memory is the product.** Prioritize photos, stories, reflections, and easy browsing over statistics or administrative features.

---

## 2. Scope

### Included in the first release

- Two fixed accounts with name-pair + individual PIN login.
- Home dashboard.
- Shared calendar.
- Full-day and time-slot availability for each person.
- Overlap detection for times when both people are free.
- Future date plans.
- Multiple memories or activities on the same calendar date.
- Memory details, multiple photos, captions, and optional scrapbook information.
- Separate POV fields for each person on every memory.
- Milestones and relationship anniversary information.
- Responsive mobile and desktop layouts.
- Private photo storage and row-level database security.

### Explicitly out of scope

- PWA installation, app-store distribution, or a native Android/iOS application.
- Public registration, third user accounts, invitations, or team functionality.
- Private diary entries. Both people's POVs are shared with each other.
- Chat, messaging, reactions, likes, feeds, or social features.
- Complex expense splitting, payment tracking, maps, or route planning.
- Push notifications, SMS, email reminders, or background synchronization in the first release.
- Offline editing. The app should show a helpful connection error rather than silently pretending an offline change was saved.

---

## 3. Technology decisions

| Layer | Choice | Purpose |
|---|---|---|
| Frontend | React + Vite + TypeScript | Main web application |
| Styling | Tailwind CSS | Responsive styling and design tokens |
| Icons | Lucide React | Consistent interface icons |
| Animation | Framer Motion, used sparingly | Page transitions and small interactions |
| Backend platform | Supabase | Authentication, PostgreSQL, storage, and APIs |
| Database | Supabase PostgreSQL | Simple relational records with JSONB for optional data |
| Photo storage | Supabase Storage | Private image bucket |
| Hosting | Vercel | Frontend deployment and HTTPS |
| Version control | GitHub | Source control and Vercel deployment integration |

### Keep the implementation uncomplicated

- Use the Supabase JavaScript client directly for ordinary reads and writes.
- Keep database calls in a small `services/` layer so components do not contain query logic.
- Use React Context for the signed-in user and a small amount of shared application state.
- Use local component state for forms and modals.
- Do not add Redux, GraphQL, a separate Express server, Prisma, microservices, or a generalized permissions framework.
- Do not add a second backend unless a real requirement appears that Supabase cannot handle cleanly.

---

## 4. Authentication and account model

### Login experience

The login page has two fields:

1. **Login name:** The user enters one of the two configured name pairs.
2. **PIN:** The user enters their own PIN.

The configured name order determines the account:

- `BhuwanPooja` identifies Bhuwan (Person A).
- `PoojaBhuwan` identifies Pooja (Person B).

Names and the displayed order must be configurable. Normalize leading/trailing spaces and case before matching. Match only the two configured combinations; do not create an account from an unrecognized pair.

### Authentication implementation

- Create exactly two Supabase Auth users manually during setup.
- Disable public sign-ups. There must be no registration screen or registration endpoint in the app.
- Treat the entered name pair as the account selector and the PIN as that account's password.
- Map each accepted name order to one of the two pre-created Supabase Auth identities, then use Supabase Auth password sign-in.
- Use non-personal internal login identifiers for the Supabase Auth accounts if email/password sign-in is used; they do not need to be real contact addresses when email delivery is not part of the product.
- Never store a plaintext PIN in the database, source code, frontend environment variables, or logs. Supabase Auth must handle password hashing and session management.
- Use an individual, non-reused PIN for each person. Prefer at least 8 numeric digits rather than a short 4-digit PIN.
- Respect Supabase Auth rate limits and show a generic invalid-login error. Do not reveal whether the pair or PIN was the incorrect part.
- Do not implement a public password reset flow. Credential changes can be performed by the project owner through the Supabase dashboard.
- Persist the Supabase session securely using the supported Supabase client behavior. Provide a clear logout action.

**Important:** The name pair is an account selector, not a security secret. The PIN and Supabase Auth session are the credentials. A public website with short PINs can be guessed, so use sufficiently long PINs and keep authentication rate limiting enabled.

### Account profiles

Each of the two profiles needs only:

- `id` — same UUID as the corresponding Supabase Auth user.
- `display_name` — the name shown in the UI.
- `role` — `person_a` or `person_b`.

No profile editing or account creation UI is required in the first release.

---

## 5. Information architecture and navigation

### Main navigation

- **Home** — relationship dashboard.
- **Calendar** — monthly calendar, availability, plans, and memories.
- **Memories** — searchable/browsable scrapbook timeline.
- **Milestones** — relationship milestones and anniversary dates.
- **Profile** — current account, appearance preferences if implemented, and logout.

On phones, use a compact bottom navigation bar. On wider screens, use a clean sidebar or top navigation. Keep the active section visually obvious.

### Suggested routes

| Route | Page |
|---|---|
| `/login` | Name-pair + PIN login |
| `/` | Home dashboard |
| `/calendar` | Calendar |
| `/memories` | Memories timeline/grid |
| `/memories/:id` | Memory detail/edit page or mobile full-screen view |
| `/milestones` | Milestones |
| `/profile` | Profile and logout |

Protect all application routes. Unauthenticated visitors should only see the login page.

---

## 6. Home dashboard

The homepage should feel like a live relationship dashboard, not an admin panel.

### Dashboard sections

1. **Welcome area** — a small greeting using the signed-in person's display name and the working title/relationship label.
2. **Next plan** — the nearest upcoming planned or confirmed date, with date, time, and location when present.
3. **Next shared free time** — the next date/time range where both people's availability overlaps. If no overlap is found in the loaded horizon, show a calm empty state and a shortcut to the calendar.
4. **Recent memories** — the latest completed memory cards with a photo, title, and date.
5. **Milestone highlight** — next upcoming anniversary or milestone, with a countdown where appropriate.
6. **Quick actions** — `Add memory`, `Plan a date`, and `Update availability`.

The dashboard should not require complex analytics. Fetch a small, recent set of records and calculate simple highlights in the frontend.

---

## 7. Calendar and availability

The calendar is one of the core features. It must remain easy to use on a narrow phone screen.

### Calendar behavior

- Show a month grid with previous/next month controls and a `Today` shortcut.
- Tapping a date opens that day's detail view. On mobile, use a bottom sheet or full-screen sheet; on desktop, use a side panel or dialog.
- A date can contain any number of memories/plans. Each activity is a separate memory record, even when several share the same date.
- Show unobtrusive date indicators for memories, plans, Person A availability, Person B availability, and shared availability.
- Do not rely on color alone: use small labels, icons, or patterns as well as color.
- The day detail view lists that date's plans/memories and availability, with actions to add a memory/plan or edit availability.

### Availability model

Each person can independently mark:

- **Full day:** Available, Busy, or Maybe.
- **Specific time range:** Available, Busy, or Maybe, with a start and end time.

Each availability entry belongs to one person. Both people can view both schedules. The calendar must distinguish:

- Person A's availability.
- Person B's availability.
- Overlapping time ranges when both are available.

A person can create, edit, or delete only their own availability entries. The UI should make it easy to update availability from the day view without navigating to a separate complicated form.

### Overlap logic

- Fetch availability entries for the visible date/month range.
- Calculate overlaps in the frontend using the two users' available intervals.
- Only show an overlap when both entries are marked `available`; `maybe` should be shown separately and must not be presented as confirmed free time.
- Subtract each person's `busy` time slots from their full-day available interval before calculating overlaps. A busy slot takes precedence over overlapping full-day availability.
- Treat full-day entries as covering the local calendar day.
- Handle midnight boundaries and daylight-saving changes using the configured application timezone.
- Set the initial timezone to `Asia/Kolkata`, but keep it configurable rather than hardcoding it throughout the app.

### Empty states

- No availability recorded: `No availability added yet` with an `Add availability` action.
- No shared free time found: `No overlapping free time in this range` with a calendar shortcut.
- No plans or memories on a day: show a simple `Nothing here yet` state and an add action.

---

## 8. Date plans and memory entries

A planned date and a completed memory are the same record moving through a simple status lifecycle. Do not create a second record when a plan becomes a memory.

### Status lifecycle

- `planned` — an idea or proposed plan.
- `confirmed` — both have settled on the plan.
- `completed` — the activity happened; it is now a memory.
- `cancelled` — the plan will not happen. Keep it distinguishable from completed memories.

When a plan becomes completed, keep its original date, title, location, and description. Reveal or emphasize the memory fields (photos, captions, both POVs, rating, and other details). Do not automatically duplicate the row.

### Creating a plan or memory

The quick-add flow should be short:

1. Tap a calendar date or `Add memory` / `Plan a date`.
2. Enter a title and date.
3. Optionally add time, location, activity, and a short description.
4. Save.
5. Add photos and extra details now or later.

Allow saving with only the required fields. Do not force every field to be completed.

### Memory details

Each memory can contain:

- Title.
- Date and optional start/end time.
- Location.
- Activity/category.
- Description or shared notes.
- Multiple photos, each with an optional caption.
- Each person's POV, stored independently.
- Optional ratings from each person.
- Optional expenses, ticket/booking details, song, memorable quote, and other scrapbook details.

Optional scrapbook details should be kept in a flexible JSONB field rather than requiring a database column for every possible detail. The UI can progressively disclose these extras under an `Add details` section.

### Two separate POVs per memory

Every memory has two independent reflection areas:

- **Person A's POV** — only Person A edits this field.
- **Person B's POV** — only Person B edits this field.

Both POVs are visible to both people. Neither POV is private. One person must never overwrite the other person's reflection when saving their own.

A POV can be left blank and completed later. Use a friendly empty state such as `Add your side of the story`.

### Editing and deletion

- Either person can create and edit the shared details of a memory or plan.
- Each person can edit only their own POV and their own rating.
- Both can view all shared content and both POVs.
- Deleting a memory requires a clear confirmation showing the title. Also remove its stored photos when the deletion is confirmed.
- Do not add a complicated approval workflow for ordinary edits.

---

## 9. Memories browsing experience

The Memories page is a scrapbook, not a dense data table.

- Default to a chronological timeline or photo-card grid, newest first.
- Include a simple year/month filter and title search.
- Each card should show a lead photo (when available), title, date, and a short excerpt.
- Opening a card shows all photos, captions, shared description, and both POVs.
- Provide a `Back to calendar` action from the memory detail page.
- Make empty and photo-less memories look intentional; never show broken image placeholders.

Do not build complex tags, nested albums, or advanced search in the first release.

---

## 10. Milestones

The Milestones page stores important relationship dates and moments.

Examples include the day you met, first date, anniversary, trips, or other personally important events.

Each milestone needs only:

- Title.
- Date.
- Optional description.
- Optional photo.

- A `Repeat yearly` option, disabled by default for ordinary milestones.

The relationship start date is `2026-08-14`, with a relationship anniversary every August 14. Record `2025-11-17` separately as the `Day we met` milestone. Keep the relationship start date configurable during setup. The dashboard calculates the next relationship anniversary and countdown from that date, and the next occurrence of any milestone marked `Repeat yearly`.

---

## 11. Visual direction — Midnight Memories

### Overall feel

Use a dark, cinematic, romantic scrapbook aesthetic. It should look refined and nostalgic, not overly decorative or like a generic Valentine's Day template.

### Palette

- Main background: deep charcoal / near-black.
- Main surface: slightly lighter charcoal.
- Accent: rich burgundy / wine red.
- Highlight: muted champagne gold.
- Primary text: warm off-white.
- Secondary text: muted warm gray.
- Borders: subtle low-contrast charcoal.

Define these as reusable CSS/Tailwind design tokens. Avoid using gold or burgundy for every element; reserve them for meaningful emphasis.

### Typography

- Elegant serif font for page titles, memory titles, and editorial moments.
- Highly readable sans-serif font for body text, labels, forms, and navigation.
- Use a restrained type scale and comfortable line height.

### Components and effects

- Photo-led cards with rounded corners and subtle borders.
- Soft gradients and restrained glow effects.
- Very subtle film grain or paper texture only where it does not reduce readability.
- Smooth transitions for opening a day, switching calendar months, and viewing a memory.
- Small motion details rather than continuous animation.
- Respect `prefers-reduced-motion`.

### Avoid

- Excessive glassmorphism that reduces contrast.
- Large animated backgrounds that affect performance.
- Constant floating hearts, cursors, or decorative particles.
- Tiny text or low-contrast gold-on-black text.
- Desktop-only hover interactions.

---

## 12. Mobile and accessibility requirements

**Mobile support is a release requirement, not a later enhancement.** Test on actual Android Chrome and iPhone Safari, including small screens.

### Responsive behavior

- Build mobile-first and progressively enhance for tablet and desktop.
- Use a compact bottom navigation on phones; use sidebar or top navigation on wide screens.
- Use mobile bottom sheets/full-screen sheets for calendar day details and add/edit forms.
- Use touch targets of at least 44 × 44 CSS pixels where practical.
- Avoid horizontal scrolling except for intentional photo galleries.
- Keep primary actions reachable with one hand.
- Ensure forms remain usable when the on-screen keyboard is open.
- Respect iOS safe-area insets and browser viewport changes.
- Support portrait and landscape layouts without clipped content.
- Provide image upload from the device gallery and camera where the browser supports it.

### Browser support

- Current stable Android Chrome.
- Current stable iPhone Safari.
- Current stable Chrome, Firefox, Safari, and Edge on desktop where practical.

This is a normal responsive website. Do not add a web app manifest, service worker, install prompt, offline cache, or PWA-specific behavior.

### Accessibility baseline

Aim for WCAG 2.2 AA practices:

- Semantic HTML and correct heading order.
- All interactive controls usable by keyboard.
- Visible focus indicators.
- Proper labels and accessible names for inputs and icon-only buttons.
- Error messages associated with the relevant fields.
- Sufficient text and control contrast.
- Do not communicate availability or status through color alone.
- Provide descriptive alt text for meaningful photos; decorative images should have empty alt text.
- Support reduced motion.
- Maintain readable font sizes and comfortable spacing.

---

## 13. Simple database design

Use four small tables. Keep the core columns queryable and place optional scrapbook content in JSONB. The schema should be understandable at a glance.

### `profiles`

One row per pre-created auth user. Exactly two rows are expected.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key; references `auth.users.id` |
| `display_name` | `text` | Name shown in the UI |
| `role` | `text` | `person_a` or `person_b`; unique |
| `created_at` | `timestamptz` | Default `now()` |

### `memories`

One row per planned date/activity/completed memory. Multiple rows may use the same date.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key |
| `event_date` | `date` | Date of the plan or activity; indexed |
| `title` | `text` | Required |
| `status` | `text` | `planned`, `confirmed`, `completed`, `cancelled` |
| `location` | `text` | Optional |
| `start_time` | `time` | Optional |
| `end_time` | `time` | Optional |
| `description` | `text` | Optional shared description |
| `person_a_pov` | `text` | Optional; edited by Person A |
| `person_b_pov` | `text` | Optional; edited by Person B |
| `person_a_rating` | `smallint` | Optional; e.g. 1–5 |
| `person_b_rating` | `smallint` | Optional; e.g. 1–5 |
| `photos` | `jsonb` | Array of `{ path, caption, sort_order }`; paths point to Storage objects |
| `extras` | `jsonb` | Optional activity, expense, ticket, song, quote, and other scrapbook details |
| `created_by` | `uuid` | References `profiles.id` |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Updated on save |

Suggested indexes: `event_date`, `status`. Do not add more indexes until actual query performance requires them.

### `availability`

One row per full-day status or time interval.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key |
| `user_id` | `uuid` | References `profiles.id` |
| `start_at` | `timestamptz` | Start of the interval |
| `end_at` | `timestamptz` | End of the interval |
| `status` | `text` | `available`, `busy`, or `maybe` |
| `all_day` | `boolean` | True for full-day entries |
| `note` | `text` | Optional |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Updated on save |

Suggested indexes: `(user_id, start_at)` and `start_at`. For full-day entries, store the start and end boundaries of the local calendar day, converted to timestamps using the configured timezone.

### `milestones`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key |
| `title` | `text` | Required |
| `milestone_date` | `date` | Required; indexed |
| `description` | `text` | Optional |
| `photo_path` | `text` | Optional Storage path |
| `repeat_yearly` | `boolean` | Default `false`; calculate the next yearly occurrence when enabled |
| `created_by` | `uuid` | References `profiles.id` |
| `created_at` | `timestamptz` | Default `now()` |

Keep the relationship start date in a small application configuration value or a single settings value set during setup. Do not build a general settings-management system for it.

### Storage

Create one **private** Supabase Storage bucket, for example `memory-photos`.

- Store actual image files in Storage, not in PostgreSQL.
- Store only the object path and caption in `memories.photos`.
- Use authenticated access and private/signed URLs for viewing.
- Compress/resize large images in the browser before upload where practical.
- Delete associated objects when a memory is permanently deleted.

### Query patterns

Keep the common queries simple:

- Memories for a month: filter `memories.event_date` between the month's first and last date.
- Upcoming plans: filter status in `planned`/`confirmed` and date greater than or equal to today, ordered ascending, with a small limit.
- Recent memories: filter status `completed`, ordered by date descending, with a small limit.
- Availability for a month: filter entries that overlap the visible month range.
- Milestones: order by `milestone_date`.

Load data by visible date range. Do not fetch every photo or every historical record for the dashboard.

---

## 14. Security and privacy

- Enable Row Level Security (RLS) on every application table.
- Only the two authenticated profile IDs should be able to read application data.
- Both authenticated users may read shared memories, both POVs, availability, and milestones.
- Only the matching user may create, edit, or delete their own availability entries.
- Both users may create and edit shared plan/memory details.
- The UI must submit only the signed-in person's POV/rating field when saving their reflection; it must never replace the other person's POV with an empty value. Where practical, enforce POV ownership in the database with a small update trigger or narrowly scoped database function.
- Storage policies must restrict access to authenticated users belonging to the two configured accounts.
- Never put the Supabase `service_role` key in the frontend. Only the publishable/anon key may be used in client code.
- Validate dates, times, status values, text lengths, and uploaded file types/sizes.
- Do not log PINs, session tokens, or private memory content.
- Use HTTPS in production.

Because this application has exactly two users, use direct and readable RLS policies rather than a reusable role/permission framework.

---

## 15. Suggested frontend structure

```text
src/
  app/
    App.tsx
    routes.tsx
  components/
    layout/
      AppShell.tsx
      BottomNav.tsx
      DesktopNav.tsx
    calendar/
      CalendarGrid.tsx
      DaySheet.tsx
      AvailabilityEditor.tsx
    memories/
      MemoryCard.tsx
      MemoryForm.tsx
      MemoryDetail.tsx
      PovEditor.tsx
      PhotoGallery.tsx
    dashboard/
      UpcomingPlanCard.tsx
      SharedAvailabilityCard.tsx
      RecentMemories.tsx
      MilestoneCard.tsx
    ui/
      Button.tsx
      Input.tsx
      Sheet.tsx
      Dialog.tsx
      EmptyState.tsx
  pages/
    LoginPage.tsx
    HomePage.tsx
    CalendarPage.tsx
    MemoriesPage.tsx
    MemoryPage.tsx
    MilestonesPage.tsx
    ProfilePage.tsx
  context/
    AuthContext.tsx
  hooks/
    useAuth.ts
    useCalendarData.ts
  services/
    supabase.ts
    authService.ts
    memoryService.ts
    availabilityService.ts
    milestoneService.ts
  utils/
    dates.ts
    availabilityOverlap.ts
    imageUpload.ts
  styles/
    globals.css
    theme.css
```

This is a suggested organization, not a requirement to create a component for every tiny element. Combine files when that makes the code clearer.

---

## 16. Environment configuration

Use a `.env.local` file for local development and Vercel environment variables in production.

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

The Supabase URL and publishable/anon key are intended for frontend use when RLS is correctly configured. Never add the service-role key or either person's PIN to a `VITE_` variable.

Keep the two display names and accepted name-pair strings in a small configuration file. Keep internal Auth account identifiers out of user-facing UI. Do not hardcode PINs anywhere.

---

## 17. Testing and acceptance criteria

The first release is complete only when all of the following work.

### Authentication

- [ ] Person A's name order + Person A's PIN opens Person A's account.
- [ ] Person B's reversed name order + Person B's PIN opens Person B's account.
- [ ] Incorrect combinations are rejected with a generic error.
- [ ] There is no public sign-up or third-account path.
- [ ] Refreshing a page preserves a valid session; logout ends it.
- [ ] No PIN or privileged Supabase key is exposed in the browser bundle.

### Memories and plans

- [ ] A user can add a memory from a calendar date.
- [ ] Several separate memories can be created on the same date.
- [ ] A planned entry can be confirmed, completed, or cancelled.
- [ ] Completing a plan keeps the same record and its existing details.
- [ ] Both users can view shared memory details and photos.
- [ ] Each user can add/edit their own POV without overwriting the other's POV.
- [ ] Either user can add multiple photos with captions.
- [ ] Optional extras can be saved without requiring every field.
- [ ] Deleting a memory asks for confirmation and removes its associated photos.

### Calendar and availability

- [ ] Both full-day and time-slot availability can be added and edited.
- [ ] Each user can manage their own availability.
- [ ] Both users can see both availability schedules.
- [ ] Overlapping `available` intervals are identified correctly.
- [ ] `maybe` is not shown as confirmed shared availability.
- [ ] Calendar dates show plans, completed memories, and availability indicators.
- [ ] Multiple entries on one date display without overlap or clipping.

### Dashboard and milestones

- [ ] Upcoming plans are shown in date order.
- [ ] The next shared availability is calculated from both schedules.
- [ ] Recent completed memories are displayed.
- [ ] The next milestone/anniversary countdown uses the configured date.
- [ ] Empty states provide a useful next action.

### Mobile and accessibility

- [ ] No horizontal page overflow at 320 CSS pixels wide.
- [ ] Forms remain usable with the iOS and Android keyboards open.
- [ ] Calendar day sheets fit phone screens and can be dismissed easily.
- [ ] Navigation and forms work using touch and keyboard.
- [ ] Focus indicators, labels, contrast, and error messages are present.
- [ ] Reduced-motion preferences are respected.
- [ ] Photos can be selected from mobile devices and display correctly after upload.
- [ ] Manually test on at least one Android Chrome device and one iPhone Safari device.

### Privacy

- [ ] Unauthenticated users cannot read database records or private photos.
- [ ] A third authenticated identity cannot be created through the app.
- [ ] RLS policies are enabled on all application tables.
- [ ] The service-role key is never exposed to the client.

---

## 18. Recommended implementation order

Build a complete, usable flow before adding decorative extras.

1. **Project setup:** Create React/Vite/TypeScript app, Tailwind theme, routing, and Supabase project.
2. **Database and security:** Create the four tables, indexes, private photo bucket, RLS policies, and two Auth users.
3. **Login and app shell:** Implement name-pair + PIN login, session handling, protected routes, and responsive navigation.
4. **Memory basics:** Add, list, view, and edit memory records; support multiple memories on the same day.
5. **POVs and photos:** Add independent POV editing, photo upload, captions, gallery, and optional extras.
6. **Calendar:** Add month navigation and day details; connect plans and memories to dates.
7. **Availability:** Add full-day and time-slot entries, then calculate shared free-time overlaps.
8. **Plans and milestones:** Add status lifecycle, milestones, relationship date configuration, and countdown.
9. **Dashboard:** Combine upcoming plans, next shared free time, recent memories, and milestone highlights.
10. **Polish and test:** Complete mobile layouts, accessibility, loading/error/empty states, security checks, and real-device testing.
11. **Deploy:** Connect GitHub to Vercel, configure environment variables, deploy, and verify the live site on both phones.

Do not start with elaborate animations. Make login, calendar, adding a memory, editing POVs, and photo uploads reliable first.

---

## 19. Hosting recommendation and free-tier notes

**Recommended deployment: Vercel + Supabase.** This is a good fit for a small private project with two users and photo storage.

### Vercel

Use the free Hobby plan for the frontend while the project is personal and non-commercial. It supports Git-based deployments and HTTPS. Check the current plan limits before launch: [Vercel Hobby plan](https://vercel.com/docs/plans/hobby).

### Supabase

Use the Free plan initially. The current published allowance includes:

- 500 MB database size.
- 1 GB file storage.
- 5 GB egress.
- 50,000 monthly active users.
- Up to two active free projects.

Important: Supabase may pause a Free project after one week of inactivity. It can be reactivated, but the app may not respond until it is resumed. The free plan also does not include automatic backups. Keep a separate copy/export of important memories and photos. Review [Supabase pricing](https://supabase.com/pricing) and [Supabase billing behavior](https://supabase.com/docs/guides/platform/billing-on-supabase) before deployment.

Free-tier quotas and policies can change. Recheck both providers' pricing pages during setup. If the memories become important enough that pause behavior or lack of automatic backups is unacceptable, budget for a paid Supabase plan rather than relying on the free tier indefinitely.

---

## 20. Final product definition

Build a visually rich but technically simple private website for exactly two people. The homepage is a relationship dashboard. The calendar is the shared planning surface, with independent availability for each person and visible shared free-time overlaps. Each calendar date can contain multiple plans or memory entries. A plan becomes a memory by changing its status, not by creating a duplicate. Each completed memory supports photos, captions, optional scrapbook details, and two independent shared POVs.

Prioritize mobile usability, privacy, fast entry, and reliable data persistence. Keep the architecture small and understandable. Do not add PWA features or generalized multi-user functionality.
