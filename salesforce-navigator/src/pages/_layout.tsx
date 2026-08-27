import { Outlet, Link, NavLink } from "react-router-dom";
import {
  Search,
  Upload,
  GitBranch,
  BarChart3,
  Sparkles,
  Code2,
  LayoutList,
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ConnectionBanner } from "@/components/system/ConnectionBanner";

const NAV = [
  { to: "/", label: "Search", icon: Search, end: true },
  { to: "/upload", label: "Upload", icon: Upload },
  { to: "/org", label: "Org Chart", icon: GitBranch },
  { to: "/activity", label: "Activity", icon: BarChart3 },
  { to: "/storage", label: "Storage", icon: Database },
  { to: "/sharepoint", label: "SharePoint", icon: LayoutList },
  { to: "/source", label: "Source", icon: Code2 },
];

export default function Layout() {
  return (
    <div className="flex flex-col min-h-svh">
      <header className="border-b sticky top-0 z-40 bg-background/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 min-h-16 py-2 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link to="/" className="font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            SalesForce Navigator
          </Link>
          <nav className="ml-auto flex flex-wrap gap-1">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    "px-3 py-1.5 rounded-full text-sm inline-flex items-center gap-1.5 transition-colors",
                    isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  )
                }
              >
                <Icon className="h-4 w-4" /> {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <ConnectionBanner />
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
