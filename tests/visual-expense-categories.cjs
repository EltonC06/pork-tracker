/* eslint-disable @typescript-eslint/no-require-imports -- Local Node.js visual test harness uses CommonJS. */
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const http = require('node:http')
const root = path.resolve(__dirname, '..')
const out = path.join(os.tmpdir(), 'pork-expense-categories-visual')
const { chromium } = require('C:/Users/elton/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const webpack = require(path.join(root, 'node_modules/next/dist/compiled/webpack/webpack'))

fs.mkdirSync(out, { recursive: true })
const loader = path.join(out, 'loader.cjs')
fs.writeFileSync(loader, `const ts = require(${JSON.stringify(path.join(root, 'node_modules/typescript'))});
module.exports = function(source) {
  if (this.resourcePath.replaceAll('\\\\', '/').includes('/app/actions/expense-categories.ts')) {
    return 'export async function createExpenseCategory(){ throw new Error("Mutations disabled"); } export async function setExpenseCategoryActive(){ throw new Error("Mutations disabled"); }';
  }
  if (this.resourcePath.replaceAll('\\\\', '/').includes('/app/actions/transactions.ts')) {
    return 'export async function createTransaction(){ throw new Error("Mutations disabled"); }';
  }
  return ts.transpileModule(source, {compilerOptions: {jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020}}).outputText;
};`)
fs.writeFileSync(path.join(out, 'next-link.js'), 'import React from "react"; export default function Link({href, children, ...props}) { return <a href={href} {...props}>{children}</a> }')
fs.writeFileSync(path.join(out, 'entry.tsx'), `import React from 'react';
import { createRoot } from 'react-dom/client';
import CategoriesClient from '@/app/dashboard/categories/CategoriesClient';
import QuickAddFab from '@/components/ui/QuickAddFab';
const categories = [
  {id:'food', user_id:'demo', name:'Alimentação', normalized_name:'alimentação', is_default:true, active:true, created_at:''},
  {id:'housing', user_id:'demo', name:'Moradia', normalized_name:'moradia', is_default:true, active:true, created_at:''},
  {id:'travel', user_id:'demo', name:'Transporte', normalized_name:'transporte', is_default:true, active:true, created_at:''},
  {id:'pets', user_id:'demo', name:'Cuidados com animais de estimação e alimentação especial', normalized_name:'pets', is_default:false, active:true, created_at:''},
  {id:'old', user_id:'demo', name:'Categoria inativa', normalized_name:'old', is_default:false, active:false, created_at:''},
];
const expenses = [
  {category_id:'food', category:'Alimentação', amount:345.78, date:'2026-10-24'},
  {category_id:'housing', category:'Moradia', amount:1800, date:'2026-10-05'},
  {category_id:'travel', category:'Transporte', amount:120.55, date:'2026-10-22'},
  {category_id:'pets', category:'Cuidados com animais de estimação e alimentação especial', amount:80, date:'2026-10-20'},
  {category_id:null, category:null, amount:15.9, date:'2026-10-21'},
  {category_id:'old', category:'Categoria inativa', amount:10, date:'2026-09-15'},
];
createRoot(document.getElementById('root')).render(<><CategoriesClient categories={categories} expenses={expenses} todayDate="2026-10-25" /><QuickAddFab accounts={[{id:'demo',name:'Conta principal',icon:'🏦',color:null}]} categories={categories} /></>);
`)
fs.writeFileSync(path.join(out, 'index.html'), '<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="style.css"></head><body><main class="main-content" style="margin-left:0"><div id="root"></div></main><script src="bundle.js"></script></body></html>')

async function main() {
  const postcss = require(path.join(root, 'node_modules/postcss'))
  const tailwind = require(path.join(root, 'node_modules/@tailwindcss/postcss/dist/index.js'))
  const css = await postcss([tailwind({ base: root })]).process(fs.readFileSync(path.join(root, 'src/app/globals.css'), 'utf8'), { from: path.join(root, 'src/app/globals.css') })
  fs.writeFileSync(path.join(out, 'style.css'), css.css)
  await new Promise((resolve, reject) => webpack.webpack({
    mode: 'development',
    entry: path.join(out, 'entry.tsx'),
    output: { path: out, filename: 'bundle.js' },
    devtool: false,
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
      modules: [path.join(root, 'node_modules')],
      alias: { '@': path.join(root, 'src'), 'next/link': path.join(out, 'next-link.js') },
    },
    module: { rules: [{ test: /\.(tsx?|js)$/, exclude: /node_modules/, use: loader }] },
    performance: { hints: false },
  }, (error, stats) => error || stats.hasErrors() ? reject(error || new Error(stats.toString({ all: false, errors: true }))) : resolve()))

  const server = http.createServer((request, response) => {
    const name = path.basename(new URL(request.url, 'http://localhost').pathname)
    const file = path.join(out, name && name !== '.' ? name : 'index.html')
    if (!fs.existsSync(file)) return response.writeHead(404).end()
    response.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html')
    response.end(fs.readFileSync(file))
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.route('**/fonts.googleapis.com/**', route => route.abort())
  try {
    for (const width of [320, 360, 390, 430, 768, 1024, 1440]) {
      for (const height of width <= 430 ? [430, 844] : [844]) {
        await page.setViewportSize({ width, height })
        await page.goto('http://127.0.0.1:' + server.address().port + '/')
        await page.getByRole('heading', { name: 'Categorias de despesas' }).waitFor()
        const dimensions = await page.evaluate(() => ({
          viewport: document.documentElement.clientWidth,
          scroll: document.documentElement.scrollWidth,
        }))
        if (dimensions.scroll > dimensions.viewport + 1) errors.push(`Overflow at ${width}x${height}: ${dimensions.scroll}`)
        await page.getByRole('button', { name: 'Esta semana' }).click()
        await page.getByRole('combobox', { name: 'Categoria da evolução mensal' }).selectOption('food')
        if (width === 390 && height === 844) await page.screenshot({ path: path.join(out, 'categories-mobile.png'), fullPage: true })
        if (width === 1024) await page.screenshot({ path: path.join(out, 'categories-desktop.png'), fullPage: true })
        await page.getByRole('button', { name: 'Adicionar lançamento rápido' }).click()
        await page.locator('#quick-add-category').selectOption('food')
        await page.getByRole('button', { name: 'Salvar', exact: true }).scrollIntoViewIfNeeded()
        const modal = await page.locator('.modal-content').evaluate(element => {
          const rect = element.getBoundingClientRect()
          const overflowing = [...element.querySelectorAll('*')].map(child => ({ tag: child.tagName, id: child.id, text: child.textContent?.trim().slice(0, 30), right: child.getBoundingClientRect().right })).filter(child => child.right > rect.right - 16).slice(0, 8)
          return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, scroll: element.scrollWidth, width: element.clientWidth, overflowing }
        })
        if (modal.left < -1 || modal.right > width + 1 || modal.top < -1 || modal.bottom > height + 1 || modal.scroll > modal.width + 1) {
          errors.push(`Modal overflow at ${width}x${height}: ${JSON.stringify(modal)}`)
        }
        if (width === 390 && height === 430) await page.screenshot({ path: path.join(out, 'quick-add-short.png') })
        await page.getByRole('button', { name: 'Fechar' }).click()
      }
    }
  } finally {
    await browser.close()
    server.close()
  }
  if (errors.length) throw new Error(errors.join('\n'))
  console.log('Expense category visual checks passed at 320, 360, 390, 430, 768, 1024 and 1440 px, including 430 px-high viewports.')
  console.log(out)
}

main().catch(error => { console.error(error); process.exitCode = 1 })
