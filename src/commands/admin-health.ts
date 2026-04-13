import type { DiscordHono } from "discord-hono";
import type { HonoWorkerEnv } from "../worker-env";
import { getPrisma } from "../db";
import { XP_ROLES } from "../roles";
import { ensureRolesExist } from "../role-manager";

function getDiscordUserId(interaction: any): string | null {
  return interaction?.member?.user?.id ?? interaction?.user?.id ?? null;
}

function getMemberRoleIds(interaction: any): string[] {
  return Array.isArray(interaction?.member?.roles) ? interaction.member.roles : [];
}

export function registerAdminHealth(app: DiscordHono<HonoWorkerEnv>) {
  return app.command("admin", async (c) =>
    c.flags("EPHEMERAL").resDefer(async (ctx) => {
      const callerId = getDiscordUserId(ctx.interaction);
      const memberRoles = getMemberRoleIds(ctx.interaction);
      if (!callerId) {
        await ctx.followup({ content: "Could not detect your Discord ID." });
        return;
      }

      if (!ctx.env.ADMIN_ROLE_ID || !memberRoles.includes(ctx.env.ADMIN_ROLE_ID)) {
        await ctx.followup({ content: "This command is admin-only." });
        return;
      }

      const prisma = getPrisma(ctx.env.DB);
      const roleMap = await ensureRolesExist(prisma, ctx.env.DISCORD_GUILD_ID, ctx.env.DISCORD_TOKEN);

      const rolesRes = await fetch(`https://discord.com/api/v10/guilds/${ctx.env.DISCORD_GUILD_ID}/roles`, {
        headers: { Authorization: `Bot ${ctx.env.DISCORD_TOKEN}` },
      });
      if (!rolesRes.ok) {
        await ctx.followup({ content: "Could not read guild role hierarchy from Discord." });
        return;
      }

      const guildRoles: Array<{ id: string; name: string; position: number }> = await rolesRes.json();
      const botMemberRes = await fetch(
        `https://discord.com/api/v10/guilds/${ctx.env.DISCORD_GUILD_ID}/members/${ctx.env.DISCORD_APPLICATION_ID}`,
        { headers: { Authorization: `Bot ${ctx.env.DISCORD_TOKEN}` } },
      );
      const botMember: { roles: string[] } | null = botMemberRes.ok ? await botMemberRes.json() : null;
      const botPos = botMember
        ? botMember.roles
            .map((id) => guildRoles.find((r) => r.id === id)?.position ?? -1)
            .reduce((max, p) => Math.max(max, p), -1)
        : -1;

      const xpLines = XP_ROLES.map((def) => {
        const id = roleMap.get(def.key) ?? "(missing)";
        return `${def.emoji} ${def.name}: ${id}`;
      });

      const warnings: string[] = [];
      for (const def of XP_ROLES) {
        const roleId = roleMap.get(def.key);
        if (!roleId) continue;
        const role = guildRoles.find((r) => r.id === roleId);
        if (!role) {
          warnings.push(`Missing role in guild: ${def.emoji} ${def.name}`);
          continue;
        }
        if (botPos <= role.position) {
          warnings.push(`Bot role is below ${def.emoji} ${def.name}; move bot role higher.`);
        }
      }

      await ctx.followup({
        embeds: [
          {
            title: "Admin health-check",
            color: warnings.length ? 0xf59e0b : 0x57f287,
            fields: [
              { name: "XP roles", value: xpLines.join("\n"), inline: false },
              {
                name: "Bot hierarchy",
                value: `Bot role position: ${botPos >= 0 ? String(botPos) : "unknown"}`,
                inline: false,
              },
              {
                name: "Warnings",
                value: warnings.length ? warnings.join("\n") : "No hierarchy issues detected.",
                inline: false,
              },
            ],
          },
        ],
      });
    }),
  );
}
