import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import {
  LayoutDashboard,
  Tag,
  FolderTree,
  Ruler,
  Shapes,
  List,
  PackageSearch,
  Package,
  Building2,
  Users,
  Shield,
  ChevronDown,
  Warehouse,
  Database,
  BoxSelect,
  Receipt,
  Settings,
} from 'lucide-react'
import { useState } from 'react'

interface NavItem {
  label: string
  to?: string
  icon: React.ReactNode
  children?: NavItem[]
  adminOnly?: boolean
  superuserOnly?: boolean
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    to: '/',
    icon: <LayoutDashboard size={18} />,
  },
  {
    label: 'Product Catalog',
    icon: <Package size={18} />,
    children: [
      { label: 'Brands', to: '/brands', icon: <Tag size={16} /> },
      { label: 'Categories', to: '/categories', icon: <FolderTree size={16} /> },
      { label: 'Units of Measure', to: '/uom', icon: <Ruler size={16} /> },
      { label: 'Attributes', to: '/attributes', icon: <List size={16} /> },
      { label: 'Common Product Names', to: '/common-product-names', icon: <PackageSearch size={16} /> },
      { label: 'Items', to: '/items', icon: <Package size={16} /> },
    ],
  },
  {
    label: 'Administration',
    icon: <Shield size={18} />,
    adminOnly: true,
    children: [
      {
        label: 'Companies',
        to: '/admin/companies',
        icon: <Building2 size={16} />,
        superuserOnly: true,
      },
      { label: 'Users', to: '/admin/users', icon: <Users size={16} />, adminOnly: true },
      { label: 'Roles', to: '/admin/roles', icon: <Shield size={16} />, adminOnly: true },
      {
        label: 'Master',
        icon: <Database size={16} />,
        adminOnly: true,
        children: [
          { label: 'Attribute Types', to: '/admin/master/attribute-types', icon: <Shapes size={16} />, adminOnly: true },
          { label: 'Dimensions', to: '/admin/master/dimensions', icon: <Ruler size={16} />, adminOnly: true },
          { label: 'Breakable Units', to: '/admin/master/breakable-units', icon: <BoxSelect size={16} />, adminOnly: true },
          { label: 'Billable Units', to: '/admin/master/billable-units', icon: <Receipt size={16} />, adminOnly: true },
          { label: 'Configuration', to: '/admin/master/configuration', icon: <Settings size={16} />, adminOnly: true },
        ],
      },
    ],
  },
]

function NavGroup({ item, depth = 0 }: { item: NavItem; depth?: number }) {
  const location = useLocation()
  const { user } = useAuthStore()

  const isActive = item.to ? location.pathname === item.to : false

  function hasDescendantActive(navItem: NavItem): boolean {
    if (navItem.to && location.pathname.startsWith(navItem.to)) return true
    return navItem.children?.some(hasDescendantActive) ?? false
  }

  const hasActiveChild = item.children?.some(hasDescendantActive) ?? false
  const [open, setOpen] = useState(hasActiveChild)

  if (item.superuserOnly && !user?.is_superuser) return null
  if (item.adminOnly && !user?.is_superuser && !user?.is_company_admin) return null

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setOpen((p) => !p)}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left',
            hasActiveChild
              ? 'bg-orange-50 text-orange-700'
              : 'text-stone-500 hover:bg-orange-50 hover:text-orange-700'
          )}
        >
          <span className="flex-shrink-0 opacity-80">{item.icon}</span>
          <span className="flex-1">{item.label}</span>
          <span className={cn('transition-transform duration-200', open ? 'rotate-0' : '-rotate-90')}>
            <ChevronDown size={14} />
          </span>
        </button>
        {open && (
          <div className={cn('mt-1 flex flex-col gap-0.5', depth === 0 ? 'ml-4' : 'ml-3')}>
            {item.children.map((child) => (
              <NavGroup key={child.label} item={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Link
      to={item.to!}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all',
        isActive
          ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm shadow-orange-200'
          : 'text-stone-500 hover:bg-orange-50 hover:text-orange-700'
      )}
    >
      <span className={cn('flex-shrink-0', isActive ? 'opacity-100' : 'opacity-70')}>{item.icon}</span>
      {item.label}
      {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/70" />}
    </Link>
  )
}

export function Sidebar() {
  return (
    <aside className="w-64 flex flex-col min-h-screen flex-shrink-0 bg-white border-r border-orange-100">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-orange-100">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #f97316 0%, #f59e0b 100%)' }}
        >
          <Warehouse size={18} className="text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-stone-900 font-bold text-sm leading-tight tracking-wide">WMS-MKB</p>
          <p className="text-stone-400 text-xs truncate">Warehouse Management</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavGroup key={item.label} item={item} />
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-orange-100">
        <p className="text-stone-400 text-[10px] text-center tracking-wider uppercase">
          WMS v1.0
        </p>
      </div>
    </aside>
  )
}
