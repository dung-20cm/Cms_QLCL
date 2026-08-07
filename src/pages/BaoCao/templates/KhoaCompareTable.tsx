import { rptColor, rptTag } from "../reportUtils";
import type { KhoaAvgRow, KhoaCompareRow } from "../types";

// 1 bảng duy nhất so sánh 2 luồng đánh giá theo TỪNG khoa -- mỗi khoa 1 dòng,
// tách 2 nhóm cột dọc (Phòng QLCL đánh giá | Khoa/phòng tự đánh giá) thay vì
// 2 bảng riêng biệt, dễ đối chiếu trực quan hơn.
export default function KhoaCompareTable({ rows }: { rows: KhoaCompareRow[] }) {
  const cell = (v: KhoaAvgRow | undefined) => {
    if (!v) {
      return (
        <td
          colSpan={3}
          style={{ textAlign: "center", fontStyle: "italic", color: "#999" }}
        >
          — Chưa có dữ liệu —
        </td>
      );
    }
    const c = rptColor(v.avg);
    return (
      <>
        <td style={{ textAlign: "center" }}>{v.n}</td>
        <td style={{ fontWeight: "bold", color: c, textAlign: "center" }}>
          {v.avg}%
        </td>
        <td style={{ fontWeight: "bold", color: c, textAlign: "center" }}>
          {rptTag(v.avg)}
        </td>
      </>
    );
  };
  return (
    <table className="pa-bangket">
      <thead>
        <tr>
          <th rowSpan={2} style={{ width: "5%" }}>
            Hạng
          </th>
          <th rowSpan={2}>Đơn vị</th>
          <th colSpan={3} style={{ textAlign: "center" }}>
            Phòng QLCL đánh giá
          </th>
          <th colSpan={3} style={{ textAlign: "center" }}>
            Khoa/phòng tự đánh giá
          </th>
        </tr>
        <tr>
          <th style={{ width: "8%" }}>Lượt</th>
          <th style={{ width: "10%" }}>Tỷ lệ đạt</th>
          <th style={{ width: "12%" }}>Xếp loại</th>
          <th style={{ width: "8%" }}>Lượt</th>
          <th style={{ width: "10%" }}>Tỷ lệ đạt</th>
          <th style={{ width: "12%" }}>Xếp loại</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.khoa_id}>
            <td style={{ textAlign: "center", fontWeight: "bold" }}>{i + 1}</td>
            <td>{r.khoa}</td>
            {cell(r.qlcl)}
            {cell(r.self)}
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <td
              colSpan={8}
              style={{ textAlign: "center", fontStyle: "italic" }}
            >
              Không có lượt đánh giá nào trong kỳ
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
