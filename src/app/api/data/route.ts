import { NextResponse } from "next/server";
import { DashboardData } from "@/types";

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
const META_TOKEN = process.env.META_ADS_ACCESS_TOKEN;

// ADS accounts: AIA Ads Acc + AIA (MY)
const ADS_ACCOUNT_IDS = ["555700366717773", "2730029447177922"];
const META_BASE = "https://graph.facebook.com/v19.0";
const TAX_MULTIPLIER = 1.1669537; // amount * 1.08 + amount * 0.0869537037037037

const CACHE_SECONDS = 300; // 5 minutes
export const revalidate = CACHE_SECONDS;

// ─── Mock data (dev fallback when no APPS_SCRIPT_URL) ───────────────────────
const MOCK_DATA: DashboardData = {
  webinarSession: "0311",
  webinarDate: "MAR 11 (WED)",
  totalRegistrants: 3309,
  totalChange: 472,
  adsTotal: 2820,
  adsTotalChange: 393,
  adsTarget: 2000,
  adsPaid: 2694,
  adsPaidChange: 374,
  adsOrganic: 126,
  adsOrganicChange: 19,
  kolTotal: 489,
  kolTotalChange: 79,
  kols: [
    { name: "KOL #01 - Cody",    emoji: "🟣", count: 278, change: 46 },
    { name: "KOL #02 - DDW",     emoji: "🔵", count: 43,  change: 6  },
    { name: "KOL #03 - CHARLES", emoji: "🟠", count: 79,  change: 11 },
    { name: "KOL #04 - Kvin",    emoji: "🟤", count: 38,  change: 10 },
    { name: "KOL #05 - Kokee",   emoji: "🟢", count: 51,  change: 6  },
  ],
  weekly: {
    dateRange: "05/03 Thursday - 11/03 Wednesday (AI 网络自由创业)",
    spentWithoutTax: 79949.36,
    spentWithTax: 93297.20,
    views: 14598,
    optins: 2616,
    cpl: 30.57,
    cplWithTax: 35.67,
  },
  yesterday: {
    date: "10 MAR (TUE)",
    spentWithoutTax: 12083.14,
    spentWithTax: 14100.46,
    views: 2158,
    optins: 370,
    cpl: 32.66,
    cplWithTax: 38.11,
  },
  countdownDays: 0,
  lastUpdated: new Date().toISOString(),
};

// ─── Date helpers (all dates in MYT = UTC+8) ────────────────────────────────

/** Returns today's date at midnight, expressed as UTC Date, but representing the MYT calendar date. */
function getMYTToday(): Date {
  const nowUTC = new Date();
  const myt = new Date(nowUTC.getTime() + 8 * 60 * 60 * 1000); // shift to MYT
  return new Date(Date.UTC(myt.getUTCFullYear(), myt.getUTCMonth(), myt.getUTCDate()));
}

/**
 * Replicates the Sheets WEEKDAY(TODAY()-4, 2) formula to find the last Thursday.
 * Works correctly when today is any day Mon–Sun.
 */
function getLastThursday(today: Date): Date {
  const shifted = new Date(today);
  shifted.setUTCDate(today.getUTCDate() - 4);
  const dow = shifted.getUTCDay(); // 0=Sun … 6=Sat
  const mode2 = dow === 0 ? 7 : dow; // Mon=1 … Sun=7
  const result = new Date(today);
  result.setUTCDate(today.getUTCDate() - mode2);
  return result;
}

/** Returns YYYY-MM-DD string (MYT calendar date). */
function toISODate(d: Date): string {
  return d.toISOString().split("T")[0];
}

