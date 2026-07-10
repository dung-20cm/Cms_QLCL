import PptxGenJS from 'pptxgenjs'

// Xuat bao cao Anh 5S ra file .pptx -- phong theo bo cuc/mau sac cua
// 5S_Dashboard_BVTB_v4.html (ham exportAnh5SPPT), co bo sung them trang muc luc,
// hinh khoi trang tri (circle overlay) va trang ket o cuoi cho sinh dong hon.
// Luu y: thu vien pptxgenjs (ban goc dung o file mau, v3.12.0) khong ho tro
// hieu ung chuyen canh (slide transition) o muc API cong khai -- da xac nhan qua
// issue chinh thuc cua thu vien -- nen phan "sinh dong hoa" tap trung vao layout,
// mau sac, hinh khoi trang tri thay vi transition.

export interface Anh5SPptRecord {
  khoa: string
  vitri: string
  ngay: string // yyyy-mm-dd hoac ''
  nguoi: string
  pct: number
  tagLabel: string // vd "✓ ĐẠT TỐT", "Đạt tốt", "Chưa đạt"...
  photos: { url: string; name: string }[]
}

// Bang mau nhan dien (dong bo brand navy dung trong Sidebar: #1B3A5C / teal #1D9E75)
const B = {
  primary: '1B3A5C',
  light: '2E6DA4',
  dark: '0F2740',
  accent: 'D6E8F8',
  white: 'FFFFFF',
  offW: 'F4F8FD',
  ok: '1D9E75',
  okLt: 'D4EDDA',
  fail: 'B02020',
  failLt: 'FAE0E0',
  gray1: '444444',
  gray2: '777777',
  gray3: 'BBBBBB',
}

const isPass = (r: Anh5SPptRecord) => r.pct >= 60
const fmtD = (n: string) => {
  if (!n) return ''
  const d = n.split('-')
  return d.length === 3 ? `${d[2]}/${d[1]}/${d[0]}` : n
}
const mkShadow = () => ({ type: 'outer' as const, color: '000000', blur: 5, offset: 2, angle: 45, opacity: 0.12 })

