# Personal Planning V1.0

## V1.1 user-authorized upgrade — 2026-10-18

User now requests phone-export → desktop-import, superseding the original no-import constraint. Scope: validated JSON v1 restore, explicit whole-dataset replacement preview/confirmation, single local pre-import raw backup with download, retain task IDs/order/dates/completion including history. No merge or cloud sync. Reject malformed/future-version/duplicate-ID files and files over 10 MB; cancel means no writes; fail backup/save safely; detect stale preview. Keep storage schema/key unchanged for existing users. Bump service-worker cache to v1.1.0, let old tabs close before activation.

- [x] Add failing import tests, implement store parsing/replacement/backup.
- [x] Add accessible import preview/confirmation/status and backup download in settings.
- [x] Test isolated phone export and desktop restore, cancellation, invalid files, repeated import, persistence and stale preview.
- [x] Run existing regressions and build, inspect mobile screenshot.
- [ ] Publish to existing GitHub Pages and verify served upgrade.

Source: user request, plus readable user confirmations from conversation 6ad32223-00dc-83ec-a986-3ffbbaf72468. Final PRD assistant content was unavailable (reference placeholder); no invented earlier requirements.

Architecture: dependency-free static HTML/CSS/ES modules, pure task rules in model.js, localStorage repository in store.js, DOM UI in app.js. Service worker caches only app assets. No backend or external requests.

Execution: direct implementation requested by user; inline execution.

- [x] Test task identity, permissions, order, delete/undo, calendar and persistence failure before implementation.
- [x] Implement local repository and rules; verify complete suite.
- [x] Implement responsive calendar, date detail, modal, touch sorting and export.
- [x] Add install assets, offline cache, static build and preview server.
- [x] Verify mobile browser interactions, offline reload, build, document setup and limitations.

Independent review: corrected adjacent-delete undo ordering with red/green regression test; corrected touch drag detection for zero movementY with browser reproduction and retest. Final suite 12/12; browser acceptance and build passed.

Follow-up complete: user authorized GitHub deployment; source uploaded to 3521339406-beep/dukinxxx, GitHub Actions Pages source enabled, HTTPS page verified at https://3521339406-beep.github.io/dukinxxx/ .

Confirmed: Monday start; current month/today on launch; blank home contains calendar only; dates have progress; same names allowed; incomplete drag order; completed bottom; uncheck appends to incomplete; 5-second undo; past read-only; today/future editable and completable; name-only tasks; immediate local saves; manual full JSON export without import; no recurrence, categories, accounts or sync.

Implementation decisions: local device timezone defines today; task names trimmed and required (no arbitrary short character limit); array order persists; completion appends within completed section; rename via name button; undo restores position, available independently for each recent deletion but stops when date becomes past. Corrupt/unsupported data is preserved and app blocks writes with raw export available. Storage failures do not claim success. Multiple tabs read latest stored state before mutation and refresh on storage events (simultaneous race between tabs remains a localStorage limitation).

Acceptance: test real rules and failed-save rollback; inspect 390px and desktop layout; exercise modal, duplicate task, completion, rename, sorting, deletion, export, refresh and offline app shell. iOS installation requires separate physical-device verification. No hosted HTTPS URL unless deployment actually happens.
