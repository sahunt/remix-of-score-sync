

# Add Google Authentication to DDR Score Tracker

## Overview

You're right - Lovable Cloud now natively supports Google authentication with a managed solution that requires no additional API keys or configuration. This makes adding Google Sign-In very straightforward.

## What Will Be Added

A "Continue with Google" button on the Auth page that allows users to sign in with their Google account alongside the existing email/password option.

## Implementation Plan

### Step 1: Configure Google OAuth Provider
First, I'll use Lovable's social auth configuration tool to set up the Google provider. This will:
- Generate the `@lovable.dev/cloud-auth-js` package integration
- Create the `src/integrations/lovable/` module with the auth client

### Step 2: Add Google Sign-In Function to Auth Context
**File**: `src/hooks/useAuth.tsx`

Add a new `signInWithGoogle` function that uses the Lovable auth module:
```typescript
import { lovable } from "@/integrations/lovable/index";

// Add to AuthContextType interface
signInWithGoogle: () => Promise<{ error: Error | null }>;

// Add function in AuthProvider
const signInWithGoogle = async () => {
  const { error } = await lovable.auth.signInWithOAuth("google", {
    redirect_uri: window.location.origin,
  });
  return { error: error as Error | null };
};
```

### Step 3: Add Google Button to Auth Page
**File**: `src/pages/Auth.tsx`

Add a styled Google sign-in button with a visual separator:
```typescript
// After the form, before the toggle text
<div className="relative my-6">
  <div className="absolute inset-0 flex items-center">
    <div className="w-full border-t border-border" />
  </div>
  <div className="relative flex justify-center text-xs uppercase">
    <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
  </div>
</div>

<Button
  type="button"
  variant="outline"
  className="w-full"
  onClick={handleGoogleSignIn}
  disabled={isSubmitting}
>
  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
    {/* Google "G" logo SVG path */}
  </svg>
  Continue with Google
</Button>
```

### Step 4: Handle Google Sign-In with Error Handling
**File**: `src/pages/Auth.tsx`

Add the handler function:
```typescript
const handleGoogleSignIn = async () => {
  setIsSubmitting(true);
  try {
    const { error } = await signInWithGoogle();
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Google Sign In Failed',
        description: error.message || 'Could not sign in with Google. Please try again.',
      });
    }
  } catch (err) {
    toast({
      variant: 'destructive',
      title: 'Error',
      description: 'An unexpected error occurred. Please try again.',
    });
  } finally {
    setIsSubmitting(false);
  }
};
```

## Files to Create/Modify

| File | Change |
|------|--------|
| `src/integrations/lovable/` | **AUTO-GENERATED** - Lovable auth module |
| `src/hooks/useAuth.tsx` | Add `signInWithGoogle` function |
| `src/pages/Auth.tsx` | Add Google button with separator |

## Visual Design

The auth page will look like this:

```
┌──────────────────────────────┐
│    🎵 DDR Score Tracker      │
│                              │
│  ┌────────────────────────┐  │
│  │     Welcome back       │  │
│  │                        │  │
│  │  Email: [_________]    │  │
│  │  Password: [______]    │  │
│  │                        │  │
│  │  [    Sign In    ]     │  │
│  │                        │  │
│  │  ─── Or continue with ───│  │
│  │                        │  │
│  │  [G Continue with Google]│  │
│  │                        │  │
│  │  Don't have an account? │  │
│  │        Sign up          │  │
│  └────────────────────────┘  │
└──────────────────────────────┘
```

## How It Works

1. User clicks "Continue with Google"
2. Lovable Cloud handles the OAuth flow with its managed Google credentials
3. User is redirected to Google to authorize
4. After authorization, user is redirected back and automatically signed in
5. The existing `onAuthStateChange` listener in `useAuth.tsx` picks up the session

## No Configuration Needed

Lovable Cloud automatically manages:
- Google OAuth client ID and secret
- Redirect URLs
- Token handling and refresh

You can optionally bring your own Google OAuth credentials through Cloud Dashboard > Users > Authentication Settings if you want custom branding on the Google consent screen.

