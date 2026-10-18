# Study App: Desired Functionality

Status: agreed with Mike on 2026-10-18 and built on the stack below. Items marked *(default)* are my proposals and weren't discussed explicitly.

## Goal

A web app that turns study material (a document, a screenshot, or a text prompt) into interactive exercises, checks the answers, explains mistakes briefly, and brings mistakes back later for review. Spanish homework is the first use case, but the MVP supports any subject, not only languages. It starts as Mike's own tool, and later a few other people can use it with their own progress.

Reference example: a page on *Presente de Subjuntivo en las oraciones subordinadas independientes* (wishes with *que*, doubt with *quizá / tal vez / acaso / puede que*, and the ¡NOTA! that *a lo mejor / seguramente / probablemente / posiblemente* take indicativo).

## MVP

### 1. Topic input
- Create a topic from any of: uploaded document (PDF, DOCX, TXT), screenshot/image, or a typed text prompt (e.g. "presente de subjuntivo after quizá").
- Exercises are generated straight from the upload. There is no summarize-and-confirm step.
- Topics are saved, so you can start a new session on an existing topic later. Many topics per user (20+) must work.
- **Topic instructions:** creating a topic includes a short input where you say what you're learning and how you want to be tested, e.g. "Spanish subjunctive, I'm at B1, translate from Russian" or "Biology exam, cell structure, short-answer questions".
  - It's stored with the topic and sent to the AI on every call for that topic (reading the material, generating exercises, checking answers) as the guidance for which exercises to create.
  - It can be viewed and edited on the topic page at any time. Changes apply to the next batch.
  - *(default)* It's optional. If left empty, the AI writes one from the material, and you can edit that too.

### 2. Languages and subjects
Works for any subject:
- **Your language** is set once per user in Settings (e.g. Russian). Instructions, rules, feedback and explanations are written in it. It's also the source language for translation exercises.
- **Each topic has a subject** that the AI detects from the material and the topic instructions, e.g. "Spanish grammar" or "World War I". You can correct it.
- For **language topics** only, the topic also has a **target language** (e.g. Spanish), detected the same way and editable. Translation exercises go from your language into the target language.
- Non-language topics simply have no target language. That's why this isn't a from/to pair on every topic.

### 3. Exercise generation
- One request generates a batch of exercises. The default is **10**, and the count is configurable.
- Before generating, a **checkbox list** of exercise types lets you pick any combination (at least one). The batch mixes the selected types.
- The last selection is saved and **preselected next session**. On first use, all types are checked.
- Which types are offered depends on the topic's kind (language or general). The topic instructions can steer the style further within those types.
- Language topic types:
  | Type | Example from the reference page |
  |---|---|
  | Translate | "Пусть он придёт вовремя!" → *¡Que llegue a tiempo!* |
  | Fill the gap | "Quizá ___ (tener) razón." → *tenga* |
  | Pick the mood (typed) | "A lo mejor mañana ___ (llover)." → *llueve* |
  | Spot and fix the error | "Tal vez sabe la respuesta." → *Tal vez sepa la respuesta.* |
- *(default)* General topic types (all typed, checked the same way):
  | Type | Example (topic: cell biology) |
  |---|---|
  | Short answer | "Which organelle produces most of the cell's ATP?" → *mitochondria* |
  | Fill the gap | "Proteins are assembled by ___." → *ribosomes* |
  | True or false | "Plant cells have no cell membrane." → *false* |
  | Spot and fix the error | "The nucleus is where photosynthesis happens." → *The chloroplast is where photosynthesis happens.* |
- Every exercise is generated together with:
  - a list of **accepted answers** (all correct variants the model can think of),
  - the **rule** it practices (short text, shown by the "show rule" hint and used to group review items).

### 4. Answering and checking
- Exercises are shown one at a time, and every answer is **typed**, including pick-the-mood.
- After each submission the answer is checked immediately:
  1. **Exact match** against the accepted answers after normalizing case, accents, punctuation and extra spaces. Small slips (a missing accent, a typo) count as correct.
  2. If there is no match, **ask the AI to double-check**. The answer may still be a valid variant.
  3. **Correct** answers are marked correct, with no explanation. If the answer had a small slip (a missing or wrong accent, different punctuation or case, a typo the AI accepted), the correct version is shown under it with the differences highlighted, so you learn from the slip. An answer that matches exactly gets no extra text. **Wrong** answers get a short explanation and the correct answer.
- Exercises only live for the session, so AI-accepted answers count for that exercise only and are not stored.

### 5. Help during an exercise
- **Show rule**: shows the rule the exercise practices. This doesn't count against you.
- **Reveal answer**: shows the answer, and the exercise counts as wrong.

### 6. Progress and review (core feature)
- Only **current progress** is stored: the topics and the review state of each rule. There is no full log of past answers.
- Wrong (or revealed) answers put their rule in a **review queue** on a spaced schedule: **1, 3, 7, 14 days**. A correct review moves the item to the next step, and a wrong one resets it to 1 day. After the 14-day step is passed, the item leaves the queue. Practicing a rule before it's due doesn't move it forward.
- Review shows a **fresh exercise on the same rule**, not the identical question.
- Two ways in:
  - **Due today**: items whose scheduled time has come.
  - **Review my mistakes**: practice all open mistakes any time, regardless of schedule.
- At the end of a session, a summary shows the score and the mistakes.

