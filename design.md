# Dashboard Design

Reading this as a product dashboard for link owners and developers, not a marketing landing page.

## Design Direction

- Vibe: calm, sharp, operational, not decorative.
- Layout: dense but breathable dashboard with a persistent sidebar.
- Visual density: medium-high.
- Motion: low, only for state transitions and chart hover.
- Shape: 8px radius for panels and inputs, full-pill only for status badges.
- Accent: one teal accent for primary actions and active states.

## Palette

| Token | Hex | Use |
| --- | --- | --- |
| `bg` | `#f7f8f5` | App background |
| `surface` | `#ffffff` | Panels, tables, form surfaces |
| `ink` | `#171717` | Primary text |
| `muted` | `#6b7280` | Secondary text |
| `border` | `#d7dad0` | Hairlines and dividers |
| `accent` | `#0f766e` | Primary buttons, active nav, chart primary |
| `accentSoft` | `#ccfbf1` | Selected row and subtle highlight |
| `warning` | `#b45309` | Expiring links |
| `danger` | `#be123c` | Disabled/errors |
| `chart2` | `#4f46e5` | Secondary chart series |
| `chart3` | `#d97706` | Tertiary chart series |

Avoid purple-blue gradients, fake glass cards, oversized hero text, and generic three-card landing sections.

## Typography

- Font: system UI first. Add Geist only if the app scaffold already includes font setup.
- Page title: 24 to 28px, 600 weight.
- Section heading: 16 to 18px, 600 weight.
- Body/table: 14px.
- Metric number: 28 to 36px, 650 weight.
- No negative letter spacing.

## App Layout

```text
+------------------------------------------------------+
| Sidebar | Top bar: search, date range, account       |
|         +--------------------------------------------+
|         | KPI row                                    |
|         | Time-series chart                          |
|         | Links table / referrer breakdown           |
+------------------------------------------------------+
```

Desktop:

- Sidebar width: 240px.
- Content max width: 1440px.
- 24px page padding.
- Tables keep dense rows around 44px height.

Mobile:

- Sidebar becomes top navigation or drawer.
- KPI cards become 2-column, then 1-column.
- Tables become stacked rows with the URL and stats visible first.

## Screens

### Links List

Purpose: manage links quickly.

Elements:

- Create link button.
- Search by title, code, destination.
- Filters: active, disabled, expired.
- Table columns: short code, destination, clicks, unique visitors, created, status, actions.
- Row actions use icons with tooltips: copy, open, details, disable.

### Create Link

Purpose: fast form, no wizard.

Fields:

- Destination URL.
- Optional title.
- Optional custom alias.
- Optional expiry date.

Validation:

- URL must be `http` or `https`.
- Alias shows availability only after blur or submit.
- Error text appears under the field.

### Link Detail

Purpose: answer "is this link working and where are clicks coming from?"

Blocks:

- Header with short URL, copy button, open button, status.
- KPI row: total clicks, unique visitors, last 24h, conversion placeholder if later needed.
- Time-series chart.
- Referrer breakdown.
- Device/browser breakdown.
- Recent click table only for last 7 days if needed.

## Component Rules

- Use cards only for individual widgets, not nested page sections.
- Prefer dividers and spacing over heavy shadows.
- Buttons must fit on one line.
- Icon buttons need accessible labels and tooltips.
- Forms need loading, error, disabled, and success states.
- Empty state should offer one action, usually "Create link".
- Chart tooltips should show exact date and count.

## Anti-AI Checklist

- No giant landing hero inside the dashboard.
- No decorative blobs, bokeh, or mesh gradients.
- No fake customer logos.
- No vague copy like "unlock insights".
- No duplicated CTA intent.
- No chart colors changing meaning between screens.
- No table text overflow on mobile.
- No invisible focus states.

## Suggested Libraries

Only add these when implementing the frontend:

- Tailwind CSS for styling.
- Radix primitives or shadcn-style owned components for dialogs, menus, and tooltips.
- Recharts for charts.
- TanStack Table only if sorting/filtering grows beyond a simple table.

Skipped: a full enterprise design system. Add one only if the UI starts needing complex data-grid behavior, advanced accessibility patterns, or multiple product teams.
