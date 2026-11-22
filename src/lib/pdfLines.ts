interface PdfTextItem { str: string; transform: number[] }

export function pdfTextLines(items: PdfTextItem[]): string {
  const rows: { y: number; items: PdfTextItem[] }[] = []
  for (const item of items) {
    if (!item.str.trim()) continue
    let row = rows.find(row => Math.abs(row.y - item.transform[5]) < 2)
    if (!row) { row = { y: item.transform[5], items: [] }; rows.push(row) }
    row.items.push(item)
  }
  return rows.sort((a, b) => b.y - a.y).map(row =>
    row.items.sort((a, b) => a.transform[4] - b.transform[4]).map(item => item.str).join(' ')
  ).join('\n')
}
