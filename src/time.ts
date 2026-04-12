export type Phase = "BUILD" | "VOTE" | "PUBLISH" | "POST_PUBLISH";

export type HackerCycle = "A" | "B";
export type HackerPhase = "BUILD" | "VOTE" | "BUFFER";

export interface HackerState {
  cycle: HackerCycle;
  phase: HackerPhase;
}

export function monthKey(date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function getMonthlyPhase(date = new Date()): Phase {
  const day = date.getUTCDate();
  if (day >= 1 && day <= 21) return "BUILD";
  if (day >= 22 && day <= 29) return "VOTE";
  if (day === 30) return "PUBLISH";
  return "POST_PUBLISH";
}

/**
 * Get the hacker track phase for a given date.
 * 
 * Two-week cycle:
 * - Cycle A: days 1-14 (BUILD days 1-11, VOTE days 12-14, BUFFER days 15+)
 * - Cycle B: days 15-28 (BUILD days 15-25, VOTE days 26-28, BUFFER days 29+)
 * - Days 29-31 are buffer/overflow
 */
export function getHackerPhase(date = new Date()): HackerState {
  const day = date.getUTCDate();
  
  // Cycle A: days 1-14
  if (day >= 1 && day <= 14) {
    if (day >= 1 && day <= 11) {
      return { cycle: "A", phase: "BUILD" };
    }
    // Days 12-14: voting window
    return { cycle: "A", phase: "VOTE" };
  }
  
  // Cycle B: days 15-28
  if (day >= 15 && day <= 28) {
    if (day >= 15 && day <= 25) {
      return { cycle: "B", phase: "BUILD" };
    }
    // Days 26-28: voting window
    return { cycle: "B", phase: "VOTE" };
  }
  
  // Days 29-31: buffer/carry-over
  return { cycle: "B", phase: "BUFFER" };
}

/**
 * Check if submissions are open for the hacker track.
 */
export function isHackerSubmissionOpen(date = new Date()): boolean {
  const state = getHackerPhase(date);
  return state.phase === "BUILD";
}

/**
 * Check if voting is open for the hacker track.
 */
export function isHackerVotingOpen(date = new Date()): boolean {
  const state = getHackerPhase(date);
  return state.phase === "VOTE";
}
