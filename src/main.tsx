import '@/lib/errorReporter';
import { enableMapSet } from "immer";
enableMapSet();
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import '@/index.css'
import { HomePage } from '@/pages/HomePage'
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ExpensesListPage } from '@/pages/ExpensesListPage';
import { SubmitExpensePage } from '@/pages/SubmitExpensePage';
import { ExpenseDetailPage } from '@/pages/ExpenseDetailPage';
import { EditExpensePage } from '@/pages/EditExpensePage';
import { AdminSettingsPage } from '@/pages/AdminSettingsPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ProtectedRoute } from '@/components/ProtectedRoute';
const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/",
    element: <ProtectedRoute><HomePage /></ProtectedRoute>,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: "dashboard",
        element: <DashboardPage />,
      },
      {
        path: "expenses",
        element: <ExpensesListPage />,
      },
      {
        path: "expenses/new",
        element: <SubmitExpensePage />,
      },
      {
        path: "expenses/:id",
        element: <ExpenseDetailPage />,
      },
      {
        path: "expenses/:id/edit",
        element: <EditExpensePage />,
      },
      {
        path: "settings",
        element: <AdminSettingsPage />,
      },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  }
]);
// Do not touch this code
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  </StrictMode>,
)