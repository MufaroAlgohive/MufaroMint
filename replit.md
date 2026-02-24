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
- **User Onboarding**: A multi-step identification process including employment details, Sumsub KYC verification, risk & disclosure acknowledgment, source of funds declaration, and T&C agreements.
- **Notification System**: Centralized real-time notifications via Supabase subscriptions, grouped by date, with swipe-to-delete, "mark all as read" functionality, and user-configurable notification type preferences.
- **Settlement Status Tracking**: Real-time detection of CSDP and broker integration via environment variables, with a settlement lifecycle (pending_csdp → pending_broker → confirmed) and status badges on holdings.

### Feature Specifications
- **Dashboard**: Investment portfolio dashboard with strategy selection and performance charts.
- **Statements**: Statements page with Strategy/Holdings/Financials tabs and PDF download.
- **Profile Management**: KYC verification status badge, editable profile details (phone, DOB, gender, country, city), and a view-only profile page.
- **Settings**: Biometric toggles, change password, session timeout configuration, and active session management.
- **Navigation Menu**: Comprehensive menu including Profile Details, Settings, Help & FAQs, Legal, Privacy, Subscriptions, and Logout.

### MINT MORNINGS Real-Time Email
- **File**: `server/mintMorningsCron.cjs` — real-time article email sender
- **Trigger**: Polls `News_articles` table every 30 seconds for new ALLBRF articles (by `doc_id` unique identifier)
- **Behavior**: Each new article with `content_types` containing "ALLBRF" is immediately sent to all confirmed users. Duplicate `doc_id`s are tracked in memory to prevent re-sending.
- **Recipients**: All confirmed users (email_confirmed_at set) from Supabase auth
- **Email Service**: Resend (API key stored as RESEND_API_KEY secret). Resend integration was dismissed; using direct API key instead.
- **Sender**: `MINT MORNINGS <mornings@thealgohive.com>`
- **Template**: HTML5 email with responsive media queries, parsed article sections (MARKETS, COMPANY CALENDAR, ECONOMIC CALENDAR, news sections) into separate styled cards matching the Mint design system.
- **Batching**: Sends to users in batches of 50 with 1-second delay between batches
- **Test Endpoints**: `POST /api/test-mint-mornings-single` (send to specific email), `POST /api/test-mint-mornings` (admin-only, requires Bearer token + admin role)

## External Dependencies

- **Supabase**: Backend-as-a-Service for user authentication (signup, login, email verification, password reset), database services for user data, onboarding information, and real-time subscriptions for notifications and market data.
- **Capacitor**: For deploying the React application as a native mobile app and accessing native device features (e.g., biometric authentication).
- **capacitor-face-id**: Plugin for integrating native Face ID/Touch ID biometric authentication.
- **Express.js**: Used as a backend API server for handling secure server-side logic and acting as a proxy for third-party APIs.
- **Axios**: HTTP client used for making API requests, particularly to the TruID API.
- **TruID Connect**: Identity verification and bank linking service. Integrated via custom backend endpoints to manage the verification and account linking flow.
- **Sumsub**: KYC (Know Your Customer) verification service. Integrated through backend endpoints (`/api/sumsub/status`, `/api/sumsub/access-token`) and a frontend SDK (`SumsubVerification.jsx`) to manage identity checks.
- **Yahoo Finance (via custom proxy)**: For fetching live stock market data (quotes and charts). The application uses a custom backend proxy to access Yahoo Finance public endpoints.