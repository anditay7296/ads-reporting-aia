"use client";

import { useCallback, useEffect, useState } from "react";
import type { MetaAdsData, AdRow } from "@/types";

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtRM(n: number) {
  return `RM${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtNum(n: number) {
  return n.toLocaleString("en-MY");
}
function fmtPct(n: number) {
  return `${n.toFixed(2)}%`;
}
function fmtRoas(n: number) {
  return n.toFixed(2);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-bold uppercase tracking-widest text-[#8b949e] mb-3">
      {children}
    </h3>
  );
}

function StatGrid({
  items,
}: {
  items: { label: string; value: string; highlight?: boolean }[];
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map(({ label, value, highlight }) => (
        <div key={label} className="card p-3">
          <div className="text-[11px] uppercase tracking-wider text-[#8b949e] mb-1">
            {label}
          </div>
          <div
            className={`text-lg font-bold ${highlight ? "text-[#58a6ff]" : "text-[#e6edf3]"}`}
          >
            {value}
          </div>
        </div>
      ))}
    </div>
  );
}

function AdsTable({
  rows,
  columns,
}: {
  rows: AdRow[];
  columns: {
    header: string;
    render: (r: AdRow, i: number) => React.ReactNode;
    className?: string;
  }[];
}) {
  if (rows.length === 0) {
    return (
      <p className="text-[#8b949e] text-sm py-4 text-center">No data</p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#30363d]">
            <th className="text-left py-2 px-2 text-[11px] uppercase tracking-wider text-[#8b949e] w-6">
              #
            </th>
            {columns.map((col) => (
              <th
                key={col.header}
                className={`text-left py-2 px-2 text-[11px] uppercase tracking-wider text-[#8b949e] ${col.className ?? ""}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={`${row.no}-${i}`}
              className="border-b border-[#21262d] hover:bg-[#161b22] transition-colors"
            >
              <td className="py-2 px-2 text-[#8b949e]">{i + 1}</td>
              {columns.map((col) => (
                <td key={col.header} className={`py-2 px-2 ${col.className ?? ""}`}>
                  {col.render(row, i)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Top 10 tables ────────────────────────────────────────────────────────────

function Top10BySpend({ rows }: { rows: AdRow[] }) {
  const cols = [
    {
      header: "No.",
      render: (r: AdRow) => <span className="font-mono text-[#79c0ff]">{r.no}</span>,
      className: "w-20",
    },
    {
      header: "Creative",
      render: (r: AdRow) => (
        <span className="text-[#e6edf3] truncate block max-w-[240px]" title={r.creative}>
          {r.creative}
        </span>
      ),
    },
    {
      header: "Spend",
      render: (r: AdRow) => <span className="text-[#3fb950] font-semibold">{fmtRM(r.spend)}</span>,
      className: "whitespace-nowrap",
    },
    {
      header: "Leads",
      render: (r: AdRow) => <span className="text-[#e6edf3]">{r.leads || "—"}</span>,
    },
    {
      header: "CPL",
      render: (r: AdRow) => (
        <span className="text-[#e6edf3]">{r.leads > 0 ? fmtRM(r.cpl) : "—"}</span>
      ),
      className: "whitespace-nowrap",
    },
    {
      header: "ROAS",
      render: (r: AdRow) => (
        <span className="text-[#e6edf3]">{r.roas > 0 ? fmtRoas(r.roas) : "—"}</span>
      ),
    },
  ];
  return <AdsTable rows={rows} columns={cols} />;
}

function Top10ByLeads({ rows }: { rows: AdRow[] }) {
  const cols = [
    {
      header: "No.",
      render: (r: AdRow) => <span className="font-mono text-[#79c0ff]">{r.no}</span>,
      className: "w-20",
    },
    {
      header: "Creative",
      render: (r: AdRow) => (
        <span className="text-[#e6edf3] truncate block max-w-[240px]" title={r.creative}>
          {r.creative}
        </span>
      ),
    },
    {
      header: "Leads",
      render: (r: AdRow) => <span className="text-[#3fb950] font-semibold">{fmtNum(r.leads)}</span>,
    },
    {
      header: "Spend",
      render: (r: AdRow) => <span className="text-[#e6edf3]">{fmtRM(r.spend)}</span>,
      className: "whitespace-nowrap",
    },
    {
      header: "CPL",
      render: (r: AdRow) => (
        <span className="text-[#e6edf3]">{r.leads > 0 ? fmtRM(r.cpl) : "—"}</span>
      ),
      className: "whitespace-nowrap",
    },
    {
      header: "CTR",
      render: (r: AdRow) => <span className="text-[#e6edf3]">{fmtPct(r.ctr)}</span>,
    },
  ];
  return <AdsTable rows={rows} columns={cols} />;
}

function Top10ByRoas({ rows }: { rows: AdRow[] }) {
  const cols = [
    {
      header: "No.",
      render: (r: AdRow) => <span className="font-mono text-[#79c0ff]">{r.no}</span>,
      className: "w-20",
    },
    {
      header: "Creative",
      render: (r: AdRow) => (
        <span className="text-[#e6edf3] truncate block max-w-[240px]" title={r.creative}>
          {r.creative}
        </span>
      ),
    },
    {
      header: "ROAS",
      render: (r: AdRow) => <span className="text-[#3fb950] font-semibold">{fmtRoas(r.roas)}</span>,
    },
    {
      header: "Purchases",
      render: (r: AdRow) => <span className="text-[#e6edf3]">{fmtNum(r.purchases)}</span>,
    },
    {
      header: "Spend",
      render: (r: AdRow) => <span className="text-[#e6edf3]">{fmtRM(r.spend)}</span>,
      className: "whitespace-nowrap",
    },
    {
      header: "Leads",
      render: (r: AdRow) => <span className="text-[#e6edf3]">{r.leads || "—"}</span>,
    },
  ];
  return <AdsTable rows={rows} columns={cols} />;
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function MetaAdsReport() {
  const [data, setData] = useState<MetaAdsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<string>("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/meta-ads", { cache: "no-store" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      const json: MetaAdsData = await res.json();
      setData(json);
      setLastFetched(new Date().toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" }));
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e6edf3] px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold text-[#e6edf3]">Meta Ads Performance</h2>
            <p className="text-[#8b949e] text-sm mt-0.5">AIA Ads Acc · All-time + Last Webinar</p>
          </div>
          <div className="flex items-center gap-3">
            {lastFetched && (
              <span className="text-[#8b949e] text-xs">Updated {lastFetched}</span>
            )}
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-3 py-1.5 text-sm bg-[#21262d] border border-[#30363d] rounded-md hover:bg-[#30363d] transition-colors disabled:opacity-50"
            >
              {loading ? "Loading…" : "Refresh"}
            </button>
          </div>
        </div>

        {/* Error state */}
        {error && !loading && (
          <div className="card border-[#f85149]/40 bg-[#1a0000] p-4">
            <p className="text-[#f85149] font-semibold text-sm">Failed to load Meta Ads data</p>
            <p className="text-[#8b949e] text-sm mt-1">{error}</p>
            <button
              onClick={fetchData}
              className="mt-3 px-3 py-1.5 text-sm bg-[#21262d] border border-[#30363d] rounded-md hover:bg-[#30363d] transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && !data && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card p-4 animate-pulse">
                <div className="h-4 bg-[#21262d] rounded w-1/3 mb-3" />
                <div className="grid grid-cols-4 gap-3">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="h-16 bg-[#21262d] rounded" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Data sections */}
        {data && (
          <>
            {/* ── Account Summary ── */}
            <div className="card p-5">
              <SectionHeader>📊 Account Summary (All Time)</SectionHeader>
              <StatGrid
                items={[
                  { label: "Total Spend", value: fmtRM(data.accountSummary.totalSpend), highlight: true },
                  { label: "Total Leads", value: fmtNum(data.accountSummary.totalLeads) },
                  { label: "Avg CPL", value: fmtRM(data.accountSummary.avgCpl) },
                  { label: "Total Reach", value: fmtNum(data.accountSummary.totalReach) },
                  { label: "Total Clicks", value: fmtNum(data.accountSummary.totalClicks) },
                  { label: "Impressions", value: fmtNum(data.accountSummary.totalImpressions) },
                  { label: "Purchases", value: fmtNum(data.accountSummary.totalPurchases) },
                  { label: "Avg ROAS", value: fmtRoas(data.accountSummary.avgRoas) },
                ]}
              />
            </div>

            {/* ── Top 10 by Spend ── */}
            <div className="card p-5">
              <SectionHeader>🏆 Top 10 Ads by Spend</SectionHeader>
              <Top10BySpend rows={data.topBySpend} />
            </div>

            {/* ── Top 10 by Leads ── */}
            <div className="card p-5">
              <SectionHeader>🎯 Top 10 Ads by Leads</SectionHeader>
              <Top10ByLeads rows={data.topByLeads} />
            </div>

            {/* ── Top 10 by ROAS ── */}
            <div className="card p-5">
              <SectionHeader>💰 Top 10 Ads by ROAS</SectionHeader>
              {data.topByRoas.length === 0 ? (
                <p className="text-[#8b949e] text-sm">No purchase data available</p>
              ) : (
                <Top10ByRoas rows={data.topByRoas} />
              )}
            </div>

            {/* ── Last Webinar ── */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-[#30363d]" />
                <span className="text-sm font-semibold text-[#8b949e] whitespace-nowrap">
                  📅 Last Webinar — {data.lastWebinar.label}
                </span>
                <div className="h-px flex-1 bg-[#30363d]" />
              </div>

              {/* Webinar summary stats */}
              <div className="card p-5">
                <SectionHeader>Webinar Period Summary</SectionHeader>
                <StatGrid
                  items={[
                    { label: "Total Spend", value: fmtRM(data.lastWebinar.summary.totalSpend), highlight: true },
                    { label: "Total Leads", value: fmtNum(data.lastWebinar.summary.totalLeads) },
                    { label: "Avg CPL", value: fmtRM(data.lastWebinar.summary.avgCpl) },
                    { label: "Avg ROAS", value: fmtRoas(data.lastWebinar.summary.avgRoas) },
                  ]}
                />
              </div>

              {/* Webinar Top 10 by Spend */}
              <div className="card p-5">
                <SectionHeader>Top 10 Ads on Last Webinar by Spend</SectionHeader>
                <Top10BySpend rows={data.lastWebinar.topBySpend} />
              </div>

              {/* Webinar Top 10 by Leads */}
              <div className="card p-5">
                <SectionHeader>Top 10 Ads on Last Webinar by Leads</SectionHeader>
                <Top10ByLeads rows={data.lastWebinar.topByLeads} />
              </div>

              {/* Webinar Top 10 by ROAS */}
              <div className="card p-5">
                <SectionHeader>Top 10 Ads on Last Webinar by ROAS</SectionHeader>
                {data.lastWebinar.topByRoas.length === 0 ? (
                  <p className="text-[#8b949e] text-sm">No purchase data for this period</p>
                ) : (
                  <Top10ByRoas rows={data.lastWebinar.topByRoas} />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
