import { NextResponse } from "next/server";
import type { AdRow, MetaAdsData } from "@/types";

const META_TOKEN = process.env.META_ADS_ACCESS_TOKEN;
// Only AIA Ads Acc for ad-level reporting (matches sync_meta_to_sheets.py)
const AD_ACCOUNT = "act_555700366717773";
const META_BASE = "https://graph.facebook.com/v21.0";

export const dynamic = "force-dynamic"; // skip build-time pre-rendering

// ─── Server-side in-memory cache ─────────────────────────────────────────────
// Keyed by webinar period — only re-fetches when the period changes.
let _serverCache: { data: MetaAdsData; cachedAt: number; periodKey: string } | null = null;

// ─── Raw API types ────────────────────────────────────────────────────────────

interface RawInsightRow {
  ad_id: string;
  ad_name: string;
  spend: string;
  impressions: string;
  clicks: string;
  ctr: string;
  cpc: string;
  reach: string;
  actions?: { action_type: string; value: string }[];
  video_thruplay_watched_actions?: { action_type: string; value: string }[];
  purchase_roas?: { action_type: string; value: string }[];
}

// ─── Regex helpers ────────────────────────────────────────────────────────────

function extractNo(adName: string): string {
  const m = adName.match(/(?:AIA|AI\s*小白)\s*-\s*([A-Z0-9]+)\s*-/);
  return m ? m[1] : adName.slice(0, 20);
}

/** Exclude ads from the AI 小白创业 page — tracked separately, not needed here. */
function isExcludedPage(adName: string): boolean {
  return adName.includes("AI 小白创业") || adName.includes("小白创业");
}

function isOriginal(adName: string): boolean {
  return !adName.includes("– Copy") && !adName.replace("–", "-").includes("- Copy");
}

function parseCreative(adName: string): { adType: string; creative: string } {
  const typeMatch = adName.match(/-\s*(IMAGE|VIDEO|REEL)\s*:/i);
  const adType = typeMatch ? typeMatch[1].toUpperCase() : "";
  const creativeMatch = adName.match(/(?:IMAGE|VIDEO|REEL):\s*(.+?)\s*-\s*COPY:/i);
  const creative = creativeMatch ? creativeMatch[1].trim() : adName;
  return { adType, creative };
}

// ─── Fetch all pages of insights ─────────────────────────────────────────────

async function fetchInsights(
  params: Record<string, string>,
  maxPages = 6,
): Promise<RawInsightRow[]> {
  const baseParams = new URLSearchParams({
    fields:
      "ad_id,ad_name,impressions,clicks,spend,ctr,cpc,reach,video_thruplay_watched_actions,actions,purchase_roas",
    level: "ad",
    limit: "500",
    time_increment: "all_days", // aggregate all days per ad — avoids daily row explosion
    access_token: META_TOKEN!,
    ...params,
  });

  const rows: RawInsightRow[] = [];
  let after: string | undefined;
  let pages = 0;

  while (pages < maxPages) {
    const pageParams = new URLSearchParams(baseParams);
    if (after) pageParams.set("after", after);

    const url = `${META_BASE}/${AD_ACCOUNT}/insights?${pageParams}`;

    // Retry with backoff on rate-limit (403 / code 4)
    let res: Response | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      res = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(30000),
      });
      if (res.status === 403) {
        const wait = (attempt + 1) * 10000; // 10s, 20s, 30s
        console.warn(`Meta Ads rate-limited (page ${pages + 1}), retrying in ${wait / 1000}s…`);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      break;
    }
    if (!res || !res.ok) {
      const errBody = res ? await res.text().catch(() => "") : "";
      console.warn(`Meta Ads insights error (page ${pages + 1}): ${res?.status}`, errBody.slice(0, 500));
      break;
    }
    const json = await res.json();
    if (json.error) {
      console.warn("Meta Ads API error:", json.error.message);
      break;
    }
    const data = json.data ?? [];
    rows.push(...data);

    // Use cursor-based pagination instead of following paging.next URL
    const nextCursor: string | undefined = json.paging?.cursors?.after;
    if (nextCursor && data.length > 0) {
      after = nextCursor;
    } else {
      break;
    }
    pages++;
  }

  console.log(`Meta Ads: fetched ${rows.length} rows across ${pages + 1} pages (maxPages=${maxPages})`);
  return rows;
}

