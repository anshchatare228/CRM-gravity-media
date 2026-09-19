import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { Loader2, Users, Pencil, Check, X, Plus, IndianRupee, Trash2, Wallet } from "lucide-react";
import { supabase } from "../lib/supabase";
import ConfirmModal from "../components/ConfirmModal";

const currency = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const formatDate = (d) =>
    new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });

export default function Internals() {
    const navigate = useNavigate();

    const [founders, setFounders] = useState([]);
    const [clients, setClients] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [payouts, setPayouts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tableMissing, setTableMissing] = useState(false);
    const [payoutsTableMissing, setPayoutsTableMissing] = useState(false);

    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ name: "", commission: "" });

    const [addOpen, setAddOpen] = useState(false);
    const [addForm, setAddForm] = useState({ name: "", commission: "" });

    const [payoutModalOpen, setPayoutModalOpen] = useState(false);
    const [deletePayoutId, setDeletePayoutId] = useState(null);
    const [payoutForm, setPayoutForm] = useState({
        founderId: "",
        amount: "",
        paidOn: new Date().toISOString().slice(0, 10),
        notes: "",
    });

    const [expandedFounderId, setExpandedFounderId] = useState(null);

    const fetchAll = async () => {
        setLoading(true);
        const [foundersRes, clientsRes, payoutsRes, invoicesRes] = await Promise.all([
            supabase.from("founders").select("*").order("name"),
            supabase.from("clients").select("*"),
            supabase.from("founder_payouts").select("*").order("paid_on", { ascending: false }),
            supabase.from("invoices").select("client_id, amount, status"),
        ]);

        if (foundersRes.error) {
            // Table probably doesn't exist yet — show empty state instead of crashing
            setTableMissing(true);
            setFounders([]);
        } else {
            setTableMissing(false);
            setFounders(foundersRes.data || []);
        }

        if (payoutsRes.error) {
            setPayoutsTableMissing(true);
            setPayouts([]);
        } else {
            setPayoutsTableMissing(false);
            setPayouts(payoutsRes.data || []);
        }

        setClients(clientsRes.data || []);
        setInvoices(invoicesRes.error ? [] : (invoicesRes.data || []));
        setLoading(false);
    };

    useEffect(() => {
        fetchAll();
    }, []);

    const companyTotals = useMemo(() => {
        const generated = clients.reduce((s, c) => s + Number(c.payment || 0), 0);
        const collected = clients.reduce((s, c) => s + Number(c.paid_amount || 0), 0);
        const pending = Math.max(0, generated - collected);
        return { generated, collected, pending };
    }, [clients]);

    // Monthly revenue is based on each client's recurring payment record,
    // not on invoice rows. Monthly retainer clients are re-added manually.
    // NOTE: earnedCut is calculated live from current founder_id assignment.
    // Reassigning a client's founder retroactively shifts past collected revenue
    // to the new founder. This is intentional per client — not a bug.
    const stats = useMemo(() => {
        const gajendra = founders.find(
            (f) => String(f.name || "").trim().toLowerCase() === "gajendra"
        );

        // First pass: figure out each founder's own commission cut,
        // and how much "leftover" flows to Gajendra from non-Gajendra clients
        const ownCutByFounder = {};
        let gajendraRemainder = 0;

        clients.forEach((c) => {
            const collected = Number(c.paid_amount || 0);
            if (!c.founder_id || collected <= 0) return;

            const founder = founders.find((f) => f.id === c.founder_id);
            if (!founder) return;

            const isThisGajendra = gajendra && founder.id === gajendra.id;

            if (isThisGajendra) {
                // Gajendra's own clients — he keeps 100%
                ownCutByFounder[founder.id] = (ownCutByFounder[founder.id] || 0) + collected;
            } else {
                const pct = Number(founder.commission || 0);
                const theirShare = Math.round((collected * pct) / 100);
                const remainder = collected - theirShare;

                ownCutByFounder[founder.id] = (ownCutByFounder[founder.id] || 0) + theirShare;
                gajendraRemainder += remainder;
            }
        });

        return founders.map((f) => {
            const theirClients = clients.filter((c) => c.founder_id === f.id);

            const generated = theirClients.reduce((s, c) => s + Number(c.payment || 0), 0);
            const collected = theirClients.reduce((s, c) => s + Number(c.paid_amount || 0), 0);
            const pending = Math.max(0, generated - collected);

            const isThisGajendra = gajendra && f.id === gajendra.id;
            const earnedCut = (ownCutByFounder[f.id] || 0) + (isThisGajendra ? gajendraRemainder : 0);

            const paidOut = payouts
                .filter((p) => p.founder_id === f.id)
                .reduce((s, p) => s + Number(p.amount || 0), 0);
            const cutPending = Math.max(0, earnedCut - paidOut);

            return {
                ...f,
                clientCount: theirClients.length,
                theirClients,
                generated,
                collected,
                pending,
                earnedCut,
                cutPaid: paidOut,
                cutPending,
            };
        });
    }, [founders, clients, payouts, invoices]);

    const founderMap = useMemo(() => {
        const map = {};
        founders.forEach((f) => (map[f.id] = f.name));
        return map;
    }, [founders]);

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

    // ---------- Payouts ----------
    const openPayoutModal = (founderId = "") => {
        setPayoutForm({ founderId, amount: "", paidOn: new Date().toISOString().slice(0, 10), notes: "" });
        setPayoutModalOpen(true);
    };

    const addPayout = async () => {
        if (!payoutForm.founderId || !payoutForm.amount) return;
        const { data, error } = await supabase
            .from("founder_payouts")
            .insert({
                founder_id: payoutForm.founderId,
                amount: Number(payoutForm.amount),
                paid_on: payoutForm.paidOn,
                notes: payoutForm.notes || null,
            })
            .select()
            .single();
        if (error) return;
        setPayouts((prev) => [data, ...prev]);
        setPayoutModalOpen(false);
    };

    const deletePayout = async (id) => {
        const { error } = await supabase.from("founder_payouts").delete().eq("id", id);
        if (error) return;
        setPayouts((prev) => prev.filter((p) => p.id !== id));
    };

    if (loading) {
        return (
            <div className="min-h-screen w-full flex flex-col md:flex-row items-stretch bg-slate-50">
                <Navbar />
                <div className="flex-1 min-w-0 flex items-center justify-center px-5 py-16">
                    <div className="w-full max-w-md rounded-none bg-white border border-gray-200 shadow-sm px-6 py-8 flex flex-col items-center justify-center gap-3 text-center">
                        <Loader2 className="animate-spin text-slate-700" size={36} />
                        <p className="text-sm font-medium text-slate-600">Loading internals...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full flex flex-col md:flex-row items-stretch bg-stone-500/10">
            <Navbar />

            <div className="flex-1 min-w-0 px-5 md:px-6 pt-10 md:pt-6 pb-12">
                <div className="max-w-5xl mx-auto">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                        <div>
                            <h1 className="text-2xl font-extrabold text-slate-900">Internals</h1>
                            <p className="text-sm text-black/90 mt-1">Founder commission cuts, client attribution &amp; revenue split</p>
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

                    <div className="rounded-none bg-white p-6 shadow-[0px_0_10px_-3px_rgba(0,0,0,0.3)] border border-gray-200 mb-6">
                        <div className="flex items-center gap-2 text-xs font-semibold tracking-[3px] text-black uppercase mb-4">
                            <IndianRupee size={14} />
                            Company Revenue
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <p className="text-[0.65rem] uppercase tracking-wide text-gray-400 mb-1">Total Generated</p>
                                <p className="text-lg font-bold text-slate-900">{currency(companyTotals.generated)}</p>
                            </div>
                            <div>
                                <p className="text-[0.65rem] uppercase tracking-wide text-gray-400 mb-1">Total Collected</p>
                                <p className="text-lg font-bold text-emerald-600">{currency(companyTotals.collected)}</p>
                            </div>
                            <div>
                                <p className="text-[0.65rem] uppercase tracking-wide text-gray-400 mb-1">Pending</p>
                                <p className="text-lg font-bold text-amber-500">{currency(companyTotals.pending)}</p>
                            </div>
                        </div>
                    </div>

                    {tableMissing ? (
                        <div className="rounded-none bg-white border border-gray-200 shadow-sm px-6 py-10 text-center">
                            <p className="text-sm font-semibold text-slate-700">The founders table isn't set up yet.</p>
                            <p className="text-xs text-slate-400 mt-1">
                                Run the founders table migration in Supabase, then refresh this page.
                            </p>
                        </div>
                    ) : (
                        <>
                            {unassignedCount > 0 && (
                                <div className="rounded-2xl bg-amber-50 text-amber-700 text-xs font-semibold px-4 py-3 mb-5">
                                    {unassignedCount} client{unassignedCount === 1 ? "" : "s"} not yet assigned to a founder — assign them from the client's edit page.
                                </div>
                            )}

                            {founders.length === 0 ? (
                                <div className="rounded-none bg-white border border-gray-200 shadow-sm px-6 py-10 text-center text-sm text-slate-400">
                                    No founders yet — add one to get started.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    {stats.map((f) => (
                                        <div key={f.id} className="rounded-none bg-white p-6 shadow-[0px_0_10px_-3px_rgba(0,0,0,0.3)] border border-gray-200">
                                            <div className="flex items-center justify-between mb-5">
                                                {editingId === f.id ? (
                                                    <input
                                                        value={editForm.name}
                                                        onChange={(e) => setEditForm((s) => ({ ...s, name: e.target.value }))}
                                                        className="font-bold text-slate-900 text-base rounded-none border border-gray-200 px-2 py-1 outline-none focus:border-slate-400 w-40"
                                                    />
                                                ) : (
                                                    <div>
                                                        <p className="font-bold text-slate-900">{f.name}</p>
                                                        <button
                                                            onClick={() => setExpandedFounderId(expandedFounderId === f.id ? null : f.id)}
                                                            className="text-xs text-gray-400 flex items-center gap-1 mt-0.5 hover:text-slate-700 transition hover:underline cursor-pointer"
                                                        >
                                                            <Users size={11} /> {f.clientCount} client{f.clientCount === 1 ? "" : "s"} brought in
                                                        </button>
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

                                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 mb-4">
                                                <div>
                                                    <p className="text-[0.65rem] uppercase tracking-wide text-gray-400 mb-1">Their Cut (Owed)</p>
                                                    <p className="text-sm font-bold text-amber-500">{currency(f.cutPending)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[0.65rem] uppercase tracking-wide text-gray-400 mb-1">Their Cut (Taken)</p>
                                                    <p className="text-sm font-bold text-emerald-600">{currency(f.cutPaid)}</p>
                                                </div>
                                            </div>

                                            {expandedFounderId === f.id && (
                                                <div className="mb-4 rounded-none border border-gray-100 divide-y divide-gray-50">
                                                    {f.theirClients.length === 0 ? (
                                                        <p className="text-xs text-slate-400 text-center py-4">No clients yet.</p>
                                                    ) : (
                                                        f.theirClients.map((c) => (
                                                            <button
                                                                key={c.id}
                                                                onClick={() => navigate(`/clients/${c.id}`)}
                                                                className="w-full flex items-center justify-between px-3.5 py-2.5 text-left hover:bg-slate-50 transition cursor-pointer"
                                                            >
                                                                <span className="text-sm font-medium text-slate-700 truncate">{c.name}</span>
                                                                <span className="text-xs text-slate-400 shrink-0 ml-2">{currency(c.paid_amount)} / {currency(c.payment)}</span>
                                                            </button>
                                                        ))
                                                    )}
                                                </div>
                                            )}

                                            {!payoutsTableMissing && (
                                                <button
                                                    onClick={() => openPayoutModal(f.id)}
                                                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-full border border-gray-200 text-slate-600 text-xs font-semibold px-3 py-2 hover:bg-slate-50 transition"
                                                >
                                                    <Wallet size={13} /> Log Payout
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* ==========================================
                                PAYOUT HISTORY TABLE
                            ========================================== */}
                            {!payoutsTableMissing ? (
                                founders.length > 0 && (
                                    <div className="mt-8">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2 text-xs font-semibold tracking-[3px] text-black uppercase">
                                                <Wallet size={14} />
                                                Payout History
                                            </div>
                                            <button
                                                onClick={() => openPayoutModal()}
                                                className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 text-white text-xs font-semibold px-4 py-2 hover:bg-slate-800 transition"
                                            >
                                                <Plus size={13} /> Log Payout
                                            </button>
                                        </div>

                                        <div className="rounded-none bg-white border border-gray-200 shadow-[0px_0_10px_-3px_rgba(0,0,0,0.3)] overflow-hidden">
                                            <div className="hidden md:grid grid-cols-[1.2fr_1fr_1fr_1.4fr_auto] gap-4 px-6 py-3 text-xs font-semibold tracking-wide text-slate-400 uppercase border-b border-gray-100">
                                                <span>Founder</span>
                                                <span>Amount</span>
                                                <span>Date</span>
                                                <span>Notes</span>
                                                <span></span>
                                            </div>

                                            {payouts.length === 0 && (
                                                <div className="px-6 py-10 text-center text-sm text-slate-400">
                                                    No payouts logged yet.
                                                </div>
                                            )}

                                            {payouts.map((p) => (
                                                <div
                                                    key={p.id}
                                                    className="grid grid-cols-2 md:grid-cols-[1.2fr_1fr_1fr_1.4fr_auto] gap-4 px-6 py-3.5 items-center border-b border-gray-50 last:border-0"
                                                >
                                                    <div className="col-span-2 md:col-span-1 font-semibold text-sm text-slate-800">
                                                        {founderMap[p.founder_id] || "Unknown"}
                                                    </div>
                                                    <div className="text-sm font-semibold text-emerald-600">{currency(p.amount)}</div>
                                                    <div className="text-sm text-slate-500">{formatDate(p.paid_on)}</div>
                                                    <div className="text-sm text-slate-500 truncate">{p.notes || "—"}</div>
                                                    <div className="flex justify-end">
                                                        <button
                                                            onClick={() => setDeletePayoutId(p.id)}
                                                            className="p-2 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )
                            ) : (
                                <div className="mt-8 rounded-none bg-white border border-gray-200 shadow-sm px-6 py-8 text-center">
                                    <p className="text-sm font-semibold text-slate-700">The founder payouts table isn't set up yet.</p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        Run the founder_payouts migration in Supabase, then refresh this page.
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {addOpen && (
                <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center px-4 z-50" onClick={() => setAddOpen(false)}>
                    <div className="bg-white rounded-none w-full max-w-sm p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-bold text-slate-900">Add Founder</h2>
                            <button onClick={() => setAddOpen(false)} className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold font-sans text-black/90 uppercase tracking-wide">Name</label>
                                <input
                                    value={addForm.name}
                                    onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                                    placeholder="e.g. Founder C"
                                    className="mt-1.5 w-full rounded-none border border-black/30 px-3.5 py-2.5 text-sm outline-none focus:border-slate-400"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold font-sans text-black/90 uppercase tracking-wide">Commission (%)</label>
                                <div className="relative mt-1.5">
                                    <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                                    <input
                                        type="number"
                                        value={addForm.commission}
                                        onChange={(e) => setAddForm((f) => ({ ...f, commission: e.target.value }))}
                                        placeholder="e.g. 10"
                                        className="w-full rounded-none border border-gray-200 pl-9 pr-3.5 py-2.5 text-sm outline-none focus:border-slate-400"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setAddOpen(false)} className="flex-1 rounded-full border border-gray-200 py-2.5 text-sm font-semibold text-black/90 hover:bg-slate-50">
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

            {payoutModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center px-4 z-50" onClick={() => setPayoutModalOpen(false)}>
                    <div className="bg-white rounded-none w-full max-w-sm p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-bold text-slate-900">Log Payout</h2>
                            <button onClick={() => setPayoutModalOpen(false)} className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold font-sans text-black/90 uppercase tracking-wide">Founder</label>
                                <select
                                    value={payoutForm.founderId}
                                    onChange={(e) => setPayoutForm((f) => ({ ...f, founderId: e.target.value }))}
                                    className="mt-1.5 w-full rounded-none border border-black/30 px-3.5 py-2.5 text-sm outline-none focus:border-slate-400 bg-white"
                                >
                                    <option value="">Select founder</option>
                                    {founders.map((fd) => (
                                        <option key={fd.id} value={fd.id}>{fd.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold font-sans text-black/90 uppercase tracking-wide">Amount (₹)</label>
                                <input
                                    type="number"
                                    value={payoutForm.amount}
                                    onChange={(e) => setPayoutForm((f) => ({ ...f, amount: e.target.value }))}
                                    placeholder="e.g. 15000"
                                    className="mt-1.5 w-full rounded-none border border-black/30 px-3.5 py-2.5 text-sm outline-none focus:border-slate-400"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold font-sans text-black/90 uppercase tracking-wide">Date</label>
                                <input
                                    type="date"
                                    value={payoutForm.paidOn}
                                    onChange={(e) => setPayoutForm((f) => ({ ...f, paidOn: e.target.value }))}
                                    className="mt-1.5 w-full rounded-none border border-black/30 px-3.5 py-2.5 text-sm outline-none focus:border-slate-400"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold font-sans text-black/90 uppercase tracking-wide">Notes (optional)</label>
                                <input
                                    value={payoutForm.notes}
                                    onChange={(e) => setPayoutForm((f) => ({ ...f, notes: e.target.value }))}
                                    placeholder="e.g. UPI transfer"
                                    className="mt-1.5 w-full rounded-none border border-black/30 px-3.5 py-2.5 text-sm outline-none focus:border-slate-400"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setPayoutModalOpen(false)} className="flex-1 rounded-full border border-gray-200 py-2.5 text-sm font-semibold text-black/90 hover:bg-slate-50">
                                Cancel
                            </button>
                            <button
                                onClick={addPayout}
                                disabled={!payoutForm.founderId || !payoutForm.amount}
                                className="flex-1 rounded-full bg-slate-900 text-white py-2.5 text-sm font-semibold hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <ConfirmModal
                open={Boolean(deletePayoutId)}
                title="Delete payout?"
                message="Delete this payout record? This cannot be undone."
                onConfirm={async () => {
                    const payoutId = deletePayoutId;
                    setDeletePayoutId(null);
                    await deletePayout(payoutId);
                }}
                onCancel={() => setDeletePayoutId(null)}
            />
        </div>
    );
}