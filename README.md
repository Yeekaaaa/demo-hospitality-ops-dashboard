

````md
# Demo Hospitality Operations Management Platform

## Live Demo

Online demo: https://demo-hospitality-ops-dashboard.vercel.app

A multi-store hospitality operations management dashboard for hotels and restaurants, built as a demo / portfolio project.

All company names, store names, staff names, and sample financial figures in this repository are fictional. They are used only to demonstrate UI design, data structure, and business logic. They do not represent any real operating entity.

---

## Project Overview

This project is positioned as an internal business intelligence dashboard prototype for hospitality operations. It demonstrates capabilities such as KPI monitoring, trend analysis, budget comparison, operating data import, and smart chart recommendation.

### Key Positioning

- Internal management dashboard prototype for hotel and restaurant operations
- Portfolio demo for business analytics, data product design, and operational reporting
- Supports both local demo data and optional Supabase-backed data
- Designed for multi-store, monthly operating performance analysis

---

## Data Mode

When Supabase is not configured, the system runs with local demo data.

When Supabase is configured, the system can display actual operating data and budget data from the database. If no database data is available, or if the database is unavailable, the system falls back to demo data and displays a data source banner.

### Data Source Logic

- No Supabase configuration: demo data mode
- Supabase configured with available data: database mode
- Supabase configured but no available data: fallback to demo data
- Pages display a banner indicating whether the current data comes from real database records or demo fallback data

---

## Language

The default language is Chinese Simplified (`zh-CN`).

Some interface areas can be switched to English from the top navigation bar.

For public GitHub / Vercel portfolio demos, the default language can be set through the following environment variable:

```env
NEXT_PUBLIC_DEFAULT_LOCALE=en-US
````

This takes effect on first visit or when no local language preference has been stored.

### Current English Coverage

The current English translation covers:

* Sidebar navigation
* Login page
* Data source banner
* Smart chart recommendation interface
* Selected layout and navigation text

Complex business pages such as Dashboard, Hotel Operations, Financial Reports, and Budget Management still mainly use Chinese business terminology.

---

## Amount Unit Logic

The system uses RMB yuan as the base unit for database storage and KPI aggregation.

Large financial figures on pages such as Dashboard and Financial Reports are displayed in ten-thousand yuan units through formatting helpers such as `formatWan`.

In short:

* Storage unit: yuan
* Calculation unit: yuan
* Display unit for large figures: ten-thousand yuan
* Display conversion only happens at the presentation layer

---

## Tech Stack

* Next.js 15, App Router
* React 19
* TypeScript
* Tailwind CSS
* Radix UI / shadcn-style components
* Recharts
* Supabase, optional browser-side anon key integration

---

## Local Development

Install dependencies:

```bash
npm install
```

Create local environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local`.

Supabase variables can be left empty if you only want to run the project with demo data.

Start the development server:

```bash
npm run dev
```

Open the browser:

```bash
http://localhost:3000
```

The default entry page is `/login`. After login, the system enters `/dashboard`.

---

## Production Build

Build the project:

```bash
npm run build
```

Start production server:

```bash
npm run start
```

---

## Environment Variables

Copy `.env.example` to `.env.local`.

Do not commit `.env.local` to Git.

| Variable                        | Description                                                                                                                                                                |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Optional. Supabase project URL. Can be left empty for demo mode.                                                                                                           |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional. Supabase anon public key. Do not use a service role key.                                                                                                         |
| `NEXT_PUBLIC_DEMO_MODE`         | Optional reserved variable. Public demo deployments are recommended to keep this as `1`. Current behavior mainly depends on Supabase availability and demo fallback logic. |
| `NEXT_PUBLIC_DEMO_USER_NAME`    | Optional reserved variable. Demo user display name. If not wired, the interface uses the built-in demo user name.                                                          |
| `NEXT_PUBLIC_DEFAULT_LOCALE`    | Optional. Supports `zh-CN` or `en-US`. Defaults to `zh-CN` when unset or invalid. For public Vercel portfolio demos, `en-US` is recommended.                               |

---

## Language Configuration

For Chinese business deployment:

