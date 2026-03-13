# Mint Auth (React + Vite)

## Overview
Mint Auth is a React authentication application built with Vite, Tailwind CSS, and Framer Motion. It provides a comprehensive and secure user authentication experience, featuring a complete signup flow with robust password validation, OTP email verification, and advanced security measures like biometric authentication and PIN lock screens. The application also integrates with various third-party services for KYC, bank linking, and real-time market data, aiming to deliver a seamless and feature-rich financial management platform. The project envisions a highly secure, intuitive, and efficient platform for managing personal finances and investments.

## User Preferences
- **Communication Style**: I prefer clear and concise communication. Avoid overly technical jargon unless necessary, and provide explanations that are easy to understand.
- **Coding Style**: I prefer clean, readable, and modular code. Favor functional components in React and maintain a consistent coding style throughout the project.
- **Workflow Preferences**: I prefer an iterative development approach. Break down tasks into smaller, manageable chunks and seek feedback regularly.
- **Interaction Preferences**: Ask before making any major architectural changes or introducing new dependencies. Provide a brief explanation for proposed changes.
- **General Working Preferences**: Do not make changes to the `server/` directory without explicit instruction, as this contains critical backend logic and third-party API integrations.

## System Architecture

### UI/UX Decisions
- **Design Language**: iOS-style UI with a "glassmorphism" design approach for a modern and sleek aesthetic.
- **Animations**: Smooth transitions and animations are implemented using Framer Motion for an enhanced user experience.
- **Theming**: Tailwind CSS is used for utility-first styling, enabling rapid and consistent UI development.
- **Navigation**: Implements an iOS-style "swipe-back" navigation system for intuitive backward navigation on non-main-tab pages, complete with previous page preview, scaling effects, and haptic feedback. SwipeBackWrapper is disabled on iOS web browsers (non-standalone) to avoid conflicting with Safari's native edge swipe gesture.
- **Browser Back Prevention**: On mobile web browsers, browser history is synced with the app's internal navigation stack via `pushState`/`popstate`. A counter-based `pendingProgrammaticBacks` ref prevents double-back races. On main tabs, a sentinel history entry is pushed to prevent the browser from navigating away from the app. PWA meta tags (`apple-mobile-web-app-capable`, `mobile-web-app-capable`) enable standalone mode when installed to home screen, which fully disables Safari's navigation gestures.

### Technical Implementations
- **Frontend Framework**: React 18 with Vite for fast development and optimized builds.
- **Styling**: Tailwind CSS 3 and PostCSS with Autoprefixer for efficient and responsive design.
- **State Management**: Context API for centralized state management, particularly for notifications. Custom hooks are extensively used for data fetching and logic encapsulation (e.g., `useSumsubStatus`, `useRealtimePrices`, `useProfile`).
- **Authentication Flows**:
    - **Password Validation**: Real-time strength indicator ensuring "Strong" passwords (8+ chars, uppercase, lowercase, number, special char).
    - **OTP Verification**: 6-digit OTP with 180-second expiry, 30-second resend cooldown, max 5 resend/edit attempts, and max 5 incorrect OTP attempts before progressive lockouts.
    - **Login Security**: Max 5 incorrect login attempts before a 30-minute cooldown, with remaining attempts displayed.
    - **Forgot Password**: Standard email-based password reset with strength validation for new passwords.
- **Biometric Authentication**: Integration with `capacitor-face-id` for native iOS/Android biometrics (Face ID/Touch ID) for secure login alternatives, configurable via settings.
- **PIN Lock Screen**: A 5-digit PIN setup and lock screen with SHA-256 hashing for enhanced session security.
- **User Onboarding**: A 6-step identification process including employment details, Sumsub KYC verification, discretionary mandate, risk disclosure, source of funds declaration, bank account details collection, and T&C agreements. Bank details (name, account number, branch code) are saved to both dedicated `user_onboarding` columns and the `sumsub_raw` JSON field.
- **Minimum Investment Enforcement**: No R1,000 floor on `calculateMinInvestment` — sums raw `shares × (last_price/100)` directly, returns `Math.round(total)` or null. `getAdjustedShares()` still uses R1,000 floor for individual asset purchases.
- **Notification System**: Centralized real-time notifications via Supabase subscriptions, grouped by date, with swipe-to-delete, "mark all as read" functionality, and user-configurable notification type preferences.
- **Settlement Config**: `/api/settlement/config.js` returns `fullyIntegrated: true`. CSDP settlement logic has been removed from the portfolio page (`NewPortfolioPage.jsx`). Portfolio tabs now display data based purely on `stock_holdings` records and strategy matching via transaction names.

