 // Skill: Warmup Rules
 // How to build warmup sets safely
 
 export function shouldActivate(message: string): boolean {
   const lower = message.toLowerCase();
   return /warmup|warm up|warm-up|prepare|injury|hurt|before playing|start.*session/i.test(lower);
 }
 
 export function buildPrompt(): string {
   return `
 ══════════════════════════════════════════════════════════════════════════════
 WARMUP SET RULES
 ══════════════════════════════════════════════════════════════════════════════
 
 ★ USE THIS SECTION FOR: "warmup set", "prepare for X", "don't want to get hurt"
 
 WARMUP LEVEL FORMULA:
 Warmups should be 4-5 levels BELOW target difficulty:
 
 | Target Level | Warmup Levels |
 |--------------|---------------|
 | 17s          | 12s, 13s, 14s |
 | 16s          | 11s, 12s, 13s |
 | 15s          | 10s, 11s, 12s |
 | 14s          | 9s, 10s, 11s  |
 
 ⚠️ WRONG: Warming up for 17s with 15s and 16s (too close to target!)
 ✓ RIGHT: Warming up for 17s with 12s, 13s, 14s (proper gap)
 
 WARMUP SET STRUCTURE (4 songs):
 1. Song 1: Very easy (target - 5 levels) - wake up the feet
 2. Song 2: Easy (target - 4 levels) - build rhythm
 3. Song 3: Moderate (target - 3 levels) - light challenge
 4. Song 4: Bridge (target - 2 levels) - transition to main work
 
 SAFETY CONSIDERATIONS:
 - If user mentions injury risk, prioritize safety over challenge
 - If user says they "hurt themselves going too hard", drop warmup levels even lower
 - Cold muscles + hard charts = injury risk
 - Better to over-warm than under-warm
 
 GOOD WARMUP CHARACTERISTICS:
 - Consistent BPM (no speed changes during warmup)
 - Patterns the player is comfortable with
 - Songs they enjoy (warmups should be fun, not stressful)
 `;
 }