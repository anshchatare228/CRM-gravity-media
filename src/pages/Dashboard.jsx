import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import StatCard from "../components/StatCard";
import UpperNav from "../components/UpperNav";
import LowerPhoneNav from "../components/LowerPhoneNav";

import { Loader2, ArrowRight, TrendingUp, Award } from "lucide-react";

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
// e.g. const data = await DashboardAPI();
// Just make sure whatever you fetch matches this same shape.
// ------------------------------------------------------------------
const   buildMockDashboard = () => {
    const today = new Date();
    const conversion_graph = Array.from({ length: 30 }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - (29 - i));
        const orders = Math.floor(Math.random() * 6);
        const commission = orders * (150 + Math.floor(Math.random() * 100));
        return {
            date: d.toISOString().slice(0, 10),
            orders,
            commission,
        };
    });

    return {
        affiliate: {
            name: "Demo Affiliate",
            ref_code: "DEMO123",
            referral_link: "https://example.com/?ref=DEMO123",
        },
        tier: {
            label: "Silver",
            commission_rate: 10,
        },
        next_tier: {
            label: "Gold",
            commission_rate: 15,
            orders_needed: 50,
            progress: 62,
        },
        stats: {
            clicks: 1840,
            orders: 31,
            conversion_rate: 1.7,
            available_balance: 4250.5,
            pending_earnings: 1120,
            paid_earnings: 18650,
        },
        conversion_graph,
    };
};

