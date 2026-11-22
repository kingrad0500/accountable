import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, Outlet, RouterProvider, ScrollRestoration } from "react-router";
import { Toaster } from "sonner";
import { TopBar } from "./components/TopBar";
import { DealsPage } from "./features/deals/DealsPage";
import { PipelinePage } from "./features/pipeline/PipelinePage";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { ContactsPage } from "./features/contacts/ContactsPage";
import { ContactPage } from "./features/contacts/ContactPage";
import { DealPage } from "./features/deals/DealPage";
import { OrganizationPage } from "./features/organizations/OrganizationPage";
import { OrganizationsPage } from "./features/organizations/OrganizationsPage";
import { PageTitle } from "./components/PageTitle";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 15_000, retry: 1 },
  },
});

function Layout() {
  return (
    <div className="mx-auto max-w-[1400px] px-6 pt-4 pb-6">
      <TopBar />
      <main>
        <Outlet />
      </main>
      <ScrollRestoration />
    </div>
  );
}

function Placeholder({ title }: { title: string }) {
  return <PageTitle title={title} />;
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <DashboardPage /> },
      { path: "/pipeline", element: <PipelinePage /> },
      { path: "/deals", element: <DealsPage /> },
      { path: "/deals/:id", element: <DealPage /> },
      { path: "/contacts", element: <ContactsPage /> },
      { path: "/contacts/:id", element: <ContactPage /> },
      { path: "/organizations", element: <OrganizationsPage /> },
      { path: "/organizations/:id", element: <OrganizationPage /> },
      { path: "*", element: <Placeholder title="Page not found" /> },
    ],
  },
]);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            fontFamily: "var(--font-sans)",
            background: "var(--raised)",
            color: "var(--text)",
            border: "1px solid var(--toast-line)",
            boxShadow: "var(--shadow-toast)",
            borderRadius: 12,
          },
        }}
      />
    </QueryClientProvider>
  );
}
