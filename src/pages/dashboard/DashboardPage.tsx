import { useQuery } from '@tanstack/react-query'
import { brandsApi } from '@/api/brands'
import { categoriesApi } from '@/api/categories'
import { itemsApi } from '@/api/items'
import { attributesApi } from '@/api/attributes'
import { uomApi } from '@/api/uom'
import { useAuthStore } from '@/store/authStore'
import { StatCard } from '@/components/ui/Card'
import { Tag, FolderTree, Package, List, Ruler, Clock } from 'lucide-react'

export function DashboardPage() {
  const { user } = useAuthStore()

  const { data: brands } = useQuery({ queryKey: ['brands'], queryFn: brandsApi.getAll })
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.getAll })
  const { data: items } = useQuery({ queryKey: ['items'], queryFn: itemsApi.getAll })
  const { data: attributes } = useQuery({ queryKey: ['attributes'], queryFn: () => attributesApi.getAll() })
  const { data: uoms } = useQuery({ queryKey: ['uom'], queryFn: uomApi.getAll })
  const { data: pendingAttributes } = useQuery({
    queryKey: ['attributes', 'pending'],
    queryFn: attributesApi.getPending,
    enabled: !!(user?.is_superuser || user?.is_company_admin),
  })

  const greeting =
    new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          {greeting}, {user?.full_name?.split(' ')[0]}!
        </h1>
        <p className="text-slate-500 mt-1">Here's a summary of your warehouse data.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        <StatCard
          title="Total Brands"
          value={brands?.length ?? '—'}
          icon={<Tag size={20} />}
          color="bg-orange-50 text-orange-600"
        />
        <StatCard
          title="Categories"
          value={categories?.length ?? '—'}
          icon={<FolderTree size={20} />}
          color="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          title="Items"
          value={items?.length ?? '—'}
          icon={<Package size={20} />}
          color="bg-orange-50 text-orange-600"
        />
        <StatCard
          title="Attributes"
          value={attributes?.length ?? '—'}
          icon={<List size={20} />}
          color="bg-purple-50 text-purple-600"
        />
        <StatCard
          title="UOM"
          value={uoms?.length ?? '—'}
          icon={<Ruler size={20} />}
          color="bg-rose-50 text-rose-600"
        />
      </div>

      {(user?.is_superuser || user?.is_company_admin) && (pendingAttributes?.length ?? 0) > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Clock size={18} className="text-orange-600 flex-shrink-0" />
            <p className="text-sm text-orange-700">
              <span className="font-semibold">{pendingAttributes?.length} attribute(s)</span> pending
              approval. Visit the Attributes page to review.
            </p>
          </div>
        </div>
      )}

      <div className="mt-8 bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 mb-1">Your Account</h2>
        <p className="text-sm text-slate-500 mb-4">Signed in as {user?.email}</p>
        <div className="flex flex-wrap gap-2 text-xs">
          {user?.is_superuser && (
            <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full font-medium">
              Superuser
            </span>
          )}
          {user?.is_company_admin && (
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
              Company Admin
            </span>
          )}
          {user?.company && (
            <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full font-medium">
              {user.company.name}
            </span>
          )}
          {user?.role && (
            <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full font-medium">
              Role: {user.role.name}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
