import { useMemo } from "react";
import { isSelfReview } from "../../../features/qlcl/lichUtils";
import type { DanhGia } from "../../../features/qlcl/types";
import { S_IDS, S_META } from "../constants";
import {
  barChart,
  ngayThangNamStr,
  nguonLabel,
  rptColor,
  rptTag,
} from "../reportUtils";
import VanBanHeader from "./VanBanHeader";

export default function DonViReport({
  khoaTen,
  from,
  to,
  rows,
  showNguon,
}: {
  khoaTen: string;
  from: string;
  to: string;
  rows: DanhGia[];
  showNguon?: boolean;
}) {
  const avg = rows.length
    ? Math.round(rows.reduce((s, r) => s + r.pct, 0) / rows.length)
    : 0;
  const color = rptColor(avg);
  const vitriGroups = useMemo(() => {
    const m = new Map<string, DanhGia[]>();
    for (const r of rows) {
      const key = r.vitri_type?.ten_vitri || "—";
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(r);
    }
    return [...m.entries()];
  }, [rows]);

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

  const rangeLabel =
    from && to
      ? `${new Date(from).toLocaleDateString("vi-VN")} – ${new Date(to).toLocaleDateString("vi-VN")}`
      : from
        ? `từ ${new Date(from).toLocaleDateString("vi-VN")}`
        : to
          ? `đến ${new Date(to).toLocaleDateString("vi-VN")}`
          : "Tất cả";

  return (
    <>
      <VanBanHeader
        coQuan1="Bệnh viện Đa khoa Thái Bình"
        coQuan2="Phòng Quản lý chất lượng"
        soHieu="BC-QLCL"
        ngayVanBan={`ngày ${ngayThangNamStr()}`}
        tenLoai="Báo cáo"
        trichYeu={
          <>
            Kết quả thực hành 5S – {khoaTen}
            <br />
            Kỳ: {rangeLabel}
          </>
        }
      />

      <div className="pa-muc">I. Thông tin chung</div>
      <table className="pa-bangket">
        <tbody>
          <tr>
            <td style={{ width: "30%", fontWeight: "bold" }}>Đơn vị:</td>
            <td>{khoaTen}</td>
            <td style={{ width: "25%", fontWeight: "bold" }}>
              Khoảng thời gian:
            </td>
            <td>{rangeLabel}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: "bold" }}>Tổng lượt đánh giá:</td>
            <td>
              <strong>{rows.length}</strong> lượt
            </td>
            <td style={{ fontWeight: "bold" }}>Số vị trí đánh giá:</td>
            <td>
              <strong>{vitriGroups.length}</strong> vị trí
            </td>
          </tr>
          <tr>
            <td style={{ fontWeight: "bold" }}>Tỷ lệ đạt TB:</td>
            <td style={{ fontWeight: "bold", color }} colSpan={3}>
              {avg}% – {rptTag(avg)}
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
          {rptTag(avg)}
        </div>
        <div className="pa-ket-detail">
          Tỷ lệ đạt trung bình tất cả lượt đánh giá
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

      <div className="pa-muc">III. Kết quả theo từng vị trí</div>
      {vitriGroups.length === 0 && (
        <div className="pa-nd" style={{ fontStyle: "italic" }}>
          Không có lượt đánh giá nào trong khoảng thời gian đã chọn.
        </div>
      )}
      {vitriGroups.map(([vitri, vrows]) => {
        const vAvg = Math.round(
          vrows.reduce((s, r) => s + r.pct, 0) / vrows.length,
        );
        const vc = rptColor(vAvg);
        return (
          <div key={vitri} style={{ marginBottom: "6mm" }}>
            <div
              style={{
                fontWeight: "bold",
                fontSize: "12pt",
                color: "#1B3A5C",
                marginBottom: "2mm",
              }}
            >
              📍 {vitri} &nbsp;
              <span style={{ fontWeight: "normal", color: vc }}>
                {vAvg}% – {rptTag(vAvg)}
              </span>
            </div>
            <table className="pa-bangket">
              <thead>
                <tr>
                  <th style={{ width: "6%" }}>#</th>
                  <th style={{ width: "14%" }}>Ngày</th>
                  <th style={{ width: showNguon ? "18%" : "22%" }}>
                    Người đánh giá
                  </th>
                  {showNguon && <th style={{ width: "16%" }}>Nguồn</th>}
                  <th style={{ width: "12%" }}>Đợt</th>
                  <th style={{ width: "12%" }}>Tỷ lệ đạt</th>
                  <th style={{ width: "12%" }}>Xếp loại</th>
                </tr>
              </thead>
              <tbody>
                {vrows.map((r, i) => {
                  const rc = rptColor(r.pct);
                  return (
                    <tr key={r.id}>
                      <td style={{ textAlign: "center" }}>{i + 1}</td>
                      <td>
                        {new Date(r.ngay_danh_gia).toLocaleDateString("vi-VN")}
                      </td>
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
                      <td>{r.dot_danh_gia}</td>
                      <td
                        style={{
                          fontWeight: "bold",
                          color: rc,
                          textAlign: "center",
                        }}
                      >
                        {r.pct}%
                      </td>
                      <td
                        style={{
                          fontWeight: "bold",
                          color: rc,
                          textAlign: "center",
                        }}
                      >
                        {rptTag(r.pct)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}

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
              <div>- Phòng QLCL (để lưu);</div>
              <div>- Lưu: VT, QLCL.</div>
            </td>
            <td className="pa-kyte">
              <div
                style={{ fontSize: "10pt", fontWeight: "bold", color: "#444" }}
              >
                Trưởng phòng QLCL
              </div>
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
