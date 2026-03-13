export interface AdRow {
  no: string;
  adId: string;
  storyId?: string;   // effective_object_story_id → real Facebook post URL
  creative: string;
  adType: string;
  spend: number;
  leads: number;
  purchases: number;
  views: number;
  cpl: number;
  roas: number;
  ctr: number;
  cpc: number;
  impressions: number;
  clicks: number;
  reach: number;
}

export interface MetaAdsData {
  lastUpdated: string;
  accountSummary: {
    totalSpend: number;
    totalLeads: number;
    totalImpressions: number;
    totalClicks: number;
    totalReach: number;
    totalPurchases: number;
    avgCpl: number;
    avgCtr: number;
    avgCpc: number;
    avgRoas: number;
  };
  topBySpend: AdRow[];
  topByLeads: AdRow[];
  topByPurchases: AdRow[];
  topByRoas: AdRow[];
  lastWebinar: {
    since: string;
    until: string;
    label: string;
    summary: {
      totalSpend: number;
      totalLeads: number;
      totalPurchases: number;
      avgCpl: number;
      avgRoas: number;
    };
    topBySpend: AdRow[];
    topByLeads: AdRow[];
    topByPurchases: AdRow[];
    topByRoas: AdRow[];
  };
}

export interface KOLData {
  name: string;
  emoji: string;
  count: number;
  change: number;
}

export interface WeeklyStats {
  dateRange: string;
  spentWithoutTax: number;
  spentWithTax: number;
  views: number;
  optins: number;
  cpl: number;
  cplWithTax: number;
}

export interface DashboardData {
  webinarSession: string;        // e.g. "0311"
  webinarDate: string;           // e.g. "MAR 11 (WED)"
  totalRegistrants: number;
  totalChange: number;
  adsTotal: number;
  adsTotalChange: number;
  adsPaid: number;
  adsPaidChange: number;
  adsOrganic: number;
  adsOrganicChange: number;
  adsTarget: number;
  kolTotal: number;
  kolTotalChange: number;
  kols: KOLData[];
  weekly: WeeklyStats;
  yesterday: {
    date: string;
    spentWithoutTax: number;
    spentWithTax: number;
    views: number;
    optins: number;
    cpl: number;
    cplWithTax: number;
  };
  countdownDays: number;
  lastUpdated: string;
  _setupNeeded?: boolean; // true when APPS_SCRIPT_URL is not yet configured
}
