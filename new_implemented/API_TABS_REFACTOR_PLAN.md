# API Tabs Refactoring Plan

**Date**: March 17, 2026
**Priority**: CRITICAL — Action buttons fundamentally broken across all tabs
**Scope**: Complete CSS restructuring + table component refactor for all 4 API tabs

---

## Problem Summary

Action buttons in all API tabs (Workspaces, Services, Routes, Plugins) have a coordinate
mismatch: clicking one button executes a different action. Root cause is CSS conflicts
across 4 global stylesheets creating invisible grid cells around buttons.

---

## Root Causes Identified

### Critical (Must Fix)

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 1 | Orphaned CSS properties outside selectors | main.css L1140, L1173 | Breaks CSS parsing, subsequent rules fail |
| 2 | `.action-buttons` uses CSS Grid (200px min cells) | App.css L798 | Invisible click areas 3× wider than buttons |
| 3 | `.action-buttons` defined 4× across 4 files | App.css, modern.css, main.css | Cascade conflict, unpredictable winner |
| 4 | `.btn-sm` defined 3× with conflicting sizes | App.css, modern.css, main.css | Tiny visible buttons inside huge grid cells |
| 5 | Broken CSS makes `!important` overrides fail | main.css L1134-1175 | Fix attempts in main.css don't apply |

### Structural (Should Fix)

| # | Issue | Impact |
|---|-------|--------|
| 6 | `max-width: 150px` on ALL table cells | Constrains data + action cells equally |
| 7 | `min-width: 400px` on action column | Table overflows viewport |
| 8 | `z-index: 10` + `position: relative` on all buttons | Stacking context issues |
| 9 | Services table: 9 columns | Too wide for most screens |
| 10 | Row onClick + button onClick = event conflicts | Double-firing despite stopPropagation |
| 11 | Filter/status bar duplicated across 4 tabs | Maintenance burden, inconsistency risk |
| 12 | No responsive table strategy | Unusable on tablets/smaller screens |

---

## Detailed Analysis

### Bug #1: Broken CSS Syntax (CRITICAL)

In `src/main.css` around lines 1134-1175, there are **orphaned CSS properties floating outside any selector block**:

```css
/* Line 1134-1142 */
.btn-sm {
  padding: 0.2rem 0.4rem !important;
  font-size: 0.7rem !important;
  min-height: 24px !important;
  line-height: 1 !important;
}
  min-width: auto !important;   /* ← ORPHAN: outside any selector! */
}                                /* ← extra closing brace */

/* Line 1168-1175 */
.table td:last-child,
.table th:last-child {
  min-width: 400px !important;
  max-width: none;
}
  width: auto !important;       /* ← ORPHAN: outside any selector! */
  overflow: visible !important;  /* ← ORPHAN */
}                                /* ← extra closing brace */
```

These orphaned properties cause CSS parsing to fail unpredictably. The browser may discard subsequent rules or misapply them, breaking the entire table layout.

### Bug #2: 4 CSS Files Fighting Over `.action-buttons`

The load order is: `index.css` → `main.css` → `modern.css` → `App.css` (via App.jsx import).

Here's what each defines for `.action-buttons`:

| File | Display | Layout |
|------|---------|--------|
| App.css L798 | `display: grid` | `grid-template-columns: repeat(auto-fit, minmax(200px, 1fr))` |
| App.css L1071 | `display: flex` | `gap: 0.5rem; flex-wrap: wrap` |
| modern.css L520 | `display: flex` | `gap: 8px` |
| main.css L1112 | `display: flex !important` | `grid-template-columns: unset !important` |

**The CSS grid definition in App.css line 798 is the smoking gun.** It sets `grid-template-columns: repeat(auto-fit, minmax(200px, 1fr))`, which creates a grid where each button gets a minimum 200px cell. Since action buttons are tiny (~60px), each button's **clickable area** (the grid cell) extends far beyond the visible button. Clicking what appears to be empty space next to "Edit" actually hits the grid cell for "Delete".

