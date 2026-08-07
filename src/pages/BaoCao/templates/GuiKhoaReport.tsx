import { Fragment } from "react";
import { smartSuggestKP } from "../../../features/qlcl/aiSuggestKP";
import type { DanhGia, KhacPhuc } from "../../../features/qlcl/types";
import { S_META } from "../constants";
import {
  addWorkDays,
  maDonVi,
  ngayThangNamStr,
  rptColor,
  rptTag,
} from "../reportUtils";
import VanBanHeader from "./VanBanHeader";

// Phiếu yêu cầu khắc phục (gửi đơn vị) — văn bản 2 trang độc lập:
// Trang 1: Phòng QLCL gửi khoa, liệt kê các tiêu chí chưa đạt, yêu cầu nộp lại
//   trong `hanDays` ngày làm việc.
// Trang 2: mẫu để khoa điền tay (Gợi ý hành động KP tự động điền bằng AI cục bộ,
//   các ô Hành động thực tế/Người thực hiện/Hạn HT để trống cho khoa điền).
// Mỗi trang tự có khối .pa-wrap riêng (không lồng trong .pa-wrap của BaoCao())
// để page-break-before hoạt động đúng, giống cách 5S_Dashboard_BVTB_v4 nối 2
// văn bản độc lập (trang1 + trang2) thay vì lồng chung 1 khối.
export default function GuiKhoaReport({
  recs,
  kpByDanhGiaId,
  hanDays,
}: {
  recs: DanhGia[];
  kpByDanhGiaId: Map<number, KhacPhuc[]>;
  hanDays: number;
}) {
  const hanNop = addWorkDays(new Date(), hanDays);
  const ngayDG = recs[0]?.ngay_danh_gia || "";
  const khoaLabel = recs[0]?.khoa?.ten_khoa || "";
  const isMulti = recs.length > 1;

  interface Issue {
    danhGiaId: number;
    sid: string;
    color: string;
    text: string;
  }
  const allIssues: Issue[] = [];
  for (const r of recs) {
    for (const k of kpByDanhGiaId.get(r.id) || []) {
      const ci = k.danh_gia_chi_tiet?.checklist_item;
      if (!ci) continue;
      allIssues.push({
        danhGiaId: r.id,
        sid: ci.s_id,
        color: S_META[ci.s_id]?.color || "#444",
        text: ci.tc,
      });
    }
  }

  if (allIssues.length === 0) {
    return (
      <div className="pa-wrap" style={{ textAlign: "center", padding: "30mm" }}>
        <div style={{ fontSize: "14pt", color: "#1D9E75", fontWeight: "bold" }}>
          ✓ Không có tiêu chí chưa đạt — không cần phiếu yêu cầu khắc phục
        </div>
      </div>
    );
  }

  const mucI = "I";
  const mucII = isMulti ? "II" : "I";
  const mucIII = isMulti ? "III" : "II";
  const maKhoa = maDonVi(khoaLabel);
  const vitriGroups = recs
    .map((r) => ({ r, issues: allIssues.filter((x) => x.danhGiaId === r.id) }))
    .filter((g) => g.issues.length > 0);

  return (
    <>
      {/* ══ TRANG 1 — Phiếu yêu cầu khắc phục (Phòng QLCL gửi khoa) ══ */}
      <div className="pa-wrap">
        <VanBanHeader
          coQuan1="Sở Y tế tỉnh Hưng Yên"
          coQuan2="Bệnh viện Đa khoa Thái Bình"
          soHieu="YCKP-QLCL"
          ngayVanBan={`ngày ${ngayThangNamStr()}`}
          tenLoai="Phiếu yêu cầu khắc phục"
          trichYeu={<>Kết quả đánh giá thực hành 5S – {khoaLabel}</>}
        />
        <div style={{ margin: "4mm 0 3mm", fontSize: "13pt" }}>
          <span style={{ fontStyle: "italic" }}>Kính gửi: </span>
          <strong>{khoaLabel}</strong>
        </div>
        <div
          style={{ fontStyle: "italic", fontSize: "12pt", marginBottom: "4mm" }}
        >
          Căn cứ kết quả đánh giá thực hành 5S ngày{" "}
          <strong>{new Date(ngayDG).toLocaleDateString("vi-VN")}</strong>
          {isMulti ? (
            <>
              {" "}
              tại <strong>{recs.length} vị trí</strong>
            </>
          ) : (
            <>
              {" "}
              tại <strong>{recs[0]?.vitri_type?.ten_vitri}</strong> (Người đánh
              giá: {recs[0]?.nguoi_danh_gia?.email})
            </>
          )}
          , Phòng Quản lý chất lượng thông báo các tiêu chí chưa đạt yêu cầu như
          sau:
        </div>

        {isMulti && (
          <>
            <div className="pa-muc">{mucI}. Tổng hợp kết quả theo vị trí</div>
            <table className="pa-bangket">
              <thead>
                <tr>
                  <th style={{ width: "5%" }}>STT</th>
                  <th style={{ width: "20%" }}>Vị trí</th>
                  <th style={{ width: "18%" }}>Người ĐG</th>
                  <th style={{ width: "12%" }}>Tỷ lệ</th>
                  <th style={{ width: "15%" }}>Xếp loại</th>
                  <th style={{ width: "12%" }}>TC chưa đạt</th>
                </tr>
              </thead>
              <tbody>
                {recs.map((r, i) => {
                  const c = rptColor(r.pct);
                  const issCount = allIssues.filter(
                    (x) => x.danhGiaId === r.id,
                  ).length;
                  return (
                    <tr key={r.id}>
                      <td style={{ textAlign: "center" }}>{i + 1}</td>
                      <td>{r.vitri_type?.ten_vitri}</td>
                      <td>{r.nguoi_danh_gia?.email}</td>
                      <td
                        style={{
                          textAlign: "center",
                          fontWeight: "bold",
                          color: c,
                        }}
                      >
                        {r.pct}%
                      </td>
                      <td
                        style={{
                          textAlign: "center",
                          fontWeight: "bold",
                          color: c,
                        }}
                      >
                        {rptTag(r.pct)}
                      </td>
                      <td
                        style={{
                          textAlign: "center",
                          fontWeight: "bold",
                          color: "#A32D2D",
                        }}
                      >
                        {issCount}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}

        <div className="pa-muc">{mucII}. Các tiêu chí chưa đạt yêu cầu</div>
        <table className="pa-bangket">
          <thead>
            <tr>
              <th style={{ width: "5%" }}>STT</th>
              {isMulti && <th style={{ width: "16%" }}>Vị trí</th>}
              <th style={{ width: "7%" }}>Mã S</th>
              <th style={{ width: isMulti ? "15%" : "20%" }}>Nội dung</th>
              <th>Tiêu chí chưa đạt</th>
            </tr>
          </thead>
          <tbody>
            {allIssues.map((iss, i) => {
              const r = recs.find((x) => x.id === iss.danhGiaId);
              return (
                <tr key={i}>
                  <td style={{ textAlign: "center", fontWeight: "bold" }}>
                    {i + 1}
                  </td>
                  {isMulti && (
                    <td style={{ fontSize: "10pt" }}>
                      {r?.vitri_type?.ten_vitri}
                    </td>
                  )}
                  <td
                    style={{
                      fontWeight: "bold",
                      color: iss.color,
                      textAlign: "center",
                    }}
                  >
                    {iss.sid}
                  </td>
                  <td style={{ color: iss.color, fontSize: "10pt" }}>
                    {S_META[iss.sid]?.name}
                  </td>
                  <td>{iss.text}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="pa-muc">{mucIII}. Yêu cầu</div>
        <div className="pa-nd" style={{ marginBottom: "2mm" }}>
          Đề nghị <strong>{khoaLabel}</strong> thực hiện:
        </div>
        <div className="pa-nd" style={{ marginBottom: "2mm" }}>
          <strong>1.</strong> Điền đầy đủ hành động khắc phục vào Phiếu hành
          động khắc phục đính kèm đối với từng tiêu chí chưa đạt.
        </div>
        <div className="pa-nd" style={{ marginBottom: "2mm" }}>
          <strong>2.</strong> Gửi Phiếu hành động khắc phục về Phòng QLCL trước
          ngày <strong>{hanNop.toLocaleDateString("vi-VN")}</strong> ({hanDays}{" "}
          ngày làm việc kể từ ngày nhận phiếu này).
        </div>
        <div className="pa-nd" style={{ marginBottom: "4mm" }}>
          <strong>3.</strong> Triển khai thực hiện và báo cáo kết quả theo đúng
          hạn đã cam kết.
        </div>
        <div
          className="pa-nd"
          style={{ marginTop: "2mm", fontStyle: "italic", fontSize: "12pt" }}
        >
          Trân trọng đề nghị Trưởng {khoaLabel} quan tâm, phối hợp thực hiện./.
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
                <div>- {khoaLabel} (để thực hiện);</div>
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
      </div>

      {/* ══ TRANG 2 — Phiếu hành động khắc phục (khoa điền, gửi lại QLCL) ══ */}
      <div className="pa-wrap" style={{ pageBreakBefore: "always" }}>
        <VanBanHeader
          coQuan1="Bệnh viện Đa khoa Thái Bình"
          coQuan2={khoaLabel}
          soHieu={`HĐKP-${maKhoa}`}
          ngayVanBan={`ngày ${ngayThangNamStr()}`}
          tenLoai="Phiếu hành động khắc phục"
          trichYeu={
            <>
              {khoaLabel} – Ngày đánh giá:{" "}
              {new Date(ngayDG).toLocaleDateString("vi-VN")}
            </>
          }
        />
        <div
          style={{ margin: "3mm 0 2mm", fontSize: "12pt", fontStyle: "italic" }}
        >
          Kính gửi:{" "}
          <strong>
            Phòng Quản lý chất lượng – Bệnh viện Đa khoa Thái Bình
          </strong>
        </div>
        <div
          style={{ fontSize: "12pt", marginBottom: "4mm", fontStyle: "italic" }}
        >
          Thực hiện Phiếu yêu cầu khắc phục số ………………/YCKP-QLCL ngày{" "}
          {ngayThangNamStr()}, {khoaLabel} xin báo cáo hành động khắc phục như
          sau:
        </div>
        <div
          style={{
            fontWeight: "bold",
            fontSize: "12pt",
            margin: "2mm 0",
            color: "#1B3A5C",
          }}
        >
          Bảng hành động khắc phục
        </div>
        <table className="pa-bangket" style={{ marginTop: "3mm" }}>
          <thead>
            <tr>
              <th style={{ width: "4%" }}>STT</th>
              <th style={{ width: "6%" }}>Mã S</th>
              <th style={{ width: "26%" }}>Tiêu chí chưa đạt</th>
              <th style={{ width: "22%" }}>
                Gợi ý hành động KP{" "}
                <span style={{ fontSize: "8pt", fontWeight: 400 }}>
                  💡 Gợi ý
                </span>
              </th>
              <th style={{ width: "18%" }}>Hành động thực tế</th>
              <th style={{ width: "12%" }}>Người thực hiện</th>
              <th style={{ width: "12%" }}>Hạn HT</th>
            </tr>
          </thead>
          <tbody>
            {vitriGroups.map((grp) => (
              <Fragment key={grp.r.id}>
                <tr style={{ background: "#E8F0FB" }}>
                  <td
                    colSpan={7}
                    style={{
                      fontWeight: "bold",
                      fontSize: "11pt",
                      color: "#1B3A5C",
                      padding: "5pt 8pt",
                    }}
                  >
                    📍 Vị trí: <strong>{grp.r.vitri_type?.ten_vitri}</strong>
                    &nbsp;|&nbsp; Ngày ĐG:{" "}
                    {new Date(grp.r.ngay_danh_gia).toLocaleDateString("vi-VN")}
                    &nbsp;|&nbsp; Tỷ lệ: <strong>{grp.r.pct}%</strong>
                  </td>
                </tr>
                {grp.issues.map((iss, i) => (
                  <tr key={i}>
                    <td
                      style={{
                        textAlign: "center",
                        fontWeight: "bold",
                        verticalAlign: "middle",
                      }}
                    >
                      {i + 1}
                    </td>
                    <td
                      style={{
                        fontWeight: "bold",
                        color: iss.color,
                        textAlign: "center",
                        verticalAlign: "middle",
                      }}
                    >
                      {iss.sid}
                    </td>
                    <td style={{ fontSize: "10pt" }}>{iss.text}</td>
                    <td style={{ fontSize: "10pt", color: "#185FA5" }}>
                      <span style={{ fontSize: "9pt", marginRight: 3 }}>
                        💡
                      </span>
                      {smartSuggestKP(iss.text, iss.sid)}
                    </td>
                    <td>
                      &nbsp;
                      <br />
                      &nbsp;
                    </td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
        <div
          style={{ marginTop: "5mm", fontSize: "11pt", fontStyle: "italic" }}
        >
          {khoaLabel} cam kết thực hiện đúng các hành động khắc phục trên và báo
          cáo kết quả về Phòng Quản lý chất lượng theo đúng hạn đã ghi.
        </div>
        {/* Bảng thật thay vì display:grid -- Word không đọc CSS Grid, sẽ xếp
            3 cột chồng dọc thay vì song song như web preview. table-layout:fixed
            + border=0 -- nếu không khoá cứng, Word tự co giãn cột theo độ dài
            chữ trong ô (VD "TRƯỞNG BAN BẢO VỆ" dài hơn) khiến 3 cột lệch nhau,
            nhìn mất cân đối/không thẳng trục thay vì chia đều 3 phần bằng nhau. */}
        <table
          style={{
            width: "100%",
            tableLayout: "fixed",
            borderCollapse: "collapse",
            border: "none",
            marginTop: "8mm",
          }}
          border={0}
          cellPadding={0}
          cellSpacing={0}
        >
          <tbody>
            <tr>
              <td
                style={{
                  border: "none",
                  width: "33.33%",
                  textAlign: "center",
                  fontSize: "11pt",
                }}
              >
                <div style={{ fontStyle: "italic" }}>Người điền phiếu</div>
                <div style={{ fontWeight: "bold" }}>(Ký, ghi rõ họ tên)</div>
                <div style={{ marginTop: "18mm" }}>&nbsp;</div>
              </td>
              <td
                style={{
                  border: "none",
                  width: "33.33%",
                  textAlign: "center",
                  fontSize: "11pt",
                }}
              >
                <div style={{ fontStyle: "italic" }}>5S Champion</div>
                <div style={{ fontWeight: "bold" }}>(Ký, ghi rõ họ tên)</div>
                <div style={{ marginTop: "18mm" }}>&nbsp;</div>
              </td>
              <td
                style={{
                  border: "none",
                  width: "33.33%",
                  textAlign: "center",
                  fontSize: "11pt",
                }}
              >
                <div
                  style={{
                    fontWeight: "bold",
                    fontSize: "10pt",
                    textTransform: "uppercase",
                  }}
                >
                  Trưởng {khoaLabel}
                </div>
                <div style={{ fontWeight: "bold" }}>(Ký, ghi rõ họ tên)</div>
                <div style={{ marginTop: "18mm" }}>&nbsp;</div>
              </td>
            </tr>
          </tbody>
        </table>
        <div className="pa-footer-note">
          Phiếu được tạo tự động bởi Bộ công cụ đánh giá 5S – Bệnh viện Đa khoa
          Thái Bình – Ngày in: {ngayThangNamStr()}
        </div>
      </div>
    </>
  );
}
