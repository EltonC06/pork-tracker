'use client'

import Link from 'next/link'
import type { ExpenseCategoryOption } from '@/types/database'

interface ExpenseCategorySelectProps {
  categories: ExpenseCategoryOption[]
  id?: string
  name?: string
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  showManageLink?: boolean
}

export default function ExpenseCategorySelect({
  categories,
  id,
  name = 'category_id',
  value,
  defaultValue,
  onChange,
  showManageLink = true,
}: ExpenseCategorySelectProps) {
  const selected = value ?? defaultValue ?? ''
  const visible = categories.filter(category => category.active || category.id === selected)

  return (
    <div className="expense-category-field">
      <select
        id={id}
        name={name}
        className="input"
        value={value}
        defaultValue={value === undefined ? defaultValue ?? '' : undefined}
        onChange={onChange ? event => onChange(event.target.value) : undefined}
      >
        <option value="">Sem categoria</option>
        {visible.map(category => (
          <option key={category.id} value={category.id}>
            {category.name}{category.active ? '' : ' (inativa)'}
          </option>
        ))}
      </select>
      {showManageLink && (
        <Link href="/dashboard/categories" className="expense-category-manage-link">
          Gerenciar categorias
        </Link>
      )}
    </div>
  )
}
