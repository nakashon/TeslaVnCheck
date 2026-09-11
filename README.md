# Battery Atlas

A responsive English/Hebrew Tesla Model Y battery-configuration checker for owners and buyers. Static React + TypeScript + Vite, deployable on GitHub Pages without a backend, account, API key or telemetry.

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

The 2020-2024 Tesla VIN table incompletely specifies Berlin chemistry; E/F is not used as a Berlin chemistry or supplier rule. Historical drive decoding is limited to the inspected generation. A replaced pack cannot be identified from the original VIN. CoC information is self-reported, not authenticated. VIN validation checks format, not vehicle existence or VIN authenticity.

This tool does not diagnose faults or perform a recall lookup. Active alerts always take precedence. Source URLs and evidence types are in `src/lib/checker.ts`. Research cutoff: 2026-09-11.

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

The app does not save identifiers to storage, application URLs, analytics or its own logs. There is no application backend. GitHub Pages may collect ordinary hosting access logs. No external fonts, scripts or Tesla credentials are used.

The example VIN is synthetic and explicitly marked as fictional; it is never used as a live registry lookup.