### Feature Specifications
- **Dashboard**: Investment portfolio dashboard with strategy selection and performance charts.
- **Statements**: Statements page with Strategy/Holdings/Financials tabs and PDF download.
- **Profile Management**: KYC verification status badge, editable profile details (phone, DOB, gender, country, city), and a view-only profile page.
- **Settings**: Biometric toggles, change password, session timeout configuration, and active session management.
- **Navigation Menu**: Comprehensive menu including Profile Details, Settings, Help & FAQs, Legal, Privacy, Subscriptions, and Logout.

### MINT MORNINGS Scheduled Email
- **File**: `server/mintMorningsCron.cjs` — scheduled daily newsletter sender
- **Vercel Cron**: `api/mint-mornings.js` — serverless function triggered by Vercel Cron at `0 5 * * *` (05:00 UTC / 07:00 SAST daily). Configured in `vercel.json`.
- **How it works**: On each cron trigger, queries the database for today's ALLBRF articles (published since midnight SAST) and sends them to all confirmed users. No in-memory state needed — fully stateless/serverless.
- **Replit fallback**: `server/mintMorningsCron.cjs` — in-process polling + scheduled send with catch-up logic for development. Works independently of the Vercel cron.
- **ALLBRF Articles**: Typically arrive in the database around 04:55 UTC (06:55 SAST), giving ~5 minutes before the scheduled send.
- **Recipients**: All confirmed users (email_confirmed_at set) from Supabase auth (uses `listUsers`)
- **Email Service**: Resend (API key stored as RESEND_API_KEY env var)
- **Sender**: `MINT MORNINGS <mornings@mymint.co.za>`
- **Template**: HTML5 email with responsive media queries, parsed article sections (MARKETS, COMPANY CALENDAR, ECONOMIC CALENDAR, news sections) into separate styled cards matching the Mint design system.
- **Batching**: Sends to users in batches of 50 with 1-second delay between batches
- **Security**: Vercel cron endpoint supports optional `CRON_SECRET` env var for authentication (Vercel sends this automatically)
- **Test Endpoints**: `POST /api/test-mint-mornings-single` (send to specific email), `POST /api/test-mint-mornings` (admin-only, requires Bearer token + admin role)

### Filter Persistence
- **File**: `src/lib/usePersistedFilters.js` — localStorage-based filter save/restore
- **Contexts**: 3 independent filter contexts:
  - `marketsInvest` — sort, sectors, exchanges (MarketsPage Invest tab)
  - `marketsStrategies` — sort, risks, minInvestment, exposure, timeHorizon, sectors (MarketsPage OpenStrategies tab)
  - `openStrategies` — same shape as marketsStrategies (standalone OpenStrategiesPage)
- **Serialization**: Sets serialized as arrays in JSON; rebuilt as Sets on load
- **Chip rebuilding**: Active filter chips are reconstructed on page load and on tab switch in MarketsPage
- **Storage keys**: `mint_filters_markets_invest`, `mint_filters_markets_strategies`, `mint_filters_open_strategies`

## External Dependencies

- **Supabase**: Backend-as-a-Service for user authentication (signup, login, email verification, password reset), database services for user data, onboarding information, and real-time subscriptions for notifications and market data.
- **Capacitor**: For deploying the React application as a native mobile app and accessing native device features (e.g., biometric authentication).
- **capacitor-face-id**: Plugin for integrating native Face ID/Touch ID biometric authentication.
- **Express.js**: Used as a backend API server for handling secure server-side logic and acting as a proxy for third-party APIs.
- **Axios**: HTTP client used for making API requests, particularly to the TruID API.
- **TruID Connect**: Identity verification and bank linking service. Integrated via custom backend endpoints to manage the verification and account linking flow.
- **Sumsub**: KYC (Know Your Customer) verification service. Integrated through backend endpoints (`/api/sumsub/status`, `/api/sumsub/access-token`) and a frontend SDK (`SumsubVerification.jsx`) to manage identity checks.
- **Yahoo Finance (via custom proxy)**: For fetching live stock market data (quotes and charts). The application uses a custom backend proxy to access Yahoo Finance public endpoints.

