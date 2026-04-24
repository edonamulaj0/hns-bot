import HomePageClient from "./HomePageClient";
import { getLeaderboard, getPortfolio } from "@/lib/api";

export default async function HomePage() {
  const [initialPortfolio, initialLeaderboard] = await Promise.all([
    getPortfolio(),
    getLeaderboard(),
  ]);

  return (
    <HomePageClient
      initialPortfolio={initialPortfolio}
      initialLeaderboard={initialLeaderboard}
    />
  );
}
