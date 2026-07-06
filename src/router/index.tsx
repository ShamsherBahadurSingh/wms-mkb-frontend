import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from './ProtectedRoute'
import { LoginPage } from '@/pages/auth/LoginPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { BrandsPage } from '@/pages/brands/BrandsPage'
import { CategoriesPage } from '@/pages/categories/CategoriesPage'
import { UomPage } from '@/pages/uom/UomPage'
import { UomFormPage } from '@/pages/uom/UomFormPage'
import { AttributeTypesPage } from '@/pages/attributeTypes/AttributeTypesPage'
import { AttributesPage } from '@/pages/attributes/AttributesPage'
import { CommonProductNamesPage } from '@/pages/commonProductNames/CommonProductNamesPage'
import { ItemsPage } from '@/pages/items/ItemsPage'
import { CompaniesPage } from '@/pages/admin/CompaniesPage'
import { UsersPage } from '@/pages/admin/UsersPage'
import { RolesPage } from '@/pages/admin/RolesPage'
import { DimensionsPage } from '@/pages/admin/master/DimensionsPage'
import { BreakableUnitsPage } from '@/pages/admin/master/BreakableUnitsPage'
import { BillableUnitsPage } from '@/pages/admin/master/BillableUnitsPage'
import { ConfigurationPage } from '@/pages/admin/master/ConfigurationPage'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/reset-password',
    element: <ResetPasswordPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <DashboardPage /> },
          { path: '/brands', element: <BrandsPage /> },
          { path: '/categories', element: <CategoriesPage /> },
          { path: '/uom', element: <UomPage /> },
          { path: '/uom/new', element: <UomFormPage /> },
          { path: '/uom/:id', element: <UomFormPage /> },
          { path: '/attribute-types', element: <AttributeTypesPage /> },
          { path: '/attributes', element: <AttributesPage /> },
          { path: '/common-product-names', element: <CommonProductNamesPage /> },
          { path: '/items', element: <ItemsPage /> },
          {
            element: <ProtectedRoute requireAdmin />,
            children: [
              { path: '/admin/users', element: <UsersPage /> },
              { path: '/admin/roles', element: <RolesPage /> },
              { path: '/admin/master/attribute-types', element: <AttributeTypesPage /> },
              { path: '/admin/master/dimensions', element: <DimensionsPage /> },
              { path: '/admin/master/breakable-units', element: <BreakableUnitsPage /> },
              { path: '/admin/master/billable-units', element: <BillableUnitsPage /> },
              { path: '/admin/master/configuration', element: <ConfigurationPage /> },
            ],
          },
          {
            element: <ProtectedRoute requireSuperuser />,
            children: [
              { path: '/admin/companies', element: <CompaniesPage /> },
            ],
          },
        ],
      },
    ],
  },
])
