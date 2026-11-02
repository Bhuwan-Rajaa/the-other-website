# First deployment: GitHub → Supabase → Vercel

This guide starts with no Supabase or Vercel project. You already have the application source in `D:\the second webiste`. Use the GitHub repository `Bhuwan-Rajaa/the-other-website` for this app.

GitHub stores the source. Supabase stores the accounts, memories, and private photos. Vercel builds and serves the website. You do not need GitHub Pages, a separate web server, or a custom domain to get started.

## 1. Push the source to GitHub

Open [the repository](https://github.com/Bhuwan-Rajaa/the-other-website) while signed into your GitHub account. If it does not exist, create a **private**, empty repository with that owner/name. When creating an empty repository, leave README, license, and Git ignore initialization unchecked because the local source already includes those files.

The local workspace has been initialized with branch `main`. This environment blocks further writes to `.git`, so the commit and remote still need to be created. Run these commands, one at a time, in your own PowerShell terminal:

```powershell
Set-Location -LiteralPath 'D:\the second webiste'
git add .
git commit -m "Initial Midnight Memories app"
git remote add origin https://github.com/Bhuwan-Rajaa/the-other-website.git
git push -u origin main
```

If Git asks you to authenticate, complete its browser sign-in. GitHub account passwords are not used for HTTPS Git authentication. Do not paste an access token into a command or send it in chat.

If Git reports **repository not found**, confirm the link opens in your browser and your Git credentials have access to this private repository. If it reports **fetch first / non-fast-forward**, the remote already contains commits. Stop before overwriting them; inspect the existing branch and integrate its history first. Do not use a force push.

After a successful push, refresh the GitHub page. It should show `package.json`, `package-lock.json`, `src/`, `supabase/`, `public/`, and this guide. Local dependencies, caches, browser profiles, `.env.local`, and build output are excluded by `.gitignore`. Keep PINs and real memory content out of source control.

For a future folder without Git metadata, first run `git init -b main` before the commands above. Do not repeat remote creation after a successful setup. If Git reports dubious ownership of this local workspace, trust only this folder with `git config --global --add safe.directory 'D:/the second webiste'`, then retry the failed command.

## 2. Create your Supabase account and project

1. Open [Supabase Dashboard](https://supabase.com/dashboard) and sign in, using GitHub if convenient.
2. If prompted, create a personal organization. You can start with the Free plan; review the plan's current limits in the dashboard.
3. Click **New project** and select that organization.
4. Name the project `midnight-memories`.
5. Generate a strong **database password** and save it privately in a password manager. This password is for PostgreSQL administration, not either person's app login PIN. The frontend does not need it.
6. Choose a region close to where you will use the app, such as an available India region.
7. Create the project and wait until its database is ready.

## 3. Configure authentication

In the new Supabase project, open **Authentication → Sign In / Providers** (the navigation label can vary slightly):

- Keep the **Email** provider enabled for password sign-in.
- Turn **Allow new users to sign up** OFF.
- Keep **anonymous sign-ins** OFF.
- Leave authentication rate limits enabled.

You will create exactly two users manually. Disabling signups does not prevent the project owner from creating those users through the dashboard.

The originally suggested four-digit PINs do not meet Supabase's standard six-character password minimum. Set a different, longer numeric PIN for each person privately; use at least eight digits as recommended in `project.md`. Do not publish or send the PINs. The app passes the entered PIN directly to Supabase Auth as that user's password.

## 4. Create the database tables and private photo bucket

1. Open **SQL Editor → New query** in Supabase.
2. Open [`supabase/migrations/001_midnight_memories.sql`](supabase/migrations/001_midnight_memories.sql) locally or on GitHub.
3. Copy the whole file into the SQL editor, including `begin;` and `commit;`.
4. Click **Run**. Run this initial migration once against your new database. If a warning asks you to review SQL or security changes, review the named objects before proceeding.
5. Check **Table Editor**: the `public` schema should contain `profiles`, `memories`, `availability`, and `milestones`.
6. Check **Storage**: `memory-photos` should exist and be **private**, with its public-bucket toggle OFF.

The migration also enables RLS and installs policies, POV ownership checks, and atomic photo functions. Do not disable RLS to fix a login or save error.

## 5. Create Bhuwan's and Pooja's accounts

Go to **Authentication → Users → Add user → Create new user**. Create these exact accounts:

| Person | Internal email entered in Supabase | Password entered in Supabase | Auto Confirm User |
| --- | --- | --- | --- |
| Bhuwan | `person-a@midnight-memories.internal` | Bhuwan's privately chosen longer PIN | ON |
| Pooja | `person-b@midnight-memories.internal` | Pooja's privately chosen longer PIN | ON |

Use **Create new user**, not an email invitation. These are internal identifiers, not working email inboxes. Auto-confirm each user so neither account needs to follow an email link.

Copy each user's **UID/UUID** from the Users page. Keep track of which ID belongs to which person.

## 6. Link the accounts to the app's two profiles

1. Open [`supabase/setup-profiles.sql`](supabase/setup-profiles.sql).
2. Copy its contents into a **new SQL Editor query**.
3. Replace `REPLACE_WITH_BHUWAN_AUTH_UUID` with Bhuwan's UUID, retaining the single quotes.
4. Replace `REPLACE_WITH_POOJA_AUTH_UUID` with Pooja's UUID, retaining the single quotes.
5. Run the query once. You do not need to put the real UUIDs into the GitHub copy of the script.
6. Verify `profiles` contains exactly two rows: `Bhuwan / person_a` and `Pooja / person_b`.
7. Verify `milestones` contains **The day we met**, dated **2025-11-17**.

The relationship start date is **2026-08-14**. Its August 14 anniversary is calculated from `src/config.ts`, so it does not need a second SQL milestone row.

## 7. Copy your frontend connection values

Open the Supabase project's **Connect** dialog and look for the app/framework setup values. You need:

- **Project URL**, such as `https://your-project-ref.supabase.co`.
- **Publishable key**, normally beginning `sb_publishable_`. A legacy `anon` key is also supported.

The key is also available under **Project Settings → API Keys**. Use a **publishable/anon** key, never a secret key or `service_role` key. No database password or user PIN belongs in the frontend environment variables.

If you want to verify the real backend locally before deploying, create `.env.local` in the project root:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-publishable-or-anon-key
```

Restart `npm run dev`. The sample-preview entry point will disappear and real sign-in will be enabled. `.env.local` stays on your machine; do not commit it. Skip this local check if you prefer to perform the first login after Vercel deploys.

## 8. Create the Vercel project and deploy

1. Open [Vercel](https://vercel.com) and sign up or sign in with GitHub.
2. Choose **Add New → Project**.
3. Connect GitHub if prompted and grant Vercel access to `Bhuwan-Rajaa/the-other-website`.
4. Find **the-other-website** and click **Import**. If it is absent, use the GitHub integration's repository-access settings to allow this private repository.
5. Set the project name to `midnight-memories`, or choose another available name.
6. Check the following build settings:

   | Setting | Value |
   | --- | --- |
   | Framework preset | Vite |
   | Root directory | Repository root; leave the default |
   | Install command | `npm ci` |
   | Build command | `npm run build` |
   | Output directory | `dist` |
   | Production branch | `main` |
   | Node.js version | `22.x` (also declared in `package.json`) |

7. Expand **Environment Variables** and add both of these **before** clicking Deploy:

   | Name | Value copied from Supabase |
   | --- | --- |
   | `VITE_SUPABASE_URL` | Project URL |
   | `VITE_SUPABASE_ANON_KEY` | Publishable/anon key |

   Use the exact names above. The `ANON_KEY` variable name accepts the new publishable key as well. Set the variables for Production. Only give Preview deployments the same project connection if you intend to test against your real data there.

8. Click **Deploy**. Wait for the build to finish and Vercel to display its HTTPS production URL.
9. Open the deployed URL. It should display the real login screen, without the sample-preview option.

Vercel environment variables are read when this Vite app is built. If you add or correct a variable after deployment, create a new deployment using **Deployments → latest deployment → Redeploy**.

The repository already includes `vercel.json` for frontend-route refreshes. Do not enable GitHub Pages for this setup.

## 9. Set the production address in Supabase

In Supabase, open **Authentication → URL Configuration**. Set **Site URL** to the Vercel HTTPS address you just received, for example `https://your-project.vercel.app`, and save it.

The current password-login flow does not use email redirects, so additional redirect URLs are not required for it. Update Site URL later if you add a custom domain.

## 10. Verify the live app

1. Log in using `BhuwanPooja` and Bhuwan's new PIN. Confirm the app greets Bhuwan.
2. Log out, then log in with `PoojaBhuwan` and Pooja's new PIN. Confirm the app greets Pooja.
3. Add a temporary memory with only a title and date; add a photo and caption. Refresh and confirm it remains.
4. Add one person's POV, then sign in as the other and add theirs. Check both remain and the other person's reflection cannot be edited.
5. Add availability for both people. Add a busy slot inside a full available day and check that slot is excluded from shared free time.
6. Open `/calendar` and refresh the page to confirm Vercel's route rewrite works.
7. Delete the temporary memory through its confirmation and confirm its objects are removed from Storage.
8. Repeat the main flows on your Android and iPhone browsers. Complete the privacy and real-device checks in `README.md` before treating the app as release-ready.

## Updating the website later

After changing source files and running appropriate checks:

```powershell
Set-Location -LiteralPath 'D:\the second webiste'
git add .
git commit -m "Describe the change"
git push
```

Vercel's GitHub integration will build a new production deployment when `main` changes. SQL schema changes still require applying the corresponding migration in Supabase; pushing SQL files to GitHub does not execute them.

## Reference documentation

- [Supabase authentication settings](https://supabase.com/docs/guides/auth/general-configuration)
- [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [Supabase password security](https://supabase.com/docs/guides/auth/password-security)
- [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite)
- [Vercel's GitHub integration](https://vercel.com/docs/git/vercel-for-github)
- [Vercel environment variables](https://vercel.com/docs/environment-variables/managing-environment-variables)
