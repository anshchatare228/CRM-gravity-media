import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import StatCard from "../components/StatCard";
import {
    Loader2,
    Users,
    IndianRupee,
    Split,
    TrendingUp,
} from "lucide-react";
import { supabase } from "../lib/supabase";

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
// BUILD DASHBOARD FROM REAL SUPABASE DATA
// ------------------------------------------------------------------

const buildDashboard = (clients, founders, payouts, tasks, invoices) => {
    // --------------------------------------------------------------
    // CLIENTS
    // --------------------------------------------------------------
    const makeClientBucket = (type) => {
        const typeClients = clients.filter((client) => client.type === type);
        const total = typeClients.length;
        const active = typeClients.filter((client) => !client.completed).length;
        const inactive = typeClients.filter((client) => client.completed).length;
        return { total, active, inactive };
    };

    const clientStats = {
        monthly: makeClientBucket("monthly"),
        contract: makeClientBucket("contract"),
    };

    // --------------------------------------------------------------
    // PAYMENTS — monthly clients are invoice-driven; contracts retain their
    // original one-time payment tracking.
    // --------------------------------------------------------------
    const makePaymentBucket = (type) => {
        const typeClients = clients.filter((client) => client.type === type);
        if (type === "monthly") {
            const monthlyClientIds = new Set(typeClients.map((client) => client.id));
            const monthlyInvoices = invoices.filter((invoice) => monthlyClientIds.has(invoice.client_id));
            const clientIdsWithInvoices = new Set(monthlyInvoices.map((invoice) => invoice.client_id));
            const clientsWithoutInvoices = typeClients.filter((client) => !clientIdsWithInvoices.has(client.id));
            const generated = monthlyInvoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0)
                + clientsWithoutInvoices.reduce((sum, client) => sum + Number(client.payment || 0), 0);
            const collected = monthlyInvoices
                .filter((invoice) => invoice.status === "paid")
                .reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0)
                + clientsWithoutInvoices.reduce((sum, client) => sum + Number(client.paid_amount || 0), 0);
            return { generated, collected, pending: Math.max(0, generated - collected) };
        }
        const generated = typeClients.reduce((sum, client) => sum + Number(client.payment || 0), 0);
        const collected = typeClients.reduce((sum, client) => sum + Number(client.paid_amount || 0), 0);
        const pending = Math.max(0, generated - collected);
        return { generated, collected, pending };
    };

    const payments = {
        monthly: makePaymentBucket("monthly"),
        contract: makePaymentBucket("contract"),
    };

    // --------------------------------------------------------------
    // FOUNDER SPLIT — attributed via client.founder_id
    // "paid" = actual payouts logged in founder_payouts
    // "pending" = commission earned on collected revenue, minus what's
    //             already been paid out
    // --------------------------------------------------------------
    const founderStats = founders.map((founder) => {
        const theirClients = clients.filter((c) => c.founder_id === founder.id);
        const collected = theirClients.reduce((sum, c) => {
            if (c.type !== "monthly") return sum + Number(c.paid_amount || 0);
            const clientInvoices = invoices.filter((invoice) => invoice.client_id === c.id);
            return sum + (clientInvoices.length
                ? clientInvoices.filter((invoice) => invoice.status === "paid").reduce((total, invoice) => total + Number(invoice.amount || 0), 0)
                : Number(c.paid_amount || 0));
        }, 0);
        const earnedCut = Math.round((collected * founder.commission) / 100);
        const paidOut = payouts
            .filter((p) => p.founder_id === founder.id)
            .reduce((sum, p) => sum + Number(p.amount || 0), 0);
        const pendingCut = Math.max(0, earnedCut - paidOut);

        return {
            name: founder.name,
            commission: founder.commission,
            clientCount: theirClients.length,
            paid: paidOut,
            pending: pendingCut,
        };
    });

    // --------------------------------------------------------------
    // CLIENTS ADDED BY MONTH
    // --------------------------------------------------------------
    const now = new Date();
    const monthlyClients = Array.from({ length: 12 }, (_, i) => {
        const date = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
        const year = date.getFullYear();
        const month = date.getMonth();

        const clientsThisMonth = clients.filter((client) => {
            if (!client.created_at) {
                return false;
            }
            const created = new Date(client.created_at);
            return created.getFullYear() === year && created.getMonth() === month;
        });

        return {
            month: date.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
            count: clientsThisMonth.length,
            clients: clientsThisMonth.map((client) => client.name),
        };
    });

    const taskStats = {
        done: tasks.filter((task) => task.done).length,
        total: tasks.length,
    };

    // --------------------------------------------------------------
    // FINAL DASHBOARD OBJECT
    // --------------------------------------------------------------
    return {
        clients: clientStats,
        payments,
        founders: founderStats,
        monthlyClients,
        taskStats,
    };
};

