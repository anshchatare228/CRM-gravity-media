import React, { useState } from "react";
import brandLogo from "../assets/logo.png";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import {
  Menu,
  X,
  LayoutDashboard,
  Link2Icon,
  CreditCard,
  User,
  FileText,
  Wallet,
  LogOut,
  Percent,
  Target,
  Box,
  BoxIcon
} from "lucide-react";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Clients", path: "/clients", icon: FileText },
    { label: "Internals", path: "/internals", icon: BoxIcon },
    // { label: "Payouts", path: "/payouts", icon: Wallet },
    // { label: "Profile", path: "/profile", icon: User },
    // { label: "KrazyStore Site", path: "https://krazystore.in", icon: Link2Icon },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };


  return (
    <>
      {/* Mobile top bar — was: conflicting z-0/z-30 + stray border-r/border-black clashing with border-b-2 border-red-400 */}
      <div className="flex items-center justify-between bg-white/10 backdrop-blur-lg px-6 py-4 fixed top-0 left-0 right-0 z-30 transition-all border-b border-gray-200 md:hidden">
        <div className="flex items-center gap-3">
          <img src={brandLogo} alt="Krazystore" className="h-9 w-auto object-contain" />
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-xl text-black hover:bg-gray-550/10 active:scale-95 transition-all duration-200 focus:outline-none"
        >
          {isOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {isOpen && (
        <div
          className="h-full fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40 md:hidden transition-all duration-300 animate-fade-in"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div className={`
          fixed md:sticky top-0 left-0 h-screen w-[260px] bg-neutral-100 border-r border-gray-400 drop-shadow-xl flex flex-col px-5 py-7 z-50
          transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-transform
          ${isOpen ? "translate-x-0 shadow-2xl z-50" : "-translate-x-full"} 
          md:translate-x-0
        `}>
        {/* was h-18 (not in default Tailwind scale, so it silently did nothing) */}
        <div className="hidden md:flex flex-col items-center mb-8 px-2">
          <img src={brandLogo} alt="Krazystore" className="h-20 mt-[-0.5rem] w-auto object-contain mb-2" />
        </div>

        {/* flex-1 so the nav list takes remaining space and Logout can be pinned with mt-auto below,
            instead of the old mt-[70%]/md:mt-[100%] hack (% margin resolves off width, not height) */}
        <div className="flex-1 flex flex-col gap-2 ml-[-0.5rem] mt-2 md:mt-0">
          <div className="md:hidden px-2 mb-4">
            <img src={brandLogo} alt="" className="h-12 w-auto ml-7" />
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isExternal = item.path.startsWith('http');
            const isActive = !isExternal && location.pathname === item.path;

            return (
              <button
                key={item.label}
                onClick={() => {
                  if (isExternal) {
                    window.open(item.path, '_blank', 'noopener,noreferrer');
                  } else {
                    navigate(item.path);
                  }
                  setIsOpen(false);
                }}
                className={`w-full group relative flex items-center gap-3.5 rounded-sm px-4 py-3.5 text-left text-[0.95rem] font-medium tracking-wide transition-all duration-300 ease-out cursor-pointer overflow-hidden z-10 ${isActive
                  ? "bg-black text-white shadow-lg shadow-slate-900/10"
                  : "text-gray-700 hover:text-black before:absolute before:inset-0 before:bg-black/30 before:-translate-x-full hover:before:translate-x-0 before:transition-transform before:duration-600 before:ease-out before:-z-10"
                  }
                `}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/4 bottom-1/4 w-[3px] bg-black rounded-r-md" />
                )}

                <Icon
                  size={19}
                  className={`transition-transform duration-200 ${isActive ? "text-white" : "text-gray-400 group-hover:text-slate-900"}`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* was mt-[70%] md:mt-[100%] — replaced with mt-auto, works regardless of nav item count or width */}
        <div className="pt-3 border-t border-gray-150/60 mt-auto">
          <button
            onClick={handleLogout}
            className="group flex w-full items-center gap-3.5 rounded-xl border border-gray-200 px-4 py-3.5 text-[0.95rem] font-medium text-gray-600 transition-all duration-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 active:scale-[0.98] cursor-pointer"
          >
            <LogOut size={19} className="text-gray-400 group-hover:text-rose-500 transition-colors duration-200" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </>
  );
}