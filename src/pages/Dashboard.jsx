import React, { useEffect, useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import UpperNav from "../components/UpperNav";
import StatCard from "../components/StatCard"
import { Loader2, Users, IndianRupee, Split, TrendingUp } from "lucide-react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

// ------------------------------------------------------------------
// MOCK DATA — replace this whole block with your real API call later.
// e.g. const data = await CRMDashboardAPI();
// Keep whatever you fetch in this same shape and everything below
// just works. Two spots are marked CLIENT-TYPE FILTER below in case
// your backend already splits continuous vs contract server-side.
// ------------------------------------------------------------------
const FIRST_NAMES = ["Aarav", "Priya", "Rohan", "Sneha", "Kabir", "Isha", "Dev", "Meera", "Arjun", "Tara", "Vikram", "Neha"];
const BRANDS = ["Studio", "Media", "Creations", "Films", "Digital", "Works", "Collective", "Labs"];

const randomClientName = () =>
    `${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]} ${BRANDS[Math.floor(Math.random() * BRANDS.length)]}`;

const buildMockDashboard = () => {
    const today = new Date();

    // --- Clients, split by type ---
    const makeClientBucket = (activeCount, inactiveCount) => ({
        total: activeCount + inactiveCount,
        active: activeCount,
        inactive: inactiveCount,
    });

    const clients = {
        continuous: makeClientBucket(14, 3),
        contract: makeClientBucket(9, 5),
    };

    // --- Payments, split by type ---
    const makePaymentBucket = (generated, collected) => ({
        generated,
        collected,
        pending: Math.max(0, generated - collected),
    });

    const payments = {
        continuous: makePaymentBucket(482000, 401500),
        contract: makePaymentBucket(263000, 190000),
    };

    // --- Combined revenue, used for founder split ---
    const combinedCollected = payments.continuous.collected + payments.contract.collected;
    const combinedPending = payments.continuous.pending + payments.contract.pending;

    const founders = [
        { name: "Founder A", commission: 10 },
        { name: "Founder B", commission: 90 },
    ].map((f) => ({
        ...f,
        paid: Math.round((combinedCollected * f.commission) / 100),
        pending: Math.round((combinedPending * f.commission) / 100),
    }));

    // --- Clients added per month, last 12 months, with names for the tooltip ---
    const monthlyClients = Array.from({ length: 12 }, (_, i) => {
        const d = new Date(today.getFullYear(), today.getMonth() - (11 - i), 1);
        const count = Math.floor(Math.random() * 4) + 1;
        const names = Array.from({ length: count }, randomClientName);
        return {
            month: d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
            count,
            clients: names,
        };
    });

    return { clients, payments, founders, monthlyClients };
};

export default function Dashboard() {
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [clientType, setClientType] = useState("continuous"); // "continuous" | "contract"

    useEffect(() => {
        // Simulated fetch — swap this out for a real API call when the backend is ready
        const timer = setTimeout(() => {
            setDashboard(buildMockDashboard());
            setLoading(false);
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    const currency = (n) =>
        `₹${Number(n).toLocaleString("en-IN", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        })}`;

    if (loading || !dashboard) {
        return (
            <div className="min-h-screen w-full flex flex-col md:flex-row items-stretch bg-slate-50">
                <Navbar />
                <div className="flex-1 min-w-0 flex items-center justify-center px-5 py-16">
                    <div className="w-full max-w-md rounded-3xl bg-white border border-gray-200 shadow-sm px-6 py-8 flex flex-col items-center justify-center gap-3 text-center">
                        <Loader2 className="animate-spin text-slate-700" size={36} />
                        <p className="text-sm font-medium text-slate-600">Loading dashboard...</p>
                    </div>
                </div>
            </div>
        );
    }

    // CLIENT-TYPE FILTER: sections 1 & 2 reflect whichever type is toggled
    const clientStats = dashboard.clients[clientType];
    const paymentStats = dashboard.payments[clientType];

    return (
        <div className="min-h-screen w-full flex flex-col md:flex-row items-stretch bg-slate-50">
            <Navbar />
            <div className="flex-1 min-w-0 w-full">
                {/* <UpperNav
                    Name={"Ansh"}
                    RefCode={"123"}
                    TabName={"overview"}
                    RefLink={"123"}
                    SpaceName={"Performance"}
                /> */}
                <div className="flex-1 min-w-0 px-5 md:px-6 pt-24 md:pt-6 pb-12 flex flex-col gap-8">
                    {/* ---------------- Section 1: Clients ---------------- */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 text-s font-semibold tracking-[3px] text-black font-sans uppercase">
                                <Users size={14} /> Clients
                            </div>
                            <ClientTypeSwitch value={clientType} onChange={setClientType} />
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                            <StatCard
                                label="Total Clients"
                                value={clientStats.total}
                                valueClass="text-slate-900"
                                sub={clientType === "continuous" ? "Continuous clients" : "Contract clients"}
                            />
                            <StatCard label="Active Clients" value={clientStats.active} valueClass="text-emerald-600" sub="Currently active" />
                            <StatCard label="Inactive Clients" value={clientStats.inactive} valueClass="text-red-600" sub="Not currently active" />
                        </div>
                    </section>

                    {/* ---------------- Section 2: Payments ---------------- */}
                    <section>
                        <div className="flex items-center gap-2 text-s font-semibold tracking-[3px] text-black font-sans uppercase mb-4">
                            <IndianRupee size={14} /> Payments
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                            <StatCard label="Total Revenue Generated" value={currency(paymentStats.generated)} valueClass="text-slate-900" sub="Billed to clients" />
                            <StatCard label="Revenue Collected" value={currency(paymentStats.collected)} valueClass="text-emerald-600" sub="Received so far" />
                            <StatCard label="Pending Revenue" value={currency(paymentStats.pending)} valueClass="text-amber-500" sub="Yet to be collected" />
                        </div>
                    </section>

                    {/* ---------------- Section 3: Founder Split + Monthly chart ---------------- */}
                    <section>
                        <div className="flex items-center gap-2 text-s font-semibold tracking-[3px] text-black font-sans uppercase mb-4">
                            <Split size={14} /> Founder Split
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,22rem)_1fr] gap-5">
                            <div className="grid gap-5">
                                {dashboard.founders.map((f) => (
                                    <FounderCard key={f.name} founder={f} currency={currency} />
                                ))}
                            </div>

                            <div className="rounded-3xl bg-white p-6 shadow-[0px_0_10px_-3px_rgba(0,0,0,0.3)] border border-gray-200">
                                <div className="flex items-center gap-2 text-s font-semibold tracking-[3px] text-black font-sans uppercase mb-4">
                                    <TrendingUp size={14} /> Clients Added by Month
                                </div>
                                <div className="w-full h-64 ml-[-1.5rem]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={dashboard.monthlyClients} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                                            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
                                            <Tooltip content={<MonthTooltip />} />
                                            <Line type="monotone" dataKey="count" stroke="#e63000" strokeWidth={2} dot={{ r: 3, fill: "#e63000" }} activeDot={{ r: 5 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                                <p className="text-xs text-gray-400 mt-2">Hover a point to see which clients joined that month.</p>
                            </div>
                        </div>
                    </section>
                </div>
            </div>

        </div>
    );
}

// ---------------- Reusable pieces ----------------

function ClientTypeSwitch({ value, onChange }) {
    return (
        <div className="relative inline-flex bg-black rounded-full p-1 text-xs font-semibold">
            <button
                onClick={() => onChange("continuous")}
                className={`px-4 py-2 rounded-full transition-all duration-300 ${value === "continuous" ? "bg-white text-black shadow" : "text-white"
                    }`}
            >
                Continuous
            </button>
            <button
                onClick={() => onChange("contract")}
                className={`px-4 py-2 rounded-full transition-all duration-300 ${value === "contract" ? "bg-white text-black shadow" : "text-white"
                    }`}
            >
                Contract
            </button>
        </div>
    );
}

// function StatCard({ label, value, valueClass = "text-slate-900", sub }) {
//     return (
//         <div className="rounded-3xl bg-white p-5 shadow-[0px_0_10px_-3px_rgba(0,0,0,0.3)] border border-gray-200 hover:border-lime-700/70 duration-300">
//             <p className="text-[0.65rem] font-semibold tracking-[2px] text-black/80 uppercase mb-2">{label}</p>
//             <p className={`text-2xl font-extrabold ${valueClass}`}>{value}</p>
//             {sub && <p className="text-xs text-gray-700 mt-1">{sub}</p>}
//         </div>
//     );
// }

function FounderCard({ founder, currency }) {
    const totalOwed = founder.paid + founder.pending;
    const pct = totalOwed ? Math.round((founder.paid / totalOwed) * 100) : 0;

    return (
        <div className="rounded-3xl bg-white p-6 shadow-[0px_0_10px_-3px_rgba(0,0,0,0.3)] border border-gray-200">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <p className="font-bold text-slate-900">{founder.name}</p>
                    <p className="text-xs text-gray-400">Commission share</p>
                </div>
                <span className="rounded-full bg-amber-50 text-amber-600 text-xs font-semibold px-3 py-1">{founder.commission}%</span>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <p className="text-[0.65rem] uppercase tracking-wide text-gray-400 mb-1">Paid</p>
                    <p className="text-lg font-bold text-emerald-600">{currency(founder.paid)}</p>
                </div>
                <div>
                    <p className="text-[0.65rem] uppercase tracking-wide text-gray-400 mb-1">Pending</p>
                    <p className="text-lg font-bold text-amber-500">{currency(founder.pending)}</p>
                </div>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-black transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-[0.65rem] text-gray-400 mt-1">{pct}% of their share paid out</p>
        </div>
    );
}

function MonthTooltip({ active, payload, label }) {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    return (
        <div className="rounded-xl bg-white border border-gray-200 shadow-lg px-4 py-3 text-xs max-w-[220px]">
            <p className="font-semibold text-slate-800 mb-1">{label}</p>
            <p className="text-slate-500 mb-2">
                {data.count} client{data.count === 1 ? "" : "s"} added
            </p>
            {data.clients.length > 0 && (
                <ul className="space-y-0.5">
                    {data.clients.map((c) => (
                        <li key={c} className="text-slate-600">
                            • {c}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}