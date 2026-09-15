import React from "react";
import { AlertTriangle, X } from "lucide-react";

export default function ConfirmModal({ open, title, message, confirmLabel = "Delete", onConfirm, onCancel }) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/40 px-4" onClick={onCancel}>
            <div className="w-full max-w-sm rounded-none bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
                <div className="flex items-start gap-3">
                    <div className="rounded-full bg-rose-50 p-2 text-rose-600">
                        <AlertTriangle size={18} />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-start justify-between gap-3">
                            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
                            <button onClick={onCancel} className="p-1 text-slate-400 hover:text-slate-700" aria-label="Close">
                                <X size={18} />
                            </button>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">{message}</p>
                    </div>
                </div>
                <div className="mt-6 flex gap-3">
                    <button onClick={onCancel} className="flex-1 rounded-full border border-gray-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                        Cancel
                    </button>
                    <button onClick={onConfirm} className="flex-1 rounded-full bg-rose-600 py-2.5 text-sm font-semibold text-white hover:bg-rose-700">
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
