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
- **Navigation**: Implements an iOS-style "swipe-back" navigation system for intuitive backward navigation on non-main-tab pages, complete with previous page preview, scaling effects, and haptic feedback.

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
- **Minimum Investment Enforcement**: R1,000 minimum per individual asset holding, enforced in `src/lib/strategyUtils.js`. `calculateMinInvestment` adjusts share counts upward so each holding meets R1,000 floor, with fallbacks to strategy-level `last_close`/`nav` price when holdings data is unavailable. The total strategy minimum is also floored at R1,000. Display uses "Min. investment" label in bottom sheets on MarketsPage and OpenStrategiesPage.
- **Notification System**: Centralized real-time notifications via Supabase subscriptions, grouped by date, with swipe-to-delete, "mark all as read" functionality, and user-configurable notification type preferences.
- **Settlement Status Tracking**: Real-time detection of CSDP and broker integration via environment variables, with a settlement lifecycle (pending_csdp → pending_broker → confirmed) and status badges on holdings.

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
- **Timeframes**: D (7 days), 1M (30 days), 3M (90 days), 6M (180 days)
- **Equity Curve Logic**: The chart builds a real equity curve from the user's fill dates:
  - Uses `created_at` from `stock_holdings` as the fill date for each asset
  - For each date, computes portfolio value as sum of (quantity × close_price) for all holdings owned at that point
  - Forward-fills prices across dates where data may be missing for some securities
  - Holdings only contribute to the total after their fill date
  - Each filter uses a strict cutoff (today minus N days) to window the data
  - Y axis shows formatted price labels (R values with k/m suffixes)
  - Tooltip shows date and value on hover
  - For strategies, uses `getStrategyPriceHistory` with mapped timeframe (D→1W, 1M→1M, 3M→3M, 6M→6M)