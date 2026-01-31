# Mint Auth (React + Vite)

## Overview
A React authentication application using Vite as the build tool with Tailwind CSS for styling and Framer Motion for animations. Features a complete signup flow with password validation and OTP email verification.

## Project Structure
- `src/` - Main source code
  - `App.jsx` - Main application component with page routing
  - `components/` - Reusable UI components
    - `AuthForm.jsx` - Main authentication form with password/OTP flow
    - `BiometricPromptModal.jsx` - Modal for enabling Face ID/Touch ID
    - `PasswordStrengthIndicator.jsx` - Password strength validation component
    - `TextInput.jsx` - Base text input component
    - `PasswordInput.jsx` - Password input wrapper
    - `PrimaryButton.jsx` - Button component
    - `Preloader.jsx` - Loading animation component
    - `AuthLayout.jsx` - Auth page layout
    - `NotificationBell.jsx` - Bell icon with unread count badge
    - `TruidConnector.jsx` - TruID Connect integration for identity verification
  - `lib/` - Utility libraries
    - `supabase.js` - Supabase client initialization
    - `biometrics.js` - Biometric authentication utilities (Face ID/Touch ID)
    - `NotificationsContext.jsx` - Centralized notifications state management with real-time updates
  - `pages/` - Page components
    - `AuthPage.jsx` - Authentication page
    - `OnboardingPage.jsx` - Welcome/landing page (before login)
    - `UserOnboardingPage.jsx` - User identification onboarding flow (3-step process)
    - `IdentityCheckPage.jsx` - Identity verification page (wraps UserOnboardingPage)
    - `HomePage.jsx` - Home page after login
    - `MorePage.jsx` - Profile and menu page with KYC badge and Required Actions
    - `EditProfilePage.jsx` - Edit profile with phone, DOB, gender, country, city fields
    - `ProfileDetailsPage.jsx` - View-only profile details page
    - `SettingsPage.jsx` - Settings with biometrics toggle and change password
    - `ChangePasswordPage.jsx` - Dedicated page for changing password
    - `NotificationsPage.jsx` - Full notifications list with swipe-to-delete
    - `NotificationSettingsPage.jsx` - Notification type preferences toggles
  - `styles/` - CSS styles
    - `auth.css` - iOS-style auth form styling
    - `tailwind.css` - Tailwind configuration
    - `onboarding-process.css` - Onboarding flow glassmorphism styling
- `public/` - Static assets
- `server/` - Backend API server
  - `index.cjs` - Express server with TruID API routes
  - `truidClient.cjs` - TruID API client with authentication
- `index.html` - HTML entry point

## Features
- **Password Validation**: Real-time strength indicator requiring ALL criteria to be "Strong":
  - At least 8 characters
  - At least 1 uppercase letter (A-Z)
  - At least 1 lowercase letter (a-z)
  - At least 1 number (0-9)
  - At least 1 special character
  - Only "Strong" passwords can proceed
- **OTP Verification Flow** (Signup):
  - 6-digit OTP code from Supabase email
  - 180 second code expiry (hidden timer - shows error only when user attempts expired code)
  - 30 second resend cooldown between requests
  - Max 5 resend/edit attempts before rate limit triggers
  - Max 5 incorrect OTP attempts before lockout
  - Progressive cooldowns: 5min first, 30min second, 30min+ shows "contact support"
  - Edit email counts as a resend attempt and returns directly to OTP page
- **Login Flow**:
  - Email → Password → Home (on success)
  - Max 5 incorrect login attempts before 30-minute cooldown
  - Shows remaining attempts after each failed login
  - Rate limit screen with options: Reset Password or Contact Support
  - Auto-dismiss rate limit screen after 10 seconds
- **Forgot Password Flow**:
  - Send password reset email via Supabase
  - User clicks magic link in email
  - Create new password (with strength validation)
  - Confirm new password
- **Supabase Integration**:
  - User authentication (signup, login)
  - Email verification (OTP)
  - Password reset via magic link
  - Environment variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
- **iOS-Style UI**: Glassmorphism design with smooth animations
- **Biometric Authentication (Face ID/Touch ID)**:
  - Uses `capacitor-face-id` plugin for native iOS/Android biometrics
  - Prompts users to enable biometrics after successful signup (OTP verification)
  - Prompts users to enable biometrics on first-time login
  - Users can choose to enable or skip biometrics
  - When enabled, login shows "Use Face ID" button as alternative to password
  - Account-bound: biometrics are tied to specific user email for security
  - Toggle switch in Settings page to enable/disable biometrics
  - Green toggle = Face ID enabled, Grey toggle = Face ID disabled
  - Works like native iOS Face ID behavior
- **Profile Management**:
  - KYC verification status badge displayed between profile picture and name
  - Required Actions section showing KYC and Bank verification status
  - Edit Profile page with editable: phone number, date of birth, gender, country, city
  - Non-editable fields: First name, Last name, Email (display only)
  - Profile Details page for view-only profile information
  - Toast notifications on profile save
- **Settings Page**:
  - Enable Biometrics toggle
  - Change Password option
  - Biometrics Debug for testing
- **Menu Structure**:
  - Profile Details - View-only profile
  - Settings - Biometrics and password
  - Help & FAQs
  - Legal Documentation
  - Privacy
  - Subscriptions (formerly My Orders)
  - Log out
- **User Identification Onboarding Flow**:
  - 3-step verification process triggered from Actions page
  - Step 1: Employment details (status, employer, income)
  - Step 2: Identity verification via TruID Connect
  - Step 3: Terms & Conditions and Privacy Policy agreements
  - Saves onboarding data to Supabase `user_onboarding` table
  - TruID integration for KYC verification with status checking
  - Backend API server on port 3001 for TruID API calls
  - Glassmorphism UI with smooth animations
- **TruID Integration**:
  - Backend: `server/index.cjs` - Express server with TruID API endpoints
  - Client: `server/truidClient.cjs` - TruID API client with authentication
  - Frontend: `src/components/TruidConnector.jsx` - Verification UI component
  - Endpoints: POST `/api/truid/initiate`, GET `/api/truid/status`
  - Environment variables: TRUID_API_KEY, BRAND_ID, COMPANY_ID, TRUID_API_BASE, TRUID_DOMAIN, REDIRECT_URL, WEBHOOK_URL
- **Notifications System**:
  - Centralized state management via NotificationsProvider context
  - Real-time updates via Supabase subscription (filtered by user preferences)
  - Unread count badge on bell icon (synced across all pages)
  - Notifications grouped by date (Today, Yesterday, This Week, etc.)
  - Swipe-to-delete individual notifications
  - "Mark all as read" bulk action
  - 8 notification types: transaction, security, investment, credit, promo, bank, verification, system
  - Notification Settings page with toggle controls per type
  - Welcome notification triggered on first signup (with duplicate prevention)
  - Preference changes immediately update real-time filtering

## Development
The development server runs on port 5000 using Vite.

### Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Test OTP Code
For development testing, the valid OTP code is: `123456`

## Deployment
This project is configured for static deployment. The build output goes to the `dist` directory.

## Technologies
- React 18
- Vite 5
- Tailwind CSS 3
- Framer Motion
- PostCSS with Autoprefixer
- Capacitor (for native mobile features)
- capacitor-face-id (biometric authentication)
- Express.js (backend API server)
- Axios (HTTP client for TruID API)
- TruID Connect (identity verification)
