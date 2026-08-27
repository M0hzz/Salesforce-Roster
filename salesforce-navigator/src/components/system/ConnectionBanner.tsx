import { Link } from "react-router-dom";
import { AlertTriangle, CloudOff } from "lucide-react";
import { useData } from "@/lib/data-context";

/**
 * Slim banner under the header whenever the SharePoint backend is selected
 * but not actually serving data, so no page quietly shows an empty roster.
 */
export function ConnectionBanner() {
  const { backend, status, lastError } = useData();
  if (backend !== "sharepoint") return null;
  if (status === "connected" || status === "connecting") return null;

  const message =
    status === "unconfigured"
      ? "SharePoint storage is selected but not configured."
      : status === "signed-out"
        ? "SharePoint storage is selected — sign in to load your team's data."
        : lastError ?? "SharePoint connection failed.";

  return (
    <div className="border-b bg-amber-500/10 text-sm">
      <div className="mx-auto max-w-7xl px-4 py-2 flex items-center gap-2 flex-wrap">
        {status === "error" ? (
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
        ) : (
          <CloudOff className="h-4 w-4 shrink-0" />
        )}
        <span className="break-words">{message}</span>
        <Link to="/storage" className="underline font-medium ml-auto shrink-0">
          Open Storage
        </Link>
      </div>
    </div>
  );
}
