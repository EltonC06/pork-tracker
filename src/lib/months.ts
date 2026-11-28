export function currentMonth() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Fortaleza', year: 'numeric', month: '2-digit' }).format(new Date()).slice(0, 7)
}

export function shiftMonth(value: string, delta: number) {
  const year = Number(value.slice(0, 4)), month = Number(value.slice(5, 7)) - 1 + delta
  const absolute = year * 12 + month
  return `${String(Math.floor(absolute / 12)).padStart(4, '0')}-${String(((absolute % 12) + 12) % 12 + 1).padStart(2, '0')}`
}

export function monthBounds(month: string) {
  const next = shiftMonth(month, 1)
  const end = new Date(`${next}-01T12:00:00Z`)
  end.setUTCDate(0)
  return { start: `${month}-01`, end: end.toISOString().slice(0, 10) }
}
