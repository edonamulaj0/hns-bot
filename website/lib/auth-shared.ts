export interface SessionUser {
  discordId: string;
  displayName: string;
  avatarHash: string | null;
  /** Profile GitHub URL from D1; used for nav avatar. */
  github?: string | null;
}
