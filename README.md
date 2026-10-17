# overnover

A personal study app that runs on your own computer. Give it a document, a screenshot or a short text prompt, and it generates exercises on that topic. It checks each answer as you submit it, briefly explains mistakes, and brings them back for review after 1, 3, 7 and 14 days.

The first use case is Spanish grammar. What it does is described in [docs/requirements.md](docs/requirements.md).

## Run it

Requires Node.js 20 or newer.

```bash
npm install
cp .env.example .env.local   # then fill it in, see below
npm run dev                  # open http://localhost:3000
```

### Settings (`.env.local`)

| Variable | What it is |
|---|---|
| `OPENROUTER_API_KEY` | Your key from https://openrouter.ai/keys |
| `OPENROUTER_MODEL` | Any OpenRouter model id. For screenshots, pick one that accepts images. |
| `STORAGE` | `sheets` for Google Sheets, or `file` to keep everything in `data/store.json` |
| `GOOGLE_SHEET_ID` | The long id in the spreadsheet URL (`/spreadsheets/d/<id>/edit`) |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY` | From the service account's JSON key |
| `MOCK_AI` | `1` uses canned responses instead of OpenRouter, for trying the screens without a key |

### Google Sheets setup

1. In Google Cloud Console, create a project, enable the **Google Sheets API**, and create a **service account**. Add a JSON key to it and download the key.
2. Copy `client_email` into `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `private_key` into `GOOGLE_PRIVATE_KEY` (keep the quotes and the `\n`s).
3. Create an empty spreadsheet and share it with the service account email as **Editor**. Put its id in `GOOGLE_SHEET_ID` and set `STORAGE=sheets`.

On first use, the app creates the `Topics`, `Exercises`, `Attempts` and `Review` tabs.

## How it works

- **New topic:** the upload is read into text (PDF, DOCX, TXT), or sent to the model as an image. The model returns a title and the list of rules the material teaches. A batch of exercises is then generated right away, using the types and count you last chose.
- **Exercises:** each exercise is generated together with its accepted answers and the rule it practises. Answers are matched exactly after ignoring case, accents and punctuation. When nothing matches, the model double-checks. Answers it accepts are added to the exercise's accepted list, and answers it rejects get a short explanation.
- **Review:** a wrong or revealed answer opens a review item for its rule, due in 1 day. A correct answer on a due review moves it to 3, then 7, then 14 days, and passing the 14-day step closes it. Another mistake resets it to 1 day. "Review my mistakes" practises every open item at any time, but only due items move up the schedule. Review always shows a fresh exercise on the same rule.

Code layout: `src/lib/ai` (OpenRouter prompts), `src/lib/store` (Google Sheets and file storage behind one interface), `src/lib/service.ts` (the flow above), `src/app` (screens and API routes).

## Checks

```bash
npm run typecheck
npm test
npm run build
```
