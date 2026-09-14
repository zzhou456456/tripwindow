# AI / Virtual Teammate Log

The assignment allows virtual teammates as long as I'm transparent about how I directed them and
what I learned, and requires listing any work substantively done with AI. This file is that record.

- **Tool:** Claude Code (model: Claude Opus 5), in the Claude desktop app, on 2026-09-14.
- **Sessions:** one Claude Code session built and deployed TripWindow (everything in this repo). A
  **separate** Claude Code session worked in my partner's repo; that part is summarized from its notes.
- **Markers:** every AI-assisted commit ends with `Co-Authored-By: Claude Opus 5`. The GitHub issues
  in this repo were created by the AI through the `gh` CLI under my account, after I approved them.

## Who did what

| The AI did | I did |
|---|---|
| Acted as a tutor when I got stuck on something technical. It explained how Expo Go runs an app on a real iPhone without Xcode, how JWT login and environment variables work, what a detached HEAD and `git stash` are, and why Expo Go needed a sign-in | **Understood the assignment requirements and made the plan**: platform (iPhone), stack (Expo + Express), host (Render), a travel app that continues my Interview Assignment, and separate repos with my partner. Also decided the order of work and what counted as done for each requirement |
| Implemented the plan in code: the Express API, the three app screens, `render.yaml`, and the README. It proposed the feature list and I approved it | Approved each commit, push, and anything published to GitHub |
| Ran the terminal work: installs, `create-expo-app`, git commits, creating the GitHub repo and issues | Created and signed in to my Expo account (CLI + Expo Go) and connected GitHub to Render |
| Tested the API with `curl` (locally and in production) and the app in a web preview | Deployed the Render Blueprint (database + web service) from the dashboard |
| Diagnosed errors I ran into and told me how to fix them | Ran the original sample and TripWindow on my real iPhone, tested every feature by hand, took all screenshots |

## Timeline

| # | Step | Who | What happened | How it was verified |
|---|---|---|---|---|
| 1 | Plan | Me | I read the assignment and the resources page and planned how to cover the 5 required items plus several exceptional features: run on my iPhone through Expo Go, build with Expo + Express, deploy on Render with Postgres, make a travel app that continues my Interview Assignment, and have my partner and me contribute to each other's repos. | — |
| 2 | Scaffold | AI | Generated the Expo default template (the "existing sample app"). Wrote the Express API: JWT auth, trips CRUD, public feed, Open-Meteo weather proxy, analytics events, with Postgres on Render and in-memory storage locally. Also `render.yaml`. | AI ran every endpoint with `curl` against a local server |
| 3 | Git + GitHub | AI, approved by me | Committed the untouched sample + API as the first commit (`4eb8e8c`), created the public repo with `gh`, pushed. I chose the GitHub noreply address as the commit email. | Repo visible on GitHub |
| 4 | Task tracking | AI, approved by me | Created `required` / `exceptional` labels and 14 issues (requirements, features, bugs) with `gh`; closed finished ones with comments. | Issues list on GitHub |
| 5 | App screens | AI | Replaced the sample screens with TripWindow: Trips (date-window form, "Use my location", weather per trip, long-press delete, public toggle), Feed, Account (register/login, JWT in SecureStore, usage stats); three native tabs. Commit `8a76be6`. | AI typechecked it and tested register + create-trip in a browser preview at iPhone size |
| 6 | Sample on device (Req 2) | Me | Checked out `4eb8e8c`, ran `npx expo start`, opened the sample in Expo Go on my iPhone, tapped through Explore. | Screenshots 01–03 |
| 7 | TripWindow on device | Me | Registered, used location (filled "Atlanta, United States"), saved a public trip with ±10 flexible days, opened the forecast, saw it in Feed. | Screenshots 05–10 |
| 8 | Deploy (Req 5) | Me (dashboard) + AI (config, testing) | I connected GitHub (Render can access only `tripwindow`) and deployed the Blueprint: free Postgres `tripwindow-db` + web service `tripwindow-api`. The log showed `storage: postgres`, live at https://tripwindow-api.onrender.com. The AI then tested production with `curl` and pointed the app and README at the new URL (commit `6e24a3f`). | Render logs screenshot; AI's production `curl` run: health, register, 401 without token, create/list trip, weather, feed, stats |
| 9 | Partner repo (Req 4) | Separate AI session + me | In `stevenyxng/cs8803-first-assignment`, another Claude Code session (per its notes) installed JDK 21 for the Firebase emulators, ran `npm run build` and `npm test` (11 rules tests pass), and added a search-by-name filter to the file list on branch `feature/file-search`, tested in the emulators at desktop and 375px widths. I reviewed the diff with this session. The PR is not opened yet. | Build + tests (per that session); diff reviewed by me |

