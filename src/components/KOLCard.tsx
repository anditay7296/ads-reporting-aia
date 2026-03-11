"use client";

import { KOLData } from "@/types";
import ChangeTag from "./ChangeTag";

interface Props {
  kol: KOLData;
}

export default function KOLCard({ kol }: Props) {
  return (
    <div className="card flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-2xl flex-shrink-0">{kol.emoji}</span>
        <div className="min-w-0">
          <p className="font-bold text-[#e6edf3] truncate">{kol.name}</p>
          <p className="section-label">Registered</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-3xl font-bold text-white">{kol.count.toLocaleString()}</span>
        <ChangeTag value={kol.change} />
      </div>
    </div>
  );
}
