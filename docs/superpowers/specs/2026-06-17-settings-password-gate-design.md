# Settings Password Gate Design

## Goal

Require a password before rendering any `/settings/*` page, whether navigation starts from the Sidebar or a direct URL. Successful verification is remembered across browser restarts.

This is a convenience gate, not secure authentication. The password source is a public static Markdown file and can be inspected by a browser user.

## Architecture

Add `SettingsPasswordGate` at the shared settings route boundary. It owns the locked, loading, load-error, and authorized states. Existing settings navigation and sub-pages remain unchanged and render only after authorization.

The gate loads `public/settings-access.md` at runtime using the configured Vite base path. The file contains one `password:` field and is the only source containing the password value. TypeScript, TSX, locale, and specification files do not contain that value.

## Interaction

When no authorization marker exists, show a password form instead of settings content. A wrong password produces an inline error. A missing, unreachable, or malformed Markdown file keeps the route locked and provides a retry action.

On success, write `data-agent.settings-access` to `localStorage` and render the requested settings URL in place. Future visits, refreshes, and browser restarts bypass the form while the marker remains.

## Accessibility

Use a labeled `type="password"` input, native form submission for Enter support, disabled submission while loading, and an `aria-live` region for errors.

## Verification

The repository has no automated test framework and explicitly forbids inventing a test script without prior agreement. Verify with `npm run typecheck`, `npm run lint`, and `npm run build`, then exercise wrong password, correct password, direct child-route access, refresh, browser restart, and Markdown load failure in the browser.
