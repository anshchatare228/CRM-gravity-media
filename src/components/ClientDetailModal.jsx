// src/components/ClientDetailModal.jsx
import React, { useEffect, useState } from "react";
import { X, Plus, Trash2, CheckCircle2, Circle, FileText, Receipt, Milestone } from "lucide-react";
import { supabase } from "../lib/supabase";

const currency = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export default function ClientDetailModal({ client, onClose, onClientUpdate }) {
    const [tab, setTab] = useState("timeline");
    const [tasks, setTasks] = useState([]);
    const [milestones, setMilestones] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);

    const [newTask, setNewTask] = useState("");
    const [milestoneForm, setMilestoneForm] = useState({ title: "", dueDate: "" });
    const [invoiceForm, setInvoiceForm] = useState({ description: "", amount: "", issueDate: new Date().toISOString().slice(0, 10) });

    useEffect(() => {
        if (!client) return;
        (async () => {
            setLoading(true);
            const [{ data: t }, { data: m }, { data: i }] = await Promise.all([
                supabase.from("client_tasks").select("*").eq("client_id", client.id).order("created_at"),
                supabase.from("client_milestones").select("*").eq("client_id", client.id).order("sort_order").order("due_date"),
                supabase.from("invoices").select("*").eq("client_id", client.id).order("issue_date", { ascending: false }),
            ]);
            setTasks(t || []);
            setMilestones(m || []);
            setInvoices(i || []);
            setLoading(false);
        })();
    }, [client]);

    // Contract clients only: all work items done => mark client completed (expired)
    const syncCompletion = async (nextTasks) => {
        if (client.type !== "contract") return;
        const allDone = nextTasks.length > 0 && nextTasks.every((t) => t.done);
        if (allDone !== client.completed) {
            await supabase.from("clients").update({ completed: allDone }).eq("id", client.id);
            onClientUpdate(client.id, { completed: allDone });
        }
    };

    // ---------- Work items ----------
    const addTask = async () => {
        if (!newTask.trim()) return;
        const { data, error } = await supabase
            .from("client_tasks")
            .insert({ client_id: client.id, title: newTask.trim() })
            .select()
            .single();
        if (error) return;
        const next = [...tasks, data];
        setTasks(next);
        setNewTask("");
        syncCompletion(next);
    };

    const toggleTask = async (task) => {
        const { error } = await supabase.from("client_tasks").update({ done: !task.done }).eq("id", task.id);
        if (error) return;
        const next = tasks.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t));
        setTasks(next);
        syncCompletion(next);
    };

    const deleteTask = async (task) => {
        const { error } = await supabase.from("client_tasks").delete().eq("id", task.id);
        if (error) return;
        const next = tasks.filter((t) => t.id !== task.id);
        setTasks(next);
        syncCompletion(next);
    };

    // ---------- Milestones / timeline ----------
    const addMilestone = async () => {
        if (!milestoneForm.title.trim()) return;
        const { data, error } = await supabase
            .from("client_milestones")
            .insert({
                client_id: client.id,
                title: milestoneForm.title.trim(),
                due_date: milestoneForm.dueDate || null,
                sort_order: milestones.length,
            })
            .select()
            .single();
        if (error) return;
        setMilestones([...milestones, data]);
        setMilestoneForm({ title: "", dueDate: "" });
    };

    const toggleMilestone = async (m) => {
        const { error } = await supabase.from("client_milestones").update({ done: !m.done }).eq("id", m.id);
        if (error) return;
        setMilestones((prev) => prev.map((x) => (x.id === m.id ? { ...x, done: !x.done } : x)));
    };

    const deleteMilestone = async (m) => {
        const { error } = await supabase.from("client_milestones").delete().eq("id", m.id);
        if (error) return;
        setMilestones((prev) => prev.filter((x) => x.id !== m.id));
    };

    // ---------- Invoices ----------
    const addInvoice = async () => {
        if (!invoiceForm.amount) return;
        const { data, error } = await supabase
            .from("invoices")
            .insert({
                client_id: client.id,
                description: invoiceForm.description,
                amount: Number(invoiceForm.amount),
                issue_date: invoiceForm.issueDate,
            })
            .select()
            .single();
        if (error) return;
        setInvoices((prev) => [data, ...prev]);
        setInvoiceForm({ description: "", amount: "", issueDate: new Date().toISOString().slice(0, 10) });
    };

    const toggleInvoicePaid = async (invoice) => {
        const nextStatus = invoice.status === "paid" ? "pending" : "paid";
        const { error } = await supabase
            .from("invoices")
            .update({ status: nextStatus, paid_at: nextStatus === "paid" ? new Date().toISOString() : null })
            .eq("id", invoice.id);
        if (error) return;
        setInvoices((prev) => prev.map((i) => (i.id === invoice.id ? { ...i, status: nextStatus } : i)));
    };

    if (!client) return null;

    const TABS = [
        { key: "timeline", label: "Timeline", icon: <Milestone size={14} /> },
        { key: "tasks", label: "Work", icon: <FileText size={14} /> },
        { key: "invoices", label: "Invoices", icon: <Receipt size={14} /> },
    ];

    return (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center px-4 z-50" onClick={onClose}>
            <div
                className="bg-white rounded-3xl w-full max-w-lg shadow-xl max-h-[90vh] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">{client.name}</h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                            {client.type === "monthly" ? "Monthly retainer" : "Contract"} · {currency(client.payment)}
                            {client.type === "monthly" ? "/mo" : " total"}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100">
                        <X size={18} />
                    </button>
                </div>

                <div className="flex gap-1 px-6 pt-4">
                    {TABS.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition ${tab === t.key ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"
                                }`}
                        >
                            {t.icon} {t.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5">
                    {loading ? (
                        <p className="text-sm text-slate-400 text-center py-8">Loading...</p>
                    ) : tab === "timeline" ? (
                        <div>
                            {milestones.length === 0 && (
                                <p className="text-sm text-slate-400 text-center py-6">No milestones yet — add the first stage below.</p>
                            )}
                            <div className="space-y-0">
                                {milestones.map((m, idx) => (
                                    <div key={m.id} className="flex gap-3 group">
                                        <div className="flex flex-col items-center">
                                            <button onClick={() => toggleMilestone(m)} className="shrink-0">
                                                {m.done ? (
                                                    <CheckCircle2 size={18} className="text-emerald-600" />
                                                ) : (
                                                    <Circle size={18} className="text-slate-300" />
                                                )}
                                            </button>
                                            {idx < milestones.length - 1 && <div className="w-px flex-1 bg-gray-200 my-1" />}
                                        </div>
                                        <div className="pb-5 flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className={`text-sm font-semibold ${m.done ? "text-slate-400 line-through" : "text-slate-800"}`}>
                                                        {m.title}
                                                    </p>
                                                    {m.due_date && (
                                                        <p className="text-xs text-slate-400 mt-0.5">
                                                            {new Date(m.due_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}
                                                        </p>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => deleteMilestone(m)}
                                                    className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-600 transition shrink-0"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2 pt-1 border-t border-gray-100 mt-1">
                                <input
                                    value={milestoneForm.title}
                                    onChange={(e) => setMilestoneForm((f) => ({ ...f, title: e.target.value }))}
                                    placeholder="e.g. First draft delivered"
                                    className="flex-1 rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-slate-400 mt-4"
                                />
                                <input
                                    type="date"
                                    value={milestoneForm.dueDate}
                                    onChange={(e) => setMilestoneForm((f) => ({ ...f, dueDate: e.target.value }))}
                                    className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 mt-4"
                                />
                                <button
                                    onClick={addMilestone}
                                    className="rounded-xl bg-slate-900 text-white px-3.5 hover:bg-slate-800 transition mt-4 shrink-0"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                        </div>
                    ) : tab === "tasks" ? (
                        <div className="space-y-2">
                            {client.type === "contract" && (
                                <p className="text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-2 mb-2">
                                    When every item below is checked off, this client is automatically marked expired.
                                </p>
                            )}
                            {tasks.length === 0 && (
                                <p className="text-sm text-slate-400 text-center py-6">No work items yet — add the first one below.</p>
                            )}
                            {tasks.map((t) => (
                                <div key={t.id} className="flex items-center gap-3 rounded-xl border border-gray-100 px-3 py-2.5 group">
                                    <button onClick={() => toggleTask(t)} className="text-slate-400 hover:text-emerald-600 shrink-0">
                                        {t.done ? <CheckCircle2 size={18} className="text-emerald-600" /> : <Circle size={18} />}
                                    </button>
                                    <span className={`flex-1 text-sm ${t.done ? "text-slate-400 line-through" : "text-slate-700"}`}>
                                        {t.title}
                                    </span>
                                    <button
                                        onClick={() => deleteTask(t)}
                                        className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-600 transition shrink-0"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                            <div className="flex gap-2 pt-2">
                                <input
                                    value={newTask}
                                    onChange={(e) => setNewTask(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && addTask()}
                                    placeholder="e.g. Reel 3 — product launch"
                                    className="flex-1 rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-slate-400"
                                />
                                <button onClick={addTask} className="rounded-xl bg-slate-900 text-white px-3.5 hover:bg-slate-800 transition">
                                    <Plus size={16} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {invoices.length === 0 && (
                                <p className="text-sm text-slate-400 text-center py-6">No invoices yet — create one below.</p>
                            )}
                            {invoices.map((inv) => (
                                <div key={inv.id} className="rounded-xl border border-gray-100 px-3.5 py-3 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-slate-800 truncate">{inv.description || "Invoice"}</p>
                                        <p className="text-xs text-slate-400">
                                            {new Date(inv.issue_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })} · {currency(inv.amount)}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => toggleInvoicePaid(inv)}
                                        className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition ${inv.status === "paid" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                                            }`}
                                    >
                                        {inv.status === "paid" ? "Paid" : "Pending"}
                                    </button>
                                </div>
                            ))}
                            <div className="rounded-xl border border-gray-100 p-3.5 space-y-2 mt-3">
                                <input
                                    value={invoiceForm.description}
                                    onChange={(e) => setInvoiceForm((f) => ({ ...f, description: e.target.value }))}
                                    placeholder="Description (e.g. August retainer)"
                                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                                />
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        value={invoiceForm.amount}
                                        onChange={(e) => setInvoiceForm((f) => ({ ...f, amount: e.target.value }))}
                                        placeholder="Amount (₹)"
                                        className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                                    />
                                    <input
                                        type="date"
                                        value={invoiceForm.issueDate}
                                        onChange={(e) => setInvoiceForm((f) => ({ ...f, issueDate: e.target.value }))}
                                        className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                                    />
                                </div>
                                <button
                                    onClick={addInvoice}
                                    className="w-full rounded-lg bg-slate-900 text-white py-2 text-sm font-semibold hover:bg-slate-800 transition"
                                >
                                    Create Invoice
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}