# Dashboard and sidebar integration

The project already supports React, TypeScript, Tailwind CSS and lucide-react. No additional dependency installation is required for this component.

Reusable UI components live in `src/components/ui`, aliased as `@/components/ui`. Global styles are in `src/index.css`, and Tailwind configuration is in `tailwind.config.js`. The shadcn `components.json` file records these paths. Keeping reusable UI components here gives generated components and imports a consistent location.

The reference design is integrated across `src/components/ui/dashboard-with-collapsible-sidebar.tsx`, `src/components/Sidebar.tsx` and `src/App.tsx`. The application shell supplies a 256px expanded / 64px collapsed desktop sidebar, mobile navigation and persisted theme management. The dashboard provides the reference header controls, four metric cards, recent activity, Quick Stats progress bars and top spending categories. The dashboard contains only these reference sections; detailed transaction management and charts are available from the sidebar.

The reference's store-specific sample sales and products are represented by real Expenso financial data. All monetary values use Indian rupee formatting via `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`; no random sample amounts are rendered. Navigation uses existing routes. The notification button shows monthly budget alerts, account opens Settings, and Help & Support opens the feature tour.

The `demo.tsx` component imports `Example` using the requested alias. Render it within Expenso's router and application shell.

For future shadcn components, run `npx shadcn@latest add <component>` and install any dependencies requested by that component.

## Add transaction

The Add transaction route renders `src/components/ui/multistep-form.tsx`. It adapts the supplied animated card, progress indicator, Back/Next controls and shadcn fields to four transaction steps: Transaction, Details, Schedule and Review. Required fields are validated before advancing; saving adds the transaction to the existing store and opens its detail page. Recurring transactions retain their scheduling support. Monetary amounts use INR with Indian digit grouping and up to two decimal places.

The supplied shadcn button, card, input, label, radio-group, checkbox, select and textarea components live under `src/components/ui`. Shared class merging is in `src/lib/utils.ts`; semantic light/dark theme variables are in `src/index.css`. TypeScript and Tailwind are already configured.
## Transactions

`src/pages/TransactionsPage.tsx` renders `TransactionsTable` from `src/components/ui/contacts-table-with-modal.tsx`. The supplied contacts reference is adapted to real transaction descriptions, income/expense badges, INR amounts, categories, dates and detail modals. It supports ten rows per page, sorting, type filtering, selection and CSV/JSON exports. Export uses selected rows in the active filter when available, otherwise all filtered rows. Selecting a page preserves selections on other pages. Detailed transaction management remains accessible through the modal's full-transaction link.

React, TypeScript, Tailwind, Lucide and Framer Motion are already installed. The existing persisted theme and semantic CSS variables provide light/dark styling, so the Vite application does not need next-themes. Shared UI components use `src/components/ui` (`@/components/ui`); styles are in `src/index.css` and `tailwind.config.js`.

Run transaction-table regression checks with `node --test tests/transaction-table.test.mjs`.
## Analytics

Analytics now contains exactly two charts: `src/components/ui/line-charts-4.tsx` for six-month income, expenses and net savings, and `src/components/ui/donut-chart.tsx` for the selected month's expense categories. `src/pages/ChartsPage.tsx` connects both to live store data and a shared month selector. Donut segments and legend items reveal INR amounts and percentages by hover or keyboard focus; empty months remain valid. The line card exports its plotted totals as CSV.

Both components adapt the supplied designs to the project's Tailwind 3, Recharts and existing shadcn Card/Button components. Required dependencies are already installed; no Tailwind 4 migration or additional radix-ui package is needed. UI files live in `src/components/ui` (`@/components/ui`), with global styles in `src/index.css` and semantic colors in `tailwind.config.js`.

Run analytics checks with `node --test tests/analytics.test.mjs`.
## Help, introduction, and guided tour

`src/pages/HelpPage.tsx` supplies the `/help` route linked from the sidebar, mobile header, and Settings. It includes searchable screen guides and FAQs, troubleshooting and local data guidance, a six-step illustrative transaction walkthrough, replay controls, and an explicitly local demo support form with a reference and JSON download. The demo never sends a message or creates a remote ticket.

The four-screen welcome introduction and eight-step guided tour cover the redesigned dashboard, four-step transaction form, transaction table and modal, line/donut analytics, Reports, Settings, and Help. Tour navigation opens each relevant route without saving records. Native dialogs support focus containment and Escape dismissal. The sample-data button is hidden when transactions exist, including when replaying the welcome introduction. Keyboard shortcut N is suppressed during dialogs, inputs, editable content, and open listboxes.

## Reports

Reports provides preset and validated custom date ranges, income/expense/net/savings summaries, monthly totals, category shares, prorated current budget allocations, and paginated transaction details. All exports include every transaction in the selected range. Historical budget limits are not stored; allocations use current limits prorated by calendar days.

PDF downloads and the PDF preview share the same generated landscape A4 document, with embedded rupee glyphs, wrapping descriptions, repeated headers, and numbered pages. Excel exports use five styled worksheets with numeric amounts, date cells, percentage formats, filters, frozen headers, and print settings. Export dependencies load on demand.

Run node --test tests/*.test.mjs and node scripts/verify-reports.mjs. The export fixture verifies 85 transactions, five worksheets, seven PDF pages, dates and reconciled totals. Generated PDF pages and all spreadsheet sheets were visually inspected.
