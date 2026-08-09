import { NavLink } from "react-router-dom";
import { LayoutDashboard, FileText, Wallet, User, Box } from "lucide-react";

const navItems = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/conversions", label: "Conversions", icon: FileText },
  { to: "/products", label: "Products", icon: Box },
  { to: "/payouts", label: "Payout", icon: Wallet },
  { to: "/profile", label: "Profile", icon: User },
];

export default function LowerPhoneNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white/95 px-2 py-2 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur-md md:hidden">
      <div className="mx-auto flex max-w-md items-center justify-between gap-1">

        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center justify-center rounded-2xl px-2 py-2 text-[10px] font-semibold tracking-wide transition-all

              ${isActive
                ? "text-red-500"
                : label === "Products" ? "text-white" : "text-slate-500 hover:bg-slate-100"
              }

              ${label === "Products"
                ? "bg-black shadow-md text-red-600"
                : ""
              }`

            }
          >
            <Icon size={22} />
            <span className="mt-1 leading-none">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
