# TestMaTesla

A Hebrew, RTL Tesla vehicle-information site for Israeli owners and buyers. The current focus is the reported BYD structural battery configuration in Model Y, with an independent Israeli recall lookup and privacy-preserving shareable reports. Static React + TypeScript + Vite on GitHub Pages, without a backend, account, API key or telemetry.

## Development

Node.js 24.13+ and npm:

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

Development uses http://127.0.0.1:5173. Preview serves the production build on port 4173.

## GitHub Pages

The workflow in `.github/workflows/deploy.yml` builds, tests, and deploys on pushes to `main`. Select **GitHub Actions** as the repository's Pages source. Relative asset URLs support both repository subpaths and custom domains.

The government CKAN endpoint supports cross-origin browser requests (`Access-Control-Allow-Origin: *`, observed 2026-09-11). No server-side proxy is needed. A CORS or network failure is displayed as a failed lookup, never fictional data.

## Result semantics

The target reported profile is **Berlin-built Model Y RWD, manufactured in 2023-2024**, associated with BYD structural LFP original configurations. Matching this profile does not establish the supplier, a defective batch, or the condition of an individual car.

- `candidate`: known VIN characteristics match the reported profile.
- `outside`: at least one known characteristic differs; not a safety clearance.
- `document-supported`: the profile and owner-entered exact `Y7CR` CoC variant agree.
- `conflicting`: VIN identifiers or the entered Y7CR variant conflict.
- `unknown`: insufficient/unsupported information; other variants are not automatically CATL.

`probability` is intentionally `null`. There is no representative battery-labeled dataset to calibrate P(target configuration | identifiers). Do not convert characteristic counts or complaint-group percentages into a chance of having a particular battery. A real probability model needs representative labeled records, deduplication, current-pack identity, and held-out calibration.

The visible metric is a count: **4 of 4 profile characteristics match**, with separate different and unknown counts. Red means a matching reported profile, green means outside that profile, and amber means incomplete/conflicting identification. These colors do not diagnose battery health. The default search is an Israeli plate, with VIN as an alternative.

The 2020-2024 Tesla VIN table incompletely specifies Berlin chemistry; E/F is not used as a Berlin chemistry or supplier rule. Historical drive decoding is limited to the inspected generation. A replaced pack cannot be identified from the original VIN. CoC information is self-reported, not authenticated. VIN validation checks format, not vehicle existence or VIN authenticity.

This tool does not diagnose faults. Active alerts always take precedence. Source URLs and evidence types are in `src/lib/checker.ts`. Research cutoff: 2026-09-11.

## Israeli recalls

Plate-based recall lookup runs independently after vehicle identification; an outage must not remove the battery result. VIN-only checks do not claim to have checked recalls. Empty results mean only no open records found in the queried Israeli dataset, not that the vehicle has no faults or campaigns elsewhere. Failed, incomplete and successful-empty queries have distinct UI states.

The CarAgent recall resource is `36bf1404-0be4-49d2-82dc-2f1ead4a8b93`, queried using the uppercase plate key. `src/lib/recalls.ts` owns schema validation, pagination, deduplication and source attribution.

## Shareable reports

Users can generate a Hebrew PNG with a QR code, download it, copy a report link or invoke the device's share sheet. The recipient sees a snapshot and a call to check their own car.

- The report carries only the first 11 VIN characters (shared vehicle characteristics), never the six-digit serial number, full VIN or license plate.
- It includes owner-entered CoC/replacement answers, creation time and an optional recall-count snapshot with its query time.
- Report data is encoded in the URL fragment. The fragment is not sent in the HTTP request to GitHub Pages.
- The receiver recomputes the configuration match from the shared prefix. Owner claims and recall summaries remain **user-shared and unverified**, not live or digitally signed results.
- The image and landing page explicitly describe a vehicle-identification summary, not a roadworthiness certificate or Tesla authentication.
- QR generation and image rendering are local; no image-hosting or QR API receives vehicle data.
- Synthetic examples cannot generate a shareable vehicle report.

The custom domain `testmatesla.com` has not been activated by this code. GitHub Pages remains the deployment target until domain registration, DNS and ownership verification are complete.

## CarAgent integration

`src/lib/govil.ts` reuses CarAgent's public CKAN endpoint, active-resource ID and `mispar_rechev` -> `misgeret` mapping. It is standalone and does not depend on the CarAgent repository.

- Endpoint: `https://data.gov.il/api/3/action/datastore_search`
- Resource: `053cea08-09bc-40ec-8f7a-156f0677aff3`
- Active-vehicle coverage only; inactive or newly registered vehicles may not resolve.
- Only necessary identification/model fields are requested, not ownership history.
- Missing VINs, unmatched plates, upstream outages, timeouts and malformed records are distinct failures.
- Israeli model codes and registration directives are context, not verified supplier mappings.

## Privacy

VIN checks happen locally in the browser. Plate requests go directly to data.gov.il: that government service receives the plate and the visitor's IP, under its own privacy practices. Requests omit credentials and referrers and disable browser caching.

The app does not save full identifiers to storage, application URLs, analytics or its own logs. Users can explicitly share the non-serial VIN prefix and summary described above. There is no application backend. GitHub Pages may collect ordinary hosting access logs. No external fonts, scripts or Tesla credentials are used.

The example VIN is synthetic and explicitly marked as fictional; it is never used as a live registry lookup.
