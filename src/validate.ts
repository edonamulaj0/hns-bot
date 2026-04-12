/**
 * Input validation layer with user-facing error messages.
 */

// Valid tiers for developer track submissions
export const VALID_TIERS = ["Beginner", "Intermediate", "Advanced"] as const;
export type Tier = (typeof VALID_TIERS)[number];

// Valid challenge types for hacker track submissions
export const VALID_CHALLENGE_TYPES = [
  "CTF_WRITEUP",
  "TOOL_BUILD",
  "VULN_RESEARCH",
  "REDTEAM",
] as const;
export type ChallengeType = (typeof VALID_CHALLENGE_TYPES)[number];

/**
 * Validation result with user-friendly error message
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validates a GitHub URL.
 * Accepts: https://github.com/username, https://github.com/username/
 * Returns error message if invalid.
 */
export function validateGitHubUrl(url: string | undefined): ValidationError | null {
  if (!url) return null; // Optional field
  
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "github.com") {
      return { field: "github", message: "URL must be from github.com" };
    }
    // Check for valid username path (should be /username/repo or just /username)
    const path = parsed.pathname.slice(1).split("/");
    if (path[0] === "" || path[0] === "sponsors") {
      return { field: "github", message: "Invalid GitHub URL format" };
    }
    return null;
  } catch {
    return { field: "github", message: "Please enter a valid URL" };
  }
}

/**
 * Validates a LinkedIn URL.
 * Accepts: https://linkedin.com/in/username
 * Returns error message if invalid.
 */
export function validateLinkedInUrl(url: string | undefined): ValidationError | null {
  if (!url) return null; // Optional field
  
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("linkedin.com")) {
      return { field: "linkedin", message: "URL must be from linkedin.com" };
    }
    if (!parsed.pathname.startsWith("/in/")) {
      return { field: "linkedin", message: "LinkedIn URL should be in /in/username format" };
    }
    return null;
  } catch {
    return { field: "linkedin", message: "Please enter a valid URL" };
  }
}

/**
 * Validates a generic URL.
 * Returns error message if invalid.
 */
export function validateUrl(url: string | undefined, fieldName: string): ValidationError | null {
  if (!url) {
    return { field: fieldName, message: "URL is required" };
  }
  
  try {
    new URL(url);
    return null;
  } catch {
    return { field: fieldName, message: "Please enter a valid URL" };
  }
}

/**
 * Validates a tier enum value.
 * Returns error message if invalid.
 */
export function validateTier(tier: string | undefined): ValidationError | null {
  if (!tier) {
    return { field: "tier", message: "Tier is required" };
  }
  
  const normalized = tier.trim();
  if (!VALID_TIERS.map(t => t.toLowerCase()).includes(normalized.toLowerCase())) {
    return { 
      field: "tier", 
      message: `Tier must be one of: ${VALID_TIERS.join(", ")}` 
    };
  }
  return null;
}

/**
 * Validates a challenge type enum value.
 * Returns error message if invalid.
 */
export function validateChallengeType(challengeType: string | undefined): ValidationError | null {
  if (!challengeType) {
    return { field: "challenge_type", message: "Challenge type is required" };
  }
  
  const normalized = challengeType.trim().toUpperCase();
  if (!VALID_CHALLENGE_TYPES.includes(normalized as ChallengeType)) {
    return { 
      field: "challenge_type", 
      message: `Challenge type must be one of: ${VALID_CHALLENGE_TYPES.join(", ")}` 
    };
  }
  return null;
}

/**
 * Enforces maximum length on a string field.
 * Returns error message if exceeded.
 */
export function enforceMaxLength(
  value: string | undefined,
  fieldName: string,
  maxLength: number
): ValidationError | null {
  if (value && value.length > maxLength) {
    return { 
      field: fieldName, 
      message: `${fieldName} must be ${maxLength} characters or less` 
    };
  }
  return null;
}

/**
 * Enforces minimum length on a string field.
 * Returns error message if not met.
 */
export function enforceMinLength(
  value: string | undefined,
  fieldName: string,
  minLength: number
): ValidationError | null {
  if (value && value.trim().length < minLength) {
    return { 
      field: fieldName, 
      message: `${fieldName} must be at least ${minLength} characters` 
    };
  }
  return null;
}