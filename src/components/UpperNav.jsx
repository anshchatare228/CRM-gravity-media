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
    <div className="mt-16 md:mt-0 mb-5 px-5 w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 pb-6 border-b-2 border-slate-400 md:w-full md:pl-6 md:pr-6 bg-white shadow-md">
      <div className="mt-3">
        <h1 className="text-3xl mt-3 md:mt-4 md:text-3xl font-extrabold tracking-tight text-slate-900 font-['rajdhani'] uppercase">
          {TabName}
        </h1>
        <div className="flex items-center gap-2 text-md font-semibold tracking-[3px] text-rose-500 font-['rajdhani'] uppercase md:mb-1">
          <TrendingUp size={14} /> {SpaceName} Space
        </div>
      </div>

      {/* referral code - desktop view (original layout) */}
      <div className="hidden md:flex items-center gap-2 rounded-2xl bg-white px-5 py-5 border border-slate-200/80 shadow-sm max-w-md sm:w-auto justify-end md:mt-[0 rem] sm:justify-start md:justify-between md:mt-5 h-[4rem] md:w-[32rem]">
        <div>
          <p className="text-[0.75rem] font-bold tracking-wider text-slate-400 uppercase">Referral Identifier</p>
          <h2 className="text-xs over  font-bold font-mono tracking-wide text-slate-900 mt-0.5">
            {displayLink}
          </h2>
        </div>
        <div className="h-8 w-px bg-slate-100" />
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 text-xs font-semibold transition-all duration-200 active:scale-95 shadow-sm shadow-slate-950/10 cursor-pointer shrink-0 ml-[-25px] md:ml-0"
        >
          {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          <span>{copied ? "Copied!" : "Copy"}</span>
        </button>
      </div>

      {/* mobile view - show only a button that opens a modal with the link and copy button */}
      <div className="absolute right-[1rem] mt-[1rem] md:hidden items-center gap-4 px-3 py-2 w-max md:mt-5">
        {/* <p className="font-['rajdhani'] ml-5">
          REFFERAL
        </p> */}
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
