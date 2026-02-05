 // Calculate total stats across ALL levels (not just 12+)
 
 import { UserScore, TotalStats, CatalogCounts, ChartAnalysis } from "./types.ts";
 
 export function calculateTotalStats(userScores: UserScore[]): TotalStats {
   let totalMfcs = 0;
   let totalPfcs = 0;
   let totalGfcs = 0;
   let totalFcs = 0;
   let totalLife4s = 0;
   let totalClears = 0;
   let totalAAAs = 0;
 
   for (const score of userScores) {
     const halo = score.halo?.toLowerCase() || '';
     const rank = score.rank?.toUpperCase() || '';
 
     if (halo === 'mfc') totalMfcs++;
     if (halo === 'pfc') totalPfcs++;
     if (halo === 'gfc') totalGfcs++;
     if (halo === 'fc') totalFcs++;
     if (halo === 'life4') totalLife4s++;
     if (!['fail', 'none', ''].includes(halo)) totalClears++;
     if (rank === 'AAA') totalAAAs++;
   }
 
   return {
     totalPlayed: userScores.length,
     totalMfcs,
     totalPfcs,
     totalGfcs,
     totalFcs,
     totalLife4s,
     totalClears,
     totalAAAs,
   };
 }
 
 export function calculateCatalogCounts(chartAnalysis: ChartAnalysis[]): CatalogCounts {
   const byLevel = new Map<number, number>();
   
   for (const chart of chartAnalysis) {
     const level = chart.difficulty_level;
     byLevel.set(level, (byLevel.get(level) || 0) + 1);
   }
   
   return {
     byLevel,
     total: chartAnalysis.length,
   };
 }
 
 export function formatCatalogCounts(counts: CatalogCounts): string {
   return Array.from(counts.byLevel.entries())
     .sort((a, b) => a[0] - b[0])
     .map(([level, count]) => `Level ${level}: ${count} charts`)
     .join('\n');
 }