import type { Metadata } from "next";
import { ManageContentClient } from "../ManageContentClient";

export const metadata: Metadata = {
  title: "Manage Other Projects | H4ck&Stack",
  description: "Create, edit, and delete additional profile projects.",
};

export default function ProfileProjectsPage() {
  return <ManageContentClient kind="PROJECT" title="Manage Other Projects" />;
}
