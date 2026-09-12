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

- `candidate`: known VIN/registration characteristics match the reported profile.
- `outside`: at least one known characteristic differs; not a safety clearance.
- `document-supported`: the profile and owner-entered exact `Y7CR` CoC variant agree.
- `conflicting`: VIN identifiers, registration evidence or the entered Y7CR variant conflict.
- `unknown`: insufficient/unsupported information; other variants are not automatically CATL.

Plate checks also use the registry's production year and explicit RWD/AWD trim.
The registry year, VIN year and first-registration date are displayed separately.
Conflicting registry/VIN years or drive types produce an amber conflict result;
the disputed characteristic remains unknown in the count. VIN-only 2025+ years
are unresolved rather than automatically outside: 2024 is the end of the main
research window, not a proven supplier or defective-batch cutoff. Generic
`LONG RANGE` trim is not interpreted as AWD across generations.

`probability` is intentionally `null`. There is no representative battery-labeled dataset to calibrate P(target configuration | identifiers). Do not convert characteristic counts or complaint-group percentages into a chance of having a particular battery. A real probability model needs representative labeled records, deduplication, current-pack identity, and held-out calibration.

The visible metric is a count: **4 of 4 profile characteristics match**, with separate different and unknown counts. Red means a matching reported profile, green means outside that profile, and amber means incomplete/conflicting identification. These colors do not diagnose battery health. The default search is an Israeli plate, with VIN as an alternative.

The 2020-2024 Tesla VIN table incompletely specifies Berlin chemistry; E/F is not used as a Berlin chemistry or supplier rule. Historical drive decoding is limited to the inspected generation. A replaced pack cannot be identified from the original VIN. CoC information is self-reported, not authenticated. VIN validation checks format, not vehicle existence or VIN authenticity.

The optional CoC refinement includes Hebrew document-finding instructions and a
copyable request for Tesla/the importer. Tesla's UK support page explicitly
directs owners to contact Tesla for a CoC; Israeli availability, delivery method
and fees are not established. Account documents are a place to check, not a
promised CoC download. The site neither retrieves nor sends document requests and
never asks for Tesla credentials. Users can leave the field unknown; only an
explicit Variant `Y7CR` should select that option. Tesla's component-level EU
declarations are not the vehicle-specific CoC.

This tool does not diagnose faults. Active alerts always take precedence. Source URLs and evidence types are in `src/lib/checker.ts`. Research cutoff: 2026-09-12.

## Israeli recalls

Plate-based recall lookup runs independently after vehicle identification; an outage must not remove the battery result. VIN-only checks do not claim to have checked recalls. Empty results mean only no open records found in the queried Israeli dataset, not that the vehicle has no faults or campaigns elsewhere. Failed, incomplete and successful-empty queries have distinct UI states.

The CarAgent recall resource is `36bf1404-0be4-49d2-82dc-2f1ead4a8b93`, queried using the uppercase plate key. `src/lib/recalls.ts` owns schema validation, pagination, deduplication and source attribution.

## Shareable reports

Users can generate a Hebrew PNG with a QR code, download it, copy a report link or invoke the device's share sheet. The recipient sees a snapshot and a call to check their own car.

- The report carries only the first 11 VIN characters (shared vehicle characteristics), never the six-digit serial number, full VIN or license plate.
- It includes owner-entered CoC/replacement answers, creation time and an optional recall-count snapshot with its query time.
- Version 2 reports also carry the non-identifying registration year/drive evidence, when available, so shared pages and PNGs preserve conflicts. Version 1 links remain readable; older clients reject version 2 instead of silently discarding evidence. Shared registration facts remain unverified user snapshots, not live registry results.
- Report data is encoded in the URL fragment. The fragment is not sent in the HTTP request to GitHub Pages.
- The receiver recomputes the configuration match from the shared prefix. Owner claims and recall summaries remain **user-shared and unverified**, not live or digitally signed results.
- The image and landing page explicitly describe a vehicle-identification summary, not a roadworthiness certificate or Tesla authentication.
- QR generation and image rendering are local; no image-hosting or QR API receives vehicle data.
- Synthetic examples cannot generate a shareable vehicle report.

The custom domain `testmatesla.com` has not been activated by this code. GitHub Pages remains the deployment target until domain registration, DNS and ownership verification are complete.

## Ownership and mileage

Plate results also query the two official [private-vehicle history resources](https://data.gov.il/dataset/273c5e33-25ab-4980-8522-a2f7ba0bb62d), independently of recalls and of one another:

- Ownership: `bb2355dc-9ec7-4f06-9c3f-3344672171da`. Display every returned ownership-type/date row in month order. Preserve same-month/type rows with different source IDs; do not turn the row count into an authoritative previous-owner or "hand" count. No owner identities are published by this feed.
- Mileage: `56063a99-8a3e-4ff4-912e-5966c0279bad`. This is **only the latest inspection's cumulative odometer reading**, not annual historical mileage. It has no inspection-date field. The separate active registry's inspection date is labeled separately and is not used to invent a dated mileage series.
- Display source-provided original registration/type and registration-change flags; these are not accident-history findings.
- Empty records, null mileage, a genuine zero reading, outages and partial ownership results are distinct states. Pagination is bounded at 1,000 rows with an explicit partial-result notice.
- Each source has its own cancellation/retry lifecycle and freshness display. Changing vehicles clears and cancels old history; a failed source does not erase other results.
- Government coverage is active private vehicles from 2017 onward. Ownership data excludes vehicles that previously had another registration number.
- History is displayed locally and is **not included in the existing shareable report**. Annual inspection archives would require an additional verified source; no historical points are estimated or persisted here.

## CarAgent integration

`src/lib/govil.ts` reuses CarAgent's public CKAN endpoint, active-resource ID and `mispar_rechev` -> `misgeret` mapping. It is standalone and does not depend on the CarAgent repository.

- Endpoint: `https://data.gov.il/api/3/action/datastore_search`
- Resource: `053cea08-09bc-40ec-8f7a-156f0677aff3`
- Active-vehicle coverage only; inactive or newly registered vehicles may not resolve.
- The active lookup requests identification/model fields plus current ownership and registration/test dates. Separate history lookups request only their displayed fields, not engine numbers or personal identities.
- Missing VINs, unmatched plates, upstream outages, timeouts and malformed records are distinct failures.
- Israeli model codes and registration directives are context, not verified supplier mappings.

## Privacy

VIN checks happen locally in the browser. Plate requests go directly to data.gov.il: that government service receives the plate and the visitor's IP, under its own privacy practices. Requests omit credentials and referrers and disable browser caching.

The app does not save full identifiers to storage, application URLs, analytics or its own logs. Users can explicitly share the non-serial VIN prefix and summary described above. There is no application backend. GitHub Pages may collect ordinary hosting access logs. No external fonts, scripts or Tesla credentials are used.

The example VIN is synthetic and explicitly marked as fictional; it is never used as a live registry lookup.
