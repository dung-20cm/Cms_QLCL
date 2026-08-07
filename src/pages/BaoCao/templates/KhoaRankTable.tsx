import { rptColor, rptTag } from "../reportUtils";
import type { KhoaAvgRow } from "../types";

// Bảng xếp hạng theo đơn vị dùng chung -- tái sử dụng cho bảng gộp lẫn 2 bảng
// tách theo nguồn đánh giá.
export default function KhoaRankTable({ rows }: { rows: KhoaAvgRow[] }) {
  return (
    <table className="pa-bangket">
      <thead>
        <tr>
          <th style={{ width: "6%" }}>Hạng</th>
          <th>Đơn vị</th>
          <th style={{ width: "12%" }}>Số lượt</th>
          <th style={{ width: "15%" }}>Tỷ lệ đạt</th>
          <th style={{ width: "18%" }}>Xếp loại</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((k, i) => {
          const c = rptColor(k.avg);
          return (
            <tr key={k.khoa_id}>
              <td style={{ textAlign: "center", fontWeight: "bold" }}>
                {i + 1}
              </td>
              <td>{k.khoa}</td>
              <td style={{ textAlign: "center" }}>{k.n}</td>
              <td style={{ fontWeight: "bold", color: c, textAlign: "center" }}>
                {k.avg}%
              </td>
              <td style={{ fontWeight: "bold", color: c, textAlign: "center" }}>
                {rptTag(k.avg)}
              </td>
            </tr>
          );
        })}
        {rows.length === 0 && (
          <tr>
            <td
              colSpan={5}
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
