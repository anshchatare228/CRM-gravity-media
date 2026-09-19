import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    ArrowLeft,
    Pencil,
    Plus,
    Trash2,
    CheckCircle2,
    Circle,
    FileText,
    Receipt,
    Milestone,
    Loader2,
    Mail,
    Phone,
    Wallet,
} from "lucide-react";
import Navbar from "../components/Navbar";
import ConfirmModal from "./ConfirmModal";
import InvoicePreview, { downloadInvoicePdf, getInvoiceItems, getInvoiceTotal } from "./InvoicePreview";
import { supabase } from "../lib/supabase";

const currency = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const TABS = [
    { key: "commercials", label: "Commercials", icon: <Wallet size={14} /> },
    { key: "timeline", label: "Timeline", icon: <Milestone size={14} /> },
    { key: "tasks", label: "Work", icon: <FileText size={14} /> },
    { key: "invoices", label: "Invoices", icon: <Receipt size={14} /> },
];

const buildCommercialsForm = (client) => ({
    payment: client?.payment ?? "",
    paidAmount: client?.paid_amount ?? "",
    startDate: client?.start_date || "",
    endDate: client?.end_date || "",
    completed: client?.completed || false,
});

const emptyInvoiceItem = () => ({ description: "", rate: "", quantity: "1" });

const buildInvoiceForm = () => ({
    items: [emptyInvoiceItem()],
    issueDate: new Date().toISOString().slice(0, 10),
    paymentMethod: "",
    upiId: "",
    paidOn: "",
});

const emptyBulkRow = () => ({ name: "", quantity: "" });

