import ExcelJS from 'exceljs'

// Bảng màu + style dùng chung cho MỌI file Excel xuất ra trong app — khớp mẫu
// bảng nhân sự chuẩn công ty: header xanh navy đậm chữ trắng, viền đủ 4 cạnh
// từng ô, các dòng dữ liệu tô xen kẽ trắng/xanh nhạt cho dễ đọc.
const HEADER_FILL = 'FF1F3864'
const BORDER_COLOR = 'FFB9C2D0'
const ALT_ROW_FILL = 'FFF2F5FA'

const THIN_BORDER = {
  top: { style: 'thin' as const, color: { argb: BORDER_COLOR } },
  left: { style: 'thin' as const, color: { argb: BORDER_COLOR } },
  bottom: { style: 'thin' as const, color: { argb: BORDER_COLOR } },
  right: { style: 'thin' as const, color: { argb: BORDER_COLOR } },
}

export function styleHeaderRow(row: ExcelJS.Row) {
  row.height = 26
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell.border = THIN_BORDER
  })
}

// centerKeys: các cột key cần căn giữa (số thứ tự, số liệu, trạng thái...) — còn
// lại mặc định căn trái (tên khoa, ghi chú, các trường text dài).
export function styleDataRow(row: ExcelJS.Row, rowIndex: number, centerKeys: string[] = []) {
  const isEven = rowIndex % 2 === 0
  row.eachCell((cell, colNumber) => {
    const col = row.worksheet.getColumn(colNumber)
    const isCenter = col.key ? centerKeys.includes(col.key) : false
    cell.border = THIN_BORDER
    cell.alignment = { vertical: 'middle', wrapText: true, horizontal: isCenter ? 'center' : 'left' }
    if (isEven) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ALT_ROW_FILL } }
    }
  })
}

export async function downloadWorkbook(wb: ExcelJS.Workbook, filename: string) {
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

export { ExcelJS }