/** Returns DD/MM string. */
function toDDMM(d: Date): string {
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

const DAY_NAMES  = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const MONTH_ABBR = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
const DAY_ABBR   = ["SUN","MON","TUE","WED","THU","FRI","SAT"];

// ─── Meta Ads helpers ────────────────────────────────────────────────────────

interface MetaAction {
  action_type: string;
  value: string;
}

interface MetaInsightRow {
  spend: string;
  actions?: MetaAction[];        // total actions (used for lead/optins)
  unique_actions?: MetaAction[]; // unique actions (used for landing_page_view/views)
}

function getActionVal(actions: MetaAction[] | undefined, type: string): number {
  return parseFloat(actions?.find((a) => a.action_type === type)?.value ?? "0") || 0;
}

/** Fetches insights for one Meta Ads account for the given date range. */
async function fetchAccountInsights(
  accountId: string,
  since: string,
  until: string,
): Promise<MetaInsightRow | null> {
  const params = new URLSearchParams({
    fields: "spend,actions,unique_actions", // unique_actions for views, actions for leads
    time_range: JSON.stringify({ since, until }),
    access_token: META_TOKEN!,
  });
  try {
    const res = await fetch(`${META_BASE}/act_${accountId}/insights?${params}`);
    if (!res.ok) {
      console.warn(`Meta Ads API error for act_${accountId}: ${res.status}`);
      return null;
    }
    const json = await res.json();
    return (json.data as MetaInsightRow[])?.[0] ?? null;
  } catch (e) {
    console.warn(`Meta Ads fetch failed for act_${accountId}:`, e);
    return null;
  }
}

/** Aggregates spend + landing_page_view + lead from both ADS accounts for a date range. */
async function fetchMetaStats(since: string, until: string) {
  const rows = await Promise.all(
    ADS_ACCOUNT_IDS.map((id) => fetchAccountInsights(id, since, until)),
  );

  let spend = 0, views = 0, optins = 0;
  for (const row of rows) {
    if (!row) continue;
    spend  += parseFloat(row.spend || "0");
    views  += getActionVal(row.unique_actions, "landing_page_view"); // unique views
    optins += getActionVal(row.actions, "lead");                     // total leads
  }

  const spentWithTax = spend * TAX_MULTIPLIER;
  const cpl          = optins > 0 ? spend / optins : 0;
  const cplWithTax   = optins > 0 ? spentWithTax / optins : 0;

  return { spentWithoutTax: spend, spentWithTax, views, optins, cpl, cplWithTax };
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function GET() {
  // Dev fallback when Apps Script URL is not configured
  if (!APPS_SCRIPT_URL) {
    if (process.env.NODE_ENV === "development") {
      return NextResponse.json(MOCK_DATA, { headers: { "X-Data-Source": "mock" } });
    }
    return NextResponse.json(
      { error: "APPS_SCRIPT_URL environment variable is not set" },
      { status: 500 },
    );
  }

  try {
    // ── Date calculations (MYT) ──────────────────────────────────────────────
    const today        = getMYTToday();
    const yesterday    = new Date(today);
    yesterday.setUTCDate(today.getUTCDate() - 1);
    const lastThursday = getLastThursday(today);

    const todayStr        = toISODate(today);
    const yesterdayStr    = toISODate(yesterday);
    const lastThursdayStr = toISODate(lastThursday);

    // ── Fetch registration counts from Apps Script (always needed) ───────────
    const appsRes = await fetch(APPS_SCRIPT_URL, {
      next: { revalidate: CACHE_SECONDS },
      redirect: "follow",
    });
    if (!appsRes.ok) throw new Error(`Apps Script returned ${appsRes.status}`);
    const appsData = await appsRes.json();

    // ── Fetch spend/views/optins ─────────────────────────────────────────────
    let weekly: DashboardData["weekly"];
    let yesterdaySection: DashboardData["yesterday"];

    if (META_TOKEN) {
      // Pull live data from Meta Ads API for both ADS accounts
      const [weeklyMeta, ydMeta] = await Promise.all([
        fetchMetaStats(lastThursdayStr, todayStr),
        fetchMetaStats(yesterdayStr, yesterdayStr),
      ]);

      weekly = {
        dateRange: `${toDDMM(lastThursday)} ${DAY_NAMES[lastThursday.getUTCDay()]} - ${toDDMM(today)} ${DAY_NAMES[today.getUTCDay()]} (AI 网络自由创业)`,
        ...weeklyMeta,
      };

      yesterdaySection = {
        date: `${yesterday.getUTCDate()} ${MONTH_ABBR[yesterday.getUTCMonth()]} (${DAY_ABBR[yesterday.getUTCDay()]})`,
        ...ydMeta,
      };
    } else {
      // Fall back to Apps Script (reads from Daily Reporting sheet)
      weekly           = appsData.weekly;
      yesterdaySection = appsData.yesterday;
    }

    const result: DashboardData = {
      ...appsData,
      weekly,
      yesterday: yesterdaySection,
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": `s-maxage=${CACHE_SECONDS}, stale-while-revalidate`,
        "X-Data-Source": META_TOKEN ? "meta-ads" : "apps-script",
      },
    });
  } catch (err) {
    console.error("Failed to fetch dashboard data:", err);
    return NextResponse.json(
      { error: "Failed to fetch data", detail: String(err) },
      { status: 502 },
    );
  }
}
