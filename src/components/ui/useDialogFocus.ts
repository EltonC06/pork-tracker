'use client'

import { useEffect, useRef } from 'react'

const focusableSelector = 'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'

/** Keep keyboard focus in an open modal and restore its trigger on dismissal. */
export default function useDialogFocus(isOpen: boolean) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const dialog = dialogRef.current
    if (!dialog) return
    const focusable = () => [...dialog.querySelectorAll<HTMLElement>(focusableSelector)].filter(element => element.getClientRects().length > 0)
    const visible = focusable()
    const initial = visible.find(element => element.matches('input:not([type="hidden"]), select, textarea')) ?? visible[0] ?? dialog
    initial.focus()

    function trapFocus(event: KeyboardEvent) {
      if (event.key !== 'Tab') return
      const items = focusable()
      const first = items[0]
      const last = items.at(-1)
      if (!first || !last) {
        event.preventDefault()
        dialog?.focus()
      } else if (event.shiftKey && (document.activeElement === first || !dialog?.contains(document.activeElement))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || !dialog?.contains(document.activeElement))) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', trapFocus)
    return () => {
      document.removeEventListener('keydown', trapFocus)
      if (trigger?.isConnected) trigger.focus()
    }
  }, [isOpen])

  return dialogRef
}
