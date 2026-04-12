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

/** True if host is medium.com or *.medium.com */
export function isMediumHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "medium.com" || h.endsWith(".medium.com");
}

/**
 * Article URL for /share-blog: must be valid https URL; Medium hosts are explicitly supported.
 */
export function validateShareBlogArticleUrl(url: string | undefined): ValidationError | null {
  if (!url?.trim()) {
    return { field: "url", message: "Enter an article URL or upload a .txt/.md file." };
  }
  try {
    const u = new URL(url.trim());
    if (u.protocol !== "https:" && u.protocol !== "http:") {
      return { field: "url", message: "URL must start with http:// or https://" };
    }
    return null;
  } catch {
    return { field: "url", message: "Please enter a valid URL" };
  }
}

/** Derive a title from the last path segment of a Medium-style URL slug. */
export function titleFromMediumOrArticleUrl(url: string): string | null {
  try {
    const u = new URL(url.trim());
    const parts = u.pathname.split("/").filter(Boolean);
    const slug = parts[parts.length - 1];
    if (!slug) return null;
    return humanizeSlug(slug);
  } catch {
    return null;
  }
}

function humanizeSlug(slug: string): string {
  const decoded = decodeURIComponent(slug.replace(/\+/g, " "));
  return decoded
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function titleFromMarkdownFirstHeading(markdown: string, fallbackTitle: string): string {
  const m = markdown.match(/^\s*#\s+(.+)$/m);
  if (m?.[1]) return m[1].trim().slice(0, 200);
  return fallbackTitle.slice(0, 200);
}

export function humanizeFilenameBase(filename: string): string {
  const base = filename.replace(/^.*[/\\]/, "").replace(/\.[^.]+$/, "");
  const spaced = base.replace(/[-_]+/g, " ").trim();
  if (!spaced) return "Article";
  return spaced.replace(/\b\w/g, (c) => c.toUpperCase());
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