// ==================================================================
// DASHBOARD COMPONENT
// ==================================================================

export default function Dashboard() {
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [clientType, setClientType] = useState("monthly");

    // --------------------------------------------------------------
    // FETCH DATA FROM SUPABASE
    // --------------------------------------------------------------
    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                setLoading(true);

                const [clientsRes, foundersRes, payoutsRes, tasksRes, invoicesRes] = await Promise.all([
                    supabase.from("clients").select("*").order("created_at", { ascending: true }),
                    supabase.from("founders").select("*").order("name"),
                    supabase.from("founder_payouts").select("*"),
                    supabase.from("client_tasks").select("done"),
                    supabase.from("invoices").select("client_id, amount, status"),
                ]);

                if (clientsRes.error) {
                    throw clientsRes.error;
                }

                // Founders / payouts tables may not exist yet — degrade gracefully
                const founders = foundersRes.error ? [] : (foundersRes.data || []);
                if (foundersRes.error) {
                    console.warn("Founders table not set up yet:", foundersRes.error.message);
                }

                const payouts = payoutsRes.error ? [] : (payoutsRes.data || []);
                if (payoutsRes.error) {
                    console.warn("Founder payouts table not set up yet:", payoutsRes.error.message);
                }

                const tasks = tasksRes.error ? [] : (tasksRes.data || []);
                if (tasksRes.error) {
                    console.warn("Client tasks table not set up yet:", tasksRes.error.message);
                }

                const invoices = invoicesRes.error ? [] : (invoicesRes.data || []);
                if (invoicesRes.error) {
                    console.warn("Invoices table not set up yet:", invoicesRes.error.message);
                }

                const dashboardData = buildDashboard(clientsRes.data || [], founders, payouts, tasks, invoices);
                setDashboard(dashboardData);
            } catch (error) {
                console.error("Dashboard error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboard();
    }, []);

    // --------------------------------------------------------------
    // CURRENCY FORMATTER
    // --------------------------------------------------------------
    const currency = (n) =>
        `₹${Number(n).toLocaleString("en-IN", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        })}`;

    // --------------------------------------------------------------
    // LOADING STATE
    // --------------------------------------------------------------
    if (loading || !dashboard) {
        return (
            <div className="min-h-screen w-full flex flex-col md:flex-row items-stretch bg-slate-50">
                <Navbar />
                <div className="flex-1 min-w-0 flex items-center justify-center px-5 py-16">
                    <div className="w-full max-w-md rounded-none bg-white border border-gray-200 shadow-sm px-6 py-8 flex flex-col items-center justify-center gap-3 text-center">
                        <Loader2 className="animate-spin text-slate-700" size={36} />
                        <p className="text-sm font-medium text-slate-600">Loading dashboard...</p>
                    </div>
                </div>
            </div>
        );
    }

    // --------------------------------------------------------------
    // CURRENT CLIENT TYPE
    // --------------------------------------------------------------
    const clientStats = dashboard.clients[clientType];
    const paymentStats = dashboard.payments[clientType];

    // --------------------------------------------------------------
    // COMBINED REVENUE (monthly + contract) — used by the Task Pulse card
    // --------------------------------------------------------------
    const totalGenerated = dashboard.payments.monthly.generated + dashboard.payments.contract.generated;
    const totalCollected = dashboard.payments.monthly.collected + dashboard.payments.contract.collected;
    const revenuePct = totalGenerated ? Math.round((totalCollected / totalGenerated) * 100) : 0;

    // ==================================================================
    // MAIN UI
    // ==================================================================
    return (
        <div className="min-h-screen w-full flex flex-col md:flex-row items-stretch bg-stone-500/10">
            <Navbar />

            <div className="flex-1 min-w-0 w-full">
                <div className="flex-1 min-w-0 px-5 md:px-6 pt-24 md:pt-6 pb-12 flex flex-col gap-8">

                    <div className="flex flex-col lg:flex-row gap-6">
                        <div className="flex-1 min-w-0 space-y-8">
                            {/* ==================================================
                                SECTION 1 — CLIENTS
                            ================================================== */}
                            <section>
                                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                    <div className="flex items-center gap-2 text-s font-semibold tracking-[3px] text-black font-sans uppercase">
                                        <Users size={14} />
                                        Clients
                                    </div>

                                    <ClientTypeSwitch value={clientType} onChange={setClientType} />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                                    <StatCard
                                        label="Total Clients"
                                        value={clientStats.total}
                                        valueClass="text-slate-900"
                                        sub={clientType === "monthly" ? "Monthly clients" : "Contract clients"}
                                    />
                                    <StatCard
                                        label="Active Clients"
                                        value={clientStats.active}
                                        valueClass="text-emerald-600"
                                        sub="Currently active"
                                    />
                                    <StatCard
                                        label="Inactive Clients"
                                        value={clientStats.inactive}
                                        valueClass="text-red-600"
                                        sub="Not currently active"
                                    />
                                </div>
                            </section>

                            {/* ==================================================
                                SECTION 2 — PAYMENTS
                            ================================================== */}
                            <section>
                                <div className="flex items-center gap-2 text-s font-semibold tracking-[3px] text-black font-sans uppercase mb-4">
                                    <IndianRupee size={14} />
                                    Payments
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                                    <StatCard
                                        label="Total Revenue Generated"
                                        value={currency(paymentStats.generated)}
                                        valueClass="text-slate-900"
                                        sub="Billed to clients"
                                    />
                                    <StatCard
                                        label="Revenue Collected"
                                        value={currency(paymentStats.collected)}
                                        valueClass="text-emerald-600"
                                        sub="Received so far"
                                    />
                                    <StatCard
                                        label="Pending Revenue"
                                        value={currency(paymentStats.pending)}
                                        valueClass="text-amber-500"
                                        sub="Yet to be collected"
                                    />
                                </div>
                            </section>
                        </div>

                        <div className="w-full lg:w-80 shrink-0 mt-14">
                            <div className="rounded-lg bg-white p-6 shadow-[0px_0_10px_-3px_rgba(0,0,0,0.3)] border border-gray-200 w-full">
                                <div className="flex items-center justify-between mb-1 pt-5">
                                    <p className="text-xs font-semibold tracking-[3px] text-slate-400 uppercase">
                                        Task Pulse
                                    </p>
                                    <TrendingUp size={18} className="text-emerald-700" />
                                </div>

                                <h3 className="text-lg font-bold text-slate-900 mb-6">Work in motion</h3>

                                <div className="mb-5">
                                    <div className="flex items-center justify-between text-sm mb-2">
                                        <span className="text-slate-900">Completed tasks</span>
                                        <span className="text-slate-400">
                                            {dashboard.taskStats.done} / {dashboard.taskStats.total}
                                        </span>
                                    </div>
                                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-teal-800 rounded-full"
                                            style={{
                                                width: `${dashboard.taskStats.total ? (dashboard.taskStats.done / dashboard.taskStats.total) * 100 : 0}%`,
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <div className="flex items-center justify-between text-sm mb-2">
                                        <span className="text-slate-900">Revenue collected</span>
                                        <span className="text-slate-400">
                                            {currency(totalCollected)} / {currency(totalGenerated)}
                                        </span>
                                    </div>
                                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-emerald-600 rounded-full"
                                            style={{ width: `${revenuePct}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="border-t border-gray-100 pt-4 flex items-end justify-between gap-3 pb-5">
                                    <div>
                                        <p className="text-xs text-slate-400 mb-1">Combined tasks</p>
                                        <p className="text-2xl font-bold text-slate-900">
                                            {dashboard.taskStats.done}
                                            <span className="text-base font-medium text-slate-400"> / {dashboard.taskStats.total}</span>
                                        </p>
                                    </div>
                                    <p className="text-xs text-gray-400 text-right">
                                        {dashboard.taskStats.total ? Math.round((dashboard.taskStats.done / dashboard.taskStats.total) * 100) : 0}% tasks done
                                        <br />
                                        {revenuePct}% revenue in
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ==================================================
                        SECTION 3 — FOUNDER SPLIT + MONTHLY CHART
                    ================================================== */}
                    <section>
                        <div className="flex items-center gap-2 text-s font-semibold tracking-[3px] text-black font-sans uppercase mb-4">
                            <Split size={14} />
                            Founder Split
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,22rem)_1fr] gap-5">
                            <div className="grid gap-5">
                                {dashboard.founders.length === 0 ? (
                                    <div className="rounded-none bg-white p-6 shadow-[0px_0_10px_-3px_rgba(0,0,0,0.3)] border border-gray-200 text-sm text-slate-400 text-center">
                                        No founders set up yet — add them on the Internals page.
                                    </div>
                                ) : (
                                    dashboard.founders.map((founder) => (
                                        <FounderCard key={founder.name} founder={founder} currency={currency} />
                                    ))
                                )}
                            </div>

                            <div className="rounded-none bg-white p-6 shadow-[0px_0_10px_-3px_rgba(0,0,0,0.3)] border border-gray-200 min-w-0">
                                <div className="flex items-center gap-2 text-s font-semibold tracking-[3px] text-black font-sans uppercase mb-4">
                                    <TrendingUp size={14} />
                                    Clients Added by Month
                                </div>

                                <div className="w-full h-64 ml-[-1rem] sm:ml-[-1.5rem]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart
                                            data={dashboard.monthlyClients}
                                            margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                                            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
                                            <Tooltip content={<MonthTooltip />} />
                                            <Line
                                                type="monotone"
                                                dataKey="count"
                                                stroke="#e63000"
                                                strokeWidth={2}
                                                dot={{ r: 3, fill: "#e63000" }}
                                                activeDot={{ r: 5 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>

                                <p className="text-xs text-gray-400 mt-2">
                                    Hover a point to see which clients joined that month.
                                </p>
                            </div>
                        </div>
                    </section>

                </div>
            </div>
        </div>
    );
}

// ==================================================================
// CLIENT TYPE SWITCH
// ==================================================================

function ClientTypeSwitch({ value, onChange }) {
    return (
        <div className="relative inline-flex bg-black rounded-full p-1 text-xs font-semibold">
            <button
                onClick={() => onChange("monthly")}
                className={`px-4 py-2 rounded-full transition-all duration-300 ${value === "monthly" ? "bg-white text-black shadow" : "text-white"
                    }`}
            >
                Monthly
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

// ==================================================================
// FOUNDER CARD
// ==================================================================

function FounderCard({ founder, currency }) {
    const totalOwed = founder.paid + founder.pending;
    const pct = totalOwed ? Math.round((founder.paid / totalOwed) * 100) : 0;

    return (
        <div className="rounded-none bg-white p-6 shadow-[0px_0_10px_-3px_rgba(0,0,0,0.3)] border border-gray-200">
            <div className="flex items-center justify-between mb-4 gap-3">
                <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">{founder.name}</p>
                    <p className="text-xs text-gray-400">
                        Commission share · {founder.clientCount} client{founder.clientCount === 1 ? "" : "s"}
                    </p>
                </div>

                <span className="rounded-full bg-amber-50 text-amber-600 text-xs font-semibold px-3 py-1 shrink-0">
                    {founder.commission}%
                </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <p className="text-[0.65rem] uppercase tracking-wide text-gray-400 mb-1">Not Taken</p>
                    <p className="text-lg font-bold text-amber-500">{currency(founder.pending)}</p>
                </div>
                <div>
                    <p className="text-[0.65rem] uppercase tracking-wide text-gray-400 mb-1">Taken</p>
                    <p className="text-lg font-bold text-emerald-600">{currency(founder.paid)}</p>
                </div>

            </div>

            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-black transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>

            <p className="text-[0.65rem] text-gray-400 mt-1">{pct}% of their earned cut taken out</p>
        </div>
    );
}

// ==================================================================
// MONTH TOOLTIP
// ==================================================================

function MonthTooltip({ active, payload, label }) {
    if (!active || !payload || !payload.length) {
        return null;
    }

    const data = payload[0].payload;

    return (
        <div className="rounded-none bg-white border border-gray-200 shadow-lg px-4 py-3 text-xs max-w-[220px]">
            <p className="font-semibold text-slate-800 mb-1">{label}</p>
            <p className="text-black/90 mb-2">
                {data.count} client{data.count === 1 ? "" : "s"} added
            </p>

            {data.clients.length > 0 && (
                <ul className="space-y-0.5">
                    {data.clients.map((client, index) => (
                        <li key={`${client}-${index}`} className="text-slate-600">
                            • {client}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}