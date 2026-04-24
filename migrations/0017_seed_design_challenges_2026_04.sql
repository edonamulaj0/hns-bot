-- Graphic Design track briefs for 2026-04 (three tiers). Safe to re-run: uses fixed ids.

INSERT OR IGNORE INTO "Challenge" (
  "id", "month", "track", "tier", "title", "description", "resources", "deliverables",
  "messageId", "threadId", "publishedAt", "createdAt"
) VALUES
(
  'seed-design-2026-04-beginner',
  '2026-04',
  'DESIGNERS',
  'Beginner',
  'Public awareness poster',
  '## Brief\nCreate a **single poster** (print or social) for a public awareness topic you care about (cyber hygiene, climate, mental health, etc.).\n\n## Focus\n- One clear headline + supporting copy\n- Strong hierarchy and readable type\n- Deliberate color palette (3–5 colors max)',
  '- [Coolors](https://coolors.co/) for palettes\n- Free fonts: Google Fonts',
  '- **PNG, JPG, or WebP** export (min 1080px on the long edge)\n- Short paragraph explaining audience + intent',
  NULL, NULL, datetime('now'), datetime('now')
),
(
  'seed-design-2026-04-intermediate',
  '2026-04',
  'DESIGNERS',
  'Intermediate',
  'Mini brand kit',
  '## Brief\nDesign a **cohesive brand kit** for a fictional product or community (name + tagline you invent).\n\n## Deliver\n- Logo mark (primary)\n- Color + type rules on one sheet\n- One social or hero layout showing the system in use',
  '- [Penpot](https://penpot.app/) or Figma community files\n- Logo grid / construction references',
  '- **PNG, JPG, or WebP** export for each artifact **or** one combined board image\n- 150–300 words on decisions + constraints',
  NULL, NULL, datetime('now'), datetime('now')
),
(
  'seed-design-2026-04-advanced',
  '2026-04',
  'DESIGNERS',
  'Advanced',
  'UI mockup + motion storyboard',
  '## Brief\nShip a **high-fidelity UI mockup** for a non-trivial flow (3+ screens or states) **and** a **6–12 frame motion storyboard** (static frames are fine — no video required).\n\n## Bar\n- Interaction states (empty, loading, error)\n- Accessibility notes (contrast, focus)\n- Motion intent annotated per frame',
  '- Apple HIG / Material motion patterns\n- WCAG contrast checkers',
  '- **PNG, JPG, or WebP** export (mockup + storyboard; multiple files → zip URL **not** accepted; use **one** combined image or **one** direct image URL per spec)\n- 300–600 word case study',
  NULL, NULL, datetime('now'), datetime('now')
);
