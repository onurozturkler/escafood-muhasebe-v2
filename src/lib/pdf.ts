'use client'

import { PDFDocument, rgb, PageSizes } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { NOTO_REGULAR } from './font_regular'
import { NOTO_BOLD } from './font_bold'
import { para, tarih, tahsilatTuruLabel } from './format'

const RED   = rgb(0.86, 0.12, 0.12)
const BLUE  = rgb(0.05, 0.31, 0.55)
const GREEN = rgb(0.16, 0.39, 0.16)
const BLACK = rgb(0.12, 0.12, 0.12)
const GRAY  = rgb(0.48, 0.48, 0.48)
const DGRAY = rgb(0.28, 0.28, 0.28)
const WHITE = rgb(1, 1, 1)
const LGRAY = rgb(0.96, 0.96, 0.96)
const BORDER = rgb(0.82, 0.82, 0.82)
const SOFT_RED = rgb(0.99, 0.94, 0.94)
const SOFT_BLUE = rgb(0.94, 0.97, 1)
const SOFT_GREEN = rgb(0.94, 0.98, 0.94)

// A4: 595 x 842 pt
const PAGE_W = 595
const PAGE_H = 842
const MARGIN_X = 14
const FOOTER_Y = 18
const FOOTER_SAFE_Y = 44

// İstenen logo ölçüsü
const LOGO_W = 92
const LOGO_H = 136
const LOGO_X = 10
const LOGO_Y = PAGE_H - 10 - LOGO_H

const HEADER_BOTTOM_Y = LOGO_Y - 18
const CONTENT_START_Y = HEADER_BOTTOM_Y - 16

const FONT_SIZE = 8
const LINE_H = 10

type Align = 'left' | 'right' | 'center'
type Col = { header: string; width: number; align?: Align }
type PdfCtx = {
  doc: PDFDocument
  regular: any
  bold: any
  logo: any
  title: string
  accent: any
}
type Cursor = { page: any; y: number }

type InfoRow = {
  label: string
  value: string
  labelW?: number
  valueAlign?: Align
  boldValue?: boolean
  noWrap?: boolean
}

function b64toBytes(b64: string): Uint8Array {
  const raw = b64.includes(',') ? b64.split(',')[1] : b64
  const bin = atob(raw)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return arr
}

async function fetchLogo(doc: PDFDocument): Promise<any> {
  try {
    const res = await fetch('/logo-pdf.jpg')
    const buf = await res.arrayBuffer()
    const bytes = new Uint8Array(buf)
    return bytes[0] === 0xff && bytes[1] === 0xd8
      ? await doc.embedJpg(bytes)
      : await doc.embedPng(bytes)
  } catch (e) {
    console.warn('Logo yüklenemedi:', e)
    return null
  }
}

async function createDoc(title: string, accent: any): Promise<PdfCtx> {
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  const regular = await doc.embedFont(b64toBytes(NOTO_REGULAR))
  const bold = await doc.embedFont(b64toBytes(NOTO_BOLD))
  const logo = await fetchLogo(doc)
  return { doc, regular, bold, logo, title, accent }
}

function val(...items: any[]): any {
  for (const item of items) {
    if (item !== undefined && item !== null && item !== '') return item
  }
  return undefined
}

function money(n: any): string {
  const num = Number(n ?? 0)
  return `${para(Number.isFinite(num) ? num : 0)} TL`
}

function safeText(value: any, fallback = '-'): string {
  if (value === undefined || value === null || value === '') return fallback
  return String(value)
}

function textWidth(font: any, text: string, size: number): number {
  return font.widthOfTextAtSize(text, size)
}

// Tüm hücreler ve bilgi kutuları için ortak wrapText.
function charLimitForWidth(size: number, maxWidth: number): number {
  // pdf-lib font ölçümü, gömülü fontlarda bazen ekrandaki gerçek çizimden iyimser kalıyor.
  // Bu yüzden sadece widthOfTextAtSize'a güvenmiyoruz; karakter sayısıyla da sert limit koyuyoruz.
  return Math.max(8, Math.floor(maxWidth / (size * 0.92)))
}

