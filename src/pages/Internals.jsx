// src/pages/Internals.jsx
import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import { Loader2, Users, Pencil, Check, X, Plus, IndianRupee } from "lucide-react";
import { supabase } from "../lib/supabase";

const currency = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export default function Internals() {
    const [founders, setFounders] = useState([]);
    const [clients, setClients] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tableMissing, setTableMissing] = useState(false);

    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ name: "", commission: "" });

    const [addOpen, setAddOpen] = useState(false);
    const [addForm, setAddForm] = useState({ name: "", commission: "" });

    const fetchAll = async () => {
        setLoading(true);
        const [foundersRes, clientsRes, invoicesRes] = await Promise.all([
            supabase.from("founders").select("*").order("name"),
            supabase.from("clients").select("*"),
            supabase.from("invoices").select("*"),
        ]);

        if (foundersRes.error) {
            // Table probably doesn't exist yet — show empty state instead of crashing
            setTableMissing(true);
            setFounders([]);
        } else {
            setTableMissing(false);
            setFounders(foundersRes.data || []);
        }
        setClients(clientsRes.data || []);
        setInvoices(invoicesRes.data || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchAll();
    }, []);

    const stats = useMemo(() => {
        return founders.map((f) => {
            const theirClients = clients.filter((c) => c.founder_id === f.id);
            const clientIds = new Set(theirClients.map((c) => c.id));
            const theirInvoices = invoices.filter((i) => clientIds.has(i.client_id));

            const generated = theirInvoices.reduce((s, i) => s + Number(i.amount || 0), 0);
            const collected = theirInvoices
                .filter((i) => i.status === "paid")
                .reduce((s, i) => s + Number(i.amount || 0), 0);
            const pending = theirInvoices
                .filter((i) => i.status === "pending")
                .reduce((s, i) => s + Number(i.amount || 0), 0);

            return {
                ...f,
                clientCount: theirClients.length,
                generated,
                collected,
                pending,
                cutPaid: Math.round((collected * f.commission) / 100),
                cutPending: Math.round((pending * f.commission) / 100),
            };
        });
    }, [founders, clients, invoices]);

    const unassignedCount = useMemo(
        () => clients.filter((c) => !c.founder_id).length,
        [clients]
    );

    // ---------- Edit commission / name ----------
    const startEdit = (f) => {
        setEditingId(f.id);
        setEditForm({ name: f.name, commission: f.commission });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm({ name: "", commission: "" });
    };

    const saveEdit = async (id) => {
        if (!editForm.name.trim() || editForm.commission === "") return;
        const { error } = await supabase
            .from("founders")
            .update({ name: editForm.name.trim(), commission: Number(editForm.commission) })
            .eq("id", id);
        if (error) return;
        setFounders((prev) =>
            prev.map((f) => (f.id === id ? { ...f, name: editForm.name.trim(), commission: Number(editForm.commission) } : f))
        );
        cancelEdit();
    };

    // ---------- Add founder ----------
    const addFounder = async () => {
        if (!addForm.name.trim() || addForm.commission === "") return;
        const { data, error } = await supabase
            .from("founders")
            .insert({ name: addForm.name.trim(), commission: Number(addForm.commission) })
            .select()
            .single();
        if (error) return;
        setFounders((prev) => [...prev, data]);
        setAddForm({ name: "", commission: "" });
        setAddOpen(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen w-full flex flex-col md:flex-row items-stretch bg-slate-50">
                <Navbar />
                <div className="flex-1 min-w-0 flex items-center justify-center px-5 py-16">
                    <div className="w-full max-w-md rounded-3xl bg-white border border-gray-200 shadow-sm px-6 py-8 flex flex-col items-center justify-center gap-3 text-center">
                        <Loader2 className="animate-spin text-slate-700" size={36} />
                        <p className="text-sm font-medium text-slate-600">Loading internals...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full flex flex-col md:flex-row items-stretch bg-slate-50">
            <Navbar />

            <div className="flex-1 min-w-0 px-5 md:px-6 pt-24 md:pt-6 pb-12">
                <div className="max-w-5xl mx-auto">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                        <div>
                            <h1 className="text-2xl font-extrabold text-slate-900">Internals</h1>
                            <p className="text-sm text-slate-500 mt-1">Founder commission cuts, client attribution &amp; revenue split</p>
                        </div>
                        {!tableMissing && (
                            <button
                                onClick={() => setAddOpen(true)}
                                className="inline-flex items-center gap-2 rounded-full bg-slate-900 text-white text-sm font-semibold px-5 py-2.5 hover:bg-slate-800 transition self-start"
                            >
                                <Plus size={16} /> Add Founder
                            </button>
                        )}
                    </div>

                    {tableMissing ? (
                        <div className="rounded-3xl bg-white border border-gray-200 shadow-sm px-6 py-10 text-center">
                            <p className="text-sm font-semibold text-slate-700">The founders table isn't set up yet.</p>
                            <p className="text-xs text-slate-400 mt-1">
                                Run the founders table migration in Supabase, then refresh this page.
                            </p>
                        </div>
                    ) : (
                        <>
                            {unassignedCount > 0 && (
                                <div className="rounded-2xl bg-amber-50 text-amber-700 text-xs font-semibold px-4 py-3 mb-5">
                                    {unassignedCount} client{unassignedCount === 1 ? "" : "s"} not yet assigned to a founder — assign them from the client's Details tab.
                                </div>
                            )}

                            {founders.length === 0 ? (
                                <div className="rounded-3xl bg-white border border-gray-200 shadow-sm px-6 py-10 text-center text-sm text-slate-400">
                                    No founders yet — add one to get started.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    {stats.map((f) => (
                                        <div key={f.id} className="rounded-3xl bg-white p-6 shadow-[0px_0_10px_-3px_rgba(0,0,0,0.3)] border border-gray-200">
                                            <div className="flex items-center justify-between mb-5">
                                                {editingId === f.id ? (
                                                    <input
                                                        value={editForm.name}
                                                        onChange={(e) => setEditForm((s) => ({ ...s, name: e.target.value }))}
                                                        className="font-bold text-slate-900 text-base rounded-lg border border-gray-200 px-2 py-1 outline-none focus:border-slate-400 w-40"
                                                    />
                                                ) : (
                                                    <div>
                                                        <p className="font-bold text-slate-900">{f.name}</p>
                                                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                                            <Users size={11} /> {f.clientCount} client{f.clientCount === 1 ? "" : "s"} brought in
                                                        </p>
                                                    </div>
                                                )}

                                                {editingId === f.id ? (
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            type="number"
                                                            value={editForm.commission}
                                                            onChange={(e) => setEditForm((s) => ({ ...s, commission: e.target.value }))}
                                                            className="w-16 rounded-full border border-gray-200 text-center text-xs font-semibold px-2 py-1 outline-none focus:border-slate-400"
                                                        />
                                                        <span className="text-xs text-slate-400">%</span>
                                                        <button onClick={() => saveEdit(f.id)} className="p-1.5 rounded-full text-emerald-600 hover:bg-emerald-50">
                                                            <Check size={15} />
                                                        </button>
                                                        <button onClick={cancelEdit} className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100">
                                                            <X size={15} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => startEdit(f)}
                                                        className="flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-600 text-xs font-semibold px-3 py-1.5 hover:bg-amber-100 transition"
                                                    >
                                                        {f.commission}% cut <Pencil size={11} />
                                                    </button>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 mb-4">
                                                <div>
                                                    <p className="text-[0.65rem] uppercase tracking-wide text-gray-400 mb-1">Total Revenue</p>
                                                    <p className="text-lg font-bold text-slate-900">{currency(f.generated)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[0.65rem] uppercase tracking-wide text-gray-400 mb-1">Collected</p>
                                                    <p className="text-lg font-bold text-emerald-600">{currency(f.collected)}</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                                                <div>
                                                    <p className="text-[0.65rem] uppercase tracking-wide text-gray-400 mb-1">Their Cut (Paid)</p>
                                                    <p className="text-sm font-bold text-emerald-600">{currency(f.cutPaid)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[0.65rem] uppercase tracking-wide text-gray-400 mb-1">Their Cut (Pending)</p>
                                                    <p className="text-sm font-bold text-amber-500">{currency(f.cutPending)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {addOpen && (
                <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center px-4 z-50" onClick={() => setAddOpen(false)}>
                    <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-bold text-slate-900">Add Founder</h2>
                            <button onClick={() => setAddOpen(false)} className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</label>
                                <input
                                    value={addForm.name}
                                    onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                                    placeholder="e.g. Founder C"
                                    className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-slate-400"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Commission (%)</label>
                                <div className="relative mt-1.5">
                                    <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                                    <input
                                        type="number"
                                        value={addForm.commission}
                                        onChange={(e) => setAddForm((f) => ({ ...f, commission: e.target.value }))}
                                        placeholder="e.g. 10"
                                        className="w-full rounded-xl border border-gray-200 pl-9 pr-3.5 py-2.5 text-sm outline-none focus:border-slate-400"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setAddOpen(false)} className="flex-1 rounded-full border border-gray-200 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50">
                                Cancel
                            </button>
                            <button
                                onClick={addFounder}
                                disabled={!addForm.name.trim() || addForm.commission === ""}
                                className="flex-1 rounded-full bg-slate-900 text-white py-2.5 text-sm font-semibold hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Add
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}