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

// ─── Facebook Ads Manager link ────────────────────────────────────────────────

function fbAdUrl(adId: string) {
  return `https://www.facebook.com/adsmanager/manage/ads?act=555700366717773&selected_ad_ids=${adId}`;
}

// ─── Podium helpers ───────────────────────────────────────────────────────────

function rowStyle(i: number) {
  if (i === 0) return "bg-amber-50  border-l-[4px] border-l-amber-400  hover:bg-amber-100";
  if (i === 1) return "bg-slate-50  border-l-[4px] border-l-slate-400  hover:bg-slate-100";
  if (i === 2) return "bg-orange-50 border-l-[4px] border-l-orange-400 hover:bg-orange-100";
  return "bg-white border-l-[4px] border-l-transparent hover:bg-gray-50";
}

function PosBadge({ i }: { i: number }) {
  if (i === 0)
    return (
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-400 text-white text-sm font-extrabold shadow shadow-amber-200 ring-2 ring-amber-300">
        1
      </span>
    );
  if (i === 1)
    return (
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-400 text-white text-sm font-extrabold shadow shadow-slate-200 ring-2 ring-slate-300">
        2
      </span>
    );
  if (i === 2)
    return (
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-orange-400 text-white text-sm font-extrabold shadow shadow-orange-200 ring-2 ring-orange-300">
        3
      </span>
    );
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-gray-500 text-xs font-bold">
      {i + 1}
    </span>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-1 h-6 bg-f1-red rounded-full" />
      <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-f1-red">
        {children}
      </h3>
      <div className="f1-divider" />
    </div>
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
        <div key={label} className="f1-stat-card">
          <div className="text-[10px] uppercase tracking-[0.15em] text-gray-500 font-bold mb-1">
            {label}
          </div>
          <div
            className={`text-xl font-extrabold tracking-tight ${highlight ? "text-f1-red" : "text-white"}`}
          >
            {value}
          </div>
        </div>
      ))}
    </div>
  );
}

