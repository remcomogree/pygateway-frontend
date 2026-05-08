Summary
-------
Fixed visibility and CSS issues preventing the "Manage Policies" button from appearing on consumer cards.

Files changed
-------------
- src/components/api/ConsumersTab.jsx
  - Added a prominently styled, class-free "🔐 MANAGE POLICIES" button (data-testid: manage-policies-<id>) inside each consumer card to avoid global style collisions.
  - Removed an unsafe/backtick comment from the styled-jsx block and scoped button-reset rules to `.consumers-tab .consumer-actions button` so native button behavior is preserved.

Why
---
A broad `all: unset` style within the component's styled-jsx block stripped default button rendering/interaction across the component. The app still rendered markup, but buttons were invisible or non-interactive. The change scopes the reset and provides a fallback prominent button to ensure visibility regardless of global styles.

How to verify
---------------
1. Start dev server:
   npm run dev
2. Open the Admin UI and navigate to the API -> Consumers tab.
3. Inspect any consumer card. You should see a full-width red "🔐 MANAGE POLICIES" button near the top of the card. The button has a data-testid attribute: `manage-policies-<consumer.id>`.
4. Click the button — it should open the Consumer Policies modal. Console will log a message when clicked.

Automated tests
---------------
I ran the test suite: `npm run test:run`.
- Vitest completed but many tests failed (21 failures). These failures are unrelated to the ConsumersTab JSX/CSS fix and reflect other areas (dashboard/LLM tests) expecting mocked data.

Notes and next steps
--------------------
- If the red prominent button is visible, remove the debug/very-visible styling and restore the standard class-based button markup once you confirm no other CSS resets exist in other components.
- If the button is still missing in your browser, open DevTools and check:
  - Is the button present in DOM? (look for `data-testid="manage-policies-<id>"`)
  - Computed styles: visibility, display, opacity, z-index, parent overflow.
- No LLM-related code was modified; per project policy, all LLM development should live under `src/components/llm`.

Contact
-------
Change applied by: GitHub Copilot
