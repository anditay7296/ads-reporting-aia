"use client";

import { useEffect, useState, useCallback } from "react";
import { DashboardData } from "@/types";
import KOLCard from "./KOLCard";
import ChangeTag from "./ChangeTag";

function fmt(n: number, decimals = 2) {
  return n.toLocaleString("en-MY", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [dataSource, setDataSource] = useState<string>("…");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/data", { cache: "no-store" });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
      setDataSource(res.headers.get("X-Data-Source") ?? "live");
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function buildWhatsAppText(): string {
    if (!data) return "";
    const d = data;
    const extra = d.adsTotal - d.adsTarget;
    const lines = [
      `*${d.webinarDate}*`,
      `███████████████`,
      ` `,
      `*WEBINAR ${d.webinarSession}*`,
      `TOTAL REGISTRANTS: *${d.totalRegistrants.toLocaleString()}*`,
      `⁻⁻⁻⁻⁻⁻⁻⁻⁻⁻⁻⁻⁻⁻⁻⁻⁻⁻⁻⁻⁻⁻⁻⁻⁻⁻⁻⁻⁻⁻⁻⁻⁻⁻⁻⁻⁻⁻⁻⁻⁻⁻⁻⁻⁻`,
      `ADS: *${d.adsTotal.toLocaleString()}* vs KOL: *${d.kolTotal.toLocaleString()}*`,
      `🌿 *ADS - AI 网络自由创业*`,
      `\`Ads: ${d.adsPaid}（+${d.adsPaidChange}）; Organic: ${d.adsOrganic}（+${d.adsOrganicChange}）\``,
      `* Registered: *${d.adsTotal.toLocaleString()}* / ${d.adsTarget.toLocaleString()} (+${d.adsTotalChange})`,
      `* Countdown: ${d.countdownDays} DAYS`,
      `* (extra ${extra.toLocaleString()})`,
      ``,
      ...d.kols
        .filter((k) => k.count > 0)
        .map(
          (k) =>
            `${k.emoji} *${k.name}*\n* Registered: *${k.count}*（+${k.change})`
        ),
      ``,
      `*${d.weekly.dateRange}*`,
      `Weekly Ads Spent: RM ${fmt(d.weekly.spentWithoutTax)} + tax = RM${fmt(d.weekly.spentWithTax)}`,
      `Number of Views of Landing Page: ${d.weekly.views.toLocaleString()}`,
      `Number of Optins: ${d.weekly.optins.toLocaleString()}`,
      `CPL: RM${fmt(d.weekly.cpl)} (with tax RM${fmt(d.weekly.cplWithTax)})`,
      ``,
      `Yesterday Ads Spent: RM ${fmt(d.yesterday.spentWithoutTax)} + tax = RM${fmt(d.yesterday.spentWithTax)}`,
      `Number of Views of Landing Page: ${d.yesterday.views.toLocaleString()}`,
      `Number of Optins: ${d.yesterday.optins.toLocaleString()}`,
      `CPL: RM${fmt(d.yesterday.cpl)} (with tax RM${fmt(d.yesterday.cplWithTax)})`,
    ];
    return lines.join("\n");
  }

  async function copyWhatsApp() {
    await navigator.clipboard.writeText(buildWhatsAppText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 gap-4">
        <div className="card text-red-400 max-w-lg w-full">
          <p className="font-bold mb-1">Failed to load data</p>
          <p className="text-sm font-mono">{error}</p>
        </div>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold text-sm transition"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[#8b949e] animate-pulse text-lg">Loading data…</div>
      </div>
    );
  }

  const extra = data.adsTotal - data.adsTarget;
  const adsPercent = Math.round((data.adsTotal / data.totalRegistrants) * 100);
  const kolPercent = 100 - adsPercent;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="section-label">WEBINAR {data.webinarSession}</p>
          <h1 className="text-2xl font-bold mt-0.5">{data.webinarDate}</h1>
          <p className="text-[#8b949e] text-sm mt-1">AI 网络自由创业</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={copyWhatsApp}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition flex items-center gap-2 ${
              copied
                ? "bg-green-700 text-white"
                : "bg-[#21262d] hover:bg-[#30363d] border border-[#30363d]"
            }`}
          >
            {copied ? "✓ Copied!" : "📋 Copy WhatsApp"}
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-4 py-2 rounded-lg font-semibold text-sm transition bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] flex items-center gap-2"
          >
            {loading ? (
              <span className="animate-spin">⟳</span>
            ) : (
              <span>↻</span>
            )}
            Refresh
          </button>
        </div>
      </div>

      {/* Setup banner */}
      {data._setupNeeded && (
        <div className="rounded-lg border border-yellow-600/50 bg-yellow-900/20 px-4 py-3 text-sm text-yellow-300">
          <p className="font-semibold mb-1">⚙️ Setup required — showing demo data</p>
          <p className="text-yellow-400/80 text-xs leading-relaxed">
            1. Deploy <code className="bg-yellow-900/40 px-1 rounded">Code.gs</code> as a Google Apps Script web app<br />
            2. Add <code className="bg-yellow-900/40 px-1 rounded">APPS_SCRIPT_URL</code> in Vercel → Settings → Environment Variables<br />
            3. Add <code className="bg-yellow-900/40 px-1 rounded">META_ADS_ACCESS_TOKEN</code> (optional, for live ad spend)<br />
            4. Redeploy
          </p>
        </div>
      )}

      {/* Last updated */}
      <div className="text-xs text-[#8b949e]">
        <span>
          Last updated:{" "}
          {new Date(data.lastUpdated).toLocaleTimeString("en-MY", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      {/* Total Registrants */}
      <div className="card text-center py-6">
        <p className="section-label mb-2">Total Registrants</p>
        <div className="flex items-center justify-center gap-3">
          <span className="text-6xl font-extrabold text-white">
            {data.totalRegistrants.toLocaleString()}
          </span>
          <ChangeTag value={data.totalChange} />
        </div>
        <div className="mt-3 flex justify-center gap-6 text-sm text-[#8b949e]">
          <span>ADS {adsPercent}%</span>
          <span>KOL {kolPercent}%</span>
        </div>
      </div>

      {/* ADS vs KOL split */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card text-center">
          <p className="section-label mb-1">ADS Total</p>
          <p className="text-4xl font-bold text-yellow-400">
            {data.adsTotal.toLocaleString()}
          </p>
          <div className="mt-1">
            <ChangeTag value={data.adsTotalChange} />
          </div>
          <p className="text-xs text-[#8b949e] mt-2">
            Target: {data.adsTarget.toLocaleString()} · Extra:{" "}
            <span className="text-green-400 font-semibold">
              +{extra.toLocaleString()}
            </span>
          </p>
        </div>
        <div className="card text-center">
          <p className="section-label mb-1">KOL Total</p>
          <p className="text-4xl font-bold text-purple-400">
            {data.kolTotal.toLocaleString()}
          </p>
          <div className="mt-1">
            <ChangeTag value={data.kolTotalChange} />
          </div>
          <p className="text-xs text-[#8b949e] mt-2">
            {data.countdownDays === 0
              ? "🔴 Webinar Today!"
              : `Countdown: ${data.countdownDays} day${data.countdownDays !== 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      {/* ADS Breakdown */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">🌿</span>
          <h2 className="font-bold text-lg">ADS — AI 网络自由创业</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#0d1117] rounded-lg p-3">
            <p className="section-label mb-1">Paid Ads</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-yellow-300">
                {data.adsPaid.toLocaleString()}
              </span>
              <ChangeTag value={data.adsPaidChange} />
            </div>
          </div>
          <div className="bg-[#0d1117] rounded-lg p-3">
            <p className="section-label mb-1">Organic (Reeve IG)</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-blue-300">
                {data.adsOrganic.toLocaleString()}
              </span>
              <ChangeTag value={data.adsOrganicChange} />
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-sm text-[#8b949e]">
          <span>
            Registered:{" "}
            <span className="text-white font-semibold">
              {data.adsTotal.toLocaleString()}
            </span>{" "}
            / {data.adsTarget.toLocaleString()}
          </span>
          <span>·</span>
          <span>
            Extra:{" "}
            <span className="text-green-400 font-semibold">
              +{extra.toLocaleString()}
            </span>
          </span>
          <span>·</span>
          <span>
            Countdown:{" "}
            <span className={data.countdownDays === 0 ? "text-red-400 font-semibold" : "text-white"}>
              {data.countdownDays} DAYS
            </span>
          </span>
        </div>
      </div>

      {/* KOL Cards */}
      <div>
        <p className="section-label mb-2">KOL Registrations</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data.kols.map((kol) => (
            <KOLCard key={kol.name} kol={kol} />
          ))}
        </div>
      </div>

      {/* Weekly Stats */}
      <div className="card">
        <p className="section-label mb-3">Weekly Stats</p>
        <p className="text-sm font-semibold text-[#e6edf3] mb-3">
          {data.weekly.dateRange}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatBox
            label="Ads Spent"
            value={`RM ${fmt(data.weekly.spentWithoutTax)}`}
            sub={`w/ tax RM ${fmt(data.weekly.spentWithTax)}`}
          />
          <StatBox
            label="Views"
            value={data.weekly.views.toLocaleString()}
          />
          <StatBox
            label="Optins"
            value={data.weekly.optins.toLocaleString()}
          />
          <StatBox
            label="CPL"
            value={`RM ${fmt(data.weekly.cpl)}`}
            sub={`w/ tax RM ${fmt(data.weekly.cplWithTax)}`}
            highlight
          />
        </div>
      </div>

      {/* Yesterday Stats */}
      <div className="card">
        <p className="section-label mb-3">Yesterday — {data.yesterday.date}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatBox
            label="Ads Spent"
            value={`RM ${fmt(data.yesterday.spentWithoutTax)}`}
            sub={`w/ tax RM ${fmt(data.yesterday.spentWithTax)}`}
          />
          <StatBox
            label="Views"
            value={data.yesterday.views.toLocaleString()}
          />
          <StatBox
            label="Optins"
            value={data.yesterday.optins.toLocaleString()}
          />
          <StatBox
            label="CPL"
            value={`RM ${fmt(data.yesterday.cpl)}`}
            sub={`w/ tax RM ${fmt(data.yesterday.cplWithTax)}`}
            highlight
          />
        </div>
      </div>

      <p className="text-center text-xs text-[#484f58] pb-4">
        {dataSource === "meta-ads"
          ? "Spend/Views/Optins from Meta Ads API · Registrations from Google Sheets"
          : dataSource === "mock"
          ? "Mock data (dev mode)"
          : "Data from Google Sheets"}
      </p>
    </div>
  );
}

function StatBox({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div className="bg-[#0d1117] rounded-lg p-3">
      <p className="section-label mb-1">{label}</p>
      <p
        className={`text-lg font-bold ${highlight ? "text-green-400" : "text-[#e6edf3]"}`}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-[#8b949e] mt-0.5">{sub}</p>}
    </div>
  );
}
