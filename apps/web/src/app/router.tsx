import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { RequireAuth, RequirePermission } from '@/components/layout/guards';
import { ROUTES } from '@/constants/routes';

import { LoginPage } from '@/pages/auth/LoginPage';
import { OnboardingPage } from '@/pages/onboarding/OnboardingPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { POSPage } from '@/pages/pos/POSPage';
import { ReceiptPage } from '@/pages/pos/ReceiptPage';
import { CashRegisterPage } from '@/pages/cash-register/CashRegisterPage';
import { CloseCashPage } from '@/pages/cash-register/CloseCashPage';
import { CashHistoryPage } from '@/pages/cash-register/CashHistoryPage';
import { CashDetailPage } from '@/pages/cash-register/CashDetailPage';
import { CashClosureReportPage } from '@/pages/cash-register/CashClosureReportPage';
import { ProductsPage } from '@/pages/products/ProductsPage';
import { ProductFormPage } from '@/pages/products/ProductFormPage';
import { ProductDetailPage } from '@/pages/products/ProductDetailPage';
import { CategoriesPage } from '@/pages/products/CategoriesPage';
import { BrandsPage } from '@/pages/products/BrandsPage';
import { CombosPage } from '@/pages/products/CombosPage';
import { InventoryPage } from '@/pages/inventory/InventoryPage';
import { InventoryMovementsPage } from '@/pages/inventory/InventoryMovementsPage';
import { CustomersPage } from '@/pages/customers/CustomersPage';
import { CustomerDetailPage } from '@/pages/customers/CustomerDetailPage';
import { SalesPage } from '@/pages/sales/SalesPage';
import { SaleDetailPage } from '@/pages/sales/SaleDetailPage';
import { ReturnsPage } from '@/pages/returns/ReturnsPage';
import { CreateReturnPage } from '@/pages/returns/CreateReturnPage';
import { SuppliersPage } from '@/pages/suppliers/SuppliersPage';
import { SupplierDetailPage } from '@/pages/suppliers/SupplierDetailPage';
import { PurchasesPage } from '@/pages/purchases/PurchasesPage';
import { PurchaseCreatePage } from '@/pages/purchases/PurchaseCreatePage';
import { PurchaseDetailPage } from '@/pages/purchases/PurchaseDetailPage';
import { PromotionsPage } from '@/pages/promotions/PromotionsPage';
import { ExpensesPage } from '@/pages/expenses/ExpensesPage';
import { ReportsPage } from '@/pages/reports/ReportsPage';
import { UsersPage } from '@/pages/users/UsersPage';
import { AuditPage } from '@/pages/audit/AuditPage';
import { NotificationsPage } from '@/pages/notifications/NotificationsPage';
import { ToolsPage } from '@/pages/tools/ToolsPage';
import { SettingsPage } from '@/pages/settings/SettingsPage';
import { NotFoundPage } from '@/pages/errors/NotFoundPage';
import { NoPermissionPage } from '@/pages/errors/NoPermissionPage';

