// Lấy dữ liệu cho các bảng đang được chọn -- dùng chung cho cả xuất Excel
// (useXuatDuLieuData.ts) lẫn kết nối Google Sheet (useConnectSheet.ts) để 2
// đường xuất luôn lấy đúng 1 nguồn dữ liệu, không lệch nhau.
import { fetchBangDuLieu, type XuatDuLieuRow } from "../../features/qlcl/api";
import { BANG_LIST } from "./constants";
import type { BangDefinition, BangKey } from "./types";
import { fmtDateFileName } from "./helpers";

export interface FetchedBang {
  bang: BangDefinition;
  rows: XuatDuLieuRow[];
}

export async function fetchSelectedBangRows(
  selected: Set<BangKey>,
  tuNgay: string,
  denNgay: string,
): Promise<FetchedBang[]> {
  const bangDaChon = BANG_LIST.filter((b) => selected.has(b.key));
  const result: FetchedBang[] = [];
  for (const bang of bangDaChon) {
    const rows = await fetchBangDuLieu(bang.key, {
      tu_ngay: tuNgay || undefined,
      den_ngay: denNgay || undefined,
    });
    result.push({ bang, rows });
  }
  return result;
}

// Tên file/tiêu đề dùng chung cho cả file Excel tải xuống lẫn tiêu đề Google
// Spreadsheet: xuất đúng 1 bảng -> đặt theo tên bảng đó (VD "HanhDongKP"); xuất
// từ 2 bảng trở lên (kể cả "chọn tất cả") -> tên chung "DuLieu5S". Có chọn
// khoảng ngày thì thêm hậu tố ngày vào cuối.
export function buildExportBaseName(
  bangDaChon: BangDefinition[],
  tuNgay: string,
  denNgay: string,
): string {
  const baseName = bangDaChon.length === 1 ? bangDaChon[0].fileName : "DuLieu5S";
  let suffix = "";
  if (tuNgay && denNgay) {
    suffix = `_${fmtDateFileName(tuNgay)}-${fmtDateFileName(denNgay)}`;
  } else if (tuNgay) {
    suffix = `_tu-${fmtDateFileName(tuNgay)}`;
  } else if (denNgay) {
    suffix = `_den-${fmtDateFileName(denNgay)}`;
  }
  return `${baseName}${suffix}`;
}