function hardSplitByCharLimit(text: string, maxChars: number): string[] {
  if (!maxChars || text.length <= maxChars) return [text]

  const out: string[] = []
  let rest = text.trim()

  while (rest.length > maxChars) {
    let cut = rest.lastIndexOf(' ', maxChars)
    if (cut < Math.floor(maxChars * 0.55)) cut = maxChars
    out.push(rest.slice(0, cut).trim())
    rest = rest.slice(cut).trim()
  }

  if (rest) out.push(rest)
  return out.length ? out : ['']
}

// Tüm hücreler ve bilgi kutuları için ortak wrapText.
// Önemli: Ürün adı gibi kolonlarda hem font genişliği hem karakter limiti kullanılır.
function wrapText(text: string, font: any, size: number, maxWidth: number, maxChars?: number): string[] {
  const clean = safeText(text, '').replace(/\s+/g, ' ').trim()
  if (!clean) return ['']

  const hardMax = maxChars ?? charLimitForWidth(size, maxWidth)
  const words = clean.split(' ')
  const lines: string[] = []
  let current = ''

  const canFit = (value: string) => {
    return value.length <= hardMax && textWidth(font, value, size) <= maxWidth * 0.76
  }

  for (const word of words) {
    const test = current ? `${current} ${word}` : word

    if (canFit(test)) {
      current = test
      continue
    }

    if (current) {
      lines.push(...hardSplitByCharLimit(current, hardMax))
      current = ''
    }

    if (!canFit(word)) {
      const parts = hardSplitByCharLimit(word, hardMax)
      for (const part of parts) {
        if (canFit(part)) {
          if (current) lines.push(current)
          current = part
        } else {
          let piece = ''
          for (const ch of part) {
            const next = piece + ch
            if (canFit(next)) {
              piece = next
            } else {
              if (piece) lines.push(piece)
              piece = ch
            }
          }
          current = piece
        }
      }
    } else {
      current = word
    }
  }

  if (current) lines.push(...hardSplitByCharLimit(current, hardMax))
  return lines.length ? lines : ['']
}

function drawTextAligned(
  page: any,
  text: string,
  x: number,
  y: number,
  width: number,
  size: number,
  font: any,
  color: any,
  align: Align = 'left'
) {
  const tw = textWidth(font, text, size)
  const tx = align === 'right' ? x + width - tw : align === 'center' ? x + (width - tw) / 2 : x
  page.drawText(text, { x: tx, y, size, font, color })
}

function drawHeader(ctx: PdfCtx, page: any): number {
  const { regular, bold, logo, title, accent } = ctx
  const { width } = page.getSize()

  if (logo) {
    const dims = logo.scaleToFit(LOGO_W, LOGO_H)
    page.drawImage(logo, {
      x: LOGO_X,
      y: LOGO_Y + (LOGO_H - dims.height),
      width: dims.width,
      height: dims.height,
    })
  }

  const companyX = LOGO_X + LOGO_W + 12
  const companyTop = LOGO_Y + LOGO_H - 10
  const companyW = 270

  page.drawText('ESCA FOOD GIDA ', {
    x: companyX,
    y: companyTop - 19,
    size: 16.5,
    font: bold,
    color: BLACK,
  })

  page.drawText('DIŞ TİCARET SANAYİ A.Ş.', {
    x: companyX,
    y: companyTop - 32,
    size: 11.5,
    font: bold,
    color: BLACK,
  })

  const companyLines = [
    'Yeni Bağlıca Mah. Etimesgut Blvd. No: 6H',
    'Etimesgut / ANKARA',
    'Vergi No: 3770983099  -  Etimesgut V.D.',
    'www.esca-food.com',
  ]

  let cy = companyTop - 42
  for (const line of companyLines) {
    const wrapped = wrapText(line, regular, 7.2, companyW)
    for (const w of wrapped) {
      page.drawText(w, { x: companyX, y: cy, size: 7.2, font: regular, color: GRAY })
      cy -= 9
    }
  }

  // Sağ üst doküman kutusu: fatura/teklif formatı hissi verir.
  const boxW = 168
  const boxH = 64
  const boxX = width - MARGIN_X - boxW
  const boxY = PAGE_H - 22 - boxH
  page.drawRectangle({ x: boxX, y: boxY, width: boxW, height: boxH, color: WHITE, borderColor: accent, borderWidth: 1 })
  page.drawRectangle({ x: boxX, y: boxY + boxH - 18, width: boxW, height: 18, color: accent })
  drawTextAligned(page, title, boxX, boxY + boxH - 13, boxW, 10, bold, WHITE, 'center')

  page.drawLine({ start: { x: MARGIN_X, y: HEADER_BOTTOM_Y }, end: { x: width - MARGIN_X, y: HEADER_BOTTOM_Y }, thickness: 0.8, color: accent })
  return CONTENT_START_Y
}

