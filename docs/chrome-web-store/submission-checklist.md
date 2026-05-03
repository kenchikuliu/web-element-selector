# Chrome Web Store Submission Checklist

## Package and version

- Confirm `manifest.json` version matches the intended release
- Build or choose the zip you want to distribute externally
- Make sure the latest GitHub release matches the current extension version

## Listing fields

- Use the primary extension name from `listing.md`
- Paste the recommended short description
- Paste the recommended detailed description
- Set category to `Developer Tools`
- Add homepage and support links

## Screenshots

- Upload screenshots in the order listed in `screenshots.md`
- Confirm each screenshot is readable at smaller sizes
- Remove duplicate or weak screenshots before submit

## Privacy and permissions

- Reuse the wording from `privacy.md`
- Confirm permissions shown in the store match:
  - `activeTab`
  - `scripting`
  - `storage`
- Verify there is no hidden analytics or remote collection path that would contradict the listing

## Functional sanity check

- Load the unpacked extension
- Launch Selector from the popup
- Confirm page selection works
- Confirm prompt copy still works
- Confirm settings are saved and reloaded
- Confirm restricted pages are handled gracefully

## Links and assets

- Confirm `https://kenchikuliu.github.io/web-element-selector/` loads
- Confirm latest GitHub release is public
- Confirm README screenshots and social preview are already present in the repo

## Final reviewer note

- Include a short note that the extension injects a local UI overlay only after user action and does not require a backend for core behavior
