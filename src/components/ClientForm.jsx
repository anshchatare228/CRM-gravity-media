import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    ArrowLeft,
    Repeat,
    FileSignature,
    Trash2,
    Loader2,
    User,
    Wallet,
} from "lucide-react";
import Navbar from "../components/Navbar";
import { supabase } from "../lib/supabase";

const EMPTY_FORM = {
    name: "",
    email: "",
    phone: "",
    type: "monthly",
    payment: "",
    paidAmount: "",
    startDate: "",
    endDate: "",
    notes: "",
    founderId: "",
    completed: false,
};

export default function ClientForm() {
    const navigate = useNavigate();
    const { id } = useParams(); // present in edit mode, undefined in add mode
    const isEdit = Boolean(id);

    const [founders, setFounders] = useState([]);
    const [form, setForm] = useState(EMPTY_FORM);
    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const load = async () => {
            const { data: founderData } = await supabase
                .from("founders")
                .select("*")
                .order("name");
            setFounders(founderData || []);

            if (isEdit) {
                setLoading(true);
                const { data, error: fetchError } = await supabase
                    .from("clients")
                    .select("*")
                    .eq("id", id)
                    .single();

                if (!fetchError && data) {
                    setForm({
                        name: data.name || "",
                        email: data.email || "",
                        phone: data.phone || "",
                        type: data.type || "monthly",
                        payment: data.payment ?? "",
                        paidAmount: data.paid_amount ?? "",
                        startDate: data.start_date || "",
                        endDate: data.end_date || "",
                        notes: data.notes || "",
                        founderId: data.founder_id || "",
                        completed: data.completed || false,
                    });
                } else {
                    setError("Couldn't load this client.");
                }
                setLoading(false);
            }
        };

        load();
    }, [id, isEdit]);

    const setDuration = (months) => {
        if (!form.startDate) return;
        const end = new Date(form.startDate);
        end.setMonth(end.getMonth() + Number(months));
        setForm((f) => ({ ...f, endDate: end.toISOString().slice(0, 10) }));
    };

    const goBack = () => navigate("/clients");

    const handleSave = async () => {
        if (!form.name.trim() || !form.payment || !form.startDate) return;

        setSaving(true);
        setError("");

        const payload = {
            name: form.name.trim(),
            email: form.email.trim() || null,
            phone: form.phone.trim() || null,
            type: form.type,
            payment: Number(form.payment),
            paid_amount: Number(form.paidAmount || 0),
            start_date: form.startDate,
            end_date: form.endDate || null,
            notes: form.notes,
            founder_id: form.founderId || null,
            completed: form.completed,
        };

        const { error: saveError } = isEdit
            ? await supabase.from("clients").update(payload).eq("id", id)
            : await supabase.from("clients").insert(payload);

        setSaving(false);

        if (saveError) {
            setError(saveError.message);
            return;
        }

        navigate("/clients");
    };

    const handleDelete = async () => {
        if (!window.confirm(`Delete ${form.name || "this client"}? This can't be undone.`)) return;
        const { error: deleteError } = await supabase.from("clients").delete().eq("id", id);
        if (deleteError) {
            setError(deleteError.message);
            return;
        }
        navigate("/clients");
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

    return (
        <div className="min-h-screen w-full flex flex-col md:flex-row items-stretch bg-slate-50">
            <Navbar />

            <div className="flex-1 min-w-0 pb-24">
                <div className="px-5 md:px-6 pt-6 max-w-3xl mx-auto">
                    <button
                        onClick={goBack}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-black/90 hover:text-slate-800 transition mb-4"
                    >
                        <ArrowLeft size={15} /> Back to Clients
                    </button>

                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-2xl font-extrabold text-slate-900">
                                {isEdit ? "Edit Client" : "Add Client"}
                            </h1>
                            <p className="text-sm text-black/90 mt-1">
                                {isEdit ? "Update engagement details and payment status." : "Set up contact details, engagement type, and commercials."}
                            </p>
                        </div>

                        {isEdit && (
                            <button
                                onClick={handleDelete}
                                className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 text-rose-600 text-sm font-semibold px-4 py-2 hover:bg-rose-50 transition"
                            >
                                <Trash2 size={14} /> Delete
                            </button>
                        )}
                    </div>

                    {error && (
                        <div className="mb-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 text-sm px-4 py-3">
                            {error}
                        </div>
                    )}

                    {/* ============================================
                        SECTION 1 — CONTACT & ENGAGEMENT
                    ============================================ */}
                    <div className="rounded-none bg-white border border-gray-200 shadow-[0px_0_10px_-3px_rgba(0,0,0,0.3)] p-6 mb-6">
                        <div className="flex items-center gap-2 text-xs font-semibold tracking-[3px] text-black uppercase mb-5">
                            <User size={14} />
                            Contact &amp; Engagement
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold font-mono text-black/90 uppercase tracking-wide">Client Name</label>
                                <input
                                    value={form.name}
                                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                    placeholder="e.g. Bloom & Co Skincare"
                                    className="mt-1.5 w-full rounded-none border-b border-b-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-slate-400"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold font-mono text-black/90 uppercase tracking-wide">Email</label>
                                    <input
                                        type="email"
                                        value={form.email}
                                        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                                        placeholder="contact@client.com"
                                        className="mt-1.5 w-full rounded-none border-b border-b-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-slate-400"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold font-mono text-black/90 uppercase tracking-wide">Phone</label>
                                    <input
                                        type="tel"
                                        value={form.phone}
                                        onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                                        placeholder="+91 98765 43210"
                                        className="mt-1.5 w-full rounded-none border-b border-b-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-slate-400"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-semibold font-mono text-black/90 uppercase tracking-wide">Client Type</label>
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
                                    <label className="text-xs font-semibold font-mono text-black/90 uppercase tracking-wide">Founder</label>
                                    <select
                                        value={form.founderId}
                                        onChange={(e) => setForm((f) => ({ ...f, founderId: e.target.value }))}
                                        className="mt-1.5 w-full rounded-none border-b border-b-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-slate-400 bg-white"
                                    >
                                        <option value="">Unassigned</option>
                                        {founders.map((fd) => (
                                            <option key={fd.id} value={fd.id}>{fd.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="text-xs font-semibold font-mono text-black/90 uppercase tracking-wide">Notes</label>
                                <textarea
                                    value={form.notes}
                                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                                    placeholder="Scope, deliverables, anything worth remembering..."
                                    rows={3}
                                    className="mt-1.5 w-full rounded-none border-b border-b-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-slate-400 resize-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* ============================================
                        SECTION 2 — COMMERCIALS & DATES
                        Add-only: once a client exists, commercials move to
                        their own "Commercials" tab on the client detail page.
                    ============================================ */}
                    {!isEdit && (
                    <div className="rounded-none bg-white border border-gray-200 shadow-[0px_0_10px_-3px_rgba(0,0,0,0.3)] p-6 mb-6">
                        <div className="flex items-center gap-2 text-xs font-semibold tracking-[3px] text-black uppercase mb-5">
                            <Wallet size={14} />
                            Commercials &amp; Dates
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold font-mono text-black/90 uppercase tracking-wide">
                                        {form.type === "monthly" ? "Monthly Fee (₹)" : "Total Contract Value (₹)"}
                                    </label>
                                    <input
                                        type="number"
                                        value={form.payment}
                                        onChange={(e) => setForm((f) => ({ ...f, payment: e.target.value }))}
                                        placeholder="e.g. 45000"
                                        className="mt-1.5 w-full rounded-none border-b border-b-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-slate-400"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold font-mono text-black/90 uppercase tracking-wide">Paid Amount (₹)</label>
                                    <input
                                        type="number"
                                        value={form.paidAmount}
                                        onChange={(e) => setForm((f) => ({ ...f, paidAmount: e.target.value }))}
                                        placeholder="e.g. 20000"
                                        className="mt-1.5 w-full rounded-none border-b border-b-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-slate-400"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold font-mono text-black/90 uppercase tracking-wide">Start Date</label>
                                    <input
                                        type="date"
                                        value={form.startDate}
                                        onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                                        className="mt-1.5 w-full rounded-none border-b border-b-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-slate-400"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold font-mono text-black/90 uppercase tracking-wide">
                                        End Date {form.type === "monthly" && <span className="normal-case font-normal">(optional)</span>}
                                    </label>
                                    <input
                                        type="date"
                                        value={form.endDate}
                                        onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                                        className="mt-1.5 w-full rounded-none border-b border-b-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-slate-400"
                                    />
                                </div>
                            </div>

                            {form.type === "contract" && (
                                <div>
                                    <label className="text-xs font-semibold font-mono text-black/90 uppercase tracking-wide">Quick Duration</label>
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

                            <label className="flex items-center gap-2 text-sm font-medium text-slate-600 pt-1">
                                <input
                                    type="checkbox"
                                    checked={form.completed}
                                    onChange={(e) => setForm((f) => ({ ...f, completed: e.target.checked }))}
                                    className="rounded border-gray-300"
                                />
                                Mark engagement as completed
                            </label>
                        </div>
                    </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            onClick={goBack}
                            className="flex-1 rounded-full border border-gray-200 py-2.5 text-sm font-semibold text-black/90 hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!form.name.trim() || !form.payment || !form.startDate || saving}
                            className="flex-1 rounded-full bg-slate-900 text-white py-2.5 text-sm font-semibold hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Client"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}