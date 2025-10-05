# Feature Specification: Spaced repetition reminders (MVP)

**Feature Branch**: `001-i-m-building`  
**Created**: 2025-10-04  
**Status**: Draft  
**Input**: User description: "I'm building a tool based on spaced repetition, a learning method that helps you remember information more effectively by reviewing it just before you're likely to forget it. You create a reminder with the short description, the system reminds you and automatically adjusts how often each reminder reappears: easier ones show up less, harder ones more. The main idea is to study a little each day, focusing on what you're most likely to forget, so knowledge moves from short-term to long-term memory efficiently. I want this tool to look sleek, something that would stand out."

## Execution Flow (main)
```
1. Parse user description from Input
   → If empty: ERROR "No feature description provided"
2. Extract key concepts from description
   → Identify: actors, actions, data, constraints
3. For each unclear aspect:
   → Mark with [NEEDS CLARIFICATION: specific question]
4. Fill User Scenarios & Testing section
   → If no clear user flow: ERROR "Cannot determine user scenarios"
5. Generate Functional Requirements
   → Each requirement must be testable
   → Mark ambiguous requirements
6. Identify Key Entities (if data involved)
7. Run Review Checklist
   → If any [NEEDS CLARIFICATION]: WARN "Spec has uncertainties"
   → If implementation details found: ERROR "Remove tech details"
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

### Section Requirements
- **Mandatory sections**: Must be completed for every feature
- **Optional sections**: Include only when relevant to the feature
- When a section doesn't apply, remove it entirely (don't leave as "N/A")

### For AI Generation
When creating this spec from a user prompt:
1. **Mark all ambiguities**: Use [NEEDS CLARIFICATION: specific question] for any assumption you'd need to make
2. **Don't guess**: If the prompt doesn't specify something (e.g., "login system" without auth method), mark it
3. **Think like a tester**: Every vague requirement should fail the "testable and unambiguous" checklist item
4. **Common underspecified areas**:
   - User types and permissions
   - Data retention/deletion policies  
   - Performance targets and scale
   - Error handling behaviors
   - Integration requirements
   - Security/compliance needs

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
As a learner who wants to remember information long-term, I add short reminders for items I’m studying. Each day, I open the app and see what is due first. When I confirm I studied an item, the system schedules the next time I should see it. Easier items appear less often; harder items appear more often. The interface feels sleek and uncluttered so focusing is easy.

### Acceptance Scenarios
1. **Given** I have no reminders, **When** I add a reminder titled “Read chapter 3,” **Then** it appears in the Active list with a due label and an automatically scheduled next review.
2. **Given** an Active reminder with a suggested interval, **When** I click “Repeat in X days” without changing X, **Then** the study event is recorded and the next review is scheduled using the suggested interval.
3. **Given** an Active reminder, **When** I edit X to a custom value and confirm, **Then** the study event is recorded and the next review is scheduled using my chosen value.
4. **Given** an Active reminder, **When** I mark it Done, **Then** it disappears from Active and appears in Done.
5. **Given** a Done reminder, **When** I restore it, **Then** it reappears in Active.
6. **Given** I return later on the same device without an account, **When** I open the app, **Then** my reminders and their statuses still appear (kept until I delete them).
7. **Given** a reminder that is past due, **When** I view my list, **Then** overdue items are shown first.

### Edge Cases
- Early repeat handling: if less than half of the current interval has elapsed, keep the same interval; if more than half has elapsed, move to the next interval. Unless the user edited X, in which case use their value.
- Overdue carryover: if a review is overdue, the next interval is calculated from the time of the new study event (now).
- Time-of-day anchoring: reviews are anchored to 09:00 local to avoid drift across days.
- Deletion of reminders is out of scope for the MVP; use Done/Restore.

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: System MUST allow users to create a reminder with a short title.
- **FR-002**: System MUST present an Active list of reminders sorted by earliest due first, with overdue shown before due-later items.
- **FR-003**: System MUST present a Done list and allow switching between Active (default) and Done.
- **FR-004**: System MUST allow marking a reminder as Done and restoring a Done reminder back to Active.
- **FR-005**: System MUST display a human-friendly due label (e.g., “today,” “tomorrow,” “in X days,” “X days overdue”).
- **FR-006**: System MUST provide a “Repeat in X days” action with an editable numeric value X and a sensible default.
- **FR-007**: System MUST compute the default X using a simple, predictable interval ladder: 1, 3, 7, 14, 30, 60, 120 days; cap at 120 days.
- **FR-008**: System MUST support an early-repeat rule: if elapsed time ≤ 50% of the current interval, keep the same interval; if > 50%, advance to the next interval, unless the user edited X.
- **FR-009**: System MUST record each study event and set the next review to “now + X days.”
- **FR-010**: System MUST anchor next reviews to 09:00 local time to minimize drift.
- **FR-011**: System MUST provide an empty state with a clear call to add the first reminder.
- **FR-012**: System MUST preserve user reminders between sessions on the same device without an account, keeping them indefinitely until the user deletes them or removes app data.
- **FR-013**: If sign-in is offered, System MUST merge existing local reminders into the signed-in account on first login; when conflicts occur, the most recent change per field wins.
 - **FR-016**: System SHOULD offer manual export/import so users can back up or move their reminders.
- **FR-014**: The interface MUST feel sleek and focused, with minimal distractions and clear visual hierarchy; motion and feedback should be tasteful and purposeful.
- **FR-015**: Accessibility MUST be maintained: keyboard navigation for interactive elements, visible focus states, sufficient color contrast, and descriptive labels and alt text.

*Example of marking unclear requirements:*
- **FR-006**: System MUST authenticate users via [NEEDS CLARIFICATION: auth method not specified - email/password, SSO, OAuth?]
- **FR-007**: System MUST retain user data for [NEEDS CLARIFICATION: retention period not specified]

### Key Entities *(include if feature involves data)*
- **Reminder**: A study item the user wants to remember; key attributes include a user-provided title, current status (Active or Done), next review date, and a history of study events used to determine spacing. No storage or technology constraints are implied here.

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [ ] No implementation details (languages, frameworks, APIs)
- [ ] Focused on user value and business needs
- [ ] Written for non-technical stakeholders
- [ ] All mandatory sections completed

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain
- [ ] Requirements are testable and unambiguous  
- [ ] Success criteria are measurable
- [ ] Scope is clearly bounded
- [ ] Dependencies and assumptions identified

---

## Execution Status
*Updated by main() during processing*

- [ ] User description parsed
- [ ] Key concepts extracted
- [ ] Ambiguities marked
- [ ] User scenarios defined
- [ ] Requirements generated
- [ ] Entities identified
- [ ] Review checklist passed

---
