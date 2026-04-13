import type { DiscordHono } from "discord-hono";
import type { HonoWorkerEnv } from "../worker-env";
import { isAdmin } from "./admin";

function extractClaudeText(data: any): string {
  const parts = Array.isArray(data?.content) ? data.content : [];
  return parts
    .filter((p: any) => p?.type === "text" && typeof p?.text === "string")
    .map((p: any) => p.text)
    .join("\n")
    .trim();
}

export function registerAdminTestClaude(app: DiscordHono<HonoWorkerEnv>) {
  return app.command("admin-test-claude", async (c) =>
    c.flags("EPHEMERAL").resDefer(async (ctx) => {
      if (!ctx.env.ADMIN_ROLE_ID || !isAdmin(ctx.interaction, ctx.env.ADMIN_ROLE_ID)) {
        await ctx.followup({ content: "⛔ Unauthorized." });
        return;
      }
      if (!ctx.env.CLAUDE_API_KEY?.trim()) {
        await ctx.followup({
          content: "❌ Claude API failed. Status: n/a. Error: Missing CLAUDE_API_KEY.",
        });
        return;
      }

      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": ctx.env.CLAUDE_API_KEY.trim(),
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 100,
            messages: [
              {
                role: "user",
                content: "Respond with exactly: CLAUDE_OK — API connection verified.",
              },
            ],
          }),
        });

        const raw = await res.text();
        console.log("admin-test-claude raw response:", raw);

        if (!res.ok) {
          await ctx.followup({
            content: `❌ Claude API failed. Status: ${res.status}. Error: ${raw.slice(0, 500)}`,
          });
          return;
        }

        let parsed: any = null;
        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = null;
        }
        const text = parsed ? extractClaudeText(parsed) : raw;

        if (text.includes("CLAUDE_OK")) {
          await ctx.followup({
            content: `✅ Claude API connected. Model: claude-sonnet-4-20250514. Response: ${text}`,
          });
          return;
        }

        await ctx.followup({
          content: `❌ Claude API failed. Status: ${res.status}. Error: CLAUDE_OK marker missing in response.`,
        });
      } catch (err) {
        await ctx.followup({
          content: `❌ Claude API failed. Status: n/a. Error: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }),
  );
}
