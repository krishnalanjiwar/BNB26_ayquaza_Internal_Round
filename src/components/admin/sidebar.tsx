"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Columns3,
  Users,
  Shield,
  FlaskConical,
  BarChart3,
  Settings,
  Zap,
  HelpCircle,
} from "lucide-react";

const navItems = [
  {
    href: "/admin",
    icon: LayoutDashboard,
    label: "Operations",
    exact: true,
  },
  { href: "/admin/queue", icon: Columns3, label: "Queue Board" },
  { href: "/admin/clients", icon: Users, label: "Clients" },
  { href: "/admin/security", icon: Shield, label: "Security" },
  { href: "/admin/simulation", icon: FlaskConical, label: "Simulation Lab" },
  { href: "/admin/analytics", icon: BarChart3, label: "Fairness Analytics" },
  { href: "/admin/settings", icon: Settings, label: "Settings" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <nav className="fixed left-0 top-0 bottom-0 w-16 bg-fd-card border-r border-white/[0.06] flex flex-col items-center py-4 z-50">
      {/* Logo */}
      <Link
        href="/admin"
        className="w-10 h-10 rounded-xl bg-fd-primary flex items-center justify-center mb-8 hover:scale-105 transition-transform"
      >
        <Zap className="w-5 h-5 text-fd-bg" />
      </Link>

      {/* Main nav */}
      <div className="flex flex-col items-center gap-1 flex-1">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 group",
                isActive
                  ? "bg-white text-fd-bg"
                  : "text-white/40 hover:text-white/70 hover:bg-white/[0.06]"
              )}
              title={item.label}
            >
              <item.icon className="w-[18px] h-[18px]" />
              {/* Tooltip */}
              <span className="absolute left-14 px-2.5 py-1.5 rounded-lg bg-fd-card-elevated border border-white/[0.06] text-xs font-medium text-white/[0.92] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-xl z-50">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Bottom */}
      <div className="flex flex-col items-center gap-1">
        <button
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-all"
          title="Help"
        >
          <HelpCircle className="w-[18px] h-[18px]" />
        </button>
      </div>
    </nav>
  );
}
