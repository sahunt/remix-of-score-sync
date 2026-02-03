
# Edi AI Feature Diagnostic Analysis

## Root Cause: CORS Header Mismatch

The `import-chart-analysis` edge function has **incomplete CORS headers**, causing all requests to fail with "Failed to fetch" errors.

### Current State (Broken)
```javascript
// import-chart-analysis/index.ts line 4-7
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
```

### Required State (Working - from edi-chat)
```javascript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
```

**The Supabase JS SDK sends these additional headers that are being blocked:**
- `x-supabase-client-platform: macOS`
- Other platform/runtime version headers

---

## Data State Assessment

| Data Source | Current Count | Expected | Status |
|-------------|---------------|----------|--------|
| `chart_analysis` table | **0 rows** | ~1,248 | EMPTY (import blocked) |
| `musicdb` table (SP, not deleted) | 5,834 songs | ~5,800+ | OK |
| `user_scores` table | 5,849 scores | varies | OK |
| `chart_analysis.csv` | 1,248 lines | 1,248 | OK |

---

## Secondary Issue: Auth Method Compatibility

The `edi-chat` function uses `supabase.auth.getClaims()` which may not exist in all Supabase JS versions. This should be changed to `supabase.auth.getUser()` for reliability.

```typescript
// Current (potentially problematic) - line 577-583
const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);

// Should be
const { data: userData, error: userError } = await supabase.auth.getUser(token);
const userId = userData?.user?.id;
```

---

## Implementation Plan

### Step 1: Fix CORS headers in import-chart-analysis
Update line 4-7 to include all required headers.

### Step 2: Fix auth method in edi-chat
Replace `getClaims()` with `getUser()` for Supabase SDK compatibility.

### Step 3: Re-deploy edge functions
Deploy both updated functions.

### Step 4: Verify data flow
The page will auto-import chart_analysis.csv data when refreshed.

---

## Technical Details

### Data Flow for Edi Feature

```text
1. Page Load (Edi.tsx)
   ├── Query chart_analysis count
   ├── If count = 0:
   │   ├── Fetch /chart_analysis.csv (1,248 charts)
   │   └── POST to import-chart-analysis function ← FAILING HERE (CORS)
   └── Display "Loading chart data..." message

2. User Sends Message
   ├── POST to edi-chat function
   │   ├── Fetch ALL user_scores (paginated, 1000/page)
   │   ├── Fetch ALL chart_analysis records (paginated)
   │   ├── Fetch ALL musicdb SP charts (paginated, ~5,800)
   │   ├── Build player profile (ceilings, proficiencies)
   │   ├── Generate system prompt with embedded data
   │   └── Stream response from Gemini AI
   └── Display streamed response with song cards
```

### Files to Modify

1. **supabase/functions/import-chart-analysis/index.ts**
   - Update corsHeaders constant (lines 4-7)

2. **supabase/functions/edi-chat/index.ts**
   - Replace `getClaims()` with `getUser()` (lines 577-585)

---

## Success Criteria Verification

After fixes, Edi will have access to:

| Data Type | Access Method | Scope |
|-----------|---------------|-------|
| User's scores | Direct query with user_id filter | ALL user scores (paginated) |
| Song catalog | Direct query on musicdb | ALL 5,834 SP charts |
| Pattern metrics | Direct query on chart_analysis | ALL 1,248 Level 12+ charts |
| AI responses | Lovable AI Gateway (Gemini) | Streaming with full context |

All data is fetched using pagination (1000 rows/page) to avoid Supabase's default row limit.
