# Expenso

Expenso is a browser-based personal finance tracker built with React and TypeScript. Track income and expenses in Indian rupees (₹), manage monthly budgets, explore analytics, and download formatted reports. No account or backend is required.

[Live website](https://expensobypartha.netlify.app/)

## Features

- **Dashboard:** all-time balance, current-month income and expenses, savings rate, previous-month comparisons, recent activity, financial progress, and budget notifications. Includes responsive mobile navigation and a collapsible desktop sidebar.
- **Add transaction:** a four-step form covering transaction information, details, recurring schedule, and final review. Supports income, expenses, categories, dates, descriptions, and weekly/monthly/yearly recurrence.
- **Transactions:** sorting, income/expense filtering, ten rows per page, selection across pages, and a detail dialog. Amounts use ₹, Indian digit grouping, and two decimal places. Export selected entries in the active filter, or all filtered entries, as CSV or JSON. Open the full transaction page for management and history.
- **Import:** preview CSV, XLSX, or XLS before saving. Supports common column aliases and date formats, validates rows, maps unknown categories to Other, and provides a sample CSV template. Up to 500 rows per import; Excel parsing loads on demand.
- **Budgets:** current saved monthly category limits, spending progress, and threshold notifications. Budget controls support adding, editing, and removing limits.
- **Analytics:** exactly two charts: a six-month income/expense/net-savings line chart and a selected-month category expense donut. Includes a shared month selector, empty states, accessible category details, and CSV export of line-chart totals.
- **Reports:** preset periods and validated custom date ranges; financial summaries, monthly totals, category shares, budget comparisons, and paginated transaction detail. Downloads include every transaction in the selected period.
- **Help and Support:** searchable guides and FAQs, troubleshooting, data guidance, an illustrative transaction walkthrough, and replayable introduction and guided tour. The sample support form generates a local reference and downloadable JSON; it does not send a message or create a remote ticket.
- **Settings and onboarding:** persisted light/dark theme, local data information, a four-screen welcome introduction, and an eight-step guided tour. Sample data is offered when no transactions exist.

## PDF and Excel reports

PDF downloads and the in-app preview use the same landscape A4 document. Reports include financial summaries, monthly totals, categories, budget comparisons when limits exist, and all transaction details. Embedded DejaVu Sans supports ₹; descriptions wrap, column headers repeat, and footers show page numbers.

Excel downloads contain five worksheets: **Summary, Monthly, Categories, Budgets, and Transactions**. Amounts remain numeric with two-decimal INR formatting, dates remain date cells, and shares use percentage formatting. Sheets include styled headers, wrapped text, filters, frozen table headers, and landscape print settings. Export libraries load on demand.

Net savings means income minus expenses within the selected period, rather than all-time balance. Savings rate is net savings divided by income; periods without income display an explanatory state. Budget allocations use current saved monthly limits, prorated by calendar days covered in each month. Historical budget limits are not stored. Future-dated entries are included when they fall inside the selected range.

## Run locally

Use a current Node.js LTS release and npm.

```bash
git clone https://github.com/CoderPartha012/Expenso.git
cd Expenso
npm ci
npm run dev
```

Open the local URL printed by Vite (normally http://localhost:5173).

```bash
npm run build
npm run preview
npm run lint
node --test tests/*.test.mjs
npx tsc --noEmit -p tsconfig.app.json
```

On Windows PowerShell, use `npm.cmd` and `npx.cmd` if execution policy blocks the PowerShell wrappers. Deploy the generated `dist/` directory to a static host with SPA fallback to `index.html` for direct route access. No backend credentials are required.

## Validation

Regression tests cover analytics windows and currency precision, transaction filtering/sorting/pagination/selection and CSV escaping, report date validation, inclusive boundaries, paise precision, monthly reconciliation, and prorated budgets.

```bash
node scripts/verify-reports.mjs
```

The export script generates sample PDF/XLSX files under ignored `tmp/report-qa/` and reopens the workbook to check totals, dates, formats, worksheet count, and record count. An 85-transaction fixture produces seven PDF pages and five Excel worksheets; rendered samples have been checked for readable tables and long-description wrapping. Build, lint, and TypeScript checks are separate.

## Technology

| Purpose | Tools |
| --- | --- |
| UI and routing | React 18, TypeScript, React Router 6 |
| Build and styling | Vite 5, Tailwind CSS 3, Radix UI primitives |
| State and persistence | Zustand 4 with localStorage |
| Charts and animation | Recharts, Framer Motion |
| PDF export | jsPDF, jsPDF-AutoTable, embedded DejaVu Sans |
| Excel export / import | ExcelJS / SheetJS |
| CSV import / export | PapaParse / CSV serialization helpers |
| Utilities | date-fns, Lucide React, Sonner |

## Project layout

```text
src/
  components/          Navigation, onboarding, imports, budget controls
    ui/                Dashboard, multistep form, tables, charts, UI primitives
  pages/               Transactions, Analytics, Reports, Settings, Help
  lib/                 Report exports/calculations and table/analytics helpers
  store.ts             Persisted state and transaction/category/budget actions
  types.ts             Shared data types
  App.tsx              Routing and root layout
  index.css            Global styles and theme variables
public/fonts/          PDF font and redistribution license
tests/                 Node regression tests
scripts/               Report export verification
```

See [DASHBOARD-INTEGRATION.md](DASHBOARD-INTEGRATION.md) for implementation details of redesigned screens.

## Routes

| Path | Screen |
| --- | --- |
| `/` | Dashboard |
| `/add-transaction` | Add transaction |
| `/transactions` | Transactions and import |
| `/transaction/:id` | Full transaction details |
| `/charts` | Analytics |
| `/reports` | Reports, PDF preview, PDF/Excel downloads |
| `/settings` | Appearance and local data information |
| `/help` | Help and Support |

## Data and privacy

Transactions, categories, budgets, theme, and onboarding preferences persist in the current browser's localStorage. There is no account synchronization or server-side transaction database. Clearing site data or switching browsers does not preserve records; download exports before clearing storage. Reports are snapshots of saved transactions at generation time.

Default categories: Food, Transport, Bills, Shopping, Entertainment, Health, Salary, and Other. DejaVu Sans redistribution terms are included in [public/fonts/LICENSE-DejaVu.txt](public/fonts/LICENSE-DejaVu.txt).
