import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
// import brandLogo from "../assets/krazystore-logo.png";
import Navbar from "../components/Navbar";
import StatCard from "../components/StatCard";
import UpperNav from "../components/UpperNav";
import LowerPhoneNav from "../components/LowerPhoneNav";
// import { DashboardAPI } from "../api/dashboard.api";

import {
    Copy,
    Check,
    MousePointerClick,
    ShoppingBag,
    Percent,
    Loader2,
    CircleDollarSign,
    ArrowRight,
    TrendingUp,
    Award
} from "lucide-react";

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

const DASHBOARD_CACHE_KEY = "affiliate_dashboard_cache";

export default function Dashboard() {
    const navigate = useNavigate();

    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const isInitialLoadRef = useRef(true);

    useEffect(() => {
        const fetchDashboard = async (showLoading = true) => {
            const cachedDashboard = sessionStorage.getItem(DASHBOARD_CACHE_KEY);
            let hasCachedData = false;

            if (cachedDashboard) {
                try {
                    const parsedDashboard = JSON.parse(cachedDashboard);
                    setDashboard(parsedDashboard);
                    setError("");
                    setLoading(false);
                    hasCachedData = true;
                } catch (err) {
                    console.warn("Failed to parse cached dashboard data", err);
                    sessionStorage.removeItem(DASHBOARD_CACHE_KEY);
                }
            }

            if (showLoading && !hasCachedData) {
                setLoading(true);
            }

            try {
                const data = await DashboardAPI();

                if (!data.success) {
                    setError(data.message || "Failed to load dashboard");
                    return;
                }

                const dashboardWithLink = {
                    ...data.dashboard,
                    affiliate: {
                        ...data.dashboard.affiliate,
                        referral_link: data.dashboard.affiliate?.ref_code ? `https://krazystore.in/?ref=${data.dashboard.affiliate.ref_code}` : ""
                    }
                };

                sessionStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify(dashboardWithLink));
                setDashboard(dashboardWithLink);
            }
            catch (err) {
                console.log(err);
                setError(err.response?.data?.message || "Something went wrong");
            }
            finally {
                setLoading(false);
                isInitialLoadRef.current = false;
            }
        };

        fetchDashboard(isInitialLoadRef.current);

        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                fetchDashboard(false);
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("focus", handleVisibilityChange);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("focus", handleVisibilityChange);
        };
    }, []);

    const currency = (n) =>
        `₹${Number(n).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;

    if (loading) {
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

    if (error || !dashboard) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
                <p className="text-red-600 text-sm">{error || "No dashboard data"}</p>
            </div>
        );
    }

    const { affiliate, tier, next_tier, stats, conversion_graph } = dashboard;

    const ordersToGo = Math.max(0, next_tier.orders_needed - next_tier.progress);
    const tierPct = next_tier.progress;

    // --- Weekly earnings: Sunday to Sunday ---
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // back up to this week's Sunday
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7); // next Sunday (exclusive upper bound)

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
                    <div className="rounded-3xl bg-white p-6 shadow-[0px_0_10px_-3px_rgba(0,0,0,0.3)] border border-gray-200 flex flex-col items-center justify-center text-center  hover:border-red-400 duration-400">
                        <div className="flex items-center gap-2 text-s font-semibold tracking-[3px] text-amber-500 font-['rajdhani'] uppercase mb-4">
                            <Award size={14} /> Tier Progress
                        </div>

                        <div className="relative flex items-center justify-center">
                            <CircularProgress
                                progress={next_tier.progress}
                                total={100}
                                size={150}
                                stroke={12}
                            />
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-extrabold text-slate-900">
                                    {tierPct}%
                                </span>
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
                                ? `${next_tier.orders_needed - stats.orders} more order${ordersToGo === 1 ? "" : "s"} to unlock ${next_tier.commission_rate}% commission`
                                : "You've unlocked the next tier!"}
                        </p>
                    </div>

                    {/* Stat cards: 2 columns x 3 rows */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                        <StatCard
                            label="Clicks"
                            value={stats.clicks}
                            valueClass="text-sky-600"
                            sub="Total link clicks"
                        />
                        <StatCard
                            label="Orders"
                            value={stats.orders}
                            valueClass="text-slate-900"
                            sub="Total converted orders"
                        />
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
                                            new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                                        }
                                        formatter={(value, name) =>
                                            name === "commission" ? [currency(value), "Commission"] : [value, "Orders"]
                                        }
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="orders"
                                        stroke="#0ea5e9"
                                        strokeWidth={2}
                                        dot={false}
                                        activeDot={{ r: 0, fill: "none", stroke: "none" }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="commission"
                                        stroke="#f59e0b"
                                        strokeWidth={2}
                                        dot={false}
                                        activeDot={{ r: 0, fill: "none", stroke: "none" }}
                                    />
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