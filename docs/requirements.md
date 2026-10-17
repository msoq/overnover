# Study App: Desired Functionality

Status: agreed with Mike (2026-10-17). Code in `msoq/overnover` is ignored; the repo will be restarted from scratch.

## Goal

A personal, locally run web app that turns study material (a document, a screenshot, or a text prompt) into interactive exercises, checks the answers, explains mistakes briefly, and brings mistakes back later for review. Spanish homework is the first use case, but nothing should be hard-wired to Spanish or to languages in general.

Reference example: a page on *Presente de Subjuntivo en las oraciones subordinadas independientes* (wishes with *que*, doubt with *quizá / tal vez / acaso / puede que*, and the ¡NOTA! that *a lo mejor / seguramente / probablemente / posiblemente* take indicativo).

## MVP

### 1. Topic input
- Create a topic from any of: uploaded document (PDF, DOCX, TXT), screenshot/image, or a typed text prompt (e.g. "presente de subjuntivo after quizá").
- Exercises are generated straight from the upload. There is no summarize-and-confirm step.
- Topics are saved, so you can start a new session on an existing topic later.

### 2. Languages
- Language selector with **from** and **to** languages, chosen per topic (e.g. Russian → Spanish).
- Used for translation exercises and for the language the feedback is written in.

### 3. Exercise generation
- One request generates a batch of exercises. The default is **10**, and the count is configurable.
- Before generating, a **checkbox list** of exercise types lets you pick any combination (at least one). The batch mixes the selected types.
- The last selection is saved and **preselected next session**. On first use, all four are checked.
- Available types:
  | Type | Example from the reference page |
  |---|---|
  | Translate | "Пусть он придёт вовремя!" → *¡Que llegue a tiempo!* |
  | Fill the gap | "Quizá ___ (tener) razón." → *tenga* |
  | Pick the mood (typed) | "A lo mejor mañana ___ (llover)." → *llueve* |
  | Spot and fix the error | "Tal vez sabe la respuesta." → *Tal vez sepa la respuesta.* |
- Every exercise is generated together with:
  - a list of **accepted answers** (all correct variants the model can think of),
  - the **rule** it practices (short text, shown by the "show rule" hint and used to group review items).

### 4. Answering and checking
- Exercises are shown one at a time, and every answer is **typed**, including pick-the-mood.
- After each submission the answer is checked immediately:
  1. **Exact match** against the accepted answers after normalizing case, accents, punctuation and extra spaces. Small slips (a missing accent, a typo) count as correct.
  2. If there is no match, **ask the AI to double-check**. The answer may still be a valid variant.
  3. **Correct** answers are just marked correct, with no feedback. **Wrong** answers get a short explanation and the correct answer.
- AI-accepted answers are added to that exercise's accepted answers, so the next check is an exact match.

### 5. Help during an exercise
- **Show rule**: shows the rule the exercise practices. This doesn't count against you.
- **Reveal answer**: shows the answer, and the exercise counts as wrong.

### 6. History and review (core feature)
- Every attempt is saved: exercise, your answer, result, feedback, timestamp.
- Wrong (or revealed) answers enter a **review queue** on a spaced schedule: **1, 3, 7, 14 days**. A correct review moves the item to the next step, and a wrong one resets it to 1 day. After the 14-day step is passed, the item leaves the queue.
- Review shows a **fresh exercise on the same rule**, not the identical question.
- Two ways in:
  - **Due today**: items whose scheduled time has come.
  - **Review my mistakes**: practice all open mistakes any time, regardless of schedule.

### 7. Platform
- Web app that runs **locally** on Mike's machine (opened in the browser).
- Single user (Mike), no accounts, login or password.
- **Language topics only** in the MVP.

### 8. AI
- All AI calls (generation, double-checking, reading images/documents) go through **OpenRouter**. The model is chosen later and is configurable.
- Screenshot input needs a model with vision, or a separate text-extraction step.

### 9. Storage
- **Google Sheets** instead of a database, behind a thin storage layer so it can be swapped later.
- Suggested sheets: `Topics`, `Exercises` (incl. accepted answers and rule), `Attempts`, `Review` (rule/exercise, step, next due date).

## Later

- Hosting it online, with password protection or accounts, and multiple users.
- Non-language subjects with their own exercise types (e.g. short answer, multiple choice, definitions), so the app is generic beyond languages.
- Progress stats: accuracy per topic and per rule, streaks.
- Audio: listen-and-write and pronunciation.
- Editing or deleting generated exercises, and flagging a bad exercise.
- Move from Google Sheets to a real database if it gets slow or limiting.

## Decisions and defaults

- **Hosting:** local only for now, so no password protection is needed.
- **Scope:** language topics only in the MVP; other subjects come later.
- **Google Sheets access** (default, not discussed): a Google service account with one spreadsheet shared to it. Its credentials and the OpenRouter key live in a local `.env` file.
- **Original material** (default, not discussed): keep the text extracted from the upload with the topic, so new exercises can be generated later. The uploaded file itself is not stored.
