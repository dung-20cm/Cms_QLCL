import type { ReactNode } from "react";
import { DIA_DANH } from "../constants";

// Header 2 cột theo NĐ30: quốc hiệu tiêu ngữ (phải, gạch chân) + tên đơn vị (trái, gạch chân) + số ký hiệu
export default function VanBanHeader({
  coQuan1,
  coQuan2,
  soHieu,
  ngayVanBan,
  tenLoai,
  trichYeu,
}: {
  coQuan1: string;
  coQuan2: string;
  soHieu: string;
  ngayVanBan: string;
  tenLoai: string;
  trichYeu: ReactNode;
}) {
  return (
    <>
      {/* Dùng <table> thật thay vì div display:table -- Word (mở file .doc qua
          engine riêng, không phải trình duyệt) không đọc display:table/table-cell,
          sẽ xếp 2 cột chồng dọc thay vì song song như web preview. */}
      <table
        className="pa-nd30-header"
        border={0}
        cellPadding={0}
        cellSpacing={0}
      >
        <tbody>
          <tr>
            {/* Cột trái hẹp hơn (42%), cột phải rộng hơn (58%) -- nội dung cột phải
            ("CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM") dài hơn cột trái, chia đều
            50/50 làm nó thiếu chỗ và xuống dòng khi mở bằng Word. */}
            <td className="pa-nd30-left" style={{ width: "42%" }}>
              <div className="pa-nd30-coquan">{coQuan1}</div>
              <div className="pa-nd30-ten">{coQuan2}</div>
              <div className="pa-nd30-gach" />
            </td>
            <td className="pa-nd30-right" style={{ width: "58%" }}>
              <div className="pa-nd30-quochieu">
                Cộng hoà xã hội chủ nghĩa Việt Nam
              </div>
              <div className="pa-nd30-tieungu">Độc lập – Tự do – Hạnh phúc</div>
            </td>
          </tr>
        </tbody>
      </table>
      <table
        className="pa-nd30-sohieu"
        border={0}
        cellPadding={0}
        cellSpacing={0}
      >
        <tbody>
          <tr>
            <td className="pa-nd30-so">Số: ………………/{soHieu}</td>
            <td className="pa-nd30-ngay">
              {DIA_DANH}, {ngayVanBan}
            </td>
          </tr>
        </tbody>
      </table>
      <div className="pa-nd30-tenloai">{tenLoai}</div>
      <div className="pa-nd30-trichyeu">{trichYeu}</div>
    </>
  );
}
