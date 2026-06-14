import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Users, Layers, BarChart3, ClipboardList, History, Settings, Menu, Building2, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";

const nav = [
  { to: "/employees", label: "Employees", icon: Users },
  { to: "/bands", label: "Salary Bands", icon: Layers },
  { to: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { to: "/reviews", label: "Salary Reviews", icon: ClipboardList },
  { to: "/audit", label: "Audit Log", icon: History },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { logout } = useStore();

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside
        className={cn(
          "shrink-0 border-r border-border bg-sidebar transition-all duration-200 flex flex-col",
          collapsed ? "w-16" : "w-60",
        )}
      >
        <div className="flex items-center gap-2 px-4 h-16 border-b border-border">
          <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground shrink-0">
            <Building2 className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-foreground">ACME</span>
              <span className="text-xs text-muted-foreground">Salary Mgmt</span>
            </div>
          )}
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="p-2 border-t border-border mt-auto">
          <button
            onClick={logout}
            className={cn(
              "w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors cursor-pointer",
              collapsed && "justify-center px-0"
            )}
            title="Log Out"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Log Out</span>}
          </button>
        </div>
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="m-2 flex items-center justify-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground hover:bg-muted cursor-pointer"
        >
          <Menu className="h-4 w-4" />
          {!collapsed && <span>Collapse</span>}
        </button>
      </aside>
      <main className="flex-1 min-w-0 overflow-x-auto">{children}</main>
    </div>
  );
}
