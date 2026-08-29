# Personal Workout

A mobile-first tracker for the **Bigger Leaner Stronger 5-day routine** — six
phases, four training weeks each, a deload week between phases. It suggests the
weight and reps for every set, lets you adjust them with a thumb-sized stepper,
and records what you actually lifted.

## What it does

**Follows the program.** All six phases and the deload block are transcribed
from the routine PDF into `src/data/program.ts`. The app knows where you are
(phase, week, workout) and shows the right session next. Weeks 1–4 are training
weeks of five workouts; week 5 is the three-workout deload.

**Suggests, then remembers.** Every set arrives pre-filled:

- The first time you do a lift, it suggests the bottom of the program's rep
  range and leaves the weight for you to set.
- Whatever you enter carries forward — to the rest of that exercise's sets, and
  to the next time the lift comes round.
- Hit the top of the rep range (6 on a 4–6 lift, 8 on a 6–8 lift) and the next
  set steps the weight up and resets the rep target to the bottom of the range.
  That double progression is the engine of the program.
- Deload sets come out at two sets of three with your last hard-set weight, and
  deliberately do **not** feed back into the progression.

**Records the real numbers.** Each set stores the weight and reps actually
performed, not just the target, along with the timestamp. History shows every
session with its date, duration, sets and total volume; Progress charts the
trend of your best set per exercise.

**Built for a gym floor.** Warm-up ramp (50/50/70/90% of the working weight),
rest timer that starts on its own when you tick a set off, screen wake-lock, and
a layout where the only things you tap mid-set are big −/+ buttons and a
checkmark. It works offline and installs to your home screen.

## Stack, and why

| Piece | Choice | Reasoning |
| --- | --- | --- |
| UI | React 18 + TypeScript + Vite | Fast build, no framework overhead for a 4-screen app. |
| Routing | React Router | — |
| Styling | Hand-rolled CSS with design tokens | ~4 kB gzipped, full control of the mobile layout, light and dark themes from one set of variables. |
| Data | Supabase (Postgres + Auth + RLS) | Row-level security means the browser can talk to Postgres directly. |
| Hosting | Netlify (static) | See below. |

**On Vercel vs Netlify:** you mentioned both. Because Supabase *is* the backend
— it serves auth and a REST API over Postgres, with row-level security doing the
authorization — there is no separate Node server to host. That makes this a pure
static SPA, which Netlify serves on its own. Nothing here needs Vercel, and
running the frontend on one host and a backend on another would only add a
deploy to keep in sync. If something later genuinely needs a server-side secret
(a Stripe webhook, a third-party API key), Netlify Functions covers it without
moving hosts.

**Local-first, cloud-second.** The app reads and writes `localStorage` as its
source of truth and pushes to Supabase in the background, retrying when the
connection returns. Gym basements have no signal; a tracker that stalls
mid-workout is worse than useless. Supabase is optional — with no credentials
configured, everything works on-device.

## Running it

```bash
npm install
npm run dev
```

That is enough to use the app: with no Supabase credentials it runs entirely on
your device.

To enable sync across devices:

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste `supabase/schema.sql`, run it.
3. Copy `.env.example` to `.env` and fill in the URL and anon key from
   **Project Settings → API**.
4. Restart the dev server, then sign in from the Settings tab. Auth is a magic
   link — no password.

The anon key is meant to be public; every table is locked to `auth.uid()` by the
row-level security policies in the schema.

## Deploying to Netlify

1. Connect the repository. `netlify.toml` sets the build command (`npm run
   build`), the publish directory (`dist`) and the SPA redirect.
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under **Site
   configuration → Environment variables** if you want sync.
3. In Supabase, add your Netlify URL to **Authentication → URL Configuration →
   Redirect URLs**, or the magic link will bounce back to localhost.

## Layout

```
src/
├── data/          program.ts (the six phases), exercises.ts, types.ts
├── lib/           progression.ts (suggestions, warm-ups, phase advance)
│                  units.ts, format.ts, localStore.ts, remote.ts, supabase.ts
├── state/         StoreContext.tsx (data + sync), useRestTimer.ts
├── components/    Stepper, SetRow, RestBar, Sheet, Sparkline, BottomNav, Icons
├── screens/       Today, Session, History, SessionDetail, Progress, Settings
└── styles/        global.css (tokens + components)
supabase/schema.sql
```

The interesting file is `src/lib/progression.ts` — it holds the whole
suggestion engine and the phase/week arithmetic, with no React in it.

## Ideas for later

Roughly in order of what would pay off most:

- **Plate calculator.** Tap the weight to see which plates to load per side.
- **Rep-quality tracking (RIR).** One tap per hard set; makes the auto-progression
  a lot smarter than "did you hit 6".
- **Exercise substitutions.** The gym's leg curl is taken — swap for an
  alternative, remembered per exercise.
- **Body weight and measurements** alongside lift progress.
- **Rest-timer notifications** via the service worker, so it buzzes with the app
  backgrounded.
- **Apple Health / Google Fit export.**
- **Previous-session column** in the set row, so last time's numbers sit next to
  today's.

## Credit

The routine is the Bigger Leaner Stronger 5-day program by Michael Matthews,
distributed by [Legion Athletics](https://legionathletics.com). This app only
tracks it.
