import { useMemo } from "react";
import { isQlclAudit, isSelfReview } from "../../../features/qlcl/lichUtils";
import type { DanhGia } from "../../../features/qlcl/types";
import { S_IDS, S_META } from "../constants";
import {
  barChart,
  buildKhoaAvgMap,
  buildKhoaCompareRows,
  ngayThangNamStr,
  rptColor,
} from "../reportUtils";
import KhoaCompareTable from "./KhoaCompareTable";
import KhoaRankTable from "./KhoaRankTable";
import VanBanHeader from "./VanBanHeader";

export default function ThangReport({
  thang,
  khoaLabel,
  rows,
  showNguon,
}: {
  thang: string;
  khoaLabel?: string;
  rows: DanhGia[];
  showNguon?: boolean;
}) {
  const avg = rows.length
    ? Math.round(rows.reduce((s, r) => s + r.pct, 0) / rows.length)
    : 0;
  const color = rptColor(avg);
  const thangLabel = thang
    ? `tháng ${thang.slice(5)} năm ${thang.slice(0, 4)}`
    : "tất cả các kỳ";
  const pham_vi = khoaLabel || "Toàn bệnh viện";
  const datTot = rows.filter((r) => r.pct >= 85).length;

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

  const khoaAvgMap = useMemo(() => buildKhoaAvgMap(rows), [rows]);
  // Chỉ tách 2 luồng (Phòng QLCL đánh giá khoa khác VS khoa/phòng tự đánh giá)
  // khi showNguon bật (Admin/Lãnh đạo/Phòng QLCL) -- Trưởng khoa/Nhân viên chỉ
  // có 1 luồng dữ liệu (tự đánh giá) nên giữ nguyên 1 bảng gộp như trước.
  const qlclKhoaAvgMap = useMemo(
    () => (showNguon ? buildKhoaAvgMap(rows.filter(isQlclAudit)) : []),
    [rows, showNguon],
  );
  const selfKhoaAvgMap = useMemo(
    () => (showNguon ? buildKhoaAvgMap(rows.filter(isSelfReview)) : []),
    [rows, showNguon],
  );

  const topStr = khoaAvgMap
    .slice(0, 3)
    .map((k) => `${k.khoa} (${k.avg}%)`)
    .join(", ");
  const lowList = khoaAvgMap.filter((k) => k.avg < 70);

  return (
    <>
      <VanBanHeader
        coQuan1="Sở Y tế tỉnh Hưng Yên"
        coQuan2="Bệnh viện Đa khoa Thái Bình"
        soHieu="BC-BV"
        ngayVanBan={`ngày ${ngayThangNamStr()}`}
        tenLoai="Báo cáo"
        trichYeu={
          <>
            Kết quả thực hành 5S {thangLabel}
            <br />
            {pham_vi}
          </>
        }
      />

      <div style={{ fontStyle: "italic", fontSize: "12pt", margin: "4mm 0" }}>
        <div>
          Căn cứ Kế hoạch số ………/KH-BVTB về triển khai thực hành 5S năm{" "}
          {new Date().getFullYear()};
        </div>
        <div style={{ marginTop: "1mm" }}>
          Phòng Quản lý Chất lượng báo cáo kết quả như sau:
        </div>
      </div>

      <div className="pa-muc">I. Thông tin chung</div>
      <table className="pa-bangket">
        <tbody>
          <tr>
            <td style={{ width: "35%", fontWeight: "bold" }}>Kỳ báo cáo:</td>
            <td>{thangLabel}</td>
            <td style={{ width: "25%", fontWeight: "bold" }}>Phạm vi:</td>
            <td>{pham_vi}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: "bold" }}>Tổng lượt đánh giá:</td>
            <td>
              <strong>{rows.length}</strong> lượt
            </td>
            <td style={{ fontWeight: "bold" }}>Số đơn vị:</td>
            <td>
              <strong>{khoaAvgMap.length}</strong>
            </td>
          </tr>
          <tr>
            <td style={{ fontWeight: "bold" }}>Tỷ lệ đạt TB:</td>
            <td style={{ fontWeight: "bold", color }}>{avg}%</td>
            <td style={{ fontWeight: "bold" }}>Đạt tốt:</td>
            <td style={{ fontWeight: "bold", color: "#1D9E75" }}>
              {datTot} lượt
            </td>
          </tr>
        </tbody>
      </table>

      <div className="pa-muc">II. Kết quả theo từng nội dung 5S</div>
      <table className="pa-bangket">
        <thead>
          <tr>
            <th style={{ width: "10%" }}>Mã S</th>
            <th style={{ width: "18%" }}>Nội dung</th>
            <th style={{ width: "15%" }}>Tỷ lệ đạt TB</th>
            <th>Biểu đồ</th>
            <th style={{ width: "18%" }}>Nhận xét</th>
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
            const nxet =
              s.pct >= 80
                ? "Tốt"
                : s.pct >= 70
                  ? "Khá"
                  : s.pct >= 60
                    ? "Trung bình"
                    : "Cần cải thiện";
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
                <td
                  style={{ fontWeight: "bold", color: c, textAlign: "center" }}
                >
                  {nxet}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {showNguon ? (
        <>
          <div className="pa-muc">
            III. Xếp hạng theo đơn vị — so sánh 2 luồng đánh giá
          </div>
          <KhoaCompareTable
            rows={buildKhoaCompareRows(qlclKhoaAvgMap, selfKhoaAvgMap)}
          />
        </>
      ) : (
        <>
          <div className="pa-muc">III. Xếp hạng theo đơn vị</div>
          <KhoaRankTable rows={khoaAvgMap} />
        </>
      )}

      <div className="pa-muc">IV. Nhận xét và kiến nghị</div>
      <div className="pa-dieu">1. Ưu điểm</div>
      <div className="pa-nd">
        {topStr || "—"} là đơn vị thực hành 5S tốt nhất kỳ này. Tỷ lệ đạt trung
        bình toàn viện đạt {avg}%.
      </div>
      <div className="pa-dieu">2. Tồn tại</div>
      <div className="pa-nd">
        {lowList.length
          ? `Còn ${lowList.length} đơn vị chưa đạt: ${lowList.map((k) => k.khoa).join(", ")}.`
          : "Tất cả đơn vị đã đạt mức Đạt trở lên."}
      </div>
      <div className="pa-dieu">3. Kiến nghị</div>
      <div className="pa-nd">
        Đề nghị các đơn vị chưa đạt lập kế hoạch khắc phục, gửi về Phòng QLCL
        trong vòng 07 ngày làm việc.
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
              <div>- Ban Giám đốc (để báo cáo);</div>
              <div>- Các khoa, phòng, TT (để thực hiện);</div>
              <div>- Lưu: VT, QLCL.</div>
            </td>
            <td className="pa-kyte">
              <div
                style={{ fontSize: "10pt", fontStyle: "italic", color: "#444" }}
              >
                KT. GIÁM ĐỐC
              </div>
              <div className="pa-kyte-chucvu">Phó Giám đốc</div>
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
