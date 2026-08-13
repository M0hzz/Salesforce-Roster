import { Suspense } from "react";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import Layout from "./pages/_layout";
import { queryClient } from "./lib/query-client";
import { AppProviders } from "@/components/system/AppProviders";
import HomePage from "./pages/index";
import UploadPage from "./pages/upload";
import OrgChartPage from "./pages/org";
import ActivityPage from "./pages/activity";
import PersonDetailPage from "./pages/person";
import SharePointPage from "./pages/sharepoint";
import SourcePage from "./pages/source";
import NotFoundPage from "./pages/not-found";

function App() {
  return (
    <AppProviders>
      <QueryClientProvider client={queryClient}>
        <Router>
          <Suspense fallback={<div className="p-8 text-muted-foreground">Loading…</div>}>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<HomePage />} />
                <Route path="upload" element={<UploadPage />} />
                <Route path="org" element={<OrgChartPage />} />
                <Route path="activity" element={<ActivityPage />} />
                <Route path="person/:id" element={<PersonDetailPage />} />
                <Route path="sharepoint" element={<SharePointPage />} />
                <Route path="source" element={<SourcePage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </Suspense>
        </Router>
      </QueryClientProvider>
    </AppProviders>
  );
}

export default App;
