# Expenso — Smart Personal Finance Tracker

Expenso is a fully client-side personal finance application built with React and TypeScript. It lets you track income and expenses, set monthly budgets per category, visualise spending trends with interactive charts, generate detailed PDF reports, and bulk-import transactions from CSV or Excel files — all without a backend or login.

## Live Demo

[https://expensobypartha.netlify.app/](https://expensobypartha.netlify.app/)

---

## Features

### Dashboard

- **Financial summary cards** — Total Balance, Monthly Income, Monthly Expenses, and Savings Rate, each with a 7-day sparkline and a month-over-month percentage change.
- **Monthly budget overview** — Progress bars per category coloured green (< 60 %), amber (60–80 %), or rose (≥ 80 %). Inline edit or delete any budget limit without leaving the page.
- **Recent transactions** — A filtered list of this month's activity with one-click delete and CSV / PDF export.
- **Expense chart** — A compact pie / area / bar chart embedded directly in the dashboard for an at-a-glance breakdown.

### Transaction Management

- **Add transactions** — Amount, type (Income / Expense), category, description, date, and optional recurring schedule (weekly / monthly / yearly).
- **Edit & delete** — Tap any transaction to edit it inline or delete it with a confirmation dialog.
- **Global search** — Full-text search across description and category from any page.
- **Advanced filters** — Filter by date, category, description keyword, amount, and type simultaneously. The filter panel sits outside the card so it is never clipped by overflow.
- **CSV export** — Download the current filtered view as a `.csv` file via react-csv.
- **PDF export** — One-click PDF with a dark header, a formatted transaction table (correct column widths, Indian Rupee formatting), and a net income / expenses / balance summary footer. Generates per-page footers automatically via jsPDF-AutoTable.

### Monthly Budget Limits

- Set a spending limit (₹) for any of the 8 default categories.
- Animated progress bars update in real time as you add expenses.
- Toast warnings fire **only on threshold crossing** — a `warning` toast when a category crosses 80 %, and an `error` toast when it exceeds 100 % — never on every transaction.
- Inline editing: click the amount text to edit the limit; press Enter or click ✓ to save.
- Trash icon removes a budget; an "Add budget" form lets you set limits for unbudgeted categories.

### Analytics (Charts Page)

- **Three chart types** switchable via pill tabs:
  - **Pie chart** — Category-wise expense share with a donut centre showing the total.
  - **Area chart** — Stacked area trend per category over time, with an average reference line.
  - **Bar chart** — Side-by-side Income vs Expenses by month.
- **Time range selector** — 1 M, 3 M, 6 M, or 1 Y.
- **Category chips** — Toggle individual categories on/off to isolate specific spending.
- CSV and PDF export directly from the charts header.

### Reports Page

- Comprehensive PDF report containing:
  - Header band with report title and date range.
  - Summary band — total income, total expenses, net savings, and savings rate.
  - **Top spending categories** table with amount and share %.
  - **Budget vs Actual** table — limit, spent, remaining, and colour-coded status.
  - **Full transaction list** — date, description, category, amount, and type.
- All amounts use Indian number formatting (`Rs.1,20,000`) — compatible with all PDF viewers without font-embedding issues.

### CSV / Excel Import

- **Drag-and-drop or click-to-browse** file picker accepting `.csv`, `.xlsx`, and `.xls`.
- **Flexible column mapping** — headers matched case-insensitively. Recognised names include `date`, `description` / `desc` / `memo` / `narration`, `category`, `amount` / `amt`, `type` / `transaction type`.
- **Auto date detection** — supports `DD/MM/YYYY` (Indian default), `YYYY-MM-DD`, `DD-MM-YYYY`, and natural language formats (`10 Jun 2026`).
- **Preview table** before committing — valid rows show green ✓, invalid rows show ⚠️ with a hover tooltip explaining the error. The summary bar counts valid vs skipped rows.
- **Validation rules** — rows with a missing or unparseable date, or a non-numeric amount, are skipped. Unknown categories map to "Other" automatically. Maximum 500 rows per import.
- **Sample template** — one-click download of a pre-filled CSV template showing the expected format.
- SheetJS (xlsx) is lazy-loaded on first Excel upload so it does not affect initial page load time.

### Settings

- **Dark / Light theme toggle** — persisted across sessions.
- **Data export / reset** — manage your stored data from the settings page.

### Onboarding

- First-time users see a guided modal walking through the core features.
- Includes a "Load sample data" option to explore the app immediately without manual entry.

### General UX

- **Fully responsive** — optimised layouts for mobile, tablet, and desktop.
- **Dark mode** — every component supports `dark:` Tailwind variants.
- **Smooth animations** — page transitions, modal entrances/exits, and progress bar fill via Framer Motion.
- **Toast notifications** — success, warning, and error toasts via Sonner with descriptive subtitles.
- **Persistent storage** — all data (transactions, categories, budgets, theme) saved to `localStorage` via Zustand `persist` middleware. No account required.

---

## Technology Stack

| Layer | Library / Tool |
| --- | --- |
| UI Framework | React 18 + TypeScript |
| Build Tool | Vite 5 |
| State Management | Zustand 4 (with `persist` middleware) |
| Routing | React Router v6 |
| Styling | Tailwind CSS 3 |
| Animations | Framer Motion |
| Charts | Recharts |
| Date Utilities | date-fns 3 |
| PDF Export | jsPDF + jsPDF-AutoTable |
| CSV Export | react-csv |
| CSV Import | PapaParse |
| Excel Import | SheetJS (xlsx) — lazy loaded |
| Icons | Lucide React |
| Toasts | Sonner |

---

## Getting Started

```bash
# 1. Clone the repo
git clone https://github.com/your-username/expenso.git
cd expenso

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

```bash
# Build for production
npm run build

# Preview the production build
npm run preview
```

---

## Project Structure

```text
src/
├── components/
│   ├── AddTransaction.tsx     # Add / edit transaction form with budget threshold alerts
│   ├── AppTour.tsx            # Interactive guided product tour
│   ├── BudgetAlerts.tsx       # Budget warning notification logic
│   ├── BudgetOverview.tsx     # Monthly budget progress bars with inline editing
│   ├── Dashboard.tsx          # Main dashboard layout and financial summary cards
│   ├── ExpenseChart.tsx       # Pie / area / bar analytics chart
│   ├── ImportModal.tsx        # CSV & Excel bulk import with drag-and-drop preview
│   ├── OnboardingModal.tsx    # First-run onboarding walkthrough
│   ├── Sidebar.tsx            # Navigation sidebar (desktop + mobile)
│   ├── TransactionForm.tsx    # Shared transaction form fields
│   └── TransactionList.tsx    # Filterable transaction table with export
├── pages/
│   ├── ChartsPage.tsx         # Full-page analytics view
│   ├── ReportsPage.tsx        # Detailed PDF report generation
│   ├── SettingsPage.tsx       # Theme toggle and data management
│   └── TransactionsPage.tsx   # All-transactions view with import button
├── store.ts                   # Zustand store — state, actions, localStorage persistence
├── types.ts                   # Shared TypeScript types (Transaction, Category, Budget …)
├── App.tsx                    # Router setup and root layout
└── main.tsx                   # React entry point
```

---

## Routes

| Path | Page |
| --- | --- |
| `/` | Dashboard |
| `/add-transaction` | Add Transaction |
| `/transactions` | All Transactions (with Import) |
| `/charts` | Analytics |
| `/reports` | Reports & PDF Export |
| `/settings` | Settings |

---

## Default Categories

Expenso ships with 8 built-in categories: Food, Transport, Bills, Shopping, Entertainment, Health, Salary, and Other. Each has a unique colour used across charts, budget bars, and the import column mapper.

---

## Data & Privacy

All data is stored exclusively in your browser's `localStorage`. Nothing is sent to any server. Clearing site data or switching browsers will reset the app.