The `main.css` attempts to fix this with `!important` overrides, but due to the broken syntax (Bug #1), those overrides may not apply correctly.

### Bug #3: `.btn-sm` Defined 3 Times with Conflicting Sizes

| File | Padding | Font Size |
|------|---------|-----------|
| App.css L1029 | `0.5rem 1rem` | `0.8rem` |
| modern.css L246 | `6px 12px` | `13px` |
| main.css L1134 | `0.2rem 0.4rem !important` | `0.7rem !important` |

The `main.css` version is absurdly small (3.2px × 6.4px padding), making buttons tiny targets. Combined with grid cells that are 200px wide, you get small visible buttons inside large invisible clickable areas — the exact symptom reported.

---

## Refactoring Plan

### Phase 1: Fix CSS (Immediate — Unblocks Everything)

**Goal**: Eliminate CSS conflicts causing button coordinate mismatch

#### 1.1 Fix broken CSS syntax in main.css
- Remove orphaned properties at lines ~1140 and ~1173
- Verify all selector blocks are properly closed

#### 1.2 Consolidate `.action-buttons` to ONE definition
- Remove `.action-buttons` from App.css (both the grid version at L798 and the flex version at L1071)
- Remove `.action-buttons` from modern.css (L520, L726)
- Keep ONE clean definition in main.css (without !important):
```css
.action-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: nowrap;
}
```

#### 1.3 Consolidate `.btn-sm` to ONE definition
- Remove from App.css and modern.css
- Single definition in main.css:
```css
.btn-sm {
  padding: 6px 12px;
  font-size: 13px;
  line-height: 1.4;
  white-space: nowrap;
}
```

#### 1.4 Remove ALL `!important` from table/button rules
- Every `!important` in main.css L1111-1175 exists to fight cascade conflicts
- Once sources are consolidated, `!important` is unnecessary
- Remove `pointer-events: auto !important`, `z-index: 10 !important`, `position: relative !important`

#### 1.5 Fix table cell constraints
- Remove `max-width: 150px` from all `.table td` — let content determine width
- Remove `min-width: 400px` from action column
- Use `white-space: nowrap` on action column only (not all cells)

**Validation**: After Phase 1, clicking "Edit" must trigger Edit, clicking "Delete" must trigger Delete.

---

### Phase 2: Table Component Refactor

**Goal**: Clean, maintainable table structure following React best practices

#### 2.1 Create shared `<DataTable>` component
```
src/components/shared/DataTable.jsx
src/components/shared/DataTable.css  (scoped styles, no conflicts)
```

Features:
- Column definitions as props (header, accessor, render, width)
- Action column renders buttons from an `actions` prop array
- Built-in client-side pagination
- Built-in search/filter bar
- Row selection support (onClick row = select, visual indicator)
- Responsive: horizontal scroll on narrow screens

Column definition pattern:
```jsx
const columns = [
  { header: 'Name', accessor: 'name', render: (val, row) => <SelectableCell ... /> },
  { header: 'Status', accessor: 'enabled', render: (val) => <StatusBadge enabled={val} /> },
];

const actions = [
  { label: 'Edit', variant: 'primary', onClick: (row) => handleEdit(row) },
  { label: 'Delete', variant: 'danger', onClick: (row) => handleDelete(row), confirm: true },
];

<DataTable columns={columns} data={filteredItems} actions={actions} />
```

#### 2.2 Create shared `<FilterStatusBar>` component
```
src/components/shared/FilterStatusBar.jsx
```

Consolidates the duplicated filter/status line across all 4 tabs:
```jsx
<FilterStatusBar
  filters={[
    { type: 'workspace', id: state.selectedWorkspaceId, label: workspaceName, onDeselect: ... },
    { type: 'service', id: state.selectedServiceId, label: serviceName, onDeselect: ... },
    { type: 'route', id: state.selectedRouteId, label: routeName, onDeselect: ... },
  ]}
/>
```

#### 2.3 Create shared `<StatusBadge>` component
Replaces inline `<span className="status-badge ...">` used everywhere.

---

### Phase 3: Simplify Tab Components

**Goal**: Each tab becomes a thin wrapper using shared components

#### 3.1 Services table — reduce from 9 to 6 columns
Current: Name | Provider | Protocol | Host | Port | Path | WebSocket | Status | Actions
Proposed: Name | Provider | Host:Port | Path | Status | Actions

- Merge Protocol+Host+Port into one "Endpoint" column (e.g., `https://host:443`)
- WebSocket flag can be an icon/badge on the Name column if enabled
- Reduces table width by ~40%

#### 3.2 Remove row-level onClick from table rows
- Workspaces: Remove `onClick` from `<tr>`, keep only the name link-button for selection
- Services/Routes: Already use link-button pattern — keep as-is
- This eliminates the event propagation conflicts entirely

#### 3.3 Remove inline styles from table rows
Replace:
```jsx
<tr style={{ backgroundColor: state.selectedServiceId === service.id ? '#fff3cd' : 'transparent' }}>
```
With CSS class:
```jsx
<tr className={state.selectedServiceId === service.id ? 'selected-row' : ''}>
```

#### 3.4 Clean up event handlers
Remove `e.preventDefault(); e.stopPropagation();` from action buttons.
These are only needed because of the row-level onClick conflict (fixed in 3.2).
Keep only if the button is inside a `<form>` or an anchor (it's not).

---

### Phase 4: CSS Architecture Cleanup

**Goal**: Prevent future cascade conflicts

#### 4.1 Audit all 4 CSS files for duplicate class definitions
Use a script to find classes defined in multiple files.
Move each class to exactly ONE file.

#### 4.2 Establish CSS ownership

| File | Purpose |
|------|---------|
| index.css | Reset + root variables |
| main.css | Layout, global utilities, typography |
| modern.css | Design tokens, theme variables |
| App.css | App-level layout (header, nav, sidebar) |
| DataTable.css | All table + action button styles (NEW) |

#### 4.3 Remove dead CSS
- `.btn-small` in main.css (not used — components use `.btn-sm`)
- Dashboard `.action-buttons` grid layout in App.css L798 (if not used by dashboard)
- Duplicate `.link-button` definitions

---

### Phase 5: Responsive & Accessibility

#### 5.1 Responsive table
- `overflow-x: auto` on `.table-container` (already exists)
- Remove hardcoded min/max widths
- Add responsive breakpoint: at < 768px, action buttons stack vertically

#### 5.2 Accessibility
- Add `aria-label` to action buttons (e.g., `aria-label="Edit service MyService"`)
- Add `role="status"` to filter status bar
- Ensure keyboard navigation works (Tab through buttons, Enter to activate)
- Add `aria-selected` to selected rows

---

## Implementation Order

| Priority | Phase | Effort | Impact |
|----------|-------|--------|--------|
| **P0** | Phase 1: Fix CSS | 1 session | Fixes the button click bug immediately |
| **P1** | Phase 3.2-3.4: Clean handlers | 1 session | Eliminates event propagation issues |
| **P2** | Phase 2: DataTable component | 1-2 sessions | Prevents future regressions, DRY |
| **P3** | Phase 3.1: Simplify columns | 1 session | Better UX, less overflow |
| **P4** | Phase 4: CSS architecture | 1 session | Long-term maintainability |
| **P5** | Phase 5: Responsive/A11y | 1 session | Polish |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/main.css` | Fix syntax, consolidate styles, remove !important |
| `src/App.css` | Remove duplicate .action-buttons, .btn-sm, .table definitions |
| `src/modern.css` | Remove duplicate .action-buttons, .btn-sm definitions |
| `src/components/shared/DataTable.jsx` | NEW: Shared table component |
| `src/components/shared/DataTable.css` | NEW: Scoped table styles |
| `src/components/shared/FilterStatusBar.jsx` | NEW: Shared filter bar |
| `src/components/shared/StatusBadge.jsx` | NEW: Shared status badge |
| `src/components/api/WorkspacesTab.jsx` | Use DataTable, remove tr onClick |
| `src/components/api/ServicesTab.jsx` | Use DataTable, reduce columns |
| `src/components/api/RoutesTab.jsx` | Use DataTable |
| `src/components/api/PluginsTab.jsx` | Use DataTable |

---

## Success Criteria

1. ✅ Clicking "Edit" executes Edit on ALL tabs, every time
2. ✅ Clicking "Delete" executes Delete on ALL tabs, every time
3. ✅ No `!important` in table/button CSS
4. ✅ `.action-buttons` defined in exactly ONE CSS file
5. ✅ `.btn-sm` defined in exactly ONE CSS file
6. ✅ Tables don't overflow the viewport on 1280px screens
7. ✅ Selection (workspace/service/route) updates status bar instantly
8. ✅ All existing functionality preserved (CRUD, filtering, pagination)
