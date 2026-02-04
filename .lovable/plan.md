
# Fix SDP Definition and Recommendation Logic

## Problem
Edi is recommending songs without PFCs as SDP targets. This is incorrect because:
- **SDP is a specific type of PFC** - it requires zero Greats/Goods/Misses
- A song without a PFC cannot possibly be an SDP target
- Good SDP targets are songs where the user already has a PFC with 10-20 perfects (score 999,800-999,900)

## Solution
Update the SDP section in `supabase/functions/edi-chat/index.ts` to clarify:

1. **SDP requires PFC first** - Make explicit that SDP is a subset of PFC
2. **Valid SDP targets** - Only songs with existing PFC and score 999,800-999,900
3. **Invalid SDP targets** - Any song without a PFC (GFC, FC, or lower)

## Changes

### File: `supabase/functions/edi-chat/index.ts`

Update lines 604-614 (SDP section) to:

```text
6. SDP (SINGLE DIGIT PERFECTS):
   CRITICAL: SDP is a TYPE OF PFC - you CANNOT have an SDP without a PFC!
   - SDP = PFC with 9 or fewer Perfect judgments (score 999,910+)
   - A song without a PFC (GFC, FC, or lower) can NEVER be an SDP target
   
   Score thresholds (PFC required for all):
   * 1,000,000 = MFC (0 perfects)
   * 999,910-999,990 = SDP (1-9 perfects)  
   * 999,800-999,900 = CLOSE to SDP (10-20 perfects) ← Good SDP targets
   * 999,700 or below with PFC = far from SDP
   
   RECOMMENDING SDP TARGETS:
   - ONLY recommend songs where halo = 'pfc' or 'mfc'
   - Best targets: PFC with score 999,800-999,900 (10-20 perfects to improve)
   - Songs with GFC/FC/lower are NOT SDP targets - recommend PFC goal instead
   
   User phrases:
   - "I want to SDP this" = goal is 999,910+ (must already have PFC)
   - "Close to SDP" = has PFC, score 999,800-999,900
   - "SDP targets" = songs with PFC at 999,800-999,900
```

## Technical Details
- The change updates the system prompt instructions only
- No calculation logic changes needed - this is about teaching Edi when to recommend SDP targets
- The key insight: filter by `halo = 'pfc' or 'mfc'` AND `score between 999800-999900` for SDP recommendations