export const router = createBrowserRouter([
  { path: ROUTES.login, element: <LoginPage /> },
  {
    path: ROUTES.onboarding,
    element: (
      <RequireAuth>
        <OnboardingPage />
      </RequireAuth>
    ),
  },
  {
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { path: ROUTES.dashboard, element: <DashboardPage /> },
      {
        path: ROUTES.pos,
        element: (
          <RequirePermission permission="sell">
            <POSPage />
          </RequirePermission>
        ),
      },
      { path: ROUTES.receipt(), element: <ReceiptPage /> },
      { path: ROUTES.cash, element: <CashRegisterPage /> },
      {
        path: ROUTES.closeCash,
        element: (
          <RequirePermission permission="close_cash">
            <CloseCashPage />
          </RequirePermission>
        ),
      },
      { path: ROUTES.cashHistory, element: <CashHistoryPage /> },
      { path: ROUTES.cashClosure(), element: <CashClosureReportPage /> },
      { path: ROUTES.cashDetail(), element: <CashDetailPage /> },
      { path: ROUTES.products, element: <ProductsPage /> },
      {
        path: ROUTES.productCreate,
        element: (
          <RequirePermission permission="edit_products">
            <ProductFormPage />
          </RequirePermission>
        ),
      },
      { path: ROUTES.productDetail(), element: <ProductDetailPage /> },
      {
        path: ROUTES.productEdit(),
        element: (
          <RequirePermission permission="edit_products">
            <ProductFormPage />
          </RequirePermission>
        ),
      },
      {
        path: ROUTES.categories,
        element: (
          <RequirePermission permission="edit_products">
            <CategoriesPage />
          </RequirePermission>
        ),
      },
      {
        path: ROUTES.brands,
        element: (
          <RequirePermission permission="edit_products">
            <BrandsPage />
          </RequirePermission>
        ),
      },
      {
        path: ROUTES.combos,
        element: (
          <RequirePermission permission="edit_products">
            <CombosPage />
          </RequirePermission>
        ),
      },
      {
        path: ROUTES.inventory,
        element: (
          <RequirePermission permission="adjust_stock">
            <InventoryPage />
          </RequirePermission>
        ),
      },
      {
        path: ROUTES.inventoryMovements,
        element: (
          <RequirePermission permission="adjust_stock">
            <InventoryMovementsPage />
          </RequirePermission>
        ),
      },
      { path: ROUTES.customers, element: <CustomersPage /> },
      { path: ROUTES.customerDetail(), element: <CustomerDetailPage /> },
      { path: ROUTES.sales, element: <SalesPage /> },
      { path: ROUTES.saleDetail(), element: <SaleDetailPage /> },
      {
        path: ROUTES.returns,
        element: (
          <RequirePermission permission="create_return">
            <ReturnsPage />
          </RequirePermission>
        ),
      },
      {
        path: ROUTES.returnCreate,
        element: (
          <RequirePermission permission="create_return">
            <CreateReturnPage />
          </RequirePermission>
        ),
      },
      {
        path: ROUTES.suppliers,
        element: (
          <RequirePermission permission="manage_purchases">
            <SuppliersPage />
          </RequirePermission>
        ),
      },
      {
        path: ROUTES.supplierDetail(),
        element: (
          <RequirePermission permission="manage_purchases">
            <SupplierDetailPage />
          </RequirePermission>
        ),
      },
      {
        path: ROUTES.purchases,
        element: (
          <RequirePermission permission="manage_purchases">
            <PurchasesPage />
          </RequirePermission>
        ),
      },
      {
        path: ROUTES.purchaseCreate,
        element: (
          <RequirePermission permission="manage_purchases">
            <PurchaseCreatePage />
          </RequirePermission>
        ),
      },
      {
        path: ROUTES.purchaseDetail(),
        element: (
          <RequirePermission permission="manage_purchases">
            <PurchaseDetailPage />
          </RequirePermission>
        ),
      },
      {
        path: ROUTES.promotions,
        element: (
          <RequirePermission permission="edit_products">
            <PromotionsPage />
          </RequirePermission>
        ),
      },
      {
        path: ROUTES.expenses,
        element: (
          <RequirePermission permission="register_expenses">
            <ExpensesPage />
          </RequirePermission>
        ),
      },
      {
        path: ROUTES.reports,
        element: (
          <RequirePermission permission="view_reports">
            <ReportsPage />
          </RequirePermission>
        ),
      },
      {
        path: ROUTES.users,
        element: (
          <RequirePermission permission="manage_users">
            <UsersPage />
          </RequirePermission>
        ),
      },
      {
        path: ROUTES.audit,
        element: (
          <RequirePermission permission="view_audit">
            <AuditPage />
          </RequirePermission>
        ),
      },
      { path: ROUTES.notifications, element: <NotificationsPage /> },
      {
        path: ROUTES.tools,
        element: (
          <RequirePermission permission="reset_demo">
            <ToolsPage />
          </RequirePermission>
        ),
      },
      {
        path: ROUTES.settings,
        element: (
          <RequirePermission permission="manage_settings">
            <SettingsPage />
          </RequirePermission>
        ),
      },
      { path: ROUTES.noPermission, element: <NoPermissionPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