export async function exportAnh5SPpt(records: Anh5SPptRecord[], dateRangeLabel: string): Promise<void> {
  const baseData = records.filter((r) => r.photos.length > 0)
  if (!baseData.length) throw new Error('Không có ảnh phù hợp để xuất PPT.')

  const khdatData = baseData.filter((r) => !isPass(r))
  const datData = baseData.filter((r) => isPass(r))
  const khdatVitri = [...new Set(khdatData.map((r) => r.vitri || '—'))].sort()
  const datVitri = [...new Set(datData.map((r) => r.vitri || '—'))].sort()

  const today = new Date()
  const todayStr = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`

  const pres = new PptxGenJS()
  pres.layout = 'LAYOUT_16x9'
  pres.title = 'Báo cáo Ảnh 5S'

  // ── Helper: badge "5S" thay cho logo ảnh (tự vẽ bằng shape, không cần asset ngoài) ──
  function addBrandBadge(sl: PptxGenJS.Slide, x: number, y: number, size: number, dark = false) {
    sl.addShape(pres.ShapeType.roundRect, {
      x, y, w: size, h: size, rectRadius: size * 0.22,
      fill: { color: dark ? B.primary : B.white },
      line: { color: dark ? B.white : B.primary, width: 1 },
    })
    sl.addText('5S', {
      x, y, w: size, h: size, align: 'center', valign: 'middle',
      fontSize: size * 24, bold: true, color: dark ? B.white : B.primary, fontFace: 'Arial', margin: 0,
    })
  }

  // ── Helper: header dải màu ở đầu trang nội dung ──
  function addBrandHeader(sl: PptxGenJS.Slide, title: string, subtitle?: string, bgColor?: string) {
    const bg = bgColor || B.primary
    sl.background = { color: B.offW }
    sl.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.72, fill: { color: bg } })
    addBrandBadge(sl, 0.12, 0.07, 0.58)
    sl.addText(title, { x: 0.82, y: 0.1, w: 8.5, h: 0.34, fontSize: 14, bold: true, color: B.white, fontFace: 'Arial', margin: 0 })
    if (subtitle) sl.addText(subtitle, { x: 0.82, y: 0.42, w: 8.5, h: 0.24, fontSize: 9.5, color: 'BDD7EE', fontFace: 'Arial', margin: 0 })
  }

  function addFooter(sl: PptxGenJS.Slide) {
    sl.addText(`Bệnh viện Đa khoa Thái Bình  ·  Phòng Quản lý Chất lượng  ·  ${todayStr}`, {
      x: 0.3, y: 5.44, w: 9.4, h: 0.17, fontSize: 7.5, color: B.gray3, fontFace: 'Arial', align: 'center', margin: 0,
    })
  }

  // Hình khối trang trí (circle mờ) cho các slide bìa/section -- tăng chiều sâu thị giác
  function addDecorCircles(sl: PptxGenJS.Slide, tint: string) {
    sl.addShape(pres.ShapeType.ellipse, { x: 7.6, y: -1.2, w: 4, h: 4, fill: { color: tint, transparency: 82 } })
    sl.addShape(pres.ShapeType.ellipse, { x: -1.4, y: 3.6, w: 3, h: 3, fill: { color: tint, transparency: 85 } })
    sl.addShape(pres.ShapeType.ellipse, { x: 8.6, y: 3.9, w: 2, h: 2, fill: { color: tint, transparency: 80 } })
  }

  const IMGS = [{ x: 0.14, y: 0.82 }, { x: 5.07, y: 0.82 }, { x: 0.14, y: 3.18 }, { x: 5.07, y: 3.18 }]
  const IW = 4.72, IH = 2.0, IH_CARD = 2.6

  function addPhotoGrid(sl: PptxGenJS.Slide, batch: { url: string; name: string; tag: string; pass: boolean; khoa: string; ngay: string; nguoi: string }[]) {
    batch.forEach((p, pi) => {
      const pos = IMGS[pi]
      sl.addShape(pres.ShapeType.roundRect, { x: pos.x, y: pos.y, w: IW, h: IH_CARD, fill: { color: B.white }, shadow: mkShadow(), rectRadius: 0.06 })
      sl.addImage({ path: p.url, x: pos.x + 0.05, y: pos.y + 0.04, w: IW - 0.1, h: IH, sizing: { type: 'cover', w: IW - 0.1, h: IH } })
      sl.addShape(pres.ShapeType.roundRect, { x: pos.x + 0.08, y: pos.y + 0.07, w: 0.95, h: 0.24, fill: { color: p.pass ? B.ok : B.fail }, rectRadius: 0.04 })
      sl.addText(p.tag || '—', { x: pos.x + 0.08, y: pos.y + 0.07, w: 0.95, h: 0.24, fontSize: 8, bold: true, color: B.white, align: 'center', fontFace: 'Arial', margin: 0 })
      sl.addText(`${fmtD(p.ngay)}  ·  ${p.nguoi}`, { x: pos.x + 0.05, y: pos.y + IH + 0.10, w: IW - 0.1, h: 0.25, fontSize: 8, color: B.gray1, fontFace: 'Arial', margin: 0 })
      sl.addText(p.khoa, { x: pos.x + 0.05, y: pos.y + IH + 0.34, w: IW - 0.1, h: 0.22, fontSize: 7.5, bold: true, color: B.primary, fontFace: 'Arial', margin: 0 })
    })
  }

  function addPhotoSlides(data: Anh5SPptRecord[], headerTitle: string, subLabel: string, bgColor: string) {
    const byKhoa: Record<string, ReturnType<typeof addPhotoGrid> extends never ? never : any[]> = {} as any
    data.forEach((r) => {
      r.photos.forEach((p) => {
        ;(byKhoa[r.khoa] ||= []).push({ url: p.url, name: p.name, tag: r.tagLabel, pass: isPass(r), khoa: r.khoa, ngay: r.ngay, nguoi: r.nguoi })
      })
    })
    const allP: any[] = []
    Object.keys(byKhoa).sort().forEach((k) => allP.push(...byKhoa[k]))
    for (let i = 0; i < allP.length; i += 4) {
      const batch = allP.slice(i, i + 4)
      const sl = pres.addSlide()
      addBrandHeader(sl, headerTitle, `${subLabel}  ·  Trang ${Math.floor(i / 4) + 1}/${Math.ceil(allP.length / 4)}`, bgColor)
      addPhotoGrid(sl, batch)
      addFooter(sl)
    }
  }

  // ================================================================
  // SLIDE 1 — BÌA
  // ================================================================
  const cover = pres.addSlide()
  cover.background = { color: B.primary }
  addDecorCircles(cover, B.white)
  addBrandBadge(cover, 0.5, 0.95, 2.3, false)
  cover.addShape(pres.ShapeType.line, { x: 3.2, y: 0.7, w: 0, h: 4.3, line: { color: '6FA8DC', width: 1 } })
  cover.addText('BỆNH VIỆN ĐA KHOA THÁI BÌNH', { x: 3.5, y: 0.85, w: 6.2, h: 0.5, fontSize: 15, bold: true, color: 'BDD7EE', fontFace: 'Arial', charSpacing: 2 })
  cover.addText('BÁO CÁO ẢNH 5S', { x: 3.5, y: 1.45, w: 6.2, h: 1.05, fontSize: 34, bold: true, color: B.white, fontFace: 'Arial' })
  cover.addText('Ảnh minh chứng đánh giá thực hành 5S', { x: 3.5, y: 2.55, w: 6.2, h: 0.45, fontSize: 15, color: '9DC3E6', fontFace: 'Arial', italic: true })

  const stats = [
    { label: 'Tổng lượt', val: String(baseData.length), c: B.white },
    { label: '❌ Chưa đạt', val: String(khdatData.length), c: 'FF9999' },
    { label: '✅ Đạt/Tốt', val: String(datData.length), c: '90EE90' },
  ]
  stats.forEach((s, i) => {
    const bx = 3.5 + i * 2.05
    cover.addShape(pres.ShapeType.roundRect, { x: bx, y: 3.2, w: 1.9, h: 1.1, fill: { color: B.white, transparency: 88 }, rectRadius: 0.08 })
    cover.addText(s.val, { x: bx, y: 3.23, w: 1.9, h: 0.62, fontSize: 26, bold: true, color: s.c, align: 'center', fontFace: 'Arial' })
    cover.addText(s.label, { x: bx, y: 3.83, w: 1.9, h: 0.3, fontSize: 11, color: '9DC3E6', align: 'center', fontFace: 'Arial' })
  })
  cover.addText(`Phòng Quản lý Chất lượng  ·  ${dateRangeLabel}`, { x: 3.5, y: 4.55, w: 6.2, h: 0.35, fontSize: 11, color: '6B8FA8', fontFace: 'Arial', italic: true })

  // ================================================================
  // SLIDE 2 — MỤC LỤC (thêm mới so với bản mẫu, cho sinh động/chuyên nghiệp hơn)
  // ================================================================
  const toc = pres.addSlide()
  toc.background = { color: B.offW }
  addBrandHeader(toc, 'NỘI DUNG BÁO CÁO', dateRangeLabel)
  const tocItems = [
    { n: '01', label: 'Tổng quan kết quả', color: B.primary },
    ...(khdatVitri.length > 0 ? [{ n: '02', label: `Các vị trí chưa đạt (${khdatVitri.length})`, color: B.fail }] : []),
    ...(datVitri.length > 0 ? [{ n: '03', label: `Các vị trí đạt / cải thiện (${datVitri.length})`, color: B.ok }] : []),
  ]
  tocItems.forEach((it, i) => {
    const ty = 1.3 + i * 0.95
    toc.addShape(pres.ShapeType.roundRect, { x: 0.6, y: ty, w: 8.8, h: 0.75, fill: { color: B.white }, shadow: mkShadow(), rectRadius: 0.08 })
    toc.addShape(pres.ShapeType.ellipse, { x: 0.8, y: ty + 0.13, w: 0.5, h: 0.5, fill: { color: it.color } })
    toc.addText(it.n, { x: 0.8, y: ty + 0.13, w: 0.5, h: 0.5, fontSize: 13, bold: true, color: B.white, align: 'center', valign: 'middle', fontFace: 'Arial', margin: 0 })
    toc.addText(it.label, { x: 1.55, y: ty, w: 7.5, h: 0.75, fontSize: 15, bold: true, color: B.gray1, valign: 'middle', fontFace: 'Arial', margin: 0 })
  })
  addFooter(toc)

  // ================================================================
  // SLIDE 3 — TỔNG QUAN
  // ================================================================
  const ov = pres.addSlide()
  addBrandHeader(ov, 'TỔNG QUAN KẾT QUẢ', `${baseData.length} lượt  ·  ${todayStr}`)
  const totalPhotos = baseData.reduce((s, r) => s + r.photos.length, 0)
  const kpis = [
    { label: 'Lượt có ảnh', val: String(baseData.length), bg: B.accent, vc: B.primary },
    { label: 'Tổng ảnh', val: String(totalPhotos), bg: 'EEF8F0', vc: B.ok },
    { label: 'Chưa đạt', val: String(khdatData.length), bg: 'FAE0E0', vc: B.fail },
    { label: 'Vị trí chưa đạt', val: String(khdatVitri.length), bg: 'FEF3E8', vc: 'CC6600' },
  ]
  kpis.forEach((k, i) => {
    const kx = 0.3 + i * 2.42
    ov.addShape(pres.ShapeType.roundRect, { x: kx, y: 0.87, w: 2.25, h: 1.05, fill: { color: k.bg }, shadow: mkShadow(), rectRadius: 0.08 })
    ov.addText(k.val, { x: kx, y: 0.9, w: 2.25, h: 0.62, fontSize: 26, bold: true, color: k.vc, align: 'center', fontFace: 'Arial' })
    ov.addText(k.label, { x: kx, y: 1.5, w: 2.25, h: 0.3, fontSize: 11, color: B.gray1, align: 'center', fontFace: 'Arial' })
  })

  const cols: [string[], string, string, string, Anh5SPptRecord[], number][] = [
    [khdatVitri, '📍 Vị trí chưa đạt', B.fail, B.failLt, khdatData, 0.3],
    [datVitri, '✅ Vị trí đạt', B.ok, B.okLt, datData, 5.2],
  ]
  cols.forEach(([vitris, label, col, bg, src, ox]) => {
    ov.addText(label, { x: ox, y: 2.1, w: 4.5, h: 0.35, fontSize: 13, bold: true, color: col, fontFace: 'Arial', margin: 0 })
    vitris.slice(0, 6).forEach((v, i) => {
      const cnt = src.filter((r) => (r.vitri || '—') === v).length
      const vy = 2.5 + i * 0.47
      ov.addShape(pres.ShapeType.roundRect, { x: ox, y: vy, w: 4.5, h: 0.39, fill: { color: bg }, shadow: mkShadow(), rectRadius: 0.05 })
      ov.addText(`${i + 1}. ${v}`, { x: ox + 0.1, y: vy + 0.05, w: 3.3, h: 0.29, fontSize: 11, color: col, fontFace: 'Arial', bold: true, margin: 0 })
      ov.addText(`${cnt} lượt`, { x: ox + 3.3, y: vy + 0.05, w: 1.1, h: 0.29, fontSize: 11, color: B.gray1, fontFace: 'Arial', align: 'right', margin: 0 })
    })
  })
  addFooter(ov)

  // ================================================================
  // PHẦN I: CHƯA ĐẠT
  // ================================================================
  if (khdatVitri.length > 0) {
    const s1 = pres.addSlide()
    s1.background = { color: B.fail }
    addDecorCircles(s1, B.white)
    addBrandBadge(s1, 4.35, 0.55, 1.3, false)
    s1.addText('PHẦN I', { x: 0.5, y: 1.95, w: 9, h: 0.7, fontSize: 40, bold: true, color: B.white, align: 'center', fontFace: 'Arial' })
    s1.addText('CÁC VỊ TRÍ CHƯA ĐẠT', { x: 0.5, y: 2.7, w: 9, h: 0.55, fontSize: 22, bold: true, color: 'FFCCCC', align: 'center', fontFace: 'Arial' })
    s1.addText(`${khdatVitri.length} vị trí  ·  ${khdatData.length} lượt`, { x: 0.5, y: 3.35, w: 9, h: 0.35, fontSize: 14, color: 'FFB3B3', align: 'center', fontFace: 'Arial', italic: true })

    khdatVitri.forEach((vitri) => {
      const vData = khdatData.filter((r) => (r.vitri || '—') === vitri)
      if (!vData.length) return
      const khoaList = [...new Set(vData.map((r) => r.khoa))].sort()
      const totalPh = vData.reduce((s, r) => s + r.photos.length, 0)
      const vsl = pres.addSlide()
      addBrandHeader(vsl, `❌  ${vitri}`, `${vData.length} lượt  ·  ${totalPh} ảnh`, B.fail)
      vsl.addText('Các đơn vị chưa đạt:', { x: 0.3, y: 0.88, w: 9, h: 0.32, fontSize: 12, bold: true, color: B.fail, fontFace: 'Arial', margin: 0 })
      khoaList.forEach((k, i) => {
        const col = i % 3, row = Math.floor(i / 3)
        const cnt = vData.filter((r) => r.khoa === k).reduce((s, r) => s + r.photos.length, 0)
        const kx = 0.3 + col * 3.25, ky = 1.28 + row * 1.02
        vsl.addShape(pres.ShapeType.roundRect, { x: kx, y: ky, w: 3.05, h: 0.88, fill: { color: B.failLt }, shadow: mkShadow(), rectRadius: 0.07 })
        const fe = vData.find((r) => r.khoa === k)
        if (fe?.photos?.[0]) vsl.addImage({ path: fe.photos[0].url, x: kx + 0.05, y: ky + 0.04, w: 0.78, h: 0.78, sizing: { type: 'cover', w: 0.78, h: 0.78 } })
        vsl.addText(k, { x: kx + 0.88, y: ky + 0.04, w: 2.12, h: 0.45, fontSize: 10, bold: true, color: B.fail, fontFace: 'Arial', margin: 0 })
        vsl.addText(`${cnt} ảnh`, { x: kx + 0.88, y: ky + 0.48, w: 2.12, h: 0.3, fontSize: 10, color: B.gray1, fontFace: 'Arial', margin: 0 })
      })
      addFooter(vsl)
      addPhotoSlides(vData, vitri, `Chưa đạt  ·  ${vData.length} lượt`, B.fail)
    })
  }

  // ================================================================
  // PHẦN II: ĐẠT / CẢI THIỆN
  // ================================================================
  if (datVitri.length > 0) {
    const s2 = pres.addSlide()
    s2.background = { color: B.ok }
    addDecorCircles(s2, B.white)
    addBrandBadge(s2, 4.35, 0.55, 1.3, false)
    s2.addText('PHẦN II', { x: 0.5, y: 1.95, w: 9, h: 0.7, fontSize: 40, bold: true, color: B.white, align: 'center', fontFace: 'Arial' })
    s2.addText('CÁC VỊ TRÍ ĐẠT / ĐÃ CẢI THIỆN', { x: 0.5, y: 2.7, w: 9, h: 0.55, fontSize: 22, bold: true, color: 'CCFFEE', align: 'center', fontFace: 'Arial' })
    s2.addText(`${datVitri.length} vị trí  ·  ${datData.length} lượt`, { x: 0.5, y: 3.35, w: 9, h: 0.35, fontSize: 14, color: 'A0E8C8', align: 'center', fontFace: 'Arial', italic: true })

    datVitri.forEach((vitri) => {
      const vData = datData.filter((r) => (r.vitri || '—') === vitri)
      if (!vData.length) return
      const khoaList = [...new Set(vData.map((r) => r.khoa))].sort()
      const totalPh = vData.reduce((s, r) => s + r.photos.length, 0)
      const vsl = pres.addSlide()
      addBrandHeader(vsl, `✅  ${vitri}`, `${vData.length} lượt  ·  ${totalPh} ảnh`, B.ok)
      vsl.addText('Các đơn vị đạt:', { x: 0.3, y: 0.88, w: 9, h: 0.32, fontSize: 12, bold: true, color: B.ok, fontFace: 'Arial', margin: 0 })
      khoaList.forEach((k, i) => {
        const col = i % 3, row = Math.floor(i / 3)
        const cnt = vData.filter((r) => r.khoa === k).reduce((s, r) => s + r.photos.length, 0)
        const kx = 0.3 + col * 3.25, ky = 1.28 + row * 1.02
        vsl.addShape(pres.ShapeType.roundRect, { x: kx, y: ky, w: 3.05, h: 0.88, fill: { color: B.okLt }, shadow: mkShadow(), rectRadius: 0.07 })
        const fe = vData.find((r) => r.khoa === k)
        if (fe?.photos?.[0]) vsl.addImage({ path: fe.photos[0].url, x: kx + 0.05, y: ky + 0.04, w: 0.78, h: 0.78, sizing: { type: 'cover', w: 0.78, h: 0.78 } })
        vsl.addText(k, { x: kx + 0.88, y: ky + 0.04, w: 2.12, h: 0.45, fontSize: 10, bold: true, color: B.ok, fontFace: 'Arial', margin: 0 })
        vsl.addText(`${cnt} ảnh`, { x: kx + 0.88, y: ky + 0.48, w: 2.12, h: 0.3, fontSize: 10, color: B.gray1, fontFace: 'Arial', margin: 0 })
      })
      addFooter(vsl)
      addPhotoSlides(vData, vitri, `Đạt / Cải thiện  ·  ${vData.length} lượt`, B.ok)
    })
  }

  // ================================================================
  // SLIDE CUỐI — LỜI CẢM ƠN (thêm mới, khép lại báo cáo cho trọn vẹn)
  // ================================================================
  const closing = pres.addSlide()
  closing.background = { color: B.primary }
  addDecorCircles(closing, B.white)
  addBrandBadge(closing, 4.35, 0.75, 1.3, false)
  closing.addText('CẢM ƠN QUÝ ĐƠN VỊ', { x: 0.5, y: 2.3, w: 9, h: 0.65, fontSize: 28, bold: true, color: B.white, align: 'center', fontFace: 'Arial' })
  closing.addText('đã đồng hành thực hiện tốt hoạt động 5S', { x: 0.5, y: 2.95, w: 9, h: 0.4, fontSize: 14, color: '9DC3E6', align: 'center', fontFace: 'Arial', italic: true })
  closing.addText(`Phòng Quản lý Chất lượng  ·  Bệnh viện Đa khoa Thái Bình  ·  ${todayStr}`, {
    x: 0.5, y: 4.6, w: 9, h: 0.35, fontSize: 11, color: '6B8FA8', align: 'center', fontFace: 'Arial', italic: true,
  })

  // Download
  const fileDate = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const blob = (await pres.write({ outputType: 'blob' })) as Blob
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `BaoCaoAnh5S_${fileDate}.pptx`
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }, 2000)
}
