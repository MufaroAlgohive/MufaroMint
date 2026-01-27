# Copilot Instructions for Mint

## Project Overview

**Mint** is a React + Vite fintech application deployed as a web app and native iOS app (via Capacitor). It's a personal finance platform featuring KYC verification, credit management, investment strategies, and biometric authentication.

**Tech Stack:**
- Frontend: React 18 + Vite 5 with Tailwind CSS and PostCSS
- Mobile: Capacitor 8 (iOS only currently)
- Backend: Supabase (PostgreSQL + Auth)
- Charts: Recharts; Icons: Lucide React; UI: Framer Motion
- Biometrics: Capacitor Native Biometric plugin

**Environment Setup:**
- `VITE_SUPABASE_URL`: Required; Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Required; Public anon key for client auth
- Dev server: `npm run dev` runs on `localhost:5000` (hardcoded in vite.config.js)
- Build output: `dist/` directory; note that web directory is configured in capacitor.config.json

## Architecture

### App Structure

1. **Single-Page Routing** (`src/App.jsx`): Hash-based page navigation without a router library. App state manages:
   - `currentPage`: Active page name ("home", "auth", "credit", etc.)
   - `authStep`: Auth substep ("email", "otp", "signup", "newPassword")
   - Two layouts: `AuthLayout` (minimal) and `AppLayout` (navbar + sidebar)

2. **Data Layer** (`src/lib/`):
   - **`supabase.js`**: Single Supabase client instance using `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
   - **`useProfile.js`**: Custom hook merging Supabase `auth.getUser()` + `profiles` table, builds profile from user metadata + row data
   - **`useRequiredActions.js`**: Tracks user compliance (KYC verified, bank linked) from `required_actions` table; auto-creates row if missing
   - **`biometrics.js`**: Platform detection, biometric availability check, encrypted localStorage flags for biometric state

3. **Component Hierarchy**:
   - Pages (`src/pages/`) are feature-based: AuthPage, HomePage, CreditPage, InvestmentsPage, etc.
   - Shared UI components (`src/components/`) use forwardRef for form inputs, className composition for styling
   - Skeleton components provide loading states for each major page

### Auth Flow

- **Signup**: Email → OTP (sent via Supabase) → Password → Create profile
- **Login**: Email + Password (with rate-limiting) OR biometric if enabled on first login
- **Recovery**: Hash-based token parsing in App.jsx triggers recovery mode (`newPassword` step)
- **Biometrics**: iOS-only; enabled after first login, stored in localStorage with email; auto-prompts on subsequent visits

## Critical Patterns

### Custom Hooks
All data hooks follow this pattern:
- Use cleanup flag (`isMounted`) to prevent state updates on unmounted components
- Return `{ data, loading }` or `{ data, error, loading }`
- Always check `if (!supabase)` before queries (handles dev without env vars)
- Use `.maybeSingle()` for optional rows; fallback gracefully if missing
- Example: `useProfile()` loads from `profiles` table only after auth check
- Auto-create missing rows if needed (see `useRequiredActions.js` insert pattern)

### Form Components
- **Controlled inputs**: Use `value` + `onChange` props
- **forwardRef support**: TextInput, PasswordInput accept ref for focus management
- **className composition**: Merge baseClassName + custom className (see `TextInput.jsx`)
- **No form library**: Manual validation in AuthForm (1300+ lines managing auth complexity)
- **Password strength**: PasswordStrengthIndicator component provides visual feedback

### Styling
- **Tailwind CSS** with custom CSS variables for theme colors (defined in tailwind.config.js)
- **Custom classes**: e.g., `glass-btn` for glassmorphic buttons (check auth.css)
- **Responsive**: Mobile-first; components adapt via Tailwind breakpoints
- **Safe area**: Components use `env(safe-area-inset-bottom)` for iOS notch/home indicator (see AppLayout)

### State Management
- **Prop drilling**: Pages receive `onOpenXxx` callbacks from App.jsx
- **No global state library**: Keep state in App or local components
- **useCallback + useMemo**: Optimize re-renders in heavy components (e.g., StrategyReturnChart with useMemo for filtered data)

### Rate Limiting & Security
- **Auth rate limits**: Hardcoded in AuthForm.jsx top (OTP_EXPIRY_TIME=180s, MAX_OTP_ATTEMPTS=5, LOGIN_COOLDOWN=1800s, etc.)
- **Progressive backoff**: Two-tier cooldown system (COOLDOWN_TIMES=[300, 1800]) for repeated failures
- **Biometric state**: Stored in localStorage with encryption flags; iOS-only for now

## Common Tasks

### Adding a New Page
1. Create `src/pages/NewPage.jsx` with props for navigation callbacks
2. Import and add to App.jsx page list (top of file)
3. Add route case in App.jsx's page switch statement
4. Pass `onOpenXxx` callbacks down from App.jsx
5. Use `useProfile` and `useRequiredActions` hooks if user data needed
6. Match page parameter naming: `onOpenNewPage` callback pattern

### Modifying Auth
- **Auth logic**: Mostly in [AuthForm.jsx](../src/components/AuthForm.jsx#L1) (handles signup, login, OTP, recovery, biometrics)
- **Rate-limiting**: Hardcoded constants at top (OTP_EXPIRY_TIME, MAX_OTP_ATTEMPTS, etc.); update COOLDOWN_TIMES for progressive backoff
- **Biometric integration**: Check [biometrics.js](../src/lib/biometrics.js#L1) for platform detection; iOS checks via `Capacitor.getPlatform()`
- **Email verification**: OTP sent via Supabase auth; verify with `.verifyOtp()` and compare `currentStep` state
- **Password recovery**: Hash params parsed in App.jsx; triggers `newPassword` step in AuthForm

### Fetching Data
- Always check `if (!supabase)` before queries (handles dev without env vars)
- Use `.from(table).select().eq().maybeSingle()` for optional rows; handle null gracefully
- Use `.from(table).select().eq().single()` only if row must exist (will error if missing)
- Use `isMounted` flag in useEffect to prevent memory leaks
- Toast messages for errors via `setToast({ message, visible })` pattern in AuthForm
- Supabase errors auto-logged; don't repeat error logging

### Styling Components
- Import Tailwind classes; no additional CSS files needed unless custom animations
- Use className composition for conditional styles (e.g., `${isActive ? 'bg-blue-500' : 'bg-gray-200'}`)
- Check `src/styles/auth.css` and `tailwind.css` for custom utilities
- Custom color vars via HSL in tailwind.config.js (e.g., `hsl(var(--primary))`)
- Don't use inline styles; compose Tailwind classes instead

### Debugging
- Open `BiometricsDebugPage` in dev for biometric testing (see src/pages/BiometricsDebugPage.jsx)
- Check browser console for Supabase error logs (always present)
- localStorage inspection for biometric state and login history
- Vite dev server hot-reloads on file changes; watch for component re-mount issues

## Build & Deployment

- **Dev**: `npm run dev` (Vite on localhost:5000)
- **Build**: `npm run build` outputs to `dist/` (configured in capacitor.config.json as webDir)
- **Preview**: `npm run preview` tests production build locally
- **Deploy**: `npm run deploy` pushes to GitHub Pages (via gh-pages package)

## Database Schema

Key Supabase tables expected:
- **`profiles`**: `id` (uuid), `email`, `first_name`, `last_name`, `avatar_url`, `phone_number`, `date_of_birth`, `gender`, `address`
- **`required_actions`**: `user_id` (uuid), `kyc_verified` (bool), `bank_linked` (bool) – auto-created by useRequiredActions if missing
- Auth metadata stored in Supabase `auth.users.user_metadata` (first_name, last_name, etc.)

## iOS Specific

- **Capacitor config**: Configured in [capacitor.config.json](../capacitor.config.json) with `com.algohive.mint.app` appId and `https://mint-henna.vercel.app/` as production server
- **Biometric plugin**: `@capgo/capacitor-native-biometric@^8.3.1` for Face ID / Touch ID; iOS-only check via `isNativeIOS()`
- **Platform checks**: Use `isNativePlatform()`, `isNativeIOS()` from biometrics.js; `Capacitor.getPlatform()` returns 'ios' or 'web'
- **Build**: Run `npm run build` then `npx cap sync` to update Xcode project (in ios/ folder)
- **Safe area insets**: `env(safe-area-inset-bottom)` used in [AppLayout](../src/layouts/AppLayout.jsx) for notch/home indicator padding
- **biometricAutoPrompted** ref: Prevents duplicate biometric prompts on hot reloads (see AuthForm useEffect)