### Portfolio Equity Curve Chart
- **File**: `src/components/SwipeableBalanceCard.jsx` — home page balance card with portfolio chart
- **Timeframes**: D (7 days), W (30 days), M (90 days) — labels are short but data ranges ensure enough points for smooth charts
- **Strategy timeframe mapping**: D→1W, W→1M, M→3M (matches getStrategyPriceHistory API)
- **P&L Equity Curve**: Chart shows gain/loss starting from R0 (first data point = baseline):
  - For stocks: gain = quantity × (current_price - first_price_in_window)
  - For strategies: gain = invested × (NAV/firstNAV - 1)
  - First point always = R0, subsequent points show movement up or down
  - Green line = up, Red line = down
  - Y axis always includes R0 tick label via computed ticks (useMemo)
  - When data is all positive: R0 at bottom, chart space above
  - When data is all negative: R0 at top, chart space below
  - Dashed ReferenceLine at y=0 for visual clarity
  - Fallback: if < 2 data points in timeframe, fetches last 30 available prices
  - Forward-fills prices across gaps for smooth curves
  - Tooltip shows date and P&L value on hover

### PDF Factsheet Generation
- **File**: `src/lib/generateFactsheetPdf.js` — client-side PDF generation using jsPDF + jspdf-autotable
- **Trigger**: FileText icon button in FactsheetPage header (next to heart/watchlist button)
- **Layout**: Single A4 portrait page matching Fairtree MDD style with two-column layout:
  - Left column: Investment Objective, Strategy Profile, Cumulative Performance chart, Return Analysis table (7D/30D/90D/YTD/All-time), Risk Analysis table
  - Right column: Strategy Details box (risk, manager, NAV, inception, benchmark, min investment, currency), Fees section (from `management_fee_bps`), Sector Allocation bars, Portfolio Holdings table, Your Investment (personalized if user has invested)
- **Personalization**: Fetches user's transaction history for the strategy to calculate invested amount, current value, and return
- **Data sources**: `strategies` table (objective, fees, benchmark, inception via `created_at`), `strategy_analytics` (curves, summary, calendar_returns), `securities` (sector data for holdings)
- **Fees**: FactsheetPage fees section now reads from `management_fee_bps` database column instead of hardcoded values

### Order Email Notifications
- **Confirmation Email**: Sent immediately after a successful payment/investment via `api/record-investment.js`. Uses Resend (`orders@mymint.co.za`). Template from `api/_lib/order-email-templates.js` with glassmorphism design matching Mint Mornings. Status shown as "Pending" since settlement hasn't occurred yet.
- **Fill Email**: Sent when CSDP or broker webhook confirms settlement (status = confirmed/filled/executed). Built inline in `server/index.cjs` via `sendOrderFillEmail()`. Status shown as "Confirmed" with green checkmark.
- **Database Logging**: All order emails logged to `order_emails` table in Supabase with columns: user_id, email, email_type (order_confirmation/order_fill), asset details, amount/quantity/price, reference, dates, resend_id, status.
- **Graceful Degradation**: If `RESEND_API_KEY` is not set, email sending is silently skipped (logged but no error thrown). Email failures never block the main transaction flow.

### Vercel Serverless API Endpoints
- **`api/onboarding/status.js`** — GET, returns user's latest onboarding record (id, kyc_status, employment_status). Mirrors Express server endpoint.
- **`api/onboarding/complete.js`** — POST, marks onboarding complete, saves bank details to sumsub_raw.
- **`api/onboarding/check-id-number.js`** — POST, validates SA ID number against onboarding pack records.
- **`api/onboarding/save-mandate.js`** — POST, saves discretionary mandate data.
- **`api/sessions/record.js`** — POST, records session fingerprint. Graceful no-op (user_sessions table not yet in Supabase).
- **`api/sessions/validate.js`** — GET, validates session fingerprint. Always returns valid:true (user_sessions table not yet in Supabase).
- **`api/_lib/supabase.js`** — Shared Supabase client (anon + admin) for Vercel serverless functions.

### Onboarding Completion Checks
- **Shared utility**: `src/lib/checkOnboardingComplete.js` — `parseOnboardingFlags(record)` returns `{ kycDone, bankDone, mandateAgreed, riskDone, sofDone, allComplete }`
- **Mandate check**: checks BOTH `sumsub_raw.mandate_data.agreedMandate` (legacy flow) AND `sumsub_raw.mandate_accepted` (new flow)
- **Used by**: HomePage, ActionsPage, IdentityCheckPage — single source of truth for completion status
- **Smart step navigation**: `getNextIncompleteStep()` (forward) and `getPrevIncompleteStep()` (back) in UserOnboardingPage skip already-completed steps