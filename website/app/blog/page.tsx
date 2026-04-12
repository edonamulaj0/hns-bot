import { permanentRedirect } from "next/navigation";

/** @deprecated Articles live under Members and Activity; keep URL for bookmarks. */
export default function BlogRedirectPage() {
  permanentRedirect("/members?view=articles");
}
