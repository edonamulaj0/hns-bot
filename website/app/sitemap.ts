import type { MetadataRoute } from "next";
import { getMembers } from "@/lib/api";

export const runtime = "edge";

function getBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (!raw) return "https://h4cknstack.com";
  return raw.replace(/\/$/, "");
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();
  const now = new Date();

  const staticRoutes = [
    "/",
    "/about",
    "/activity",
    "/blog",
    "/challenges",
    "/challenges/developers",
    "/challenges/designers",
    "/challenges/hackers",
    "/join",
    "/members",
    "/privacy",
    "/profile",
    "/profile/articles",
    "/profile/projects",
    "/profile/submissions",
    "/settings",
    "/settings/submissions",
    "/submit",
    "/terms",
    "/what-we-do",
  ];

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
  }));

  const members = await getMembers();
  const memberEntries: MetadataRoute.Sitemap = members.members
    .filter((member) => Boolean(member.profileCompletedAt))
    .map((member) => ({
      url: `${baseUrl}/members/user/${member.discordId}`,
      lastModified: member.profileCompletedAt
        ? new Date(member.profileCompletedAt)
        : now,
    }));

  return [...staticEntries, ...memberEntries];
}