```env
NEXT_PUBLIC_DEFAULT_LOCALE=zh-CN
```

Or leave it unset.

For public English portfolio demo:

```env
NEXT_PUBLIC_DEFAULT_LOCALE=en-US
```

After changing the environment variable in Vercel, redeploy the project.

### Locale Priority

The project uses the following language priority logic:

1. If `fengtin-locale-default-snapshot` does not match the current `NEXT_PUBLIC_DEFAULT_LOCALE`, use the environment default and refresh the snapshot.
2. If the snapshot matches the current environment default, use the user’s previous manual selection stored in `localStorage['fengtin-locale']`.
3. If no environment value is provided, fall back to `zh-CN`.

This prevents old browser cache from overriding the intended default language after deployment changes.

---

## Main Features

The current demo includes:

* Executive Dashboard
* Hotel Operations
* Restaurant Operations
* Financial Reports
* Budget Management
* Operating Data Template Import
* Monthly actual operating data management
* Budget data management
* Data source banner
* Demo data fallback
* Smart Chart recommendation
* High-fidelity static placeholder pages for future extension

---

## Business Data Structure

### Actual Data and Budget Data

Actual operating data and budget data are separated.

* Actual data: `actual_data`
* Budget data: `budget_data`

Operating data is imported by monthly accounting period.

### Accounting Period

The import template follows a monthly period format:

```text
month + YYYY-MM
```

The system only records monthly operating periods. It does not require annual summary rows.

### Store Master Data

Demo store master data is defined in:

```text
lib/store-master.ts
```

It uses fictional stores, including:

* Demo Hotel A
* Demo Hotel B
* Demo Hotel C
* Demo Restaurant
* Demo City

### Store Opening Periods

Store opening periods are defined in:

```text
lib/store-opening-periods.ts
```

The file uses mock IDs and display-name mapping.

Do not commit real store UUIDs or real production identifiers to the public repository.

---

## Data Caliber Summary

The key data caliber rules are:

* Amounts are stored and aggregated in yuan.
* Large financial values are displayed in ten-thousand yuan at the presentation layer.
* Monthly operating data is imported by accounting period.
* Actual data and budget data are managed separately.
* Store trend analysis should start from each store’s opening period.
* Public repositories must not contain real store names, real financial data, or production database UUIDs.
* Historical internal database keys such as `huazhu_management_fee` may remain in schema definitions, but the interface and templates display the business-facing term “Brand Management Fee”.

For more detailed rules, see:

```text
docs/data-caliber-freeze.md
```

---

## Validation and Check Scripts

Run production build:

```bash
npm run build
```

Run lint check:

```bash
npm run lint
```

Run acceptance check:

```bash
npx tsx scripts/acceptance-check.ts
```

Run i18n dictionary check:

```bash
npx tsx scripts/i18n-dictionary-check.ts
```

Run Smart Chart recommendation check:

```bash
npx tsx scripts/smart-chart-recommend-check.ts
```

Run Smart Chart renderer check:

```bash
npx tsx scripts/smart-chart-renderer-check.ts
```

---

## Security Notes for Public Repository

Do not commit:

* `.env.local`
* Real Supabase URL
* Real Supabase anon key
* Supabase service role key
* Real store names
* Real staff names
* Real financial data
* Production database UUIDs

The following directories are intended for local agent or development workflows and are not part of the business release scope:

```text
.agents/
.cursor/
```

The SQL and migration files only contain schema definitions. They do not contain real seed data.

```text
sql/
supabase/migrations/
```

---

## Repository Structure

```text
app/                 # Pages and routes, including login and dashboard pages
components/          # UI components, layout, charts, and data source banner
lib/                 # Business rules, mock data, i18n, Smart Chart logic, and store master data
contexts/            # Store period context and Supabase data contexts
scripts/             # Validation and rule-checking scripts
supabase/migrations/ # Optional schema migrations for self-hosted Supabase setup
```

---

## License and Usage

This project is intended for technical demonstration, learning, and portfolio use.

If you fork or present this project publicly, please keep all names and data fictional. Do not replace demo content with real client or business information in a public repository.

```
```
