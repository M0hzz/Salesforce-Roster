import { useState } from "react";
import { Cloud, HardDrive, LogIn, LogOut, RefreshCw } from "lucide-react";
import { useData, type ConnectionStatus } from "@/lib/data-context";
import { getSharePointConfig, missingSharePointConfig } from "@/lib/sharepoint/config";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  ready: "Ready",
  unconfigured: "Not configured",
  "signed-out": "Signed out",
  connecting: "Connecting…",
  connected: "Connected",
  error: "Error",
};

export default function StoragePage() {
  const {
    backend,
    setBackend,
    status,
    lastError,
    accountName,
    signIn,
    signOut,
    refresh,
    roster,
    activity,
  } = useData();
  const [busy, setBusy] = useState(false);
  const cfg = getSharePointConfig();
  const missing = missingSharePointConfig();

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch {
      /* surfaced through lastError */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Storage</h1>
        <p className="text-muted-foreground mt-1">
          Choose where roster and activity data lives. Currently holding {roster.length} people and{" "}
          {activity.length} activity rows.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <BackendCard
          icon={<HardDrive className="h-5 w-5" />}
          title="This browser"
          active={backend === "local"}
          onSelect={() => setBackend("local")}
          description="Data stays in localStorage on this machine. Private, instant, but not shared with anyone."
        />
        <BackendCard
          icon={<Cloud className="h-5 w-5" />}
          title="SharePoint"
          active={backend === "sharepoint"}
          onSelect={() => setBackend("sharepoint")}
          description="Data lives in two SharePoint lists via Microsoft Graph, shared with everyone on the site."
        />
      </div>

      {backend === "sharepoint" && (
        <section className="p-6 rounded-xl border bg-card space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="font-bold">SharePoint connection</h2>
            <span
              className={cn(
                "text-xs px-2 py-1 rounded-full border",
                status === "connected" && "text-green-600 border-green-600/40",
                status === "error" && "text-destructive border-destructive/40",
                (status === "connecting" || status === "signed-out" || status === "unconfigured") &&
                  "text-muted-foreground"
              )}
            >
              {STATUS_LABEL[status]}
            </span>
          </div>

          {status === "unconfigured" ? (
            <div className="text-sm space-y-2">
              <p>
                Missing environment variables:{" "}
                {missing.map((m) => (
                  <code key={m} className="text-xs bg-muted px-1 py-0.5 rounded mr-1">
                    {m}
                  </code>
                ))}
              </p>
              <p className="text-muted-foreground">
                Copy <code className="text-xs">.env.example</code> to{" "}
                <code className="text-xs">.env.local</code>, fill it in, and restart the dev server.
                The SharePoint page has the full setup walkthrough.
              </p>
            </div>
          ) : (
            <>
              <dl className="text-sm grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                <dt className="text-muted-foreground">Site</dt>
                <dd className="font-mono text-xs pt-0.5">
                  {cfg.hostname}
                  {cfg.sitePath}
                </dd>
                <dt className="text-muted-foreground">Lists</dt>
                <dd className="font-mono text-xs pt-0.5">
                  {cfg.rosterListName}, {cfg.activityListName}
                </dd>
                {accountName && (
                  <>
                    <dt className="text-muted-foreground">Signed in as</dt>
                    <dd className="pt-0.5">{accountName}</dd>
                  </>
                )}
              </dl>

              <div className="flex flex-wrap gap-2">
                {status === "connected" ? (
                  <>
                    <button
                      disabled={busy}
                      onClick={() => run(refresh)}
                      className="px-3 py-1.5 rounded border text-sm inline-flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <RefreshCw className={cn("h-4 w-4", busy && "animate-spin")} /> Refresh data
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => run(signOut)}
                      className="px-3 py-1.5 rounded border text-sm inline-flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </>
                ) : (
                  <button
                    disabled={busy || status === "connecting"}
                    onClick={() => run(signIn)}
                    className="px-3 py-1.5 rounded bg-primary text-primary-foreground text-sm inline-flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <LogIn className="h-4 w-4" /> Sign in with Microsoft
                  </button>
                )}
              </div>
            </>
          )}

          {lastError && (
            <p className="text-sm text-destructive break-words">{lastError}</p>
          )}
        </section>
      )}
    </div>
  );
}

function BackendCard({
  icon,
  title,
  description,
  active,
  onSelect,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "p-5 rounded-xl border bg-card text-left space-y-2 transition-colors",
        active ? "border-primary ring-1 ring-primary" : "hover:bg-muted/50"
      )}
    >
      <div className="flex items-center gap-2 font-bold">
        {icon}
        {title}
        {active && (
          <span className="ml-auto text-xs text-primary font-medium">In use</span>
        )}
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </button>
  );
}
