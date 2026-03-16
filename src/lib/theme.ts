/**
 * Design tokens for ListingScout dark theme.
 *
 * Use these as Tailwind class fragments, e.g. `className={T.card}`.
 * Centralizes the palette so the entire app reads from one place.
 *
 * Contrast targets (WCAG AA on #08090E):
 *   text-1  #EEEEF4  — primary text      (15.5:1)
 *   text-2  #B0B0C0  — secondary labels   (8.0:1)
 *   text-3  #7A7A90  — tertiary / muted   (4.5:1)
 */

// ─── Background Layers ──────────────────────────────────────────────────────
// Clear visual depth: each step is noticeably lighter than the last.
export const bg = {
  /** Page / root background */
  base:    'bg-[#08090E]',
  /** Raised surfaces — sidebar, modals */
  raised:  'bg-[#0F1117]',
  /** Cards, table rows, inputs */
  card:    'bg-[#161822]',
  /** Hover / active / header rows */
  hover:   'bg-[#1D2030]',
  /** High-emphasis surface (selected, focus) */
  active:  'bg-[#252840]',
} as const

// ─── Borders ────────────────────────────────────────────────────────────────
export const border = {
  /** Default border — clearly visible */
  base:    'border-[#2A2D42]',
  /** Subtle border for nested elements */
  subtle:  'border-[#1F2235]',
  /** Strong border for focused elements */
  strong:  'border-[#3A3D58]',
} as const

// ─── Text ───────────────────────────────────────────────────────────────────
export const text = {
  /** Primary text — headings, body, important values */
  primary:   'text-[#EEEEF4]',
  /** Secondary text — labels, descriptions */
  secondary: 'text-[#B0B0C0]',
  /** Muted text — placeholders, footnotes */
  muted:     'text-[#7A7A90]',
  /** Accent — links, active nav */
  accent:    'text-[#818CF8]',
} as const

// ─── Accent Colors ──────────────────────────────────────────────────────────
export const accent = {
  indigo:       'bg-[#6366F1]',
  indigoHover:  'bg-[#818CF8]',
  indigo10:     'bg-[#6366F1]/10',
  indigo15:     'bg-[#6366F1]/15',
} as const

// ─── Semantic Colors ────────────────────────────────────────────────────────
export const semantic = {
  success:    '#22C55E',
  warning:    '#F59E0B',
  danger:     '#EF4444',
  info:       '#3B82F6',
  muted:      '#7A7A90',
} as const

// ─── Composite Tokens (common patterns) ─────────────────────────────────────
export const T = {
  // Cards
  card:        `${bg.card} ${border.base} rounded-xl`,
  cardInner:   `${bg.raised} ${border.subtle} rounded-lg`,

  // Page header
  headerBg:    `${bg.raised} ${border.base} border-b`,

  // Table
  tableWrap:   `rounded-xl ${border.base} border overflow-hidden`,
  tableHeader: `${bg.hover}`,
  tableRow:    `${border.subtle} border-b hover:${bg.hover} transition-colors`,
  tableRowAlt: `${bg.raised}`,

  // Inputs
  input:       `${bg.card} ${border.base} ${text.primary} placeholder:${text.muted}`,

  // Sidebar
  sidebarBg:   `${bg.raised} ${border.base} border-r`,
  navActive:   `${accent.indigo15} ${text.accent}`,
  navInactive: `${text.secondary} hover:${bg.hover} hover:${text.primary}`,
} as const