// ─── Batch-fetch effective_object_story_id for real post URLs ─────────────────

async function fetchStoryIds(adIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!adIds.length) return map;

  // Process in parallel chunks of 50 (safe URL length)
  const chunks: string[][] = [];
  for (let i = 0; i < adIds.length; i += 50) {
    chunks.push(adIds.slice(i, i + 50));
  }

  await Promise.all(
    chunks.map(async (chunk) => {
      // Must fetch through creative.fields() — effective_object_story_id
      // lives on the AdCreative, not directly on the Ad object.
      const url =
        `${META_BASE}/?ids=${chunk.join(",")}&fields=id,creative.fields(effective_object_story_id)` +
        `&access_token=${META_TOKEN}`;
      try {
        const res = await fetch(url, {
          cache: "no-store",
          signal: AbortSignal.timeout(30000),
        });
        if (!res.ok) return;
        const json = await res.json();
        for (const [id, val] of Object.entries(
          json as Record<string, { creative?: { effective_object_story_id?: string } }>,
        )) {
          const storyId = val?.creative?.effective_object_story_id;
          if (storyId) {
            map.set(id, storyId);
          }
        }
      } catch {
        // non-fatal — ad number shown as plain text
      }
    }),
  );

  return map;
}

// ─── Group by ad No. (mirrors Python group_by_no) ────────────────────────────

function groupByNo(rows: RawInsightRow[], storyMap: Map<string, string>): AdRow[] {
  const buckets = new Map<
    string,
    {
      spend: number;
      impressions: number;
      clicks: number;
      reach: number;
      leads: number;
      purchases: number;
      views: number;
      roasSum: number;
      roasCount: number;
      variants: { name: string; id: string; spend: number }[];
    }
  >();

  for (const ad of rows) {
    const spend = parseFloat(ad.spend || "0");
    if (spend === 0) continue;

    const no = extractNo(ad.ad_name);
    if (!buckets.has(no)) {
      buckets.set(no, {
        spend: 0,
        impressions: 0,
        clicks: 0,
        reach: 0,
        leads: 0,
        purchases: 0,
        views: 0,
        roasSum: 0,
        roasCount: 0,
        variants: [],
      });
    }
    const b = buckets.get(no)!;

    b.spend += spend;
    b.impressions += parseInt(ad.impressions || "0", 10);
    b.clicks += parseInt(ad.clicks || "0", 10);
    b.reach += parseInt(ad.reach || "0", 10);

    for (const a of ad.actions ?? []) {
      if (a.action_type.toLowerCase().includes("lead")) {
        b.leads += parseInt(a.value, 10);
      }
      if (
        a.action_type === "purchase" ||
        a.action_type === "omni_purchase" ||
        a.action_type === "offsite_conversion.fb_pixel_purchase"
      ) {
        b.purchases += parseInt(a.value, 10);
      }
    }
    for (const a of ad.video_thruplay_watched_actions ?? []) {
      b.views += parseInt(a.value, 10);
    }
    if (ad.purchase_roas?.length) {
      b.roasSum += parseFloat(ad.purchase_roas[0].value);
      b.roasCount += 1;
    }

    b.variants.push({ name: ad.ad_name, id: ad.ad_id, spend });
  }

  const result: AdRow[] = [];
  for (const [no, b] of Array.from(buckets.entries())) {
    const orig = b.variants.find((v) => isOriginal(v.name));
    const rep = orig ?? b.variants.reduce((a, c) => (c.spend > a.spend ? c : a));
    const { adType, creative } = parseCreative(rep.name);

    const leads = b.leads;
    const spend = b.spend;
    const roas = b.roasCount > 0 ? b.roasSum / b.roasCount : 0;

    result.push({
      no,
      adId: rep.id,
      storyId: storyMap.get(rep.id),
      creative: creative.slice(0, 60),
      adType,
      spend,
      leads,
      purchases: b.purchases,
      views: b.views,
      cpl: leads > 0 ? spend / leads : 0,
      roas,
      ctr: b.impressions > 0 ? (b.clicks / b.impressions) * 100 : 0,
      cpc: b.clicks > 0 ? spend / b.clicks : 0,
      impressions: b.impressions,
      clicks: b.clicks,
      reach: b.reach,
    });
  }

  return result;
}

