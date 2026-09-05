# Camartes — Customer Booking App

A mobile-first, cross-platform (iOS + Android + web) React Native app built with **Expo SDK 57** and **Expo Router**, implementing the Camartes Customer Booking App specification: customers configure photography/videography requirements for one or more event days, get three budget-based package recommendations, and are matched with up to 6 available service providers sourced live from the **Camartes Vendor Platform**.

This is a separate app from `camartes-field` (the field-executive app) in this repo — it targets end customers, not Camartes employees, and ships as its own binary (`com.camartes.customer`).

## Why a separate app

The spec calls for "a customer-side booking app that connects to the existing Camartes Vendor platform, rather than creating a separate vendor database." This app never stores or invents vendor data — it reads the real, live vendor catalog from `https://camartes-backend.onrender.com` (the same backend `camartes-field/lib/camartes-api.ts` talks to) and adapts it for matching. If the platform has zero onboarded providers for a category (e.g. LED Wall today), this app shows zero, never a fabricated listing.

## Run it

**Windows + Android (exact commands):** see [`LOCAL_RUN.md`](./LOCAL_RUN.md).

```bash
npm install
npx expo start
```

Scan the QR code with **Expo Go** (iOS/Android), or press `w` for web.

```bash
# Sanity-check that everything still bundles for every platform
npx expo export --platform web
npx expo export --platform ios --platform android
```

### Sign in

Auth is mobile number + OTP (fully working, no external SMS gateway required — the demo OTP is shown on-screen, matching the same "no SMS" convention as `camartes-field`'s in-app handover PIN). Email sign-in also works end to end. Google/Apple buttons are present per spec but need OAuth client credentials — configure them as Cloud Agent / EAS secrets to wire up the real providers (until then the buttons explain what's missing rather than silently failing).

### Real location search (optional)

"Use my current location" always works with no configuration (`expo-location`'s native reverse geocoder). Text search for an address uses the real Google Places Autocomplete/Details APIs when `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY` is set; otherwise it falls back to a curated list of Indian cities so the flow still works end to end, and the customer can always hand-edit the full address afterwards either way.

## Architecture

```
UI (app/*.tsx, expo-router)
  -> state (src/state/AppProvider.tsx)
    -> services (src/services/*.ts)      "Camartes API" boundary
      -> engine (src/engine/*.ts)        pure business logic
```

- **`src/types/`** — booking + vendor domain types (mirrors the relational tables the spec proposes: bookings, booking_days, photography/videography/aerial/led/web-live requirements, deliverables, budgets, packages, vendor matches).
- **`src/constants/`** — admin-configurable data shaped exactly like it would be if fetched from an admin API (event categories, LED sizes, quantity limits): no screen or validator switches on a hard-coded id list, so wiring these to `GET /api/admin/*` later is a one-file change.
- **`src/engine/`** — pure, framework-free, **unit-tested** business logic:
  - `validation.ts` — every rule in spec section 38 (core photography/videography requirement, time/date/budget validation), including the exact required error copy.
  - `pricing.ts` — the Essential / Signature / Elite package generator, driven by requirements + a swappable pricing-rules config (never hard-coded "the app just shows ₹X"), plus budget-feasibility detection (spec section 43).
  - `matching.ts` — the vendor matching + ranking engine (mandatory capability/availability filters, then the weighted scoring from spec section 45), capped at 6 results.
- **`src/services/`** — the only code that talks to the network/device APIs:
  - `vendorApi.ts` — fetches the **real** Camartes Vendor Platform catalog (photographer/videographer/aerial/LED/web-live search + stores), merges per-provider capabilities, and never invents vendors.
  - `bookingApi.ts` — the booking service layer. Every exported function corresponds 1:1 to a REST endpoint from spec section 36/37 (`POST /api/customer/bookings`, `.../days`, `.../budget`, `GET .../matches`, `.../vendor-request`, …). It's implemented against on-device storage today; swapping each function body for a real `fetch()` is the only change needed once a booking backend exists — none of the UI or state layer would change.
  - `placesApi.ts`, `authApi.ts`, `notificationsStore.ts` — location, auth and notifications, same "real where possible, honestly-labelled fallback otherwise" approach.
- **`src/state/AppProvider.tsx`** — one React context wrapping the services with React state + auto-save, exposed via `useAppStore()`.
- **`app/`** — Expo Router screens. All 25 "core screens" from the spec exist: splash, login/OTP, home, the full booking wizard (event days → photography/videography/aerial/LED/web-live → deliverables → expected delivery → summary → budget → packages → matches → vendor profile → confirm), my bookings, booking detail/status, messages, notifications, profile.

## Business rules enforced (client + designed to be re-enforced server-side)

- **Photography or videography is mandatory; LED Wall, Web Live and Aerial are add-ons only.** Enforced per event day in `validateCoreServiceRule`, with the exact spec copy: *"Photography or videography service is required. LED Wall, Web Live and Aerial services are available only as add-on services."*
- End time must be after start time, with explicit overnight support (spec: 8 PM → 2 AM (+1 day)).
- Event dates can't be in the past; expected delivery can't be before the final event day.
- Photographer/videographer counts must be > 0 once a style is enabled.
- Budget must be > 0.
- A vendor only counts as "Available" if it has every required capability **and** enough quantity/calendar availability across **every** event day (spec's initial "one vendor for all days" rule) — see `checkVendorAvailability`.
- Never more than 6 matches are returned; if fewer qualify, the actual count is shown; if zero, an honest empty state with next-step actions is shown (change date/time, adjust requirements, increase budget) — nothing is fabricated.
- Vendor contact details stay masked until the vendor accepts a request (spec section 30).

## Testing

```bash
npm test        # engine unit tests (validation / pricing / matching)
npm run typecheck
```

`src/engine/__tests__/validation.test.ts` includes the exact allow/deny truth table from spec section 2 (Photography+Drone ✅, Drone-only ❌, LED+WebLive ❌, etc.), plus rules 2–10. `matching.test.ts` covers the 6-provider cap, the zero/partial-match cases, and capability filtering. `pricing.test.ts` covers package ordering/labels and the budget-feasibility warning.

## Android APK (local)

```bash
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
```

The signed APK is `android/app/build/outputs/apk/release/app-release.apk` (debug keystore — fine for sideloading/testing, not for a Play Store release). Sideload on an arm64 Android phone with "install unknown apps" enabled.

To serve it for download from this VM (e.g. via Cursor Preview):

```bash
mkdir -p apk-dist && cp android/app/build/outputs/apk/release/app-release.apk apk-dist/camartes-customer.apk
node scripts/serve-apk.js   # listens on 0.0.0.0:43159, GET /camartes-customer.apk
```

## Known gaps / next steps

- `bookingApi.ts` runs against on-device storage; the function boundaries are designed so a real Camartes booking backend can be swapped in without touching the UI.
- Vendor availability calendars aren't exposed by the current public vendor catalog API, so `simulateVendorCalendarAvailability` deterministically derives a stand-in per vendor+date (clearly isolated and commented) — replace with a real `GET /api/vendors/{id}/availability` call the moment it exists.
- Vendor accept/reject/counter-offer is simulated client-side for demo purposes (`simulateVendorResponse`) since there's no live vendor-side app wired to this project yet; a real integration would instead subscribe to vendor-platform webhooks/events.
- Google/Apple OAuth need credentials configured before those buttons can do more than explain what's missing.
- No payment gateway is integrated yet ("Proceed to payment" advances the state machine only).
- Day reordering uses simple up/down controls rather than drag-and-drop.
