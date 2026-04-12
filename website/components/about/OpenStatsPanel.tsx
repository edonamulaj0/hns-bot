"use client";

import { motion } from "framer-motion";
import type { AboutStatsPayload } from "@/lib/about-stats";
import { memberDisplayName } from "@/lib/member-label";
import { githubProfileHref } from "@/lib/url";

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function OpenStatsPanel({ data }: { data: AboutStatsPayload }) {
  const maxStack = Math.max(...data.topStacks.map((t) => t.count), 1);
  const counts = data.monthly.map((m) => m.count);
  const maxM = Math.max(...counts, 1);
  const w = 360;
  const h = 96;
  const n = data.monthly.length;
  const pathD =
    n === 0
      ? `M 0 ${h / 2} L ${w} ${h / 2}`
      : data.monthly
          .map((m, i) => {
            const x = n === 1 ? w / 2 : (i / (n - 1)) * w;
            const y = h - (m.count / maxM) * (h - 12) - 6;
            return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
          })
          .join(" ");

  const ghTop = data.topUser ? githubProfileHref(data.topUser.github) : null;

  return (
    <section className="section border-t border-[var(--border)] bg-[var(--bg-card)]">
      <div className="container max-w-5xl">
        <h2 className="text-2xl sm:text-3xl font-bold mb-2">By the numbers</h2>
        <p className="text-sm text-white/50 mb-10 max-w-2xl">
          Open stats from the live API — totals and trends across the community.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {[
            { label: "Total XP distributed", value: data.totalXp.toLocaleString() },
            { label: "Projects shipped", value: data.totalProjects.toLocaleString() },
            { label: "Articles shared", value: data.totalBlogs.toLocaleString() },
          ].map((s) => (
            <div key={s.label} className="card p-5">
              <p className="mono text-[0.65rem] text-white/45 uppercase tracking-wider mb-2">{s.label}</p>
              <p className="text-3xl font-bold text-[var(--accent)] tabular-nums">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-10">
          <div className="card p-5 sm:p-6">
            <h3 className="font-bold mb-4">Most used tech stacks</h3>
            <p className="text-xs text-white/45 mb-4 mono">Top 8 by members listing the stack</p>
            {data.topStacks.length === 0 ? (
              <p className="text-sm text-white/50">No stack data yet.</p>
            ) : (
              <ul className="space-y-3">
                {data.topStacks.map((row) => {
                  const pct = Math.round((row.count / maxStack) * 100);
                  return (
                    <li key={row.name}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-white/80">{row.name}</span>
                        <span className="mono text-white/45">{row.count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-[var(--border)] overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-[var(--accent)]"
                          initial={{ width: 0 }}
                          whileInView={{ width: `${pct}%` }}
                          viewport={{ once: true, amount: 0.4 }}
                          transition={{ duration: 0.9, ease: EASE_OUT }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="card p-5 sm:p-6">
            <h3 className="font-bold mb-4">Submissions per month</h3>
            <p className="text-xs text-white/45 mb-4 mono">Published portfolio entries</p>
            <div className="w-full overflow-x-auto">
              <svg width={w} height={h + 24} className="mx-auto block max-w-full">
                <motion.path
                  d={pathD}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0, opacity: 0.4 }}
                  whileInView={{ pathLength: 1, opacity: 1 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 1.15, ease: EASE_OUT }}
                />
              </svg>
            </div>
            {n > 0 && (
              <div className="flex flex-wrap gap-2 mt-2 justify-center">
                {data.monthly.map((m) => (
                  <span key={m.month} className="mono text-[0.6rem] text-white/35">
                    {m.month}: {m.count}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {data.topUser && (
          <div className="card p-6 border-[var(--accent)]/35 bg-[rgba(204,255,0,0.04)]">
            <p className="mono text-[0.65rem] text-[var(--accent)] uppercase tracking-wider mb-2">
              Top contributor (all-time XP)
            </p>
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="text-2xl font-bold">{memberDisplayName(data.topUser)}</span>
              <span className="text-[var(--accent)] font-bold mono">{data.topUser.points} XP</span>
              {ghTop && (
                <a href={ghTop} target="_blank" rel="noopener noreferrer" className="btn text-xs py-1">
                  GitHub
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
