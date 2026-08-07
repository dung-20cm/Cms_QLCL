import { useMemo } from "react";
import { smartSuggestKP } from "../../../features/qlcl/aiSuggestKP";
import { isSelfReview } from "../../../features/qlcl/lichUtils";
import type { DanhGia, KhacPhuc } from "../../../features/qlcl/types";
import { S_IDS, S_META } from "../constants";
import {
  barChart,
  ngayThangNamStr,
  nguonLabel,
  rptColor,
  rptTag,
} from "../reportUtils";
import VanBanHeader from "./VanBanHeader";

// Báo cáo theo đợt đánh giá — gộp TOÀN BỘ lượt đánh giá của 1 khoa/phòng trong
// đúng 1 đợt đánh giá (dot_danh_gia_id) thành 1 phiếu duy nhất: tư duy bố cục
// giống LuotReport (I. Thông tin, II. Kết quả tổng hợp, III. Hành động khắc
// phục, IV. Nhận xét/kiến nghị + ký tên) nhưng gộp nhiều lượt như DonViReport.
export default function DotReport({
  dotTen,
  khoaTen,
  rows,
  kpList,
  nhanXet,
  showNguon,
}: {
  dotTen: string;
  khoaTen: string;
  rows: DanhGia[];
  kpList: KhacPhuc[];
  nhanXet: string;
  showNguon?: boolean;
}) {
  const avg = rows.length
    ? Math.round(rows.reduce((s, r) => s + r.pct, 0) / rows.length)
    : 0;
  const color = rptColor(avg);
  const tag = rptTag(avg);
  const tuNgay = rows[0]?.ngay_danh_gia;
  const denNgay = rows[rows.length - 1]?.ngay_danh_gia;
  const rangeLabel =
    tuNgay && denNgay
      ? tuNgay === denNgay
        ? new Date(tuNgay).toLocaleDateString("vi-VN")
        : `${new Date(tuNgay).toLocaleDateString("vi-VN")} – ${new Date(denNgay).toLocaleDateString("vi-VN")}`
      : "—";
  const kienNghi =
    avg >= 85
      ? "tiếp tục phát huy và duy trì thực hành 5S đạt mức Tốt."
      : "thực hiện các biện pháp khắc phục các tiêu chí chưa đạt và báo cáo kết quả về Phòng Quản lý Chất lượng.";

  const sAvg = useMemo(() => {
    const agg: Record<string, { ok: number; total: number }> = {};
    for (const r of rows) {
      for (const s of r.sScores || []) {
        const cur = agg[s.id] || { ok: 0, total: 0 };
        cur.ok += s.ok;
        cur.total += s.total;
        agg[s.id] = cur;
      }
    }
    return S_IDS.map((id) => {
      const v = agg[id];
      return { id, pct: v && v.total ? Math.round((v.ok / v.total) * 100) : 0 };
    });
  }, [rows]);

  return (
    <>
      <VanBanHeader
        coQuan1="Sở Y tế tỉnh Hưng Yên"
        coQuan2="Bệnh viện Đa khoa Thái Bình"
        soHieu="BC-QLCL"
        ngayVanBan={`ngày ${ngayThangNamStr()}`}
        tenLoai="Báo cáo kết quả thực hành 5S theo đợt đánh giá"
        trichYeu={
          <>
            Đợt: {dotTen}
            <br />
            {khoaTen}
          </>
        }
      />

      <div className="pa-muc">I. Thông tin chung</div>
      <table className="pa-bangket">
        <tbody>
          <tr>
            <td style={{ width: "30%", fontWeight: "bold" }}>Đơn vị:</td>
            <td>{khoaTen}</td>
            <td style={{ width: "25%", fontWeight: "bold" }}>Đợt đánh giá:</td>
            <td>{dotTen}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: "bold" }}>Khoảng thời gian:</td>
            <td>{rangeLabel}</td>
            <td style={{ fontWeight: "bold" }}>Tổng lượt đánh giá:</td>
            <td>
              <strong>{rows.length}</strong> lượt
            </td>
          </tr>
        </tbody>
      </table>

      <div className="pa-muc">II. Kết quả tổng hợp</div>
      <div className="pa-ket-box" style={{ borderColor: color }}>
        <div className="pa-ket-diem" style={{ color }}>
          {avg}%
        </div>
        <div className="pa-ket-loai" style={{ color }}>
          {tag}
        </div>
        <div className="pa-ket-detail">
          Tỷ lệ đạt trung bình tất cả lượt đánh giá trong đợt
        </div>
      </div>
      <table className="pa-bangket">
        <thead>
          <tr>
            <th style={{ width: "10%" }}>Mã S</th>
            <th style={{ width: "20%" }}>Nội dung</th>
            <th style={{ width: "15%" }}>Tỷ lệ đạt TB</th>
            <th>Biểu đồ</th>
          </tr>
        </thead>
        <tbody>
          {sAvg.map((s) => {
            const c =
              s.pct >= 80
                ? "#1D9E75"
                : s.pct >= 60
                  ? S_META[s.id].color
                  : "#A32D2D";
            return (
              <tr key={s.id}>
                <td
                  style={{
                    fontWeight: "bold",
                    color: S_META[s.id].color,
                    textAlign: "center",
                  }}
                >
                  {s.id}
                </td>
                <td>{S_META[s.id].name}</td>
                <td
                  style={{ fontWeight: "bold", color: c, textAlign: "center" }}
                >
                  {s.pct}%
                </td>
                <td className="pa-bar" style={{ color: c }}>
                  {barChart(s.pct)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <table className="pa-bangket">
        <thead>
          <tr>
            <th style={{ width: "5%" }}>#</th>
            <th style={{ width: "13%" }}>Ngày</th>
            <th style={{ width: showNguon ? "17%" : "20%" }}>Vị trí</th>
            <th style={{ width: showNguon ? "15%" : "18%" }}>Người đánh giá</th>
            {showNguon && <th style={{ width: "15%" }}>Nguồn</th>}
            <th style={{ width: "12%" }}>Tỷ lệ đạt</th>
            <th style={{ width: "12%" }}>Xếp loại</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const rc = rptColor(r.pct);
            return (
              <tr key={r.id}>
                <td style={{ textAlign: "center" }}>{i + 1}</td>
                <td>{new Date(r.ngay_danh_gia).toLocaleDateString("vi-VN")}</td>
                <td>{r.vitri_type?.ten_vitri}</td>
                <td>{r.nguoi_danh_gia?.email}</td>
                {showNguon && (
                  <td
                    style={{
                      fontSize: "10pt",
                      color: isSelfReview(r) ? "#1D9E75" : "#185FA5",
                    }}
                  >
                    {nguonLabel(r)}
                  </td>
                )}
                <td
                  style={{ fontWeight: "bold", color: rc, textAlign: "center" }}
                >
                  {r.pct}%
                </td>
                <td
                  style={{ fontWeight: "bold", color: rc, textAlign: "center" }}
                >
                  {rptTag(r.pct)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="pa-muc">III. Hành động khắc phục</div>
      {kpList.length === 0 ? (
        <div className="pa-nd" style={{ color: "#1D9E75", fontWeight: "bold" }}>
          ✓ Tất cả tiêu chí đạt yêu cầu — không có nội dung cần khắc phục.
        </div>
      ) : (
        <table className="pa-bangket">
          <thead>
            <tr>
              <th style={{ width: "6%" }}>TT</th>
              <th style={{ width: "6%" }}>Mã S</th>
              <th style={{ width: "26%" }}>Tiêu chí chưa đạt</th>
              <th>Hành động khắc phục</th>
              <th style={{ width: "12%" }}>Hạn xử lý</th>
              <th style={{ width: "12%" }}>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {kpList.map((k, i) => (
              <tr key={k.id}>
                <td style={{ textAlign: "center" }}>{i + 1}</td>
                <td
                  style={{
                    fontWeight: "bold",
                    textAlign: "center",
                    color:
                      S_META[k.danh_gia_chi_tiet?.checklist_item?.s_id || ""]
                        ?.color,
                  }}
                >
                  {k.danh_gia_chi_tiet?.checklist_item?.s_id}
                </td>
                <td>
                  {k.danh_gia_chi_tiet?.checklist_item?.tc}
                  {k.danh_gia_chi_tiet?.ghi_chu && (
                    <i> — {k.danh_gia_chi_tiet.ghi_chu}</i>
                  )}
                </td>
                <td>
                  {k.hanh_dong_khac_phuc || (
                    <span style={{ color: "#185FA5", fontStyle: "italic" }}>
                      💡 Gợi ý AI:{" "}
                      {smartSuggestKP(
                        k.danh_gia_chi_tiet?.checklist_item?.tc || "",
                        k.danh_gia_chi_tiet?.checklist_item?.s_id || "",
                      )}
                    </span>
                  )}
                </td>
                <td style={{ textAlign: "center" }}>
                  {k.han_xu_ly
                    ? new Date(k.han_xu_ly).toLocaleDateString("vi-VN")
                    : ""}
                </td>
                <td style={{ textAlign: "center", fontWeight: "bold" }}>
                  {k.trang_thai}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="pa-muc">IV. Nhận xét và kiến nghị</div>
      <div className="pa-nd">
        {nhanXet || "(Điền nhận xét của người kiểm tra)"}
      </div>
      <div className="pa-nd">
        Căn cứ kết quả đánh giá, đề nghị {khoaTen} {kienNghi}
      </div>

      <hr className="pa-divider" />

      <table
        className="pa-footer-tbl"
        border={0}
        cellPadding={0}
        cellSpacing={0}
      >
        <tbody>
          <tr>
            <td className="pa-noinha">
              <div className="pa-noinha-title">Nơi nhận:</div>
              <div>- {khoaTen} (để thực hiện);</div>
              <div>- Phòng QLCL (để theo dõi);</div>
              <div>- Lưu: VT, QLCL.</div>
            </td>
            <td className="pa-kyte">
              <div className="pa-kyte-chucvu">Trưởng phòng QLCL</div>
              <div className="pa-kyte-note">(Ký, ghi rõ họ tên)</div>
              <div className="pa-kyte-ten">&nbsp;</div>
            </td>
          </tr>
        </tbody>
      </table>

      <div className="pa-footer-note">
        Báo cáo được tạo tự động bởi Bộ công cụ đánh giá 5S – Bệnh viện Đa khoa
        Thái Bình – Ngày in: {ngayThangNamStr()}
      </div>
    </>
  );
}