export default function ClientDetail() {
    const navigate = useNavigate();
    const { id } = useParams();

    const [client, setClient] = useState(null);
    const [tab, setTab] = useState("commercials");
    const [tasks, setTasks] = useState([]);
    const [milestones, setMilestones] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tabLoading, setTabLoading] = useState(true);

    const [commercialsForm, setCommercialsForm] = useState(buildCommercialsForm(null));
    const [savingCommercials, setSavingCommercials] = useState(false);
    const [commercialsSavedFlash, setCommercialsSavedFlash] = useState(false);

    const [newTask, setNewTask] = useState("");
    const [milestoneForm, setMilestoneForm] = useState({ title: "", dueDate: "" });
    const [invoiceForm, setInvoiceForm] = useState(buildInvoiceForm());
    const [pendingDelete, setPendingDelete] = useState(null);
    const [selectedInvoice, setSelectedInvoice] = useState(null);

    // ---------- Bulk work-item generator ----------
    const [bulkRows, setBulkRows] = useState([emptyBulkRow()]);
    const [generatingBulk, setGeneratingBulk] = useState(false);

    const loadAll = async () => {
        setLoading(true);
        const { data: clientData, error } = await supabase.from("clients").select("*").eq("id", id).single();
        if (!error) {
            setClient(clientData);
            setCommercialsForm(buildCommercialsForm(clientData));
        }
        setLoading(false);

        setTabLoading(true);
        const [{ data: t }, { data: m }, { data: i }] = await Promise.all([
            supabase.from("client_tasks").select("*").eq("client_id", id).order("created_at"),
            supabase.from("client_milestones").select("*").eq("client_id", id).order("sort_order").order("due_date"),
            supabase.from("invoices").select("*").eq("client_id", id).order("issue_date", { ascending: false }),
        ]);
        setTasks(t || []);
        setMilestones(m || []);
        setInvoices(i || []);
        setTabLoading(false);
    };

    useEffect(() => {
        loadAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const syncCompletion = async (nextTasks) => {
        if (client.type !== "contract") return;
        const allDone = nextTasks.length > 0 && nextTasks.every((t) => t.done);
        if (allDone !== client.completed) {
            await supabase.from("clients").update({ completed: allDone }).eq("id", client.id);
            setClient((c) => ({ ...c, completed: allDone }));
        }
    };

    const setCommercialsDuration = (months) => {
        if (!commercialsForm.startDate) return;
        const end = new Date(commercialsForm.startDate);
        end.setMonth(end.getMonth() + Number(months));
        setCommercialsForm((f) => ({ ...f, endDate: end.toISOString().slice(0, 10) }));
    };

    const saveCommercials = async () => {
        if (!commercialsForm.payment || !commercialsForm.startDate) return;
        setSavingCommercials(true);
        const payload = {
            payment: Number(commercialsForm.payment),
            paid_amount: Number(commercialsForm.paidAmount || 0),
            start_date: commercialsForm.startDate,
            end_date: commercialsForm.endDate || null,
            completed: commercialsForm.completed,
        };
        const { error } = await supabase.from("clients").update(payload).eq("id", client.id);
        setSavingCommercials(false);
        if (error) return;
        setClient((c) => ({ ...c, ...payload }));
        setCommercialsSavedFlash(true);
        setTimeout(() => setCommercialsSavedFlash(false), 1500);
    };

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

    // ---------- Bulk work-item generator ----------
    const updateBulkRow = (index, field, value) => {
        setBulkRows((rows) => rows.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
    };

    const addBulkRow = () => setBulkRows((rows) => [...rows, emptyBulkRow()]);

    const removeBulkRow = (index) => {
        setBulkRows((rows) => (rows.length > 1 ? rows.filter((_, i) => i !== index) : rows));
    };

    const generateBulkTasks = async () => {
        const rowsToInsert = [];
        bulkRows.forEach((row) => {
            const name = row.name.trim();
            const qty = Number(row.quantity || 0);
            if (!name || qty <= 0) return;
            for (let i = 1; i <= qty; i++) {
                rowsToInsert.push({ client_id: client.id, title: `${name} ${i}` });
            }
        });

        if (rowsToInsert.length === 0) return;

        setGeneratingBulk(true);
        const { data, error } = await supabase.from("client_tasks").insert(rowsToInsert).select();
        setGeneratingBulk(false);
        if (error) {
            console.error("Failed to generate tasks:", error);
            return;
        }

        const next = [...tasks, ...(data || [])];
        setTasks(next);
        syncCompletion(next);
        setBulkRows([emptyBulkRow()]);
    };

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

    const updateInvoiceItem = (index, field, value) => {
        setInvoiceForm((f) => ({
            ...f,
            items: f.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
        }));
    };

    const addInvoiceItemRow = () => {
        setInvoiceForm((f) => ({ ...f, items: [...f.items, emptyInvoiceItem()] }));
    };

    const removeInvoiceItemRow = (index) => {
        setInvoiceForm((f) => ({
            ...f,
            items: f.items.length > 1 ? f.items.filter((_, i) => i !== index) : f.items,
        }));
    };

    const addInvoice = async () => {
        const items = invoiceForm.items
            .map((item) => {
                const quantity = Number(item.quantity || 1);
                const rate = Number(
                    item.rate || (client.type === "monthly" && invoiceForm.items.length === 1 ? client.payment : 0)
                );
                const amount = rate * quantity;
                return {
                    description: item.description || (client.type === "monthly" ? "Monthly retainer" : "Services"),
                    rate,
                    quantity,
                    amount,
                };
            })
            .filter((item) => item.amount > 0);

        if (items.length === 0) return;

        const total = items.reduce((sum, item) => sum + item.amount, 0);

        const { data, error } = await supabase
            .from("invoices")
            .insert({
                client_id: client.id,
                description: items.map((i) => i.description).join(", "),
                invoice_number: `INV-${Date.now().toString().slice(-6)}`,
                items, // jsonb column — array of {description, rate, quantity, amount}
                amount: total,
                rate: items[0].rate,
                quantity: items[0].quantity,
                issue_date: invoiceForm.issueDate,
                payment_method: invoiceForm.paymentMethod || null,
                upi_id: invoiceForm.upiId || null,
                paid_on: invoiceForm.paidOn || null,
            })
            .select()
            .single();

        if (error) {
            console.error("Failed to create invoice:", error);
            return;
        }

        setInvoices((prev) => [data, ...prev]);
        setInvoiceForm(buildInvoiceForm());
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

    if (loading) {
        return (
            <div className="min-h-screen w-full flex flex-col md:flex-row items-stretch bg-slate-50">
                <Navbar />
                <div className="flex-1 min-w-0 flex items-center justify-center px-5 py-16">
                    <div className="w-full max-w-md rounded-none bg-white border border-gray-200 shadow-sm px-6 py-8 flex flex-col items-center justify-center gap-3 text-center">
                        <Loader2 className="animate-spin text-slate-700" size={36} />
                        <p className="text-sm font-medium text-slate-600">Loading client...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!client) {
        return (
            <div className="min-h-screen w-full flex flex-col md:flex-row items-stretch bg-slate-50">
                <Navbar />
                <div className="flex-1 min-w-0 flex items-center justify-center px-5 py-16">
                    <div className="text-center">
                        <p className="text-sm text-black/90 mb-3">This client couldn't be found.</p>
                        <button onClick={() => navigate("/clients")} className="text-sm font-semibold text-slate-900 underline">
                            Back to Clients
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full flex flex-col md:flex-row items-stretch bg-slate-50">
            <Navbar />

            <div className="flex-1 min-w-0 pb-24">
                <div className="px-5 md:px-6 pt-6 max-w-3xl mx-auto">
                    <button
                        onClick={() => navigate("/clients")}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-black/90 hover:text-slate-800 transition mb-4"
                    >
                        <ArrowLeft size={15} /> Back to Clients
                    </button>

                    <div className="rounded-none bg-white border border-gray-200 shadow-[0px_0_10px_-3px_rgba(0,0,0,0.3)] p-6 mb-6">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-extrabold text-slate-900">{client.name}</h1>
                                <p className="text-sm text-black/90 mt-1">
                                    {client.type === "monthly" ? "Monthly retainer" : "Contract"} · {currency(client.payment)}
                                    {client.type === "monthly" ? "/mo" : " total"} · {currency(client.paid_amount)} paid so far
                                </p>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-black/90">
                                    {client.email && (
                                        <span className="inline-flex items-center gap-1.5">
                                            <Mail size={12} className="text-slate-300" /> {client.email}
                                        </span>
                                    )}
                                    {client.phone && (
                                        <span className="inline-flex items-center gap-1.5">
                                            <Phone size={12} className="text-slate-300" /> {client.phone}
                                        </span>
                                    )}
                                </div>
                                {client.notes && <p className="text-sm text-black/90 mt-3">{client.notes}</p>}
                            </div>
                            <button
                                onClick={() => navigate(`/clients/${client.id}/edit`)}
                                className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 text-slate-600 text-sm font-semibold px-4 py-2 hover:bg-slate-50 transition shrink-0"
                            >
                                <Pencil size={14} /> Edit
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-1 mb-5 flex-wrap">
                        {TABS.map((t) => (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition ${tab === t.key ? "bg-slate-900 text-white" : "text-black/90 bg-white border border-gray-200 hover:bg-slate-50"
                                    }`}
                            >
                                {t.icon} {t.label}
                            </button>
                        ))}
                    </div>

                    <div className="rounded-none bg-white border border-gray-200 shadow-[0px_0_10px_-3px_rgba(0,0,0,0.3)] p-6">
                        {tab === "commercials" ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-semibold font-sans text-black/90 uppercase tracking-wide">
                                            {client.type === "monthly" ? "Monthly Fee (₹)" : "Total Contract Value (₹)"}
                                        </label>
                                        <input
                                            type="number"
                                            value={commercialsForm.payment}
                                            onChange={(e) => setCommercialsForm((f) => ({ ...f, payment: e.target.value }))}
                                            placeholder="e.g. 45000"
                                            className="mt-1.5 w-full rounded-none border border-black/30 px-3.5 py-2.5 text-sm outline-none focus:border-slate-400"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold font-sans text-black/90 uppercase tracking-wide">Paid Amount (₹)</label>
                                        <input
                                            type="number"
                                            value={commercialsForm.paidAmount}
                                            onChange={(e) => setCommercialsForm((f) => ({ ...f, paidAmount: e.target.value }))}
                                            placeholder="e.g. 20000"
                                            className="mt-1.5 w-full rounded-none border border-black/30 px-3.5 py-2.5 text-sm outline-none focus:border-slate-400"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-semibold font-sans text-black/90 uppercase tracking-wide">Start Date</label>
                                        <input
                                            type="date"
                                            value={commercialsForm.startDate}
                                            onChange={(e) => setCommercialsForm((f) => ({ ...f, startDate: e.target.value }))}
                                            className="mt-1.5 w-full rounded-none border border-black/30 px-3.5 py-2.5 text-sm outline-none focus:border-slate-400"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold font-sans text-black/90 uppercase tracking-wide">
                                            End Date {client.type === "monthly" && <span className="normal-case font-normal">(optional)</span>}
                                        </label>
                                        <input
                                            type="date"
                                            value={commercialsForm.endDate}
                                            onChange={(e) => setCommercialsForm((f) => ({ ...f, endDate: e.target.value }))}
                                            className="mt-1.5 w-full rounded-none border border-black/30 px-3.5 py-2.5 text-sm outline-none focus:border-slate-400"
                                        />
                                    </div>
                                </div>

                                {client.type === "contract" && (
                                    <div>
                                        <label className="text-xs font-semibold font-sans text-black/90 uppercase tracking-wide">Quick Duration</label>
                                        <div className="mt-1.5 flex gap-2">
                                            {[1, 3, 6, 12].map((m) => (
                                                <button
                                                    key={m}
                                                    onClick={() => setCommercialsDuration(m)}
                                                    disabled={!commercialsForm.startDate}
                                                    className="flex-1 rounded-none border border-gray-200 py-2 text-xs font-semibold text-black/90 hover:border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed"
                                                >
                                                    {m}mo
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <label className="flex items-center gap-2 text-sm font-medium text-slate-600 pt-1">
                                    <input
                                        type="checkbox"
                                        checked={commercialsForm.completed}
                                        onChange={(e) => setCommercialsForm((f) => ({ ...f, completed: e.target.checked }))}
                                        className="rounded border-gray-300"
                                    />
                                    Mark engagement as completed
                                </label>

                                <button
                                    onClick={saveCommercials}
                                    disabled={!commercialsForm.payment || !commercialsForm.startDate || savingCommercials}
                                    className="w-full rounded-none bg-slate-900 text-white py-2.5 text-sm font-semibold hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                                >
                                    {savingCommercials ? "Saving..." : commercialsSavedFlash ? "Saved ✓" : "Save Changes"}
                                </button>
                            </div>
                        ) : tabLoading ? (
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
                                        When every item below is checked off, this client is automatically marked completed.
                                    </p>
                                )}

                                {/* ---------- Bulk work-item generator ---------- */}
                                <div className="rounded-none border border-gray-100 p-3.5 space-y-3 mb-3">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bulk Generate Work Items</p>

                                    {bulkRows.map((row, index) => (
                                        <div key={index} className="grid grid-cols-[1fr_100px_28px] gap-2 items-center">
                                            <input
                                                value={row.name}
                                                onChange={(e) => updateBulkRow(index, "name", e.target.value)}
                                                placeholder="e.g. Reel, Post, Carousel"
                                                className="rounded-none border border-gray-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                                            />
                                            <input
                                                type="number"
                                                min="1"
                                                value={row.quantity}
                                                onChange={(e) => updateBulkRow(index, "quantity", e.target.value)}
                                                placeholder="Qty"
                                                className="rounded-none border border-gray-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                                            />
                                            <button
                                                onClick={() => removeBulkRow(index)}
                                                disabled={bulkRows.length === 1}
                                                className="text-slate-300 hover:text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                                aria-label="Remove row"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}

                                    <div className="flex items-center justify-between pt-1">
                                        <button
                                            onClick={addBulkRow}
                                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
                                        >
                                            <Plus size={13} /> Add row
                                        </button>

                                        <button
                                            onClick={generateBulkTasks}
                                            disabled={generatingBulk}
                                            className="rounded-full bg-slate-900 text-white text-xs font-semibold px-4 py-2 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                                        >
                                            {generatingBulk ? "Generating..." : "Generate"}
                                        </button>
                                    </div>
                                </div>

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
                                {invoices.map((inv) => {
                                    const total = getInvoiceTotal(inv);
                                    const items = getInvoiceItems(inv);
                                    return (
                                        <div key={inv.id} className="rounded-none border border-gray-100 px-3.5 py-3 flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-slate-800 truncate">
                                                    {items.length > 1 ? `${items[0].description} +${items.length - 1} more` : items[0].description}
                                                </p>
                                                <p className="text-xs text-slate-400">
                                                    {new Date(inv.issue_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })} · {currency(total)}
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
                                    );
                                })}

                                <div className="rounded-none border border-gray-100 p-3.5 space-y-3 mt-3">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Items</p>
                                    {invoiceForm.items.map((item, index) => (
                                        <div key={index} className="grid grid-cols-[1fr_90px_60px_28px] gap-2 items-center">
                                            <input
                                                value={item.description}
                                                onChange={(e) => updateInvoiceItem(index, "description", e.target.value)}
                                                placeholder="e.g. Website Development, SEO"
                                                className="rounded-none border border-gray-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                                            />
                                            <input
                                                type="number"
                                                value={item.rate}
                                                onChange={(e) => updateInvoiceItem(index, "rate", e.target.value)}
                                                placeholder="Rate (₹)"
                                                className="rounded-none border border-gray-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                                            />
                                            <input
                                                type="number"
                                                min="1"
                                                value={item.quantity}
                                                onChange={(e) => updateInvoiceItem(index, "quantity", e.target.value)}
                                                placeholder="Qty"
                                                className="rounded-none border border-gray-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                                            />
                                            <button
                                                onClick={() => removeInvoiceItemRow(index)}
                                                disabled={invoiceForm.items.length === 1}
                                                className="text-slate-300 hover:text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                                aria-label="Remove item"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        onClick={addInvoiceItemRow}
                                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
                                    >
                                        <Plus size={13} /> Add item
                                    </button>

                                    <div className="grid grid-cols-2 gap-2 pt-2">
                                        <input
                                            type="date"
                                            value={invoiceForm.issueDate}
                                            onChange={(e) => setInvoiceForm((f) => ({ ...f, issueDate: e.target.value }))}
                                            className="rounded-none border border-gray-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                                        />
                                        <select
                                            value={invoiceForm.paymentMethod}
                                            onChange={(e) => setInvoiceForm((f) => ({ ...f, paymentMethod: e.target.value }))}
                                            className="rounded-none border border-gray-200 px-3 py-2 text-sm outline-none focus:border-slate-400 bg-white"
                                        >
                                            <option value="">Paid using (optional)</option>
                                            <option value="upi">UPI</option>
                                            <option value="cash">Cash</option>
                                            <option value="card">Card</option>
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            value={invoiceForm.upiId}
                                            onChange={(e) => setInvoiceForm((f) => ({ ...f, upiId: e.target.value }))}
                                            placeholder="UPI ID (optional)"
                                            className="rounded-none border border-gray-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                                        />
                                        <input
                                            type="date"
                                            value={invoiceForm.paidOn}
                                            onChange={(e) => setInvoiceForm((f) => ({ ...f, paidOn: e.target.value }))}
                                            aria-label="Paid date"
                                            className="rounded-none border border-gray-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                                        />
                                    </div>
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