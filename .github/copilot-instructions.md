# Mint AI Coding Guide

## Big picture
- **App shape**: React + Vite frontend (`src/`) plus Express middleware (`server/index.cjs`) for KYC/banking endpoints; Vite proxies `/api/*` to `localhost:3001`.
- **Routing model**: No router library. `src/App.jsx` is the state machine (`currentPage`, `authStep`, local history stack, modal state, hash recovery handling).
- **Layouts**: Auth screens are standalone; signed-in screens render through `src/layouts/AppLayout.jsx` (bottom navbar + modal shell).
- **Backend boundary**: Supabase is the primary data/auth backend (`src/lib/supabase.js`); always guard with `if (!supabase)` before queries.
- **Native behavior**: Capacitor app with Android-specific back-button handling and app-exit logic in `src/App.jsx`.

## Critical workflows
- **Dev**: `npm run dev` starts both Express and Vite (`server/index.cjs & vite`) on port 5000 + 3001.
- **Build**: `npm run build` outputs `dist/` (Capacitor `webDir` in `capacitor.config.json`).
- **Mobile sync**: `npx cap sync ios|android` after every frontend build.
- **Android smoke test**: `npm run build && npx cap sync android && cd android && ./gradlew assembleDebug && adb install -r app/build/outputs/apk/debug/app-debug.apk`.
- **No formal test suite**: There is no `test` script in `package.json`; validate changes with targeted manual flows.

## Project-specific patterns
- **Lifecycle safety**: Hooks use `isMounted`/refs to avoid setting state after unmount (example: `src/lib/useProfile.js`, `src/pages/PaymentPage.jsx`).
- **Supabase querying**: Prefer `.maybeSingle()` for optional rows and auto-insert missing records (example: `src/lib/useRequiredActions.js`).
- **Realtime subscriptions**: Notifications and required actions use singleton channel patterns to avoid duplicate subscriptions across components (`src/lib/NotificationsContext.jsx`, `src/lib/useRequiredActions.js`).
- **Auth complexity lives in one place**: `src/components/AuthForm.jsx` contains OTP (6-digit, 180s), resend cooldown, login cooldown/rate-limit, and biometric login gates.
- **Biometrics**: Always gate with `(isNativeIOS() || isNativeAndroid())`, never iOS-only checks; Android requires `USE_BIOMETRIC` + `USE_FINGERPRINT` permissions.
- **KYC polling coordination**: Sumsub widget pauses global polling to prevent camera/session interference (`pauseSumsubPolling` / `resumeSumsubPolling` in `src/lib/useSumsubStatus.js`).
- **Caching**: Strategy lists and history are in-memory cached (60s TTL) with per-timeframe keys in `src/lib/strategyData.js`.

## Data and integration boundaries
- **Strategy source of truth**: Use `strategies`, `strategy_metrics`, and strategy history from `src/lib/strategyData.js`; do not derive strategy NAV from securities.
- **Markets flow**: `src/pages/MarketsPage.jsx` → `src/pages/FactsheetPage.jsx` → `src/pages/OpenStrategiesPage.jsx`.
- **Payments**: Paystack SDK is loaded in `index.html`; `src/pages/PaymentPage.jsx` launches `window.PaystackPop()` and then POSTs `/api/record-investment`.
- **KYC**: Server signs Sumsub requests in `server/index.cjs`; client widget is `src/components/SumsubVerification.jsx` (`@sumsub/websdk-react`).

## Styling and component conventions
- **Tailwind-first**: Compose Tailwind utility classes; avoid CSS modules/styled-components.
- **Shared UI**: Reusable primitives live in `src/components/` and `src/components/ui/` with `@` alias imports.
- **Charts**: Use Recharts components (`ComposedChart`, `Area`, `Line`, `ResponsiveContainer`) as in `src/components/StrategyReturnChart.jsx`.

## Env keys to check before debugging
- Frontend: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_PAYSTACK_PUBLIC_KEY`.
- Server/KYC: `SUMSUB_APP_TOKEN`, `SUMSUB_SECRET_KEY`, `SUMSUB_LEVEL_NAME`.

