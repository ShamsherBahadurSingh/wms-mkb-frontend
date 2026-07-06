import { Settings } from 'lucide-react'
import { PageHeader } from '@/components/ui/Table'

export function ConfigurationPage() {
  return (
    <div>
      <PageHeader
        title="Configuration"
        subtitle="System-wide settings and configuration"
      />
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Settings size={48} className="mb-4 opacity-30" />
        <p className="text-sm">Configuration settings coming soon.</p>
      </div>
    </div>
  )
}
