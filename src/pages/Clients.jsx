import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Repeat, FileSignature, Loader2, ArrowRight, Mail, Phone } from "lucide-react";
import Navbar from "../components/Navbar";
import { supabase } from "../lib/supabase";

const currency = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const getStatus = (client) => {
    if (client.completed) return "completed";
    const today = new Date();
    const start = new Date(client.start_date);
    const end = client.end_date ? new Date(client.end_date) : null;
    if (start > today) return "upcoming";
    if (end && end < today) return "expired";
    return "active";
};

const STATUS_STYLE = {
    active: "bg-emerald-50 text-emerald-600",
    completed: "bg-slate-100 text-black/90",
    upcoming: "bg-sky-50 text-sky-600",
    expired: "bg-amber-50 text-amber-600",
};

const STATUS_LABEL = {
    active: "Active",
    completed: "Completed",
    upcoming: "Upcoming",
    expired: "Expired",
};

const initials = (name) =>
    name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join("");

export default function Clients() {
    const navigate = useNavigate();

    const [clients, setClients] = useState([]);
    const [founders, setFounders] = useState([]);
    const [milestoneStats, setMilestoneStats] = useState({}); // { [clientId]: { done, total } }
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [query, setQuery] = useState("");

    const fetchClients = async () => {
        setLoading(true);

        const [{ data: clientData, error }, { data: founderData }, { data: milestoneData }] = await Promise.all([
            supabase.from("clients").select("*").order("created_at", { ascending: false }),
            supabase.from("founders").select("*").order("name"),
            supabase.from("client_milestones").select("client_id, done"),
        ]);

        if (!error) setClients(clientData || []);
        setFounders(founderData || []); // stays empty if founders table isn't set up yet

        const stats = {};
        (milestoneData || []).forEach((m) => {
            if (!stats[m.client_id]) stats[m.client_id] = { done: 0, total: 0 };
            stats[m.client_id].total += 1;
            if (m.done) stats[m.client_id].done += 1;
        });
        setMilestoneStats(stats);

        setLoading(false);
    };

    useEffect(() => {
        fetchClients();
    }, []);

    const founderMap = useMemo(() => {
        const map = {};
        founders.forEach((f) => (map[f.id] = f.name));
        return map;
    }, [founders]);

    const filtered = useMemo(() => {
        return clients.filter((c) => {
            const matchesType = filter === "all" || c.type === filter;
            const q = query.toLowerCase();
            const matchesQuery =
                c.name.toLowerCase().includes(q) ||
                (c.email || "").toLowerCase().includes(q) ||
                (c.phone || "").toLowerCase().includes(q);
            return matchesType && matchesQuery;
        });
    }, [clients, filter, query]);

    if (loading) {
        return (
            <div className="min-h-screen w-full flex flex-col md:flex-row items-stretch bg-slate-50">
                <Navbar />
                <div className="flex-1 min-w-0 flex items-center justify-center px-5 py-16">
                    <div className="w-full max-w-md rounded-lg bg-white border border-gray-200 shadow-sm px-6 py-8 flex flex-col items-center justify-center gap-3 text-center">
                        <Loader2 className="animate-spin text-slate-700" size={36} />
                        <p className="text-sm font-medium text-slate-600">Loading clients...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full flex flex-col md:flex-row items-stretch bg-slate-50">
            <Navbar />

            <div className="flex-1 min-w-0 flex flex-col pb-24">
                <div className="px-5 md:px-5 pt-5">
                    <div className="max-w-6xl mx-auto">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                            <div>
                                <h1 className="text-2xl font-extrabold text-slate-900">Clients</h1>
                                <p className="text-sm text-black/90 mt-1">
                                    {clients.length} total &middot; monthly retainers &amp; fixed-term contracts
                                </p>
                            </div>
                            <button
                                onClick={() => navigate("/clients/new")}
                                className="inline-flex items-center gap-2 rounded-full bg-slate-900 text-white text-sm font-semibold px-5 py-2.5 hover:bg-slate-800 transition self-start"
                            >
                                <Plus size={16} /> Add Client
                            </button>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 mb-5">
                            <div className="inline-flex rounded-full bg-white border border-gray-200 p-1 shadow-sm self-start">
                                {[
                                    { key: "all", label: "All" },
                                    { key: "monthly", label: "Monthly", icon: <Repeat size={13} /> },
                                    { key: "contract", label: "Contract", icon: <FileSignature size={13} /> },
                                ].map((t) => (
                                    <button
                                        key={t.key}
                                        onClick={() => setFilter(t.key)}
                                        className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition ${filter === t.key ? "bg-slate-900 text-white" : "text-black/90 hover:text-slate-800"
                                            }`}
                                    >
                                        {t.icon} {t.label}
                                    </button>
                                ))}
                            </div>
                            <div className="relative flex-1 max-w-xs">
                                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Search client, contact, or package"
                                    className="w-full rounded-full border border-gray-200 bg-white pl-9 pr-4 py-2 text-sm outline-none focus:border-slate-400"
                                />
                            </div>
                        </div>

                        <div className="rounded-lg bg-white border border-gray-200 shadow-[0px_0_10px_-3px_rgba(0,0,0,0.3)] overflow-hidden">
                            <div className="hidden md:grid grid-cols-[1.8fr_1fr_0.9fr_1.3fr_1.3fr_auto] gap-4 px-6 py-3 text-s font-semibold font-mono tracking-wide text-slate-400 uppercase border-b border-gray-100">
                                <span>Client</span>
                                <span>Type</span>
                                <span>Status</span>
                                <span>Payment</span>
                                <span>Delivery</span>
                                <span></span>
                            </div>

                            {filtered.length === 0 && (
                                <div className="px-6 py-12 text-center text-sm text-slate-400">No clients match this view.</div>
                            )}

                            {filtered.map((c) => {
                                const status = getStatus(c);
                                const paid = Number(c.paid_amount || 0);
                                const total = Number(c.payment || 0);
                                const paymentPct = total ? Math.min(100, Math.round((paid / total) * 100)) : 0;

                                const ms = milestoneStats[c.id] || { done: 0, total: 0 };
                                const deliveryPct = ms.total ? Math.min(100, Math.round((ms.done / ms.total) * 100)) : 0;

                                return (
                                    <div
                                        key={c.id}
                                        onClick={() => navigate(`/clients/${c.id}`)}
                                        className="grid grid-cols-2 md:grid-cols-[1.8fr_1fr_0.9fr_1.3fr_1.3fr_auto] gap-4 px-6 py-4 items-center border-b border-gray-50 last:border-0 hover:bg-slate-50/60 transition cursor-pointer"
                                    >
                                        <div className="col-span-2 md:col-span-1 flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-slate-100 text-black/90 text-xs font-bold flex items-center justify-center shrink-0">
                                                {initials(c.name)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-slate-800 text-sm truncate">{c.name}</p>
                                                <p className="text-xs text-slate-400 mt-0.5 truncate">
                                                    {c.email || "—"}
                                                    {c.phone ? ` · ${c.phone}` : ""}
                                                </p>
                                            </div>
                                        </div>

                                        <div>
                                            <span
                                                className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${c.type === "monthly" ? "bg-sky-50 text-sky-600" : "bg-amber-50 text-amber-600"
                                                    }`}
                                            >
                                                {c.type === "monthly" ? <Repeat size={11} /> : <FileSignature size={11} />}
                                                {c.type === "monthly" ? "Monthly" : "Contract"}
                                            </span>
                                        </div>

                                        <div>
                                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLE[status]}`}>
                                                {STATUS_LABEL[status]}
                                            </span>
                                        </div>

                                        <div>
                                            <div className="flex items-baseline justify-between text-xs font-semibold text-slate-700 mb-1">
                                                <span>{currency(paid)}</span>
                                                <span className="text-slate-400 font-normal">/ {currency(total)}</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-slate-900 rounded-full transition-all"
                                                    style={{ width: `${paymentPct}%` }}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex items-baseline justify-between text-xs font-semibold text-slate-700 mb-1">
                                                <span>{ms.done}</span>
                                                <span className="text-slate-400 font-normal">/ {ms.total || 0}</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-lime-500 rounded-full transition-all"
                                                    style={{ width: `${deliveryPct}%` }}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex justify-end">
                                            <ArrowRight size={16} className="text-slate-300" />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}