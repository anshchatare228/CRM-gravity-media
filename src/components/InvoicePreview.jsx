import React from "react";
import { Download, X } from "lucide-react";
import { jsPDF } from "jspdf";
import brandLogo from "../assets/logo.png";

const BUSINESS = {
    name: "Gravity Media",
    pan: "BSIPT5969A",
    mobiles: ["+91 8668246297", "7588847799"],
    email: "gravitymedia57@gmail.com",
    addressLines: ["Gravity Media, Shop No. 23, 3rd Floor, MahatmaPhule", "Market, Iti Road, Nanded 431602"],
    bank: {
        name: "Gajendra Balaji Tompe",
        bank: "Axis Bank",
        account: "923010071111198",
        ifsc: "UTIB0003831",
        branch: "Viman nagar",
    },
    upiId: "8668246297-2@ybl",
    signatoryName: "Gajendra Balaji Tompe",
};

const currency = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
// jsPDF's built-in fonts (helvetica/times/courier) have no ₹ glyph — it silently
// substitutes a fallback character that renders as "1". Use "Rs." in the PDF instead.
const pdfCurrency = (value) => `Rs. ${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const dateText = (value) => (value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");
const invoiceNumber = (invoice) => invoice.invoice_number || `INV-${String(invoice.id || "").slice(0, 8).toUpperCase()}`;

// Reads either the new multi-item `invoice.items` array, or falls back to the
// legacy single description/rate/quantity/amount columns on the invoice row.
export function getInvoiceItems(invoice) {
    if (Array.isArray(invoice.items) && invoice.items.length > 0) {
        return invoice.items.map((it) => {
            const quantity = Number(it.quantity || 1);
            const rate = Number(it.rate ?? it.amount ?? 0);
            const amount = Number(it.amount ?? rate * quantity);
            return { description: it.description || "Services", rate, quantity, amount };
        });
    }
    const quantity = Number(invoice.quantity || 1);
    const rate = Number(invoice.rate ?? invoice.amount ?? 0);
    const amount = Number(invoice.amount ?? rate * quantity);
    return [{ description: invoice.description || "Services", rate, quantity, amount }];
}

export function getInvoiceTotal(invoice) {
    return getInvoiceItems(invoice).reduce((sum, item) => sum + Number(item.amount || 0), 0);
}

// ---- number to words (Indian numbering system, whole rupees) ----
const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n) {
    if (n < 20) return ONES[n];
    const t = Math.floor(n / 10);
    const o = n % 10;
    return `${TENS[t]}${o ? " " + ONES[o] : ""}`;
}

function threeDigits(n) {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    let out = "";
    if (hundred) out += `${ONES[hundred]} Hundred${rest ? " " : ""}`;
    if (rest) out += twoDigits(rest);
    return out;
}

export function numberToWordsIndian(num) {
    num = Math.round(Number(num || 0));
    if (num === 0) return "Zero Rupees";
    const crore = Math.floor(num / 10000000); num %= 10000000;
    const lakh = Math.floor(num / 100000); num %= 100000;
    const thousand = Math.floor(num / 1000); num %= 1000;
    const hundred = num;

    const parts = [];
    if (crore) parts.push(`${threeDigits(crore)} Crore`);
    if (lakh) parts.push(`${threeDigits(lakh)} Lakh`);
    if (thousand) parts.push(`${threeDigits(thousand)} Thousand`);
    if (hundred) parts.push(threeDigits(hundred));

    return `${parts.join(" ").trim()} Rupees`;
}

function loadImageAsDataUrl(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            canvas.getContext("2d").drawImage(img, 0, 0);
            resolve(canvas.toDataURL("image/png"));
        };
        img.onerror = reject;
        img.src = src;
    });
}

export async function downloadInvoicePdf(client, invoice) {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const items = getInvoiceItems(invoice);
    const total = getInvoiceTotal(invoice);

    try {
        const logoData = await loadImageAsDataUrl(brandLogo);
        pdf.addImage(logoData, "PNG", pageWidth - 52, 20, 32, 20);
    } catch (e) {
        // logo failed to load — continue without it
    }

    pdf.setTextColor(30, 90, 150);
    pdf.setFontSize(10);
    pdf.setFont(undefined, "bold");
    pdf.text("INVOICE", 20, 20);

    pdf.setTextColor(110, 110, 110);
    pdf.setFontSize(8);
    pdf.setFont(undefined, "normal");
    pdf.text("ORIGINAL FOR RECIPIENT", pageWidth - 20, 14, { align: "right" });

    pdf.setTextColor(20, 20, 20);
    pdf.setFontSize(17);
    pdf.setFont(undefined, "bold");
    pdf.text(BUSINESS.name, 20, 29);

    let y = 37;
    pdf.setFontSize(9);
    pdf.setFont(undefined, "bold");
    pdf.text("PAN", 20, y);
    pdf.setFont(undefined, "normal");
    pdf.text(BUSINESS.pan, 33, y);

    y += 7;
    pdf.setFont(undefined, "bold");
    pdf.text("Mobile", 20, y);
    pdf.setFont(undefined, "normal");
    pdf.text(BUSINESS.mobiles.join(", "), 37, y);

    y += 7;
    pdf.setFont(undefined, "bold");
    pdf.text("Email", 20, y);
    pdf.setFont(undefined, "normal");
    pdf.text(BUSINESS.email, 37, y);

    y += 7;
    pdf.setFont(undefined, "bold");
    pdf.text("Address", 20, y);
    pdf.setFont(undefined, "normal");
    pdf.text(BUSINESS.addressLines[0], 37, y);
    pdf.text(BUSINESS.addressLines[1], 37, y + 5);

    y += 15;
    pdf.setDrawColor(140, 177, 190);
    pdf.line(20, y, pageWidth - 20, y);

    y += 9;
    pdf.setTextColor(20, 20, 20);
    pdf.setFontSize(9.5);
    pdf.setFont(undefined, "normal");
    pdf.text(`Invoice #: ${invoiceNumber(invoice)}`, 20, y);

    y += 8;
    pdf.setFont(undefined, "bold");
    pdf.text("Customer Details:", 20, y);

    // right column: customer address + invoice date
    const rightX = pageWidth - 20;
    let ry = y - 8;
    pdf.setFont(undefined, "normal");
    pdf.setFontSize(9);
    if (client.address) {
        const addrLines = pdf.splitTextToSize(client.address, 75);
        addrLines.forEach((line) => {
            pdf.text(line, rightX, ry, { align: "right" });
            ry += 5;
        });
    }
    pdf.setFont(undefined, "bold");
    pdf.text(`Invoice Date: ${dateText(invoice.issue_date).toUpperCase()}`, rightX, ry + 3, { align: "right" });

    y += 7;
    pdf.setFontSize(10.5);
    pdf.setFont(undefined, "bold");
    pdf.text(client.name || "Client", 20, y);

    // table
    const tableTop = y + 14;
    pdf.setDrawColor(120, 160, 180);
    pdf.line(20, tableTop - 6, pageWidth - 20, tableTop - 6);
    pdf.setFontSize(9);
    pdf.setFont(undefined, "bold");
    pdf.setTextColor(20, 20, 20);
    pdf.text("#", 22, tableTop);
    pdf.text("Item", 30, tableTop);
    pdf.text("Rate / Item", 122, tableTop, { align: "right" });
    pdf.text("Qty", 148, tableTop, { align: "right" });
    pdf.text("Amount", pageWidth - 22, tableTop, { align: "right" });
    pdf.line(20, tableTop + 4, pageWidth - 20, tableTop + 4);

    let rowY = tableTop + 12;
    pdf.setFont(undefined, "normal");
    items.forEach((item, idx) => {
        pdf.text(String(idx + 1), 22, rowY);
        pdf.text(item.description, 30, rowY);
        pdf.text(pdfCurrency(item.rate), 122, rowY, { align: "right" });
        pdf.text(String(item.quantity), 148, rowY, { align: "right" });
        pdf.text(pdfCurrency(item.amount), pageWidth - 22, rowY, { align: "right" });
        rowY += 8;
    });
    pdf.line(20, rowY, pageWidth - 20, rowY);

    rowY += 12;
    pdf.setFont(undefined, "bold");
    pdf.setFontSize(11);
    pdf.text(`Total  ${pdfCurrency(total)}`, pageWidth - 22, rowY, { align: "right" });

    rowY += 8;
    pdf.setFontSize(9);
    pdf.setFont(undefined, "normal");
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Total amount (in words): ${numberToWordsIndian(total)}`, 20, rowY);

    rowY += 11;
    pdf.setFillColor(235, 244, 247);
    pdf.rect(pageWidth - 92, rowY - 6, 72, 10, "F");
    pdf.setFont(undefined, "bold");
    pdf.setTextColor(20, 20, 20);
    pdf.setFontSize(10);
    pdf.text(`Amount Payable: ${pdfCurrency(total)}`, pageWidth - 22, rowY, { align: "right" });

    rowY += 22;
    pdf.setDrawColor(225, 225, 225);
    pdf.line(20, rowY, pageWidth - 20, rowY);

    rowY += 10;
    pdf.setFontSize(9);
    pdf.setFont(undefined, "bold");
    pdf.setTextColor(20, 20, 20);
    pdf.text("Bank Details:", 20, rowY);

    const bankRows = [
        ["Name:", BUSINESS.bank.name],
        ["Bank:", BUSINESS.bank.bank],
        ["Account :", BUSINESS.bank.account],
        ["IFSC Code:", BUSINESS.bank.ifsc],
        ["Branch:", BUSINESS.bank.branch],
    ];
    let by = rowY + 7;
    bankRows.forEach(([label, value]) => {
        pdf.setFont(undefined, "bold");
        pdf.text(label, 20, by);
        pdf.setFont(undefined, "normal");
        pdf.text(value, 48, by);
        by += 6;
    });

    by += 5;
    pdf.setFont(undefined, "bold");
    pdf.text("UPI Id", 20, by);
    pdf.setFont(undefined, "normal");
    pdf.text(BUSINESS.upiId, 20, by + 6);

    // signature: boxed space reserved for a signature image, printed name below
    const sigW = 50;
    const sigX = pageWidth - 20 - sigW;
    let sigY = rowY + 6;
    pdf.setDrawColor(210, 210, 210);
    pdf.rect(sigX, sigY, sigW, 20);
    sigY += 26;
    pdf.setFontSize(8.5);
    pdf.setTextColor(130, 130, 130);
    pdf.text("Authorized Signatory", sigX + sigW / 2, sigY, { align: "center" });
    sigY += 6;
    pdf.setFont(undefined, "bold");
    pdf.setFontSize(9.5);
    pdf.setTextColor(20, 20, 20);
    pdf.text(BUSINESS.signatoryName, sigX + sigW / 2, sigY, { align: "center" });

    pdf.setTextColor(150, 150, 150);
    pdf.setFontSize(8);
    pdf.setFont(undefined, "normal");
    pdf.text("Thank you for your business.", 20, 285);

    pdf.save(`${invoiceNumber(invoice)}-${(client.name || "client").replace(/[^a-z0-9]+/gi, "-")}.pdf`);
}

export default function InvoicePreview({ client, invoice, onClose }) {
    const [downloading, setDownloading] = React.useState(false);
    const items = getInvoiceItems(invoice);
    const total = getInvoiceTotal(invoice);

    const handleDownload = async () => {
        setDownloading(true);
        try {
            await downloadInvoicePdf(client, invoice);
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/40 px-4 py-8 overflow-y-auto" onClick={onClose}>
            <div className="w-full max-w-2xl rounded-none bg-white shadow-xl my-auto" onClick={(event) => event.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[2px] text-slate-400">Invoice Preview</p>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700" aria-label="Close invoice preview">
                        <X size={18} />
                    </button>
                </div>

                <div className="px-8 py-7 text-slate-800">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-xs font-bold tracking-[3px] text-sky-700">INVOICE</p>
                            <h2 className="text-2xl font-extrabold text-slate-900 mt-1">{BUSINESS.name}</h2>
                            <div className="mt-2 space-y-0.5 text-[11.5px] text-slate-700">
                                <p><span className="font-semibold">PAN</span> {BUSINESS.pan}</p>
                                <p>
                                    <span className="font-semibold">Mobile</span> {BUSINESS.mobiles.join(", ")}
                                    <span className="inline-block w-4" />
                                    <span className="font-semibold">Email</span> {BUSINESS.email}
                                </p>
                                <p>
                                    <span className="font-semibold">Address</span> {BUSINESS.addressLines[0]}
                                    <br />
                                    <span className="pl-[52px] inline-block">{BUSINESS.addressLines[1]}</span>
                                </p>
                            </div>
                        </div>
                        <div className="text-right shrink-0">
                            <p className="text-[10px] text-slate-400 mb-2">ORIGINAL FOR RECIPIENT</p>
                            <img src={brandLogo} alt="Gravity Media" className="h-14 ml-auto object-contain" />
                        </div>
                    </div>

                    <div className="border-t border-sky-100 mt-4 pt-3 flex items-start justify-between gap-4">
                        <div>
                            <p className="text-[12px]">Invoice #: <span className="font-semibold">{invoiceNumber(invoice)}</span></p>
                            <p className="text-[11px] text-slate-400 mt-3 font-semibold uppercase tracking-wide">Customer Details:</p>
                            <p className="font-bold text-slate-900">{client.name || "Client"}</p>
                        </div>
                        <div className="text-right text-[11.5px] text-slate-600 shrink-0">
                            {client.address && <p className="max-w-[220px]">{client.address}</p>}
                            <p className="font-semibold text-slate-900 mt-1">Invoice Date: {dateText(invoice.issue_date).toUpperCase()}</p>
                        </div>
                    </div>

                    <div className="mt-5 border-t border-b border-sky-100 grid grid-cols-[24px_1fr_90px_50px_90px] gap-2 py-2 text-[11px] font-bold uppercase text-slate-700">
                        <span>#</span><span>Item</span><span className="text-right">Rate / Item</span><span className="text-right">Qty</span><span className="text-right">Amount</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {items.map((item, idx) => (
                            <div key={idx} className="grid grid-cols-[24px_1fr_90px_50px_90px] gap-2 py-2.5 text-[12px]">
                                <span className="text-slate-500">{idx + 1}</span>
                                <span className="text-slate-800">{item.description}</span>
                                <span className="text-right">{currency(item.rate)}</span>
                                <span className="text-right">{item.quantity}</span>
                                <span className="text-right">{currency(item.amount)}</span>
                            </div>
                        ))}
                    </div>

                    <div className="border-t border-gray-200 mt-2 pt-4 text-right">
                        <p className="text-base font-bold text-slate-900">Total {currency(total)}</p>
                        <p className="text-[11px] text-slate-400 mt-1">Total amount (in words): {numberToWordsIndian(total)}</p>
                        <p className="inline-block mt-3 bg-sky-50 px-4 py-2 font-bold text-slate-900">Amount Payable: {currency(total)}</p>
                    </div>

                    <div className="border-t border-gray-200 mt-6 pt-5 flex items-end justify-between gap-6">
                        <div className="text-[11.5px] space-y-0.5">
                            <p className="font-bold text-slate-800 mb-1">Bank Details:</p>
                            <p><span className="inline-block w-20 font-semibold">Name:</span>{BUSINESS.bank.name}</p>
                            <p><span className="inline-block w-20 font-semibold">Bank:</span>{BUSINESS.bank.bank}</p>
                            <p><span className="inline-block w-20 font-semibold">Account :</span>{BUSINESS.bank.account}</p>
                            <p><span className="inline-block w-20 font-semibold">IFSC Code:</span>{BUSINESS.bank.ifsc}</p>
                            <p><span className="inline-block w-20 font-semibold">Branch:</span>{BUSINESS.bank.branch}</p>
                            <p className="pt-2 font-bold text-slate-800">UPI Id</p>
                            <p>{BUSINESS.upiId}</p>
                        </div>
                        <div className="text-center shrink-0">
                            <div className="h-14 w-32 border border-dashed border-gray-300 flex items-center justify-center text-[10px] text-slate-300">
                                Signature
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">Authorized Signatory</p>
                            <p className="text-[12px] font-bold text-slate-900">{BUSINESS.signatoryName}</p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 border-t border-gray-100 px-6 py-4">
                    <button onClick={onClose} className="flex-1 rounded-full border border-gray-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Close</button>
                    <button
                        onClick={handleDownload}
                        disabled={downloading}
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                    >
                        <Download size={15} /> {downloading ? "Preparing..." : "Download PDF"}
                    </button>
                </div>
            </div>
        </div>
    );
}