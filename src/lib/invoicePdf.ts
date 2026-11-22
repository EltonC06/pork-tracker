import { pdfTextLines } from './pdfLines'

/** Local extraction: the original PDF never leaves the browser. */
export async function extractInvoicePdf(data: Uint8Array): Promise<string> {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
  const task = pdfjs.getDocument({ data })
  try {
    const pdf = await task.promise
    if (pdf.numPages > 40) throw new Error('Limite de 40 páginas por fatura.')
    const pages: string[] = []
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n)
      const { items } = await page.getTextContent()
      pages.push(pdfTextLines(items.filter(item => 'str' in item)))
      page.cleanup()
    }
    return pages.join('\n')
  } finally {
    await task.destroy()
  }
}
