---
name: bi-dashboard-builder
description: "End-to-end development, automation, and high-fidelity prototyping of Business Intelligence (BI) dashboards. Use for: standardizing operational and financial metrics, building repeatable Python data cleaning pipelines, and developing executive-ready React/Tailwind interactive BI mockups."
---

# BI Dashboard Builder

This skill provides a standardized, end-to-end workflow for translating raw business data (such as fragmented Excel sheets) into high-fidelity, interactive, and decision-ready Business Intelligence (BI) dashboards. It ensures consistent metric definitions, robust data engineering, and professional visual hierarchy designed for executive-level (C-suite) stakeholders.

## Core Capabilities

1. **Metric & KPI Standardization**: Defining clear, consistent financial and operational metrics with mathematically precise formulas.
2. **Automated Data Pipelines**: Consolidating fragmented spreadsheets using Python (Pandas) into structured, repeatable data schemas.
3. **High-Fidelity Interactive Mockups**: Designing professional React/Tailwind/Lucide dashboard interfaces that simulate real-world interactive BI systems (filters, tabs, drill-downs).

---

## Workflow Decision Tree

Before writing any code, evaluate the business scenario to determine the execution path:

```
                  [Identify User Goal]
                           |
         +-----------------+-----------------+
         |                                   |
[Raw Spreadsheet Data?]             [UI Dashboard Mockup?]
         |                                   |
  (Follow Pipeline)                    (Follow Prototyping)
         |                                   |
         v                                   v
1. Metrics Dictionary                1. Define Layout & Theme
2. Python Pandas Pipeline            2. Build Layout Grid & Cards
3. Export JSON Schema                3. Implement Interactivity
```

---

## Phase 1: Metric & KPI Standardization

Never build a visualization without a standardized metrics dictionary. You must first create a clear table defining each metric, its formula, its business significance, and its data source.

### Standard Metrics Dictionary (Hospitality Example)

| Metric Category | Metric Name | Mathematical Formula | Business Significance |
| :--- | :--- | :--- | :--- |
| **Operational** | **Occupancy Rate** | `Rooms Sold / Rooms Available` | Measures capacity utilization. |
| **Operational** | **ADR (Average Daily Rate)** | `Room Revenue / Rooms Sold` | Measures pricing power and average spend per room. |
| **Operational** | **RevPAR (Revenue Per Available Room)** | `Room Revenue / Rooms Available` or `ADR * Occupancy` | The ultimate measure of rooms-department performance. |
| **Financial** | **Operating Margin** | `Operating Profit / Gross Revenue` | Measures operational cost efficiency. |
| **Financial** | **Budget Variance** | `(Actual - Budget) / Budget` | Measures planning accuracy and budget discipline. |

---

## Phase 2: Automated Python Data Pipelines

Raw spreadsheets are usually messy and fragmented. You must build a repeatable Python (Pandas) script to clean, consolidate, and export the structured data as a JSON file to power the frontend dashboard.

### Core Pipeline Workflow

1. **Load Raw Files**: Read multiple Excel sheets or CSVs.
2. **Data Cleaning**: Handle missing values, parse date columns, and enforce correct data types.
3. **Consolidation**: Group, aggregate, and merge data into a single master dataframe.
4. **Export**: Output to a structured JSON file matching the frontend's schema.

> **Note**: For complete data pipeline code templates and execution examples, see [references/pipeline_templates.md](references/pipeline_templates.md).

---

## Phase 3: High-Fidelity Interactive React Prototyping

To build a dashboard that feels "hand-crafted" and professional, avoid generic templates and Inter-only designs. Apply high-end aesthetic rules to represent a true production-level application.

### 1. Typography & Hierarchy
- Use a bold serif font (e.g., `font-serif`) for page titles and large numbers (metrics) to establish a premium feel.
- Use a clean sans-serif font (e.g., `font-sans`) for data labels, descriptions, and filters to ensure maximum readability.

### 2. Depth, Borders & Contrast
- Use subtle shadows (`shadow-sm`) and soft borders (`border-border/40`) to define cards.
- Always pair background semantic classes with their corresponding foreground classes (e.g., `bg-card text-card-foreground`).
- For positive metrics, use soft greens (e.g., `bg-emerald-500/10 text-emerald-600`); for negative or below-target metrics, use soft ambers/reds (e.g., `bg-amber-500/10 text-amber-600`).

### 3. Layout Structure
- **Header Section**: Contains title, description, time filter, and global status indicators.
- **KPI Summary Grid**: 3-4 cards displaying high-level metrics with absolute values, budget targets, and variance indicators.
- **Main Analysis Area**: Multi-tab layout (e.g., Overview, Performance Ranking, Strategic Roadmap) to organize deep-dive analytics.
- **Sidebar or Control Panel**: Sticky filtering controls (by property, region, or date range).

> **Note**: For copyable React dashboard layout code and UI component templates, see [templates/dashboard_scaffold.tsx](templates/dashboard_scaffold.tsx).

---

## References & Bundled Resources

To minimize context bloat, specific implementation files are separated into the following resources. Refer to them as needed:

- **Data Pipeline Templates**: [references/pipeline_templates.md](references/pipeline_templates.md) - Contains full Python (Pandas) code to clean and merge Excel sheets into JSON.
- **React Prototyping Scaffold**: [templates/dashboard_scaffold.tsx](templates/dashboard_scaffold.tsx) - A copyable, production-ready React component file with responsive layout, tabs, filtering, and Lucide icons.
- **Metrics Catalog Reference**: [references/metrics_catalog.md](references/metrics_catalog.md) - Comprehensive metric calculation guidelines across multiple industries (SaaS, E-commerce, Retail, Hospitality).
