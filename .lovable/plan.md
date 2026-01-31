

# Enhanced Caching & Performance Optimizations

## Summary
Implement multiple caching layers to dramatically improve performance since score and image data only changes on upload. This includes browser caching for images, PWA service worker caching, optimized React Query cache invalidation, and HTTP cache headers for static assets.

---

## Current State Analysis

| Area | Current Implementation | Opportunity |
|------|----------------------|-------------|
| **React Query** | 5-min staleTime, 10-min gcTime | Increase to longer durations |
| **Song Jacket Images** | No caching strategy | Add service worker + browser caching |
| **Score Data** | Refetched on navigation | Smart invalidation on upload only |
| **MusicDB Catalog** | 5-min cache | Near-permanent cache (rarely changes) |
| **Static Assets** | Default Vite handling | PWA precaching |
| **Upload Invalidation** | Manual refetch call | Targeted cache invalidation |

---

## Phase 1: Aggressive React Query Caching

### 1A. Extend Cache Durations

Since data only changes on upload, extend cache times significantly:

```typescript
// src/App.tsx - Updated QueryClient config
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 60 * 1000,  // 30 minutes (was 5)
      gcTime: 60 * 60 * 1000,     // 60 minutes (was 10)
      refetchOnWindowFocus: false,
      refetchOnMount: false,       // Don't refetch if data exists
      retry: 1,
    },
  },
});
```

### 1B. Upload-Triggered Invalidation

Centralize cache invalidation when upload completes:

```typescript
// src/hooks/useUploadInvalidation.ts
export function useUploadInvalidation() {
  const queryClient = useQueryClient();
  
  const invalidateAfterUpload = useCallback(() => {
    // Invalidate all score-related queries
    queryClient.invalidateQueries({ queryKey: ['user-scores'] });
    queryClient.invalidateQueries({ queryKey: ['user-stats'] });
    queryClient.invalidateQueries({ queryKey: ['goals'] });
  }, [queryClient]);
  
  return { invalidateAfterUpload };
}
```

### 1C. MusicDB Catalog - Near-Permanent Cache

The song catalog rarely changes (only admin updates):

```typescript
// useMusicDbCount.ts
staleTime: Infinity,           // Never stale
gcTime: 24 * 60 * 60 * 1000,   // Keep for 24 hours
```

---

## Phase 2: Service Worker & PWA Caching

### 2A. Install VitePWA Plugin

Add service worker support for offline caching:

| Package | Purpose |
|---------|---------|
| `vite-plugin-pwa` | PWA plugin for Vite |
| `workbox-precaching` | Precache static assets |
| `workbox-strategies` | Runtime caching strategies |

### 2B. Configure VitePWA

```typescript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Precache built assets
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        
        // Runtime caching for song jackets
        runtimeCaching: [
          {
            urlPattern: /\/storage\/v1\/object\/public\/song-jackets\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'song-jackets-cache',
              expiration: {
                maxEntries: 2000,              // ~1300 songs
                maxAgeSeconds: 30 * 24 * 60 * 60  // 30 days
              },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxAgeSeconds: 365 * 24 * 60 * 60 }
            }
          }
        ]
      },
      manifest: {
        name: 'DDR Score Tracker',
        short_name: 'DDR Tracker',
        theme_color: '#1a1a2e'
      }
    })
  ]
});
```

### 2C. Song Jacket Caching Benefits

| Scenario | Before | After |
|----------|--------|-------|
| First load | Network request | Network request |
| Repeat visits | Network request | Instant from cache |
| Offline | Broken images | Cached images work |
| Scroll performance | Network bottleneck | Local cache instant |

---

## Phase 3: HTTP Cache Headers

### 3A. Supabase Storage Cache Headers

Song jackets are stored in Supabase Storage. Enable browser caching by setting cache headers on the bucket:

```sql
-- Update song-jackets bucket to enable caching
-- This is done via Supabase dashboard or API, not SQL
-- Set Cache-Control: public, max-age=31536000, immutable
```

**Note:** This requires configuring the storage bucket's default cache headers in Cloud View.

### 3B. Edge Function Response Headers

For any future edge functions serving static-ish data:

```typescript
return new Response(JSON.stringify(data), {
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=3600', // 1 hour
  }
});
```

---

## Phase 4: Image Loading Optimization

### 4A. Preload Critical Images

Add link preloads for above-the-fold images:

```html
<!-- index.html - Optional for landing page images -->
<link rel="preload" as="image" href="/path/to/critical-image.png">
```

### 4B. Intersection Observer for Lazy Loading

The current `loading="lazy"` is good. Enhance with IntersectionObserver for prefetching:

```typescript
// Optional: Prefetch images just before they enter viewport
const prefetchImage = (url: string) => {
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.as = 'image';
  link.href = url;
  document.head.appendChild(link);
};
```

---

## Phase 5: LocalStorage for UI State

### 5A. Persist Filter Selections (Already Done)

The app already persists selected levels and filters in localStorage - good!

### 5B. Consider IndexedDB for Score Data (Optional - Advanced)

For offline support or very large datasets:

```typescript
// Could cache scores in IndexedDB with idb-keyval
// Only sync delta on upload
import { get, set } from 'idb-keyval';

// Store scores locally
await set('user-scores', scores);

// Retrieve on app load
const cached = await get('user-scores');
```

**Trade-off:** Adds complexity, only needed for true offline support.

---

## Files to Modify/Create

| File | Change |
|------|--------|
| `package.json` | Add `vite-plugin-pwa` dependency |
| `vite.config.ts` | Configure VitePWA plugin |
| `src/App.tsx` | Extend cache durations |
| `src/hooks/useUploadInvalidation.ts` | New - centralized cache invalidation |
| `src/pages/Upload.tsx` | Use invalidation hook after upload |
| `src/hooks/useMusicDbCount.ts` | Set staleTime to Infinity |
| `index.html` | Add manifest link, theme-color meta |

---

## Implementation Priority

| Phase | Effort | Impact | Priority |
|-------|--------|--------|----------|
| **1A-C: React Query tuning** | Low | High | Do first |
| **2A-C: PWA + Service Worker** | Medium | Very High | Do second |
| **3A-B: HTTP Cache Headers** | Low | Medium | Do third |
| **4A-B: Image optimization** | Low | Medium | Optional |
| **5B: IndexedDB offline** | High | Low | Skip unless needed |

---

## Expected Performance Gains

| Metric | Current | After Optimization |
|--------|---------|-------------------|
| Repeat page loads | ~2-3s API calls | <100ms (cached) |
| Song jacket loading | Network every time | Instant from SW cache |
| Score list scroll | Lazy load each image | Pre-cached images |
| App after upload | Full refetch | Targeted invalidation |
| Offline capability | None | Basic offline with cached data |

---

## Technical Considerations

1. **Cache Busting:** PWA handles this via content hashing
2. **Cache Size:** ~1300 jacket images × ~10KB = ~13MB (acceptable)
3. **Upload Sync:** Invalidate caches immediately on successful upload
4. **Stale Data Risk:** Low - users control when they upload new data
5. **Service Worker Updates:** VitePWA handles auto-updates gracefully

