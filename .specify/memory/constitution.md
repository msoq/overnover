# Overnover constitution

## Core principles

### I. Simplicity first
Prefer simplicity over tooling and cleverness. Fewer moving parts, clearer code, and obvious solutions reduce risk and speed up delivery.

### II. SSR by default
Render pages on the server by default. Pre-render pages that rarely change, and add client interactivity only where it clearly helps users.

### III. Content and accessibility
Content must be readable, navigable with a keyboard, and understandable by assistive technologies. Use clear structure, meaningful headings, labels, alt text, visible focus, and strong color contrast.

### IV. Performance and efficiency
Deliver the first view quickly and keep interactions responsive. Keep pages light, avoid unnecessary dependencies, and defer non-essential work until after the main content is available.

### V. Reliability and resilience
Design for failure. Show helpful errors, keep user data safe, and degrade gracefully when scripts, styles, or network conditions are limited.

## Standards

### Accessibility (must-have)
- Provide text alternatives for images and media.
- Ensure keyboard access for all interactive elements and visible focus states.
- Use clear, descriptive labels and error messages.
- Maintain sufficient color contrast and avoid relying on color alone to convey meaning.

### SEO and content quality
- Write unique, descriptive page titles and summaries that reflect user intent.
- Structure content with meaningful headings and descriptive link text.
- Avoid duplicate content and prefer human-readable URLs.

### Performance and UX
- Keep critical content small and fast to display.
- Load non-critical content after the main experience is usable.
- Prefer simple solutions over heavy client-side behavior.

### Privacy and security
- Collect the minimum user data needed for the feature.
- Never expose secrets to users.
- Handle user input safely and show clear consent where required.

## Development workflow

- Ship small, reviewable changes that improve the user experience.
- SSR is the default choice for new pages; choose a simpler option only with a clear reason.
- Manual checks per change: keyboard navigation, focus order, contrast, title/summary, and first view speed.
- Document user-facing behavior and any trade-offs made for simplicity or performance.

## Governance

- This constitution guides design, build, and review decisions for the app.
- Exceptions require a clear, written rationale focusing on user benefit and long-term simplicity.
- New tools, abstractions, or dependencies must show net value in clarity, speed, or maintenance cost.
- Revisit this document as the product evolves; keep it short and practical.

**Version**: 1.0.0 | **Ratified**: 2025-10-04 | **Last Amended**: 2025-10-04