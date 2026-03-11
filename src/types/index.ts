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
