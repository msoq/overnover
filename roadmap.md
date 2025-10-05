## mvp plan — reminders with spaced repetition basics

### scope
- Create reminders with: `createdAt`, `nextRepeatedAt`, `status`.
- Home shows a grid of tiles sorted by `nextRepeatedAt` ascending; overdue at the top.
- Filters by `status`: Active (default) and Done.
- Actions on a tile: "Repeat in X days" with inline editable `X`, "Mark done".

### user stories
- As a user, I add a reminder with a title.
- As a user, I see my active reminders sorted by the next repetition date.
- As a user, I click "Repeat in X days" and can edit `X` inline to set a custom value.
- As a user, I mark a reminder as done to move it out of Active.
- As a user, I can restore a reminder from Done back to Active if I need it again.
- As a user, I can edit the title and notes anytime to track progress.
- As a user, I return later and my data persists locally; if I log in, it syncs.

### data model
- Reminder: `{ id, title, createdAt, repeatedAt: string[], nextRepeatedAt, status: 'active'|'done', updatedAt }`.
- Optional: `note` (text).
- Keep timestamps in ISO 8601 (UTC). In UI, show local time.
 - Derived: `lastRepeatedAt = last(repeatedAt)` if any; `repeatCount = repeatedAt.length`.

### scheduling (default behavior)
- Simple interval ladder inspired by Ebbinghaus: `1, 3, 7, 14, 30, 60, 120` days.
- Derived current interval: if `repeatedAt.length > 0`, let `last = last(repeatedAt)` and `currentDays = max(1, floor((now - last) in days))`, else `currentDays = null`.
- On "Repeat in X days":
  - `X` is editable inline. Use the edited number if the user changes it.
  - First repeat (no `repeatedAt`): use default first interval `1` day.
  - Subsequent repeats: default `X` is the next ladder interval ≥ `currentDays`, capped at 120.
  - Append `now` to `repeatedAt`, set `nextRepeatedAt = now + X days`.
- Early repeat rule with 50% threshold: let `intervalDays = max(1, floor((nextRepeatedAt - last(repeatedAt)) in days))`.
  - If repeating before `nextRepeatedAt` and elapsed ≤ 50% of `intervalDays`, keep the same `X = intervalDays` (do not advance the ladder).
  - If elapsed > 50% of `intervalDays`, set `X` to the next ladder interval after `intervalDays`.
  - Unless the user edited `X` inline, then use the edited value.
  - After choosing `X`, append `now` and set `nextRepeatedAt = now + X days`.
- Time-of-day: normalize `nextRepeatedAt` to 09:00 user local time to avoid time drift.

### ui behavior
- Grid tile shows: title, battery indicator, and due label ("today", "tomorrow", "in X days", or "X days overdue").
- Battery is UI-only: compute thirds of the interval between `last(repeatedAt)` and `nextRepeatedAt`.
  - 0–33% elapsed → high, 34–66% → medium, 67–100% → low.
- Primary button: "Repeat in X days" with `X` as an inline editable number input (1–365).
- "Mark done" sets `status = 'done'` and hides it from Active; remains in Done.
- "Restore" on Done tiles sets `status = 'active'` and shows it in Active again.
- Title is inline‑editable (press Enter to save); notes editable in details panel/modal.
- Notes autosave on blur; show last edited time using `updatedAt`.
- Empty states: show a quick add CTA when no Active reminders.
- No keyboard shortcuts in MVP.

### sorting and filters
- Sort by `nextRepeatedAt` ascending. Overdue appear above those due later today.
- Filters: Active (`status = 'active'`) default, Done (`status = 'done'`).
- Search box (optional): filter by title substring on the client; no browser indexing in MVP.

### storage and auth
- Not logged in: store data locally in IndexedDB only; provide manual JSON export/import.
- Logged in: store in a database under the user id; keep the app offline‑first.
- Sync on login: merge local into server using `updatedAt`; last write wins per field.
- Manual JSON export/import for backups.

### non‑goals for mvp
- No tags; consider adding post‑MVP.
- No browser search indexing; if search is added, use a simple substring scan.
- No media or complex stats. No deck hierarchy. No notifications.
- No multi‑device conflict UI; rely on last‑write‑wins with audit in console only.

### edge cases
- Overdue carryover: if `nextRepeatedAt < now`, show as overdue; repeating sets a new `nextRepeatedAt` from now.
- Daylight saving time: normalize `nextRepeatedAt` at 09:00 local to avoid off‑by‑one surprises.
- Deleting reminders: out of scope for MVP; allow marking done only.

### next steps
- Build local data layer (IndexedDB) and grid UI.
- Add default scheduling and inline interval editing.
- Add auth and server persistence; implement merge of local data on login.
- Add export/import and basic empty states.
 - Plan notifications (local push on mobile/PWA; web reminders) and opt-in settings.
 - Design tags/groups data model (post-MVP): simple tag list, later many-to-many.
