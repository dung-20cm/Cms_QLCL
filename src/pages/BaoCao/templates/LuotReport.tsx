import { smartSuggestKP } from "../../../features/qlcl/aiSuggestKP";
import type { DanhGia, KhacPhuc } from "../../../features/qlcl/types";
import { S_IDS, S_META } from "../constants";
import { barChart, ngayThangNamStr, rptColor, rptTag } from "../reportUtils";
import VanBanHeader from "./VanBanHeader";

export default function LuotReport({
  luot,
  kpList,
  nhanXet,
}: {
  luot: DanhGia;
  kpList: KhacPhuc[];
  nhanXet: string;
}) {
  const pct = luot.pct;
  const color = rptColor(pct);
  const tag = rptTag(pct);
  const sScores = luot.sScores || [];
  const kienNghi =
    pct >= 85
      ? "tiếp tục phát huy và duy trì thực hành 5S đạt mức Tốt."
      : "thực hiện các biện pháp khắc phục các tiêu chí chưa đạt và báo cáo kết quả về Phòng Quản lý Chất lượng.";

  return (
    <>
      <VanBanHeader
        coQuan1="Sở Y tế tỉnh Hưng Yên"
        coQuan2="Bệnh viện Đa khoa Thái Bình"
        soHieu="BC-QLCL"
        ngayVanBan={`ngày ${ngayThangNamStr()}`}
        tenLoai="Phiếu kết quả đánh giá thực hành 5S"
        trichYeu={
          <>
            Tại {luot.vitri_type?.ten_vitri} – {luot.khoa?.ten_khoa}
          </>
        }
      />

      <div className="pa-muc">I. Thông tin đánh giá</div>
      <table className="pa-bangket">
        <tbody>
          <tr>
            <td style={{ width: "30%", fontWeight: "bold" }}>
              Đơn vị (Khoa/Phòng/TT):
            </td>
            <td>{luot.khoa?.ten_khoa}</td>
            <td style={{ width: "25%", fontWeight: "bold" }}>Ngày đánh giá:</td>
            <td>{new Date(luot.ngay_danh_gia).toLocaleDateString("vi-VN")}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: "bold" }}>Vị trí đánh giá:</td>
            <td>
              {luot.vitri_type?.ten_vitri}
              {luot.vitri_chi_tiet?.ma_vitri
                ? ` (${luot.vitri_chi_tiet.ma_vitri})`
                : ""}
            </td>
            <td style={{ fontWeight: "bold" }}>Đợt đánh giá:</td>
            <td>{luot.dot_danh_gia}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: "bold" }}>Người đánh giá:</td>
            <td>{luot.nguoi_danh_gia?.email}</td>
            <td style={{ fontWeight: "bold" }}>Số tiêu chí đạt:</td>
            <td>
              <strong>
                {luot.so_tieu_chi_dat}/{luot.so_tieu_chi_tong}
              </strong>{" "}
              tiêu chí
            </td>
          </tr>
        </tbody>
      </table>

      <div className="pa-muc">II. Kết quả tổng hợp</div>
      <div className="pa-ket-box" style={{ borderColor: color }}>
        <div className="pa-ket-diem" style={{ color }}>
          {pct}%
        </div>
        <div className="pa-ket-loai" style={{ color }}>
          {tag}
        </div>
        <div className="pa-ket-detail">
          Tỷ lệ đạt tiêu chí / Tổng số tiêu chí
        </div>
      </div>
      {sScores.length > 0 && (
        <table className="pa-bangket">
          <thead>
            <tr>
              <th style={{ width: "8%" }}>Mã S</th>
              <th style={{ width: "20%" }}>Nội dung</th>
              <th style={{ width: "8%" }}>TC đạt</th>
              <th style={{ width: "8%" }}>Tổng TC</th>
              <th style={{ width: "12%" }}>Tỷ lệ</th>
              <th>Biểu đồ</th>
            </tr>
          </thead>
          <tbody>
            {S_IDS.map((id) => {
              const s = sScores.find((x) => x.id === id);
              if (!s) return null;
              const c =
                s.pct >= 80
                  ? "#1D9E75"
                  : s.pct >= 60
                    ? S_META[id].color
                    : "#A32D2D";
              return (
                <tr key={id}>
                  <td
                    style={{
                      fontWeight: "bold",
                      color: S_META[id].color,
                      textAlign: "center",
                    }}
                  >
                    {id}
                  </td>
                  <td>{s.name || S_META[id].name}</td>
                  <td style={{ textAlign: "center", fontWeight: "bold" }}>
                    {s.ok}
                  </td>
                  <td style={{ textAlign: "center" }}>{s.total}</td>
                  <td
                    style={{
                      textAlign: "center",
                      fontWeight: "bold",
                      color: c,
                    }}
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
      )}

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
              <th style={{ width: "28%" }}>Tiêu chí chưa đạt</th>
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
        Căn cứ kết quả đánh giá, đề nghị {luot.khoa?.ten_khoa} {kienNghi}
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
              <div>- {luot.khoa?.ten_khoa} (để thực hiện);</div>
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
        Phiếu được tạo tự động bởi Bộ công cụ đánh giá 5S – Bệnh viện Đa khoa
        Thái Bình – Ngày in: {ngayThangNamStr()}
      </div>
    </>
  );
}