function addPage(ctx: PdfCtx): Cursor {
  const page = ctx.doc.addPage(PageSizes.A4)
  const y = drawHeader(ctx, page)
  return { page, y }
}

function ensureSpace(ctx: PdfCtx, cursor: Cursor, neededHeight: number): Cursor {
  if (cursor.y - neededHeight < FOOTER_SAFE_Y) return addPage(ctx)
  return cursor
}

function drawFooterAll(ctx: PdfCtx) {
  const pages = ctx.doc.getPages()
  const total = pages.length
  pages.forEach((page, index) => {
    const { width } = page.getSize()
    page.drawLine({ start: { x: MARGIN_X, y: 32 }, end: { x: width - MARGIN_X, y: 32 }, thickness: 0.3, color: BORDER })
    page.drawText(`Sayfa ${index + 1} / ${total}`, { x: MARGIN_X, y: FOOTER_Y, size: 7, font: ctx.regular, color: GRAY })
    const site = 'www.escafood.com.tr'
    page.drawText(site, { x: width - MARGIN_X - textWidth(ctx.regular, site, 7), y: FOOTER_Y, size: 7, font: ctx.regular, color: GRAY })
  })
}

function drawInfoBox(
  ctx: PdfCtx,
  cursor: Cursor,
  title: string,
  rows: InfoRow[],
  x: number,
  y: number,
  width: number,
  titleColor: any,
  fillColor = LGRAY
): number {
  const { page } = cursor
  const pad = 7
  const labelWDefault = 70
  const rowGap = 3
  let contentH = 0

  const prepared = rows.map(row => {
    const labelW = row.labelW ?? labelWDefault
    const valueW = width - pad * 2 - labelW - 6
    const font = row.boldValue ? ctx.bold : ctx.regular
    const valueLines = row.noWrap
  ? [safeText(row.value)]
  : wrapText(row.value, font, 8, valueW)
    const rowH = Math.max(12, valueLines.length * 9 + 2)
    contentH += rowH + rowGap
    return { ...row, labelW, valueW, valueLines, rowH, font }
  })

  const boxH = 20 + contentH + pad
  page.drawRectangle({ x, y: y - boxH, width, height: boxH, color: WHITE, borderColor: BORDER, borderWidth: 0.6 })
  page.drawRectangle({ x, y: y - 18, width, height: 18, color: titleColor })
  const titleSize = title === 'TAHSİLAT MAKBUZU' ? 12 : 8.5
const titleW = ctx.bold.widthOfTextAtSize(title, titleSize)

page.drawText(title, {
  x: title === 'TAHSİLAT MAKBUZU'
    ? x + (width - titleW) / 2
    : x + pad,
  y: title === 'TAHSİLAT MAKBUZU'
    ? y - 13.5
    : y - 12.5,
  size: titleSize,
  font: ctx.bold,
  color: WHITE,
})

  let ry = y - 29
  for (const row of prepared) {
    page.drawRectangle({ x: x + pad, y: ry - row.rowH + 4, width: width - pad * 2, height: row.rowH, color: fillColor })
    page.drawText(row.label, { x: x + pad + 4, y: ry - 5, size: 7.6, font: ctx.bold, color: GRAY })
    let vy = ry - 5
    for (const line of row.valueLines) {
      drawTextAligned(page, line, x + pad + row.labelW + 6, vy, row.valueW, 7.8, row.font, BLACK, row.valueAlign ?? 'left')
      vy -= 9
    }
    ry -= row.rowH + rowGap
  }

  return y - boxH
}

