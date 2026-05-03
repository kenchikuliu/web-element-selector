# Privacy and Permissions

## One-paragraph store privacy summary

`Web Element Selector runs locally in the browser. It injects a visual selector into the current page so you can choose regions and copy prompts for AI coding tools. It does not send page contents to a remote server. Any copied prompt is only placed in your clipboard or used locally in the browser unless you choose to paste it elsewhere.`

## Permissions explanation

### `activeTab`

Used to access the currently active tab only when the user clicks the extension and launches the selector.

### `scripting`

Used to inject the selector UI and styles into the current page on demand.

### `storage`

Used to remember extension-level defaults such as target AI, export mode, context mode, and default task text.

## Data handling summary

- No hosted backend is required for the extension to function
- No account login is required
- No analytics or telemetry are currently required for core usage
- Data saved by the extension stays in browser extension storage or page-local browser storage
- Clipboard actions are initiated by the user workflow

## Suggested Chrome Web Store privacy answers

### Does the extension collect personally identifiable information?

`No`

### Does the extension sell user data?

`No`

### Does the extension use data for purposes unrelated to core functionality?

`No`

### Does the extension transmit website content to a remote server by default?

`No`

## Reviewer note

`The extension injects a local UI overlay into the active page only after a user action. It is intended to help users select UI regions and copy structured prompts for local or external AI-assisted editing workflows.`
