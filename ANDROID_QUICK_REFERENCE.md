# Android Fixes - Quick Reference

## Issues Fixed

### 1. ✅ Biometric Login - Now Works on Android
- **Before**: `isNativeIOS()` only → Biometrics on iOS only
- **After**: `(isNativeIOS() || isNativeAndroid())` → Biometrics on iOS + Android
- **Files**: `src/components/AuthForm.jsx`, `src/lib/biometrics.js`

### 2. ✅ Added Biometric Permissions
- Added `android.permission.USE_BIOMETRIC` (API 28+)
- Added `android.permission.USE_FINGERPRINT` (fallback for API 23-27)
- **File**: `android/app/src/main/AndroidManifest.xml`

### 3. ✅ App Icon - No Changes Needed
- Background color `#26A69A` is optimal
- All densities configured correctly

## Quick Test (5 minutes)

```bash
# 1. Build
npm run build && npx cap sync android

# 2. Install
cd android && ./gradlew assembleDebug && adb install -r app/build/outputs/apk/debug/app-debug.apk

# 3. Test
# - Create new account (should see biometric enrollment)
# - Log out and log back in (should see auto biometric prompt)
# - Check Logcat: adb logcat | grep Biometrics

# Expected: platform: "android" in console logs
```

## Files Changed

| File | What | Why |
|------|------|-----|
| `android/app/src/main/AndroidManifest.xml` | +2 permissions | Biometric requires Android permissions |
| `src/lib/biometrics.js` | +`isNativeAndroid()`, +error logging | Support Android detection & debugging |
| `src/components/AuthForm.jsx` | Fix biometric checks (2 locations) | Enable Android biometric auth |

## Logcat Debugging

```bash
# Enable debugging (set to true)
# src/components/AuthForm.jsx line 26: const DEBUG_BIOMETRICS = true;

# Then filter:
adb logcat | grep "\[Biometrics\]"

# Expected output shows:
# - platform: "android" ✅
# - available: true ✅  (if device has biometric)
# - canUse: true ✅ (after first login)
```

## Emulator Quick Setup

```bash
# Android 8.0+ emulator required
# Settings → Apps → Mint → Permissions → Enable Biometric

# Or register fingerprint in emulator:
# Extended Controls (in emulator) → Fingerprint → Register
```

## Support Matrix

| API | Android | Biometric | Status |
|-----|---------|-----------|--------|
| 24+ | 7.0+ | Fingerprint/Face | ✅ Full |
| 23-27 | 6.0-8.1 | Fingerprint only | ✅ Works |
| <23 | <6.0 | None | ❌ Not supported |

---

**For full details**, see [ANDROID_FIXES.md](ANDROID_FIXES.md)