function BarIndicator({ pct, color = "bg-f1-red" }: { pct: number; color?: string }) {
  return (
    <div className="mt-1 h-1 rounded-full bg-gray-200 overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

function AdNoLink({ r }: { r: AdRow }) {
  return (
    <a
      href={fbAdUrl(r.adId)}
      target="_blank"
      rel="noopener noreferrer"
      className="font-mono text-xs text-blue-600 hover:text-blue-800 hover:underline font-bold"
    >
      {r.no}
    </a>
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
      <p className="text-gray-400 text-sm py-4 text-center">No data</p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-800 border-b border-gray-700">
            <th className="text-left py-3 px-3 text-[10px] uppercase tracking-[0.15em] font-bold text-gray-300 w-12">
              Rank
            </th>
            {columns.map((col) => (
              <th
                key={col.header}
                className={`text-left py-3 px-3 text-[10px] uppercase tracking-[0.15em] font-bold text-gray-300 ${col.className ?? ""}`}
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
              className={`border-b border-gray-100 transition-colors last:border-0 ${rowStyle(i)}`}
            >
              <td className="py-3 px-3">
                <PosBadge i={i} />
              </td>
              {columns.map((col) => (
                <td key={col.header} className={`py-3 px-3 ${col.className ?? ""}`}>
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
  const maxSpend = rows[0]?.spend || 1;
  const cols = [
    {
      header: "Ad No.",
      render: (r: AdRow) => <AdNoLink r={r} />,
      className: "w-20",
    },
    {
      header: "Creative",
      render: (r: AdRow) => (
        <span className="text-gray-900 font-semibold truncate block max-w-[200px]" title={r.creative}>
          {r.creative}
        </span>
      ),
    },
    {
      header: "Spend",
      render: (r: AdRow) => (
        <div>
          <span className="text-f1-red font-bold">{fmtRM(r.spend)}</span>
          <BarIndicator pct={(r.spend / maxSpend) * 100} />
        </div>
      ),
      className: "whitespace-nowrap",
    },
    {
      header: "Leads",
      render: (r: AdRow) => <span className="text-gray-800 font-semibold">{r.leads || "—"}</span>,
    },
    {
      header: "CPL",
      render: (r: AdRow) => (
        <span className="text-gray-700">{r.leads > 0 ? fmtRM(r.cpl) : "—"}</span>
      ),
      className: "whitespace-nowrap",
    },
    {
      header: "Purchases",
      render: (r: AdRow) => <span className="text-gray-700">{r.purchases || "—"}</span>,
    },
    {
      header: "ROAS",
      render: (r: AdRow) => (
        <span className="text-gray-700">{r.roas > 0 ? fmtRoas(r.roas) : "—"}</span>
      ),
    },
  ];
  return <AdsTable rows={rows} columns={cols} />;
}

function Top10ByLeads({ rows }: { rows: AdRow[] }) {
  const maxLeads = rows[0]?.leads || 1;
  const cols = [
    {
      header: "Ad No.",
      render: (r: AdRow) => <AdNoLink r={r} />,
      className: "w-20",
    },
    {
      header: "Creative",
      render: (r: AdRow) => (
        <span className="text-gray-900 font-semibold truncate block max-w-[200px]" title={r.creative}>
          {r.creative}
        </span>
      ),
    },
    {
      header: "Leads",
      render: (r: AdRow) => (
        <div>
          <span className="text-amber-500 font-bold">{fmtNum(r.leads)}</span>
          <BarIndicator pct={(r.leads / maxLeads) * 100} color="bg-amber-400" />
        </div>
      ),
    },
    {
      header: "Spend",
      render: (r: AdRow) => <span className="text-gray-700">{fmtRM(r.spend)}</span>,
      className: "whitespace-nowrap",
    },
    {
      header: "CPL",
      render: (r: AdRow) => (
        <span className="text-gray-700">{r.leads > 0 ? fmtRM(r.cpl) : "—"}</span>
      ),
      className: "whitespace-nowrap",
    },
    {
      header: "Purchases",
      render: (r: AdRow) => <span className="text-gray-700">{r.purchases || "—"}</span>,
    },
    {
      header: "ROAS",
      render: (r: AdRow) => (
        <span className="text-gray-700">{r.roas > 0 ? fmtRoas(r.roas) : "—"}</span>
      ),
    },
  ];
  return <AdsTable rows={rows} columns={cols} />;
}

function Top10ByRoas({ rows }: { rows: AdRow[] }) {
  const maxRoas = rows[0]?.roas || 1;
  const cols = [
    {
      header: "Ad No.",
      render: (r: AdRow) => <AdNoLink r={r} />,
      className: "w-20",
    },
    {
      header: "Creative",
      render: (r: AdRow) => (
        <span className="text-gray-900 font-semibold truncate block max-w-[200px]" title={r.creative}>
          {r.creative}
        </span>
      ),
    },
    {
      header: "ROAS",
      render: (r: AdRow) => (
        <div>
          <span className="text-emerald-600 font-bold">{fmtRoas(r.roas)}</span>
          <BarIndicator pct={(r.roas / maxRoas) * 100} color="bg-emerald-500" />
        </div>
      ),
    },
    {
      header: "Leads",
      render: (r: AdRow) => <span className="text-gray-700">{r.leads || "—"}</span>,
    },
    {
      header: "CPL",
      render: (r: AdRow) => (
        <span className="text-gray-700">{r.leads > 0 ? fmtRM(r.cpl) : "—"}</span>
      ),
      className: "whitespace-nowrap",
    },
    {
      header: "Purchases",
      render: (r: AdRow) => <span className="text-gray-800 font-semibold">{fmtNum(r.purchases)}</span>,
    },
    {
      header: "Spend",
      render: (r: AdRow) => <span className="text-gray-700">{fmtRM(r.spend)}</span>,
      className: "whitespace-nowrap",
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
    <div className="min-h-screen bg-f1-surface text-[#e6edf3] px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-extrabold uppercase tracking-wider text-white">
              Meta Ads Performance
            </h2>
            <p className="text-f1-red text-sm font-semibold uppercase tracking-widest mt-0.5">
              AIA Ads Acc · All-time + Last Webinar
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lastFetched && (
              <span className="text-gray-600 text-xs font-mono">Updated {lastFetched}</span>
            )}
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider bg-f1-red/10 border border-f1-red/30 text-f1-red rounded-md hover:bg-f1-red/20 transition-colors disabled:opacity-50"
            >
              {loading ? "Loading…" : "Refresh"}
            </button>
          </div>
        </div>

        {/* Racing stripe accent */}
        <div className="h-[2px] bg-gradient-to-r from-f1-red via-f1-red/40 to-transparent" />

        {/* Error state */}
        {error && !loading && (
          <div className="f1-card border-f1-red/40 bg-f1-red/5 p-4">
            <p className="text-f1-red font-bold text-sm uppercase tracking-wider">Failed to load Meta Ads data</p>
            <p className="text-gray-500 text-sm mt-1">{error}</p>
            <button
              onClick={fetchData}
              className="mt-3 px-4 py-1.5 text-xs font-bold uppercase tracking-wider bg-f1-red/10 border border-f1-red/30 text-f1-red rounded-md hover:bg-f1-red/20 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && !data && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="f1-card p-4 animate-pulse">
                <div className="h-4 bg-f1-red/10 rounded w-1/3 mb-3" />
                <div className="grid grid-cols-4 gap-3">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="h-16 bg-f1-carbon rounded" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Data sections */}
        {data && (
          <>
            {/* ── Last Webinar ── */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="f1-divider" />
                <span className="w-2 h-2 rounded-full bg-f1-red inline-block animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-f1-red whitespace-nowrap">
                  Last Webinar — {data.lastWebinar.label}
                </span>
                <div className="f1-divider" />
              </div>

              {/* Webinar summary stats */}
              <div className="f1-card p-5">
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
              <div className="f1-card p-5">
                <SectionHeader>Top 10 Ads · Last Webinar · By Spend</SectionHeader>
                <Top10BySpend rows={data.lastWebinar.topBySpend} />
              </div>

              {/* Webinar Top 10 by Leads */}
              <div className="f1-card p-5">
                <SectionHeader>Top 10 Ads · Last Webinar · By Leads</SectionHeader>
                <Top10ByLeads rows={data.lastWebinar.topByLeads} />
              </div>

              {/* Webinar Top 10 by ROAS */}
              <div className="f1-card p-5">
                <SectionHeader>Top 10 Ads · Last Webinar · By ROAS</SectionHeader>
                {data.lastWebinar.topByRoas.length === 0 ? (
                  <p className="text-gray-600 text-sm">No purchase data for this period</p>
                ) : (
                  <Top10ByRoas rows={data.lastWebinar.topByRoas} />
                )}
              </div>
            </div>

            {/* ── Account Summary (All Time) ── */}
            <div className="f1-card p-5">
              <SectionHeader>Account Summary · All Time</SectionHeader>
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
            <div className="f1-card p-5">
              <SectionHeader>Top 10 Ads by Spend</SectionHeader>
              <Top10BySpend rows={data.topBySpend} />
            </div>

            {/* ── Top 10 by Leads ── */}
            <div className="f1-card p-5">
              <SectionHeader>Top 10 Ads by Leads</SectionHeader>
              <Top10ByLeads rows={data.topByLeads} />
            </div>

            {/* ── Top 10 by ROAS ── */}
            <div className="f1-card p-5">
              <SectionHeader>Top 10 Ads by ROAS</SectionHeader>
              {data.topByRoas.length === 0 ? (
                <p className="text-gray-600 text-sm">No purchase data available</p>
              ) : (
                <Top10ByRoas rows={data.topByRoas} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