function drawTableHeader(page: any, ctx: PdfCtx, y: number, cols: Col[], headerColor: any): number {
  const x0 = MARGIN_X
  const tableW = cols.reduce((sum, col) => sum + col.width, 0)
  const hdrH = 18
  page.drawRectangle({ x: x0, y: y - hdrH, width: tableW, height: hdrH, color: headerColor })

  let cx = x0
  for (const col of cols) {
    drawTextAligned(page, col.header, cx + 5, y - 12, col.width - 10, 7.6, ctx.bold, WHITE, col.align ?? 'left')
    cx += col.width
  }
  return y - hdrH
}

function drawTable(ctx: PdfCtx, cursor: Cursor, cols: Col[], rows: string[][], headerColor: any): Cursor {
  const x0 = MARGIN_X
  const pad = 5
  const rowPad = 5
  const lineH = LINE_H
  const tableW = cols.reduce((sum, col) => sum + col.width, 0)

  cursor = ensureSpace(ctx, cursor, 36)
  cursor.y = drawTableHeader(cursor.page, ctx, cursor.y, cols, headerColor)

  rows.forEach((row, ri) => {
    const wrapped = cols.map((col, ci) => {
  const txt = safeText(row[ci], '').replace(/\s+/g, ' ').trim()
  const usableW = col.width - pad * 2 - 8

  // Barkod, fiyat, miktar, toplam gibi sayısal alanlarda wrap yapma.
  // Bunlar tek satır kalmalı.
  if (
    col.header === 'Sıra' ||
    col.header === 'Barkod' ||
    col.header === 'Birim Fiyat' ||
    col.header === 'Miktar' ||
    col.header === 'Toplam'
  ) {
    return [txt]
  }

  // Sadece Ürün Adı wrap yapsın.
  return wrapText(txt, ctx.regular, FONT_SIZE, usableW, 26)
})
    const maxLines = Math.max(...wrapped.map(w => w.length), 1)
    const rowH = maxLines * lineH + rowPad * 2

    cursor = ensureSpace(ctx, cursor, rowH + 24)
    if (cursor.y === CONTENT_START_Y) cursor.y = drawTableHeader(cursor.page, ctx, cursor.y, cols, headerColor)

    const bg = ri % 2 === 0 ? LGRAY : WHITE
    cursor.page.drawRectangle({ x: x0, y: cursor.y - rowH, width: tableW, height: rowH, color: bg, borderColor: BORDER, borderWidth: 0.25 })

    let cx = x0
    cols.forEach((col, ci) => {
      cursor.page.drawLine({ start: { x: cx, y: cursor.y }, end: { x: cx, y: cursor.y - rowH }, thickness: 0.25, color: BORDER })
      wrapped[ci].forEach((line, li) => {
        const ty = cursor.y - rowPad - lineH * li - 8
        drawTextAligned(cursor.page, line, cx + pad, ty, col.width - pad * 2 - 8, FONT_SIZE, ctx.regular, BLACK, col.align ?? 'left')
      })
      cx += col.width
    })
    cursor.page.drawLine({ start: { x: x0 + tableW, y: cursor.y }, end: { x: x0 + tableW, y: cursor.y - rowH }, thickness: 0.25, color: BORDER })

    cursor.y -= rowH
  })

  return { page: cursor.page, y: cursor.y - 8 }
}

