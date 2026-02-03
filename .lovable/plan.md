
# Fix Edi Chat Interface Layout

## Problem Analysis
The Edi page is currently rendered inside `AppLayout`, which:
- Always shows the `BottomNav` component
- Adds `pb-[120px]` padding to accommodate the nav
- Conflicts with Edi's own `h-[100dvh]` full-height layout

The result: the bottom nav overlaps/appears below the chat, and there's a large empty gap under the chat input.

## Solution

Move the Edi route **outside** of the `AppLayout` wrapper so it gets its own isolated layout without the bottom nav or extra padding.

### Changes Required

**1. Modify `src/App.tsx`**
- Move the `/edi` route outside of the `AppLayout` wrapper
- Keep it as a protected route, but wrap it with just `ScoresProvider` (needed for score data access)

```text
Before:
  <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
    <Route path="/home" ... />
    <Route path="/edi" ... />  <-- Inside AppLayout
    ...
  </Route>

After:
  <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
    <Route path="/home" ... />
    ...
  </Route>
  <Route 
    path="/edi" 
    element={
      <ProtectedRoute>
        <ScoresProvider>
          <Edi />
        </ScoresProvider>
      </ProtectedRoute>
    } 
  />  <-- Standalone, no BottomNav
```

**2. Update `src/pages/Edi.tsx` (minor cleanup)**
- Remove the `border-t` from the ChatInput wrapper since it already has its own border
- Ensure the input stays pinned to the actual bottom of the viewport

## Visual Result
- Chat input will be anchored directly to the bottom of the screen
- No bottom navigation bar on the Edi page
- Hamburger menu remains for navigation to other pages
- Full-height chat experience

## Technical Notes
- The Edi page already has its own hamburger menu with navigation links (Home, Scores, Upload, Profile)
- `ScoresProvider` is required for the `useScores` hook used in Edi
- No other files need changes - ChatInput styling is already correct
