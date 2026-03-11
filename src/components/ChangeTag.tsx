"use client";

interface Props {
  value: number;
  prefix?: string;
}

export default function ChangeTag({ value, prefix = "+" }: Props) {
  const isPos = value > 0;
  const isNeg = value < 0;
  const color = isPos
    ? "bg-green-900/40 text-green-400 border-green-800"
    : isNeg
    ? "bg-red-900/40 text-red-400 border-red-800"
    : "bg-gray-800 text-gray-400 border-gray-700";

  return (
    <span
      className={`inline-flex items-center text-sm font-semibold px-2 py-0.5 rounded border ${color}`}
    >
      {isPos ? `${prefix}${value}` : value}
    </span>
  );
}