export default function Dashboard() {
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);

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
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
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

    const { affiliate, tier, next_tier, stats, conversion_graph } = dashboard;

    const ordersToGo = Math.max(0, next_tier.orders_needed - stats.orders);
    const tierPct = next_tier.progress;

    // --- Weekly earnings: Sunday to Sunday ---
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    const weeklyEarnings = (conversion_graph || []).reduce((sum, entry) => {
        const entryDate = new Date(entry.date);
        if (entryDate >= startOfWeek && entryDate < endOfWeek) {
            return sum + Number(entry.commission || 0);
        }
        return sum;
    }, 0);

    return (
        <div className="min-h-screen w-full flex flex-col md:flex-row items-stretch bg-slate-50">
            <Navbar />

            <div className="flex-1 min-w-0 flex flex-col pb-24">
                <UpperNav
                    Name={affiliate.name}
                    RefCode={affiliate.ref_code}
                    TabName={"overview"}
                    RefLink={affiliate.referral_link}
                    SpaceName={"Performance"}
                />

                <div className="px-5 md:px-6 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
                    {/* Circular tier progress card */}
                    <div className="rounded-3xl bg-white p-6 shadow-[0px_0_10px_-3px_rgba(0,0,0,0.3)] border border-gray-200 flex flex-col items-center justify-center text-center hover:border-red-400 duration-400">
                        <div className="flex items-center gap-2 text-s font-semibold tracking-[3px] text-amber-500 font-['rajdhani'] uppercase mb-4">
                            <Award size={14} /> Tier Progress
                        </div>

                        <div className="relative flex items-center justify-center">
                            <CircularProgress progress={tierPct} total={100} size={150} stroke={12} />
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-extrabold text-slate-900">{tierPct}%</span>
                                <span className="text-[0.65rem] font-semibold text-gray-400 uppercase tracking-wide">
                                    {stats.orders} orders
                                </span>
                            </div>
                        </div>

                        <div className="mt-5 flex items-center gap-2 text-sm text-slate-600">
                            <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                                {tier.label}
                            </span>
                            <ArrowRight size={16} className="text-black" />
                            <span className="rounded-full bg-amber-50 px-3 py-1 font-semibold text-amber-600">
                                {next_tier.label}
                            </span>
                        </div>

                        <p className="mt-3 text-xs text-gray-400">
                            {ordersToGo > 0
                                ? `${ordersToGo} more order${ordersToGo === 1 ? "" : "s"} to unlock ${next_tier.commission_rate}% commission`
                                : "You've unlocked the next tier!"}
                        </p>
                    </div>

                    {/* Stat cards: 2 columns x 3 rows */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                        <StatCard label="Clicks" value={stats.clicks} valueClass="text-sky-600" sub="Total link clicks" />
                        <StatCard label="Orders" value={stats.orders} valueClass="text-slate-900" sub="Total converted orders" />
                        <StatCard
                            label="Conversion Rate"
                            value={`${stats.conversion_rate}%`}
                            valueClass="text-slate-900"
                            sub="Clicks to orders"
                        />
                        <StatCard
                            label="Available Balance"
                            value={currency(stats.available_balance)}
                            valueClass="text-emerald-600"
                            sub="Ready to withdraw"
                        />
                        <StatCard
                            label="Pending Earnings"
                            value={currency(stats.pending_earnings)}
                            valueClass="text-amber-500"
                            sub="Awaiting approval"
                        />
                        <StatCard
                            label="Total Earnings This Week"
                            value={currency(weeklyEarnings)}
                            valueClass="text-slate-900"
                            sub={"Sunday to Sunday"}
                        />
                    </div>
                </div>

                <div className="mt-5 px-5 md:px-6 grid grid-cols-1 lg:grid-cols-[minmax(0,45rem)_1fr] xl:grid-cols-[minmax(0,17.5rem)_1fr] gap-5">
                    <div className="grid w-full gap-5">
                        <StatCard
                            label="Current Commission"
                            value={`${tier.commission_rate}%`}
                            valueClass="text-amber-500"
                            sub="Current commission rate"
                        />
                        <StatCard
                            label="Total Payout"
                            value={currency(stats.paid_earnings)}
                            valueClass="text-slate-900"
                            sub={"Lifetime payout"}
                        />
                    </div>

                    <div className="rounded-3xl bg-white p-6 shadow-[0px_0_10px_-3px_rgba(0,0,0,0.3)] border border-gray-200 outline-none">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 text-s font-semibold tracking-[3px] text-[#e63000] font-['rajdhani'] uppercase">
                                <TrendingUp size={14} /> Conversions (Last 30 Days)
                            </div>
                        </div>

                        <div className="w-full h-64 ml-[-1.5rem] outline-none [&_svg]:outline-none">
                            <ResponsiveContainer width="100%" height="100%" stroke="none">
                                <LineChart data={conversion_graph} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                                        tickFormatter={(d) =>
                                            new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
                                        }
                                        interval={4}
                                    />
                                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
                                    <Tooltip
                                        labelFormatter={(d) =>
                                            new Date(d).toLocaleDateString("en-IN", {
                                                day: "2-digit",
                                                month: "short",
                                                year: "numeric",
                                            })
                                        }
                                        formatter={(value, name) =>
                                            name === "commission" ? [currency(value), "Commission"] : [value, "Orders"]
                                        }
                                    />
                                    <Line type="monotone" dataKey="orders" stroke="#0ea5e9" strokeWidth={2} dot={false} activeDot={{ r: 0, fill: "none", stroke: "none" }} />
                                    <Line type="monotone" dataKey="commission" stroke="#f59e0b" strokeWidth={2} dot={false} activeDot={{ r: 0, fill: "none", stroke: "none" }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" /> Orders
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#e63000] inline-block" /> Commission
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            <LowerPhoneNav />
        </div>
    );
}

// Simple circular progress ring used by the Tier Progress card
function CircularProgress({ progress, total, size, stroke }) {
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const pct = Math.min(100, Math.max(0, (progress / total) * 100));
    const offset = circumference - (pct / 100) * circumference;

    return (
        <svg width={size} height={size} className="-rotate-90">
            <circle cx={size / 2} cy={size / 2} r={radius} stroke="#e2e8f0" strokeWidth={stroke} fill="none" />
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="#e63000"
                strokeWidth={stroke}
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
            />
        </svg>
    );
}