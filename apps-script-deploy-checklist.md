# Apps Script Deploy Checklist

This project uses Google Sheets and Google Drive as the lightweight backend for
coach-managed products. The Apps Script project must be redeployed whenever
`google-apps-script/Code.gs` changes.

## Current Resources

- Spreadsheet: `골라줘상점_반응수집`
- Spreadsheet ID: `1Ic0u9wsptpIuIpbsZRNrmoPWXdVKJi9swCW0vqXdgFU`
- Apps Script project: `골라줘상점_반응수집`
- Apps Script project ID: `1IsV8oF87kP1KL3c_gdwwB3LNz3DReloZNf2V_0u76MiWHieRC9TAjCOV`
- Product image Drive folder: `골라줘상점 상품이미지`
- Product image folder ID: `1hXDvlelHOiNNMMXwr2sandLnPuHrulZL`
- Web app URL: `https://script.google.com/macros/s/AKfycbzVJ-Teaxy6yEd41Y6TT4_tVt1aUeA5vIPq-MXJynmjWgaY0AWTRqSbu2WCVK9CCxGUqQ/exec`

## Manual Deploy

`gws` can verify and mutate Google Sheets/Drive, but this machine's `gws`
install does not expose Apps Script, and `clasp` is not logged in. Use the
browser deploy path:

1. Open the Apps Script project:
   `https://script.google.com/u/0/home/projects/1IsV8oF87kP1KL3c_gdwwB3LNz3DReloZNf2V_0u76MiWHieRC9TAjCOV/edit`
2. Replace the contents of `Code.gs` with:
   `/Users/alan/GitHub/gollajwo-store/google-apps-script/Code.gs`
3. Confirm `PRODUCT_IMAGE_FOLDER_ID` is:
   `1hXDvlelHOiNNMMXwr2sandLnPuHrulZL`
4. Save the script.
5. Open `Deploy` > `New deployment` or `Manage deployments`.
6. Select or edit a `Web app` deployment.
7. Select `New version` when editing an existing deployment.
8. Keep execution as `Me`.
9. Keep access as `Anyone` for the current test setup.
10. Deploy and approve any Sheets/Drive permissions.
11. Put the resulting web app URL in `config.js`.

If image upload reports a Drive permission error, select
`authorizeProductImageFolder` in the Apps Script function dropdown, run it once,
click the permission link in the execution log, and approve Drive access.

## Verification

Run these after deployment:

```bash
GWS=/Users/alan/.nvm/versions/node/v24.11.0/lib/node_modules/@googleworkspace/cli/node_modules/.bin_real/gws

curl -L 'https://script.google.com/macros/s/AKfycbzVJ-Teaxy6yEd41Y6TT4_tVt1aUeA5vIPq-MXJynmjWgaY0AWTRqSbu2WCVK9CCxGUqQ/exec?action=manageProducts'

$GWS sheets spreadsheets values get \
  --params '{"spreadsheetId":"1Ic0u9wsptpIuIpbsZRNrmoPWXdVKJi9swCW0vqXdgFU","range":"Products!A1:P8"}'

$GWS drive files list \
  --params '{"q":"'\''1hXDvlelHOiNNMMXwr2sandLnPuHrulZL'\'' in parents and trashed = false","fields":"files(id,name,mimeType,webViewLink)","pageSize":10}'
```

Expected signs:

- `action=manageProducts` returns `{ "ok": true, "products": [...] }`.
- `coach.html` no longer shows "상품 저장 API가 아직 배포되지 않았어요."
- Saving a product from `coach.html` updates the matching `Products` row.
- Uploading a new product image creates a file in the product image Drive folder.
- `index.html` shows at most three active products from the sheet.