## Problems and how they were solved

| Problem | Who hit it | Cause | Fix (who) |
|---|---|---|---|
| In-memory `/feed` returned `user_id` and coordinates | AI, while reviewing its own code | The memory store returned whole rows; the Postgres query selected only public columns | AI made both return the same fields (issue #12) |
| Dates could show a day early | AI, while reading the code before it caused a bug | `node-pg` turns a Postgres `DATE` into a JS Date at local midnight, which shifts when serialized | AI kept dates as `YYYY-MM-DD` strings (issue #14); later confirmed against the real Render database |
| First `git commit` failed | AI | No git name/email set on my Mac | I chose the GitHub noreply identity; AI set it for this repo only (issue #13) |
| Expo Router docs page returned 404 | AI | Docs URL moved for SDK 57 | AI read the installed package's type definitions instead |
| App content hidden under the web tab bar; `Platform is not defined` in the console | AI, in the browser preview | Floating web tab bar; one of the AI's edits hot-reloaded before its matching import was added | AI added web-only padding; the import landed in the next edit |
| In the browser preview, a click didn't submit and some typed fields didn't save | AI's browser automation | The automated clicks missed after the page re-rendered (the server log showed no request) | Clicking by element reference fixed it; my iPhone test showed the fields do save, so the app was fine |
| Expo Go: "You need to be signed in to Expo Go and Expo CLI" | Me | Current Expo Go needs the same Expo account on the phone and the computer | I made an Expo account, ran `npx expo login`, and signed in on the phone (AI explained the error) |
| `git checkout main` refused | Me | An uncommitted line in this log (from the partner-repo session) would have been overwritten | AI stashed the change, switched to `main`, and merged the line back in |
| `EADDRINUSE :3000` when starting the API | Me | The AI's own preview server was still running on port 3000 | AI stopped it |
| Date placeholder looks like a filled-in value in dark mode | Me (spotted in a screenshot review) | Placeholder color is close to the text color | Not fixed yet |
| Partner-repo commit author was my Mac's local hostname email | AI, before pushing | That repo had no git identity set | I approved switching to the noreply identity; AI amended the unpushed commit |
| AI's first PR draft suggested "add a `.env.example`" | AI's mistake | It hadn't checked; that file already existed | AI read the partner repo and corrected the note: the README says `.env.local` is committed, but it's gitignored |
| This log's first draft credited me with things the AI did (e.g. the `curl` tests and code fixes) | Me, when I asked whether AI use was documented clearly | The table's "what I checked" column mixed my actions with the AI's | Rewritten with a "Who" column and this division-of-work summary |

## What I learned

Most of what I'd built before was front-end, so the biggest gain was a small but real first experience
of how a back end is put together and shipped:

- **How the app and server talk.** The phone never touches the database; it calls REST endpoints
  (`POST /auth/login`, `GET /trips`, …) and gets JSON back. Watching the server log while I tapped
  buttons on my iPhone made it clear which action triggered which request.
- **Authentication in practice.** Passwords are hashed on the server, login returns a token (JWT), and
  the app sends it with every request. `/trips` without a token is refused with 401, which is how one
  user's trips stay private.
- **Local vs. deployed.** Locally the server kept data in memory and vanished on restart; on Render it
  uses a real Postgres database. I had to point the app at a different URL (my Mac's LAN IP versus the
  Render URL). On the free tier the service sleeps and the first request can take ~50 seconds.
- **Configuration lives outside the code.** The port, database URL, and secret come from environment
  variables that Render fills in from `render.yaml`, which is why the same code runs on my Mac and on Render.
- **Debugging across layers.** When something failed I learned to check which layer it was: the app,
  the network (phone and Mac on the same Wi-Fi), the server log, or an account step like the Expo sign-in.
- **Git beyond commit and push.** Checking out an old commit to screenshot the original sample, then
  getting stuck on `git checkout main` because of an uncommitted change, showed me what a detached HEAD
  and `git stash` are for.

On working with AI: it was fast at writing code, but I still had to plan, make the decisions, set up
accounts, test on the real device, and check what it wrote about my work. Its first draft of this log
gave me credit for things it had done, and I caught that.

_(I gave the main point, more back-end experience coming from a front-end background; the AI drafted the wording from what we actually did, and I reviewed it.)_