### 7. Users and sign-in
- Users sign in with their **Google account**. This also gives the app access to the user's own progress sheet (see Storage).

### 8. AI
- All AI calls (reading the material, generating exercises, double-checking answers) go through **OpenRouter**, via the server so the API key stays secret.
- Default model: **`anthropic/claude-haiku-5.5`** ($0.10 / $0.50 per million input/output tokens; reads images and PDFs). It's configurable. If it makes grammar mistakes in the answer key, switch to Claude Sonnet 5.5.
- Screenshots and PDFs are sent straight to the model. *(default)* DOCX files are converted to text in the browser first, because the model doesn't read DOCX.

### 9. Storage
- Each user's progress lives in a **Google Sheet in their own Google Drive**, which the app creates on first sign-in.
- The app asks only for access to files it created itself (Google's `drive.file` permission). That permission doesn't need a Google app review.
- The browser reads and writes the sheet directly with the user's Google sign-in, so the server stores nothing and there is no database.
- **Loading pattern:** one read when a session starts, nothing during the exercises, and one write at the end with the updated review state. Expected cost is about 0.5 s at each end. Answer checks don't touch the sheet: exact matches are instant, and AI double-checks take 1–3 s.
- *(default)* The session in progress is also kept in the browser until the final write, so closing the tab mid-session doesn't lose it.
- *(default)* Sheet tabs:
  - `Topics`: id, title, subject, kind (language or general), target language, topic instructions, rules, extracted text, created date.
  - `Review`: topic, rule, step, next due date, status.
  - `Settings`: your language, last exercise types and count.
- Known limits:
  - If the same user studies on two devices at the same moment, the last one to finish overwrites the other.
  - A user who edits the sheet by hand can break it.
- Storage stays behind one small interface, so it can move to a database (e.g. Cloudflare D1) later if needed.

### 10. Hosting and tech stack
Same pattern as Mike's zabauki products, in a pnpm workspace:
- **`apps/web`:** React Router v7 (with Vite), deployed to **Cloudflare Pages**. The signed-in study screens run in the browser. Public pages (landing, about) can be rendered on the server later for SEO, without changing frameworks.
- **`apps/api`:** [Hono](https://hono.dev) on a **Cloudflare Worker**. It passes AI calls through to OpenRouter so the key stays secret. It has no database.
- **Local development:** `pnpm dev` runs the web app (Vite) and the API (`wrangler dev`) side by side.

### 11. Branches and deployment
Same setup as Mike's zabauki repo:
- **No pull requests.** Active development happens directly on the **`dev`** branch. **`main`** is production.
- **Push to `dev`** → GitHub Actions (`deploy-dev.yml`) deploys to the Cloudflare **dev** environment.
- **Merge `dev` into `main`** → `deploy.yml` deploys to the **prod** Cloudflare account. A `pnpm deploy:prod` script (`scripts/ship.sh`) does the merge and push in one step.
- Both workflows call one reusable workflow with a `deployment_environment` input (`dev` or `prod`).
- GitHub Environments `dev` and `prod` each hold their own secrets: Cloudflare API token and account ID (prod is a separate account), the OpenRouter key, the R2 state keys, and the Google OAuth client ID (as a variable). The OpenRouter key is set on the Worker as a secret on each deploy (`wrangler secret put`).
- Naming follows zabauki: the API Worker is `overnover-api` in prod and `overnover-api-dev` in dev. The Pages projects are `overnover-prod` and `overnover-dev`.
- *(default)* Typecheck and tests run in the same workflow before deploying, so a broken push doesn't ship.
- **Infrastructure as code:** OpenTofu, like zabauki, with state in an R2 bucket and one state file per environment.
  - It manages the Pages project and, optionally, a custom domain with its DNS record. The API Worker stays on its workers.dev address and is deployed by wrangler.
  - The Worker code itself is still deployed by wrangler.
  - A `manage-infrastructure.yml` workflow applies changes when `infra/` changes on `dev` or `main`.
  - Not covered by OpenTofu, so documented as one-time manual steps in the README: the Google OAuth client (Google Cloud Console), the GitHub Environment secrets, and the R2 state bucket itself.
- Tooling matches zabauki: pnpm, Biome for lint and format, Node 22.

## Later

- More exercise types, e.g. multiple choice with tap answers, or matching pairs.
- Public pages rendered on the server for SEO.
- Progress stats: accuracy per topic and per rule, streaks.
- Audio: listen-and-write and pronunciation.
- Editing or deleting generated exercises, and flagging a bad exercise.
- Move storage to a database if Sheets becomes slow or limiting.

## Decisions and their reasons

- **React Router v7 + Hono:** matches zabauki, keeping one pattern across projects, and leaves server rendering available for SEO.
- **Dev/main branches, no PRs, OpenTofu for infrastructure:** same as zabauki, so environments can be recreated.
- **Google Sheets over a database:** each user keeps their progress in their own account. Storing only current progress, with one read and one write per session, keeps it about as fast as a database.
- **No full answer history:** dropped in favor of the light Sheets model above.
- **Your language + topic subject instead of a from/to pair:** a from/to pair only makes sense for language topics. Splitting it this way keeps the app generic.
- **Any subject in the MVP, steered by topic instructions:** you describe what you're learning in your own words, and it's kept as editable guidance for the AI. This replaces hard-coding subjects.
- **Original material:** the text extracted from the upload is kept with the topic, so new exercises can be generated later. The uploaded file itself is not stored.
