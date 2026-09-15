import React, { useEffect, useState } from "react";
import { X, Plus, Trash2, CheckCircle2, Circle, FileText, Receipt, Milestone, Pencil, Repeat, FileSignature } from "lucide-react";
import { supabase } from "../lib/supabase";
import ConfirmModal from "./ConfirmModal";
import InvoicePreview, { downloadInvoicePdf } from "./InvoicePreview";

const currency = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const buildForm = (client) => ({
    name: client.name,
    type: client.type,
    payment: client.payment,
    startDate: client.start_date,
    endDate: client.end_date || "",
    notes: client.notes || "",
    founderId: client.founder_id || "",
});

export default function ClientEdit({ client, founders = [], onClose, onClientUpdate }) {
    const [tab, setTab] = useState("timeline");
    const [tasks, setTasks] = useState([]);
    const [milestones, setMilestones] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);

    const [newTask, setNewTask] = useState("");
    const [milestoneForm, setMilestoneForm] = useState({ title: "", dueDate: "" });
    const [invoiceForm, setInvoiceForm] = useState({ description: "", rate: "", quantity: "1", amount: "", issueDate: new Date().toISOString().slice(0, 10), paymentMethod: "", upiId: "", paidOn: "" });

    const [form, setForm] = useState(() => (client ? buildForm(client) : buildForm({})));
    const [savingDetails, setSavingDetails] = useState(false);
    const [savedFlash, setSavedFlash] = useState(false);
    const [pendingDelete, setPendingDelete] = useState(null);
    const [selectedInvoice, setSelectedInvoice] = useState(null);

    useEffect(() => {
        if (!client) return;
        setForm(buildForm(client));
    }, [client?.id]);

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

    const confirmDeleteTask = async (task) => {
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

    const confirmDeleteMilestone = async (m) => {
        const { error } = await supabase.from("client_milestones").delete().eq("id", m.id);
        if (error) return;
        setMilestones((prev) => prev.filter((x) => x.id !== m.id));
    };

    // ---------- Invoices ----------
    const addInvoice = async () => {
        const rate = Number(invoiceForm.rate || invoiceForm.amount || (client.type === "monthly" ? client.payment : 0));
        const quantity = Number(invoiceForm.quantity || 1);
        const amount = Number(invoiceForm.amount || rate * quantity);
        if (!amount) return;
        const { data, error } = await supabase
            .from("invoices")
            .insert({
                client_id: client.id,
                description: invoiceForm.description || (client.type === "monthly" ? "Monthly retainer" : "Invoice"),
                invoice_number: `INV-${Date.now().toString().slice(-6)}`,
                rate,
                quantity,
                amount,
                issue_date: invoiceForm.issueDate,
                payment_method: invoiceForm.paymentMethod || null,
                upi_id: invoiceForm.upiId || null,
                paid_on: invoiceForm.paidOn || null,
            })
            .select()
            .single();
        if (error) return;
        setInvoices((prev) => [data, ...prev]);
        setInvoiceForm({ description: "", rate: "", quantity: "1", amount: "", issueDate: new Date().toISOString().slice(0, 10), paymentMethod: "", upiId: "", paidOn: "" });
    };

    const toggleInvoicePaid = async (invoice) => {
        const nextStatus = invoice.status === "paid" ? "pending" : "paid";
        const { error } = await supabase
            .from("invoices")
            .update({ status: nextStatus, paid_at: nextStatus === "paid" ? new Date().toISOString() : null, paid_on: nextStatus === "paid" ? new Date().toISOString().slice(0, 10) : null })
            .eq("id", invoice.id);
        if (error) return;
        setInvoices((prev) => prev.map((i) => (i.id === invoice.id ? {
            ...i,
            status: nextStatus,
            paid_on: nextStatus === "paid" ? new Date().toISOString().slice(0, 10) : null,
        } : i)));
    };

    const confirmDeleteInvoice = async (invoice) => {
        const { error } = await supabase.from("invoices").delete().eq("id", invoice.id);
        if (error) return;
        setInvoices((prev) => prev.filter((item) => item.id !== invoice.id));
        if (selectedInvoice?.id === invoice.id) setSelectedInvoice(null);
    };

    // ---------- Details / edit ----------
    const setDuration = (months) => {
        if (!form.startDate) return;
        const end = new Date(form.startDate);
        end.setMonth(end.getMonth() + Number(months));
        setForm((f) => ({ ...f, endDate: end.toISOString().slice(0, 10) }));
    };

    const saveDetails = async () => {
        if (!form.name.trim() || !form.payment || !form.startDate) return;
        setSavingDetails(true);
        const payload = {
            name: form.name.trim(),
            type: form.type,
            payment: Number(form.payment),
            start_date: form.startDate,
            end_date: form.endDate || null,
            notes: form.notes,
            founder_id: form.founderId || null,
        };
        const { error } = await supabase.from("clients").update(payload).eq("id", client.id);
        setSavingDetails(false);
        if (error) return;
        onClientUpdate(client.id, payload);
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 1500);
    };

    if (!client) return null;

    const TABS = [
        { key: "details", label: "Details", icon: <Pencil size={14} /> },
        { key: "timeline", label: "Timeline", icon: <Milestone size={14} /> },
        { key: "tasks", label: "Work", icon: <FileText size={14} /> },
        { key: "invoices", label: "Invoices", icon: <Receipt size={14} /> },
    ];

    return (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center px-4 z-50" onClick={onClose}>
            <div
                className="bg-white rounded-none w-full max-w-lg shadow-xl max-h-[90vh] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">{form.name || client.name}</h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                            {form.type === "monthly" ? "Monthly retainer" : "Contract"} · {currency(form.payment)}
                            {form.type === "monthly" ? "/mo" : " total"}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100">
                        <X size={18} />
                    </button>
                </div>

                <div className="flex gap-1 px-6 pt-4 flex-wrap">
                    {TABS.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition ${tab === t.key ? "bg-slate-900 text-white" : "text-black/90 hover:bg-slate-100"
                                }`}
                        >
                            {t.icon} {t.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5">
                    {tab === "details" ? (
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold font-sans text-black/90 uppercase tracking-wide">Client Name</label>
                                <input
                                    value={form.name}
                                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                    placeholder="e.g. Bloom & Co Skincare"
                                    className="mt-1.5 w-full rounded-none border border-black/30 px-3.5 py-2.5 text-sm outline-none focus:border-slate-400"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold font-sans text-black/90 uppercase tracking-wide">Client Type</label>
                                <div className="mt-1.5 grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setForm((f) => ({ ...f, type: "monthly" }))}
                                        className={`flex items-center justify-center gap-1.5 rounded-none border px-3 py-2.5 text-sm font-semibold transition ${form.type === "monthly" ? "border-slate-900 bg-slate-900 text-white" : "border-gray-200 text-black/90"
                                            }`}
                                    >
                                        <Repeat size={14} /> Monthly
                                    </button>
                                    <button
                                        onClick={() => setForm((f) => ({ ...f, type: "contract" }))}
                                        className={`flex items-center justify-center gap-1.5 rounded-none border px-3 py-2.5 text-sm font-semibold transition ${form.type === "contract" ? "border-slate-900 bg-slate-900 text-white" : "border-gray-200 text-black/90"
                                            }`}
                                    >
                                        <FileSignature size={14} /> Contract
                                    </button>
                                </div>
                            </div>

                            {founders.length > 0 && (
                                <div>
                                    <label className="text-xs font-semibold font-sans text-black/90 uppercase tracking-wide">Founder</label>
                                    <select
                                        value={form.founderId}
                                        onChange={(e) => setForm((f) => ({ ...f, founderId: e.target.value }))}
                                        className="mt-1.5 w-full rounded-none border border-black/30 px-3.5 py-2.5 text-sm outline-none focus:border-slate-400 bg-white"
                                    >
                                        <option value="">Unassigned</option>
                                        {founders.map((fd) => (
                                            <option key={fd.id} value={fd.id}>{fd.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="text-xs font-semibold font-sans text-black/90 uppercase tracking-wide">
                                    {form.type === "monthly" ? "Monthly Fee (₹)" : "Total Contract Value (₹)"}
                                </label>
                                <input
                                    type="number"
                                    value={form.payment}
                                    onChange={(e) => setForm((f) => ({ ...f, payment: e.target.value }))}
                                    placeholder="e.g. 45000"
                                    className="mt-1.5 w-full rounded-none border border-black/30 px-3.5 py-2.5 text-sm outline-none focus:border-slate-400"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold font-sans text-black/90 uppercase tracking-wide">Start Date</label>
                                    <input
                                        type="date"
                                        value={form.startDate}
                                        onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                                        className="mt-1.5 w-full rounded-none border border-black/30 px-3.5 py-2.5 text-sm outline-none focus:border-slate-400"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold font-sans text-black/90 uppercase tracking-wide">
                                        End Date {form.type === "monthly" && <span className="normal-case font-normal">(optional)</span>}
                                    </label>
                                    <input
                                        type="date"
                                        value={form.endDate}
                                        onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                                        className="mt-1.5 w-full rounded-none border border-black/30 px-3.5 py-2.5 text-sm outline-none focus:border-slate-400"
                                    />
                                </div>
                            </div>

                            {form.type === "contract" && (
                                <div>
                                    <label className="text-xs font-semibold font-sans text-black/90 uppercase tracking-wide">Quick Duration</label>
                                    <div className="mt-1.5 flex gap-2">
                                        {[1, 3, 6, 12].map((m) => (
                                            <button
                                                key={m}
                                                onClick={() => setDuration(m)}
                                                disabled={!form.startDate}
                                                className="flex-1 rounded-none border border-gray-200 py-2 text-xs font-semibold text-black/90 hover:border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                {m}mo
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="text-xs font-semibold font-sans text-black/90 uppercase tracking-wide">Notes</label>
                                <textarea
                                    value={form.notes}
                                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                                    placeholder="Scope, deliverables, anything worth remembering..."
                                    rows={3}
                                    className="mt-1.5 w-full rounded-none border border-black/30 px-3.5 py-2.5 text-sm outline-none focus:border-slate-400 resize-none"
                                />
                            </div>

                            <button
                                onClick={saveDetails}
                                disabled={!form.name.trim() || !form.payment || !form.startDate || savingDetails}
                                className="w-full rounded-none bg-slate-900 text-white py-2.5 text-sm font-semibold hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                            >
                                {savingDetails ? "Saving..." : savedFlash ? "Saved ✓" : "Save Changes"}
                            </button>
                        </div>
                    ) : loading ? (
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
                                                    onClick={() => setPendingDelete({ type: "milestone", item: m })}
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
                                    className="flex-1 rounded-none border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-slate-400 mt-4"
                                />
                                <input
                                    type="date"
                                    value={milestoneForm.dueDate}
                                    onChange={(e) => setMilestoneForm((f) => ({ ...f, dueDate: e.target.value }))}
                                    className="rounded-none border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 mt-4"
                                />
                                <button
                                    onClick={addMilestone}
                                    className="rounded-none bg-slate-900 text-white px-3.5 hover:bg-slate-800 transition mt-4 shrink-0"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                        </div>
                    ) : tab === "tasks" ? (
                        <div className="space-y-2">
                            {client.type === "contract" && (
                                <p className="text-xs text-amber-600 bg-amber-50 rounded-none px-3 py-2 mb-2">
                                    When every item below is checked off, this client is automatically marked expired.
                                </p>
                            )}
                            {tasks.length === 0 && (
                                <p className="text-sm text-slate-400 text-center py-6">No work items yet — add the first one below.</p>
                            )}
                            {tasks.map((t) => (
                                <div key={t.id} className="flex items-center gap-3 rounded-none border border-gray-100 px-3 py-2.5 group">
                                    <button onClick={() => toggleTask(t)} className="text-slate-400 hover:text-emerald-600 shrink-0">
                                        {t.done ? <CheckCircle2 size={18} className="text-emerald-600" /> : <Circle size={18} />}
                                    </button>
                                    <span className={`flex-1 text-sm ${t.done ? "text-slate-400 line-through" : "text-slate-700"}`}>
                                        {t.title}
                                    </span>
                                    <button
                                        onClick={() => setPendingDelete({ type: "task", item: t })}
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
                                    className="flex-1 rounded-none border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-slate-400"
                                />
                                <button onClick={addTask} className="rounded-none bg-slate-900 text-white px-3.5 hover:bg-slate-800 transition">
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
                                <div key={inv.id} className="rounded-none border border-gray-100 px-3.5 py-3 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-slate-800 truncate">{inv.description || "Invoice"}</p>
                                        <p className="text-xs text-slate-400">
                                            {new Date(inv.issue_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })} · {currency(inv.amount)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button onClick={() => setSelectedInvoice(inv)} className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">View</button>
                                        <button onClick={() => downloadInvoicePdf(client, inv)} className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">Download</button>
                                        <button
                                            onClick={() => toggleInvoicePaid(inv)}
                                            className={`text-xs font-semibold px-3 py-1.5 rounded-full transition ${inv.status === "paid" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                                                }`}
                                        >
                                            {inv.status === "paid" ? "Paid" : "Pending"}
                                        </button>
                                        <button
                                            onClick={() => setPendingDelete({ type: "invoice", item: inv })}
                                            className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <div className="rounded-none border border-gray-100 p-3.5 space-y-2 mt-3">
                                <input
                                    value={invoiceForm.description}
                                    onChange={(e) => setInvoiceForm((f) => ({ ...f, description: e.target.value }))}
                                    placeholder="Description (e.g. August retainer)"
                                    className="w-full rounded-none border border-gray-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    <input type="number" value={invoiceForm.rate} onChange={(e) => setInvoiceForm((f) => ({ ...f, rate: e.target.value }))} placeholder="Rate / item (₹)" className="rounded-none border border-gray-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
                                    <input type="number" min="1" value={invoiceForm.quantity} onChange={(e) => setInvoiceForm((f) => ({ ...f, quantity: e.target.value }))} placeholder="Quantity" className="rounded-none border border-gray-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        type="number"
                                        value={invoiceForm.amount}
                                        onChange={(e) => setInvoiceForm((f) => ({ ...f, amount: e.target.value }))}
                                        placeholder={client.type === "monthly" ? `Monthly fee (${currency(client.payment)})` : "Amount (₹)"}
                                        className="flex-1 rounded-none border border-gray-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                                    />
                                    <input
                                        type="date"
                                        value={invoiceForm.issueDate}
                                        onChange={(e) => setInvoiceForm((f) => ({ ...f, issueDate: e.target.value }))}
                                        className="rounded-none border border-gray-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <select value={invoiceForm.paymentMethod} onChange={(e) => setInvoiceForm((f) => ({ ...f, paymentMethod: e.target.value }))} className="rounded-none border border-gray-200 px-3 py-2 text-sm outline-none focus:border-slate-400 bg-white">
                                        <option value="">Paid using (optional)</option><option value="upi">UPI</option><option value="cash">Cash</option><option value="card">Card</option>
                                    </select>
                                    <input value={invoiceForm.upiId} onChange={(e) => setInvoiceForm((f) => ({ ...f, upiId: e.target.value }))} placeholder="UPI ID (optional)" className="rounded-none border border-gray-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
                                </div>
                                <input type="date" value={invoiceForm.paidOn} onChange={(e) => setInvoiceForm((f) => ({ ...f, paidOn: e.target.value }))} className="w-full rounded-none border border-gray-200 px-3 py-2 text-sm outline-none focus:border-slate-400" aria-label="Paid date" />
                                <button
                                    onClick={addInvoice}
                                    className="w-full rounded-none bg-slate-900 text-white py-2 text-sm font-semibold hover:bg-slate-800 transition"
                                >
                                    Create Invoice
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <ConfirmModal
                open={Boolean(pendingDelete)}
                title={`Delete ${pendingDelete?.type || "item"}?`}
                message={`Delete this ${pendingDelete?.type || "item"}? This cannot be undone.`}
                onConfirm={async () => {
                    const deletion = pendingDelete;
                    setPendingDelete(null);
                    if (deletion?.type === "task") await confirmDeleteTask(deletion.item);
                    if (deletion?.type === "milestone") await confirmDeleteMilestone(deletion.item);
                    if (deletion?.type === "invoice") await confirmDeleteInvoice(deletion.item);
                }}
                onCancel={() => setPendingDelete(null)}
            />
            {selectedInvoice && <InvoicePreview client={client} invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />}
        </div>
    );
}