// ─── Last webinar period (Thu → Wed, matching Python last_wednesday logic) ────

function getLastWebinarPeriod(): { since: string; until: string } {
  const today = new Date();
  // MYT offset: UTC+8
  const myt = new Date(today.getTime() + 8 * 60 * 60 * 1000);
  const dayOfWeek = myt.getUTCDay(); // 0=Sun,1=Mon,...,3=Wed,...

  // Days back to last Wednesday
  let daysBack = (dayOfWeek - 3 + 7) % 7;
  if (daysBack === 0) daysBack = 7; // if today IS Wednesday, go back to prev one

  const lastWed = new Date(myt);
  lastWed.setUTCDate(myt.getUTCDate() - daysBack);

  const prevThu = new Date(lastWed);
  prevThu.setUTCDate(lastWed.getUTCDate() - 6);

  const fmt = (d: Date) => d.toISOString().split("T")[0];
  return { since: fmt(prevThu), until: fmt(lastWed) };
}

function buildSummary(rows: AdRow[]) {
  const totalSpend = rows.reduce((s, r) => s + r.spend, 0);
  const totalLeads = rows.reduce((s, r) => s + r.leads, 0);
  const totalPurchases = rows.reduce((s, r) => s + r.purchases, 0);
  const roasAds = rows.filter((r) => r.purchases > 0 && r.roas > 0);
  const avgRoas =
    roasAds.length > 0
      ? roasAds.reduce((s, r) => s + r.roas, 0) / roasAds.length
      : 0;
  return {
    totalSpend,
    totalLeads,
    totalPurchases,
    avgCpl: totalLeads > 0 ? totalSpend / totalLeads : 0,
    avgRoas,
  };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET() {
  if (!META_TOKEN) {
    return NextResponse.json(
      { error: "META_ADS_ACCESS_TOKEN not configured" },
      { status: 503 },
    );
  }

  try {
    const { since, until } = getLastWebinarPeriod();
    const periodKey = `${since}_${until}`;

    // Return cached data if the webinar period hasn't changed
    if (_serverCache && _serverCache.periodKey === periodKey) {
      console.log("Meta Ads: serving cached data for period", periodKey);
      return NextResponse.json(_serverCache.data, {
        headers: {
          "Cache-Control": "s-maxage=86400, stale-while-revalidate",
          "X-Cache": "HIT",
          "X-Cached-At": new Date(_serverCache.cachedAt).toISOString(),
        },
      });
    }

    console.log("Meta Ads: fetching fresh data for new period", periodKey);

    // Fetch all-time with high page cap (100 pages = 50,000 ads) to capture full spend
    const alltimeRows = await fetchInsights({ date_preset: "maximum" }, 100);
    const webinarRows = await fetchInsights(
      { time_range: JSON.stringify({ since, until }) },
      25,
    );

    // Exclude AI 小白创业 page ads from rankings only (not from summary totals)
    const filteredAlltimeRows = alltimeRows.filter((r) => !isExcludedPage(r.ad_name));
    const filteredWebinarRows = webinarRows.filter((r) => !isExcludedPage(r.ad_name));

    // Batch-fetch real Facebook post URLs for all unique ad IDs
    const allAdIds = Array.from(
      new Set([...filteredAlltimeRows, ...filteredWebinarRows].map((r) => r.ad_id)),
    );
    const storyMap = await fetchStoryIds(allAdIds);

    // All ads (incl. 小白创业) for summary totals
    const alltimeAll = groupByNo(alltimeRows, storyMap);
    // Filtered ads (excl. 小白创业) for ranking tables
    const alltime = groupByNo(filteredAlltimeRows, storyMap);
    const webinar = groupByNo(filteredWebinarRows, storyMap);

    // Summary uses ALL ads for accurate totals
    const totalSpend = alltimeAll.reduce((s, r) => s + r.spend, 0);
    const totalLeads = alltimeAll.reduce((s, r) => s + r.leads, 0);
    const totalImpressions = alltimeAll.reduce((s, r) => s + r.impressions, 0);
    const totalClicks = alltimeAll.reduce((s, r) => s + r.clicks, 0);
    const totalReach = alltimeAll.reduce((s, r) => s + r.reach, 0);
    const totalPurchases = alltimeAll.reduce((s, r) => s + r.purchases, 0);
    const roasAds = alltimeAll.filter((r) => r.purchases > 0 && r.roas > 0);
    const avgRoas =
      roasAds.length > 0
        ? roasAds.reduce((s, r) => s + r.roas, 0) / roasAds.length
        : 0;

    // Rankings use filtered ads (excl. 小白创业)
    const topBySpend = [...alltime].sort((a, b) => b.spend - a.spend);
    const topByLeads = [...alltime].sort((a, b) => b.leads - a.leads);
    const topByPurchasesAll = alltime.filter((r) => r.purchases > 0);
    const topByPurchases = [...topByPurchasesAll].sort((a, b) => b.purchases - a.purchases);
    const topByRoasAll = alltime.filter((r) => r.purchases > 0 && r.roas > 0);
    const topByRoas = [...topByRoasAll].sort((a, b) => b.roas - a.roas);

    const webinarPurchaseAds = webinar.filter((r) => r.purchases > 0);
    const webinarRoasAds = webinar.filter((r) => r.purchases > 0 && r.roas > 0);

    const data: MetaAdsData = {
      lastUpdated: new Date().toISOString(),
      accountSummary: {
        totalSpend,
        totalLeads,
        totalImpressions,
        totalClicks,
        totalReach,
        totalPurchases,
        avgCpl: totalLeads > 0 ? totalSpend / totalLeads : 0,
        avgCtr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
        avgCpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
        avgRoas,
      },
      topBySpend,
      topByLeads,
      topByPurchases,
      topByRoas,
      lastWebinar: {
        since,
        until,
        label: `${since} ~ ${until}`,
        summary: buildSummary(webinar),
        topBySpend: [...webinar].sort((a, b) => b.spend - a.spend),
        topByLeads: [...webinar].sort((a, b) => b.leads - a.leads),
        topByPurchases: [...webinarPurchaseAds].sort((a, b) => b.purchases - a.purchases),
        topByRoas: [...webinarRoasAds].sort((a, b) => b.roas - a.roas),
      },
    };

    // Save to server-side cache keyed by webinar period
    _serverCache = { data, cachedAt: Date.now(), periodKey };

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "s-maxage=86400, stale-while-revalidate",
      },
    });
  } catch (err) {
    console.error("Meta Ads reporting error:", err);

    // Return cached data if available, rather than a hard error
    if (_serverCache) {
      console.warn("Meta Ads: returning stale cache from", new Date(_serverCache.cachedAt).toISOString());
      return NextResponse.json(_serverCache.data, {
        headers: {
          "Cache-Control": "no-store",
          "X-Cache": "STALE",
          "X-Cached-At": new Date(_serverCache.cachedAt).toISOString(),
        },
      });
    }

    return NextResponse.json(
      { error: "Failed to fetch Meta Ads data", detail: String(err) },
      { status: 502 },
    );
  }
}