function drawTotals(ctx: PdfCtx, cursor: Cursor, rows: { label: string; value: string; accent?: boolean }[], color: any): Cursor {
  const boxW = 210
  const rowH = 18
  const boxH = rows.length * rowH + 8
  cursor = ensureSpace(ctx, cursor, boxH + 8)

  const x = PAGE_W - MARGIN_X - boxW
  let y = cursor.y

  cursor.page.drawRectangle({ x, y: y - boxH, width: boxW, height: boxH, color: WHITE, borderColor: BORDER, borderWidth: 0.6 })
  y -= 7

  for (const row of rows) {
    const bg = row.accent ? color : LGRAY
    const txtColor = row.accent ? WHITE : BLACK
    cursor.page.drawRectangle({ x: x + 5, y: y - rowH + 5, width: boxW - 10, height: rowH, color: bg })
    cursor.page.drawText(row.label, { x: x + 10, y: y - 7, size: row.accent ? 9 : 8, font: row.accent ? ctx.bold : ctx.regular, color: txtColor })
    drawTextAligned(cursor.page, row.value, x + 90, y - 7, boxW - 105, row.accent ? 9 : 8, ctx.bold, txtColor, 'right')
    y -= rowH
  }

  return { page: cursor.page, y: cursor.y - boxH - 10 }
}

function drawNote(ctx: PdfCtx, cursor: Cursor, note: string, color = LGRAY): Cursor {
  const clean = safeText(note, '')
  if (!clean) return cursor

  const width = PAGE_W - MARGIN_X * 2
  const lines = wrapText(clean, ctx.regular, 8, width - 18)
  const h = Math.max(30, lines.length * 10 + 18)
  cursor = ensureSpace(ctx, cursor, h + 8)

  cursor.page.drawRectangle({ x: MARGIN_X, y: cursor.y - h, width, height: h, color, borderColor: BORDER, borderWidth: 0.5 })
  cursor.page.drawText('Not / Açıklama', { x: MARGIN_X + 8, y: cursor.y - 12, size: 8, font: ctx.bold, color: GRAY })
  let y = cursor.y - 24
  for (const line of lines) {
    cursor.page.drawText(line, { x: MARGIN_X + 8, y, size: 8, font: ctx.regular, color: BLACK })
    y -= 10
  }

  return { page: cursor.page, y: cursor.y - h - 8 }
}

