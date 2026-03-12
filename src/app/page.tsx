import Dashboard from "@/components/Dashboard";
import MetaAdsReport from "@/components/MetaAdsReport";

export default function Home() {
  return (
    <>
      <Dashboard />
      <div className="border-t border-[#30363d]" />
      <MetaAdsReport />
    </>
  );
}
