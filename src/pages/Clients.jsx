import React, { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, X, Search, Repeat, FileSignature, Calendar, Loader2 } from "lucide-react";
import Navbar from "../components/Navbar";
import ClientDetailModal from "../components/ClientDetailModal";
import { supabase } from "../lib/supabase";

const EMPTY_FORM = { name: "", type: "monthly", payment: "", startDate: "", endDate: "", notes: "" };

const currency = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const getStatus = (client) => {
    if (client.type === "contract" && client.completed) return "expired";
    const today = new Date();
    const start = new Date(client.start_date);
    const end = client.end_date ? new Date(client.end_date) : null;
    if (start > today) return "upcoming";
    if (end && end < today) return "expired";
    return "active";
};

const STATUS_STYLE = {
    active: "bg-emerald-50 text-emerald-600",
    upcoming: "bg-sky-50 text-sky-600",
    expired: "bg-slate-100 text-slate-500",
};

export default function Clients() {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [query, setQuery] = useState("");
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [detailClient, setDetailClient] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);

    const fetchClients = async () => {
        setLoading(true);
        const { data, error } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
        if (!error) setClients(data || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchClients();
    }, []);

    const filtered = useMemo(() => {
        return clients.filter((c) => {
            const matchesType = filter === "all" || c.type === filter;
            const matchesQuery = c.name.toLowerCase().includes(query.toLowerCase());
            return matchesType && matchesQuery;
        });
    }, [clients, filter, query]);

    const openAddModal = () => {
        setEditingId(null);
        setForm(EMPTY_FORM);
        setEditModalOpen(true);
    };

    const openEditModal = (client) => {
        setEditingId(client.id);
        setForm({
            name: client.name,
            type: client.type,
            payment: client.payment,
            startDate: client.start_date,
            endDate: client.end_date || "",
            notes: client.notes || "",
        });
        setEditModalOpen(true);
    };

    const closeModal = () => {
        setEditModalOpen(false);
        setEditingId(null);
        setForm(EMPTY_FORM);
    };

    const saveClient = async () => {
        if (!form.name.trim() || !form.payment || !form.startDate) return;
        const payload = {
            name: form.name.trim(),
            type: form.type,
            payment: Number(form.payment),
            start_date: form.startDate,
            end_date: form.endDate || null,
            notes: form.notes,
        };
        if (editingId) {
            const { error } = await supabase.from("clients").update(payload).eq("id", editingId);
            if (error) return;
        } else {
            const { error } = await supabase.from("clients").insert(payload);
            if (error) return;
        }
        await fetchClients();
        closeModal();
    };

    const deleteClient = async (id) => {
        const { error } = await supabase.from("clients").delete().eq("id", id);
        if (error) return;
        setClients((prev) => prev.filter((c) => c.id !== id));
    };

    const setDuration = (months) => {
        if (!form.startDate) return;
        const end = new Date(form.startDate);
        end.setMonth(end.getMonth() + Number(months));
        setForm((f) => ({ ...f, endDate: end.toISOString().slice(0, 10) }));
    };

    const handleClientUpdate = (id, patch) => {
        setClients((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    };

    if (loading) {
        return (
            <div className="min-h-screen w-full flex flex-col md:flex-row items-stretch bg-slate-50">
                <Navbar />
                <div className="flex-1 min-w-0 flex items-center justify-center px-5 py-16">
                    <div className="w-full max-w-md rounded-3xl bg-white border border-gray-200 shadow-sm px-6 py-8 flex flex-col items-center justify-center gap-3 text-center">
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
                                <p className="text-sm text-slate-500 mt-1">{clients.length} total &middot; monthly retainers &amp; fixed-term contracts</p>
                            </div>
                            <button
                                onClick={openAddModal}
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
                                        className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition ${filter === t.key ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-800"
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
                                    placeholder="Search clients..."
                                    className="w-full rounded-full border border-gray-200 bg-white pl-9 pr-4 py-2 text-sm outline-none focus:border-slate-400"
                                />
                            </div>
                        </div>

                        <div className="rounded-3xl bg-white border border-gray-200 shadow-[0px_0_10px_-3px_rgba(0,0,0,0.3)] overflow-hidden">
                            <div className="hidden md:grid grid-cols-[1.8fr_0.9fr_1fr_1fr_1fr_0.8fr_auto] gap-4 px-6 py-3 text-xs font-semibold tracking-wide text-slate-400 uppercase border-b border-gray-100">
                                <span>Client</span>
                                <span>Type</span>
                                <span>Payment</span>
                                <span>Start</span>
                                <span>End</span>
                                <span>Status</span>
                                <span></span>
                            </div>

                            {filtered.length === 0 && (
                                <div className="px-6 py-12 text-center text-sm text-slate-400">No clients match this view.</div>
                            )}

                            {filtered.map((c) => {
                                const status = getStatus(c);
                                return (
                                    <div
                                        key={c.id}
                                        onClick={() => setDetailClient(c)}
                                        className="grid grid-cols-2 md:grid-cols-[1.8fr_0.9fr_1fr_1fr_1fr_0.8fr_auto] gap-4 px-6 py-4 items-center border-b border-gray-50 last:border-0 hover:bg-slate-50/60 transition cursor-pointer"
                                    >
                                        <div className="col-span-2 md:col-span-1">
                                            <p className="font-semibold text-slate-800 text-sm">{c.name}</p>
                                            {c.notes && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{c.notes}</p>}
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
                                        <div className="text-sm font-semibold text-slate-700">
                                            {currency(c.payment)}
                                            {c.type === "monthly" && <span className="text-xs text-slate-400 font-normal">/mo</span>}
                                        </div>
                                        <div className="text-sm text-slate-500 flex items-center gap-1">
                                            <Calendar size={12} className="text-slate-300" />
                                            {new Date(c.start_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}
                                        </div>
                                        <div className="text-sm text-slate-500">
                                            {c.end_date
                                                ? new Date(c.end_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })
                                                : "Ongoing"}
                                        </div>
                                        <div>
                                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_STYLE[status]}`}>
                                                {status}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => openEditModal(c)}
                                                className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                                            >
                                                <Pencil size={14} />
                                            </button>
                                            <button
                                                onClick={() => deleteClient(c.id)}
                                                className="p-2 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {editModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center px-4 z-50" onClick={closeModal}>
                    <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-bold text-slate-900">{editingId ? "Edit Client" : "Add Client"}</h2>
                            <button onClick={closeModal} className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Client Name</label>
                                <input
                                    value={form.name}
                                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                    placeholder="e.g. Bloom & Co Skincare"
                                    className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-slate-400"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Client Type</label>
                                <div className="mt-1.5 grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setForm((f) => ({ ...f, type: "monthly" }))}
                                        className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${form.type === "monthly" ? "border-slate-900 bg-slate-900 text-white" : "border-gray-200 text-slate-500"
                                            }`}
                                    >
                                        <Repeat size={14} /> Monthly
                                    </button>
                                    <button
                                        onClick={() => setForm((f) => ({ ...f, type: "contract" }))}
                                        className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${form.type === "contract" ? "border-slate-900 bg-slate-900 text-white" : "border-gray-200 text-slate-500"
                                            }`}
                                    >
                                        <FileSignature size={14} /> Contract
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                    {form.type === "monthly" ? "Monthly Fee (₹)" : "Total Contract Value (₹)"}
                                </label>
                                <input
                                    type="number"
                                    value={form.payment}
                                    onChange={(e) => setForm((f) => ({ ...f, payment: e.target.value }))}
                                    placeholder="e.g. 45000"
                                    className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-slate-400"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Start Date</label>
                                    <input
                                        type="date"
                                        value={form.startDate}
                                        onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                                        className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-slate-400"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                        End Date {form.type === "monthly" && <span className="normal-case font-normal">(optional)</span>}
                                    </label>
                                    <input
                                        type="date"
                                        value={form.endDate}
                                        onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                                        className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-slate-400"
                                    />
                                </div>
                            </div>

                            {form.type === "contract" && (
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Quick Duration</label>
                                    <div className="mt-1.5 flex gap-2">
                                        {[1, 3, 6, 12].map((m) => (
                                            <button
                                                key={m}
                                                onClick={() => setDuration(m)}
                                                disabled={!form.startDate}
                                                className="flex-1 rounded-xl border border-gray-200 py-2 text-xs font-semibold text-slate-500 hover:border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                {m}mo
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Notes</label>
                                <textarea
                                    value={form.notes}
                                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                                    placeholder="Scope, deliverables, anything worth remembering..."
                                    rows={3}
                                    className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-slate-400 resize-none"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button onClick={closeModal} className="flex-1 rounded-full border border-gray-200 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50">
                                Cancel
                            </button>
                            <button
                                onClick={saveClient}
                                disabled={!form.name.trim() || !form.payment || !form.startDate}
                                className="flex-1 rounded-full bg-slate-900 text-white py-2.5 text-sm font-semibold hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {editingId ? "Save Changes" : "Add Client"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {detailClient && (
                <ClientDetailModal
                    client={detailClient}
                    onClose={() => setDetailClient(null)}
                    onClientUpdate={handleClientUpdate}
                />
            )}
        </div>
    );
}