# Test Fixes for Tabler Migration

## Summary
Fixed all test files to work with the Tabler CSS migration. All 40 tests now pass across 5 test files.

## Changes Made

### 1. `src/test/helpers.js` - Mock Response Fix
- Added `statusText` and `headers` (with proper `Headers` object and `content-type: application/json`) to `createMockResponse`
- **Root cause**: The API client's `fetchRequest` method calls `response.headers.get('content-type')` and `Object.fromEntries(response.headers.entries())` which threw errors on the incomplete mock, triggering the retry logic with exponential backoff (2s, 4s, 8s delays)

### 2. `src/components/__tests__/APIView.test.jsx`
- Changed tab selectors from `getByRole('button', { name: /🏢.*Workspaces/ })` to `getByRole('link', { name: /Workspaces/ })` — tabs are now `<a>` elements, not `<button>` with emoji prefixes
- Changed stats queries from `.parentElement.querySelector('.api-stats')` to `.closest('.page-header')` — stats are now in the page header, not a separate `.api-stats` div
- Split stat text assertions (e.g., `'1 Workspaces'` → separate `'1'` and `'Workspaces'` checks) since counts are in `<strong>` elements
- Switched from sequential `mockResolvedValueOnce` to URL-based `mockImplementation` for the statistics test to handle variable API call ordering
- Added API singleton cache clearing in `beforeEach`

### 3. `src/components/__tests__/Dashboard.test.jsx`
- Added URL-based `setupFetchMock` helper to handle variable API call ordering
- Replaced all sequential `mockResolvedValueOnce` chains with `setupFetchMock` calls
- Updated card selectors from `.dashboard-card` + `cursor: pointer` style check to `.card` + `toBeInTheDocument()`
- Fixed error handling test to use 400 status (skips retry) instead of `mockRejectedValue` (triggers exponential backoff)
- Added API singleton cache clearing in `beforeEach`

### 4. `src/components/__tests__/DashboardView.test.jsx`
- Same URL-based `setupFetchMock` helper approach
- Fixed `waitFor` text matchers to wait for actual content (e.g., `'Workspaces'`) instead of `/dashboard/i` which matched the loading spinner text
- Updated card selectors from `.dashboard-card` to `.card`
- Fixed error handling and empty state tests
- Added API singleton cache clearing in `beforeEach`

## Root Causes of Pre-existing Failures
1. **Missing mock response properties**: `createMockResponse` didn't include `statusText` or `headers`, causing the API client to throw in `fetchRequest`, triggering retry loops
2. **Sequential mock ordering**: `mockResolvedValueOnce` chains broke when API call order changed (e.g., adding ABAC policy loading)
3. **API singleton caching**: The shared API singleton's `requestCache` and `responseCacheMap` persisted between tests, causing stale results
4. **Retry mechanism**: `mockRejectedValue` triggered the API client's exponential backoff (MAX_RETRIES=3, delays of 2s/4s/8s), causing test timeouts

## Test Results
```
Test Files  5 passed (5)
Tests       40 passed (40)
Build       ✓ built in 5.87s
```
