import React, { useState } from "react";
import { Copy, Check, TrendingUp, Info, Link } from "lucide-react";

export default function UpperNav({ TabName, Name, RefCode, RefLink, SpaceName, icon}) {
  const [copied, setCopied] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const displayLink = RefLink;
  const showGreeting = TabName === "overview";
  const handleCopy = async () => {
    if (!RefLink) {
      setToastMsg("No referral link available");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 1800);
      return;
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(RefLink);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = RefLink;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }

      setCopied(true);
      setToastMsg("Copied!");
      setShowToast(true);
      setTimeout(() => setCopied(false), 1800);
      setTimeout(() => setShowToast(false), 1800);
    } catch (err) {
      console.error("Failed to copy:", err);
      setToastMsg("Copy failed");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 1800);
    }
  };

  return (
    // added "relative" — the mobile button below is `absolute`, and without a positioned
    // ancestor it was escaping this header entirely instead of anchoring inside it
    <div className="relative mt-16 md:mt-0 mb-5 px-5 w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 pb-6 border-b-2 border-slate-400 md:w-full md:pl-6 md:pr-6  shadow-md">
      <div className="mt-3">
        <h1 className="text-3xl mt-3 md:mt-4 md:text-3xl font-extrabold tracking-tight text-slate-900 font-['rajdhani'] uppercase">
          {TabName}
        </h1>
        <div className="flex items-center gap-2 text-md font-semibold tracking-[3px] text-black/60 font-['rajdhani'] uppercase md:mb-1">
           an overview in the company
        </div>
      </div>


      {/* mobile view - was: absolute right-[1rem] mt-[1rem] with no positioned parent (see fix above),
          now anchored with top-4 right-4 against the relative container */}
      <div className="absolute top-4 right-4 md:hidden flex items-center gap-4 px-3 py-2 w-max">
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-3 py-2 text-xs font-semibold transition-all duration-200 active:scale-95 shadow-sm cursor-pointer"
        >
          <Link size={14}/>
          <span>Show Link</span>
        </button>
      </div>

      {/* Mobile modal: shows actual link and copy button */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-xl shadow-lg p-4 max-w-sm w-[92%] mx-4">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-lg font-bold font-['rajdhani']">Your referral link</h3>
              <button onClick={() => setShowModal(false)} className="text-white bg-black px-2 rounded-lg">Close</button>
            </div>
            <div className="mb-3 bg-neutral-200/30 py-1 flex justify-center rounded-md">
              <p className="break-words text-md text-slate-800">{displayLink || "No referral link available"}</p>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => {
                  handleCopy();
                  setShowModal(false);
                }}
                className="flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 text-xs font-semibold transition-all duration-200 active:scale-95 shadow-sm"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{copied ? "Copied!" : "Copy"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {showToast && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white px-4 py-2 rounded-md shadow-md z-50">
          {toastMsg}
        </div>
      )}
    </div>
  );
}