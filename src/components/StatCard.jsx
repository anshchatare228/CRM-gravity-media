import React from "react";

export default function StatCard({ label, value, valueClass = "text-black", sub }) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-[0px_0_10px_-3px_rgba(0,0,0,0.3)] border border-gray-200 hover:border-red-400 duration-400">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <h2 className={`mt-3 text-3xl md:text-4xl font-bold ${valueClass}`}>{value}</h2>
      {sub && <p className="mt-1 text-xs text-gray-700">{sub}</p>}
    </div>
  );
}