## Key Files Reference

- [App.jsx](../src/App.jsx#L1): Main router and state management
- [AuthForm.jsx](../src/components/AuthForm.jsx#L1): Complex auth UI (consider breaking down if extending)
- [supabase.js](../src/lib/supabase.js#L1): Backend client
- [useProfile.js](../src/lib/useProfile.js#L1): Profile data hook pattern
- [HomePage.jsx](../src/pages/HomePage.jsx#L1): Dashboard with actions and transaction history

## Common Gotchas & Error Handling

### State Updates on Unmounted Components
All data-fetching hooks use `isMounted` flag to prevent memory leaks:
```javascript
let isMounted = true;
// ... async operations ...
if (isMounted) setLoading(false);
return () => { isMounted = false; };
```

### Missing Supabase Client
When env vars are missing, `supabase` is null. Always guard queries:
```javascript
if (!supabase) return; // dev without env vars
```

### Rate Limit State Management
AuthForm uses complex cooldown tracking with multiple intervals. When modifying:
- Clear all refs in cleanup: `clearInterval(otpExpiryInterval.current)`, etc.
- Use `setShowRateLimitScreen` to conditionally render throttle UI
- Test two-tier COOLDOWN_TIMES=[300, 1800] (5min, then 30min)

### Biometric Login State
`biometricAutoPrompted` ref prevents duplicate prompts on re-renders. Don't remove this pattern—it's critical for iOS/web dev consistency.

### Component Re-mounting on Hash Navigation
Hash-based routing causes page components to unmount/remount. Avoid storing critical state in component trees; use App.jsx state instead.

### Toast Timing
Toast messages auto-hide with `setTimeout(toastTimeout.current)`. Ensure cleanup in useEffect return; don't nest multiple toast setups.

