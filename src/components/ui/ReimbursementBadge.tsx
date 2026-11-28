import Link from 'next/link'
import { reimbursementLabels } from '@/lib/reimbursements'
import type { Reimbursement } from '@/types/reimbursements'

interface ReimbursementBadgeProps { record?: Reimbursement }

export default function ReimbursementBadge({ record }: ReimbursementBadgeProps) {
  if (!record) return null
  return <Link href="/dashboard/reimbursements" className={`badge ${record.status === 'reimbursed' ? 'badge-success' : record.status === 'not_reimbursed' ? 'badge-danger' : 'badge-neutral'}`}>Reembolso · {reimbursementLabels[record.status]}</Link>
}
