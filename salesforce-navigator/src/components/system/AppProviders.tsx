import { ReactNode } from "react";
import { DataProvider } from "@/lib/data-context";

export function AppProviders({ children }: { children: ReactNode }) {
  return <DataProvider>{children}</DataProvider>;
}