function downloadPDF(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function teklifPDF(teklif: any, musteri: any, kalemler: any[] = []) {
  const teklifNo = safeText(val(teklif?.teklif_no, teklif?.teklifNo, teklif?.no), '000000')
  const ctx = await createDoc(`TEKLİF #${teklifNo}`, BLUE)
  let cursor = addPage(ctx)

  const belgeRows: InfoRow[] = [
    { label: 'Belge No', value: teklifNo, boldValue: true },
    { label: 'Tarih', value: tarih(val(teklif?.tarih, teklif?.createdAt, Date.now())) },
    { label: 'Durum', value: teklif?.iptal ? 'İptal Edildi' : 'Geçerli' },
  ]

  const musteriRows: InfoRow[] = [
    { label: 'Müşteri', value: safeText(val(musteri?.musteri_adi, musteri?.musteriAdi, teklif?.musteri_adi, teklif?.musteriAdi)), boldValue: true },
    { label: 'Adres', value: safeText(musteri?.adres) },
    { label: 'Telefon', value: safeText(val(musteri?.telefon, musteri?.tel, musteri?.gsm)) },
    { label: 'Vergi', value: safeText(val(musteri?.vergi_no, musteri?.vergiNo, musteri?.vergi_dairesi, musteri?.vergiDairesi)) },
  ]

  const leftX = MARGIN_X
  const rightW = 178
  const gap = 10
  const leftW = PAGE_W - MARGIN_X * 2 - rightW - gap
  const topY = cursor.y

  const leftBottom = drawInfoBox(ctx, cursor, 'MÜŞTERİ BİLGİLERİ', musteriRows, leftX, topY, leftW, BLUE, SOFT_BLUE)
  const rightBottom = drawInfoBox(ctx, cursor, 'BELGE BİLGİLERİ', belgeRows, leftX + leftW + gap, topY, rightW, BLUE, SOFT_BLUE)
  cursor.y = Math.min(leftBottom, rightBottom) - 12

  const cols: Col[] = [
    { header: 'Sıra', width: 34, align: 'center' },
    { header: 'Ürün Adı', width: 205 },
    { header: 'Barkod', width: 96, align: 'center' },
    { header: 'Birim Fiyat', width: 82, align: 'right' },
    { header: 'Miktar', width: 58, align: 'right' },
    { header: 'Toplam', width: 92, align: 'right' },
  ]

  const rows = kalemler.map((k, index) => {
    const birim = Number(val(k?.birim_fiyat, k?.birimFiyat, k?.fiyat, 0))
    const miktar = Number(val(k?.miktar, k?.adet, 0))
    const toplam = Number(val(k?.toplam, k?.toplamTutar, birim * miktar))
    return [
      String(index + 1),
      safeText(val(k?.urun_adi, k?.urunAdi, k?.ad, k?.name)),
      safeText(k?.barkod),
      money(birim),
      safeText(miktar),
      money(toplam),
    ]
  })

  cursor = drawTable(ctx, cursor, cols, rows.length ? rows : [['-', 'Ürün bulunamadı', '-', '-', '-', '-']], BLUE)

  const araToplam = Number(val(teklif?.ara_toplam, teklif?.araToplam, teklif?.toplamTutar, rows.reduce((s, r) => s + 0, 0), 0))
  const iskontoOrani = Number(val(teklif?.iskonto_orani, teklif?.iskontoOrani, 0))
  const iskontoTutar = Number(val(teklif?.iskonto_tutar, teklif?.iskontoTutar, 0))
  const genelToplam = Number(val(teklif?.genel_toplam, teklif?.genelToplam, teklif?.toplamTutar, araToplam - iskontoTutar, 0))

  const totals = [
    { label: 'Ara Toplam', value: money(araToplam) },
    ...(iskontoOrani > 0 || iskontoTutar > 0 ? [{ label: `İskonto${iskontoOrani > 0 ? ` (%${iskontoOrani})` : ''}`, value: `- ${money(iskontoTutar)}` }] : []),
    { label: 'GENEL TOPLAM', value: money(genelToplam), accent: true },
  ]
  cursor = drawTotals(ctx, cursor, totals, RED)
  cursor = drawNote(ctx, cursor, safeText(val(teklif?.notlar, teklif?.not, teklif?.aciklama), ''), SOFT_BLUE)

  drawFooterAll(ctx)
  downloadPDF(await ctx.doc.save(), `Teklif_${teklifNo}.pdf`)
}

export async function tahsilatPDF(tahsilat: any, musteri: any) {
  const tahsilatNo = safeText(val(tahsilat?.tahsilat_no, tahsilat?.tahsilatNo, tahsilat?.no), '000000')
  const ctx = await createDoc(`TAHSİLAT #${tahsilatNo}`, BLUE)
  let cursor = addPage(ctx)

  const rows: InfoRow[] = [
    { label: 'Makbuz No', value: tahsilatNo, boldValue: true },
    { label: 'Tarih', value: tarih(val(tahsilat?.tarih, Date.now())) },
    { label: 'Müşteri', value: safeText(val(musteri?.musteri_adi, musteri?.musteriAdi)), boldValue: true },
    { label: 'Adres', value: safeText(musteri?.adres) },
    { label: 'Tahsilat Türü', value: tahsilatTuruLabel?.[tahsilat?.tahsilat_turu] ?? safeText(val(tahsilat?.tahsilat_turu, tahsilat?.tahsilatTuru)) },
    { label: 'Tutar', value: money(tahsilat?.tutar), valueAlign: 'left', boldValue: true },
    { label: 'Açıklama', value: safeText(tahsilat?.aciklama) },
  ]

  cursor.y = drawInfoBox(ctx, cursor, 'TAHSİLAT MAKBUZU', rows, MARGIN_X, cursor.y, PAGE_W - MARGIN_X * 2, BLUE, SOFT_BLUE) - 18

  cursor = ensureSpace(ctx, cursor, 42)
  cursor.page.drawRectangle({ x: MARGIN_X, y: cursor.y - 36, width: PAGE_W - MARGIN_X * 2, height: 36, color: BLUE })
  const txt = `TAHSİL EDİLEN TUTAR: ${money(tahsilat?.tutar)}`
  drawTextAligned(cursor.page, txt, MARGIN_X, cursor.y - 22, PAGE_W - MARGIN_X * 2, 13, ctx.bold, WHITE, 'center')

  drawFooterAll(ctx)
  downloadPDF(await ctx.doc.save(), `Tahsilat_${tahsilatNo}.pdf`)
}

export async function ekstrePDF(musteri: any, hareketler: any[] = []) {
  const ctx = await createDoc('CARİ HESAP EKSTRESİ', GREEN)
  let cursor = addPage(ctx)

  const aktif = hareketler.filter(h => !h?.iptal)
  const musteriAdi = safeText(val(musteri?.musteri_adi, musteri?.musteriAdi, musteri?.ad), 'Musteri')

  const ozetRows: InfoRow[] = [
    { label: 'Müşteri', value: musteriAdi, boldValue: true },
    { label: 'Adres', value: safeText(musteri?.adres) },
    { label: 'Açılış Bakiyesi', value: money(val(musteri?.acilis_bakiyesi, musteri?.acilisBakiyesi, 0)), valueAlign: 'right' },
    { label: 'Toplam Borç', value: money(val(musteri?.toplam_borc, musteri?.toplamBorc, 0)), valueAlign: 'right' },
    { label: 'Tahsilat', value: money(val(musteri?.toplam_tahsilat, musteri?.toplamTahsilat, 0)), valueAlign: 'right' },
    { label: 'Bakiye', value: money(val(musteri?.bakiye, musteri?.carihesap, 0)), valueAlign: 'right', boldValue: true },
  ]

  cursor.y = drawInfoBox(ctx, cursor, 'CARİ ÖZET', ozetRows, MARGIN_X, cursor.y, PAGE_W - MARGIN_X * 2, GREEN, SOFT_GREEN) - 12

  const cols: Col[] = [
    { header: 'Tarih', width: 68, align: 'center' },
    { header: 'Belge No', width: 82, align: 'center' },
    { header: 'Tür', width: 68, align: 'center' },
    { header: 'Açıklama', width: 154 },
    { header: 'Tutar', width: 90, align: 'right' },
    { header: 'Bakiye', width: 105, align: 'right' },
  ]

  let kumBakiye = Number(val(musteri?.acilis_bakiyesi, musteri?.acilisBakiyesi, 0))
  const tableRows = aktif.map(h => {
    const tip = safeText(h?.tip)
    const tutar = Number(val(h?.tutar, h?.toplamTutar, 0))
    kumBakiye += tip === 'teklif' ? -tutar : tutar
    return [
      tarih(h?.tarih),
      safeText(val(h?.no, h?.belgeNo, h?.teklifNo, h?.tahsilatNo)),
      tip === 'teklif' ? 'Teklif' : 'Tahsilat',
      safeText(val(h?.aciklama, h?.not, '')),
      `${tip === 'teklif' ? '-' : '+'}${money(tutar)}`,
      money(kumBakiye),
    ]
  })

  cursor = drawTable(ctx, cursor, cols, tableRows.length ? tableRows : [['-', '-', '-', 'Kayıtlı hareket bulunamadı.', '-', '-']], GREEN)

  drawFooterAll(ctx)
  const bugun = new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')
  downloadPDF(await ctx.doc.save(), `Ekstre_${musteriAdi}_${bugun}.pdf`)
}
