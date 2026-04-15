import type { Metadata } from "next";
import { ManageContentClient } from "../ManageContentClient";

export const metadata: Metadata = {
  title: "Manage Articles | H4ck&Stack",
  description: "Create, edit, and delete your profile articles.",
};

export default function ProfileArticlesPage() {
  return <ManageContentClient kind="ARTICLE" title="Manage Articles" />;
}
