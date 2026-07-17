import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays } from "lucide-react";
import { useAppSelector } from "../../app/hooks";
import { useCatalog } from "../ui/PageShell";
import { useHasAnyPermission } from "../../features/auth/usePermission";
import { PERM_XEM_LICH } from "../../features/auth/permissions";
import {
  fetchLichPhanCongList,
  fetchDanhGiaList,
} from "../../features/qlcl/api";
import type { LichPhanCong, DanhGia } from "../../features/qlcl/types";
import {
  fmt,
  lichForDate,
  isLichDone,
  groupLich,
  tenNguoi,
} from "../../features/qlcl/lichUtils";

// Banner "Lịch hôm nay" hiện xuyên suốt mọi trang (giống bản mẫu 5S_Dashboard_BVTB_v4)
// — LUÔN chỉ hiện lịch mà người phụ trách thuộc ĐÚNG khoa/phòng của tài khoản đang
// đăng nhập (nhất quán với "Phân công hôm nay" ở trang Lịch đánh giá), tránh lộ
// lịch của khoa/phòng khác cho tài khoản không có phạm vi xem toàn viện.
export default function TodayLichBanner() {
  const navigate = useNavigate();
  const currentUser = useAppSelector((s) => s.auth.user);
  const canSeeLich = useHasAnyPermission(PERM_XEM_LICH);
  const { users } = useCatalog();
  const [lichList, setLichList] = useState<LichPhanCong[]>([]);
  const [danhGiaList, setDanhGiaList] = useState<DanhGia[]>([]);

  useEffect(() => {
    if (!canSeeLich) return;
    Promise.all([
      fetchLichPhanCongList(),
      fetchDanhGiaList().catch(() => ({ rows: [] as DanhGia[], total: 0 })),
    ])
      .then(([lich, dg]) => {
        setLichList(lich.rows.filter((l) => l.active !== 0));
        setDanhGiaList(dg.rows.filter((d) => d.active !== 0));
      })
      .catch(() => {});
  }, [canSeeLich]);

  const userKhoaMap = useMemo(
    () => new Map(users.map((u) => [u.id, u.khoa_id ?? null])),
    [users],
  );
  const todayStr = fmt(new Date());

  const todayGroups = useMemo(() => {
    if (currentUser?.khoa_id == null) return [];
    const todayLich = lichForDate(lichList, todayStr).filter(
      (l) => userKhoaMap.get(l.nguoi_thuc_hien_id) === currentUser.khoa_id,
    );
    return groupLich(todayLich);
  }, [lichList, userKhoaMap, currentUser?.khoa_id, todayStr]);

  if (!canSeeLich || todayGroups.length === 0) return null;

  const total = todayGroups.length;
  const doneCount = todayGroups.filter((g) =>
    isLichDone(danhGiaList, g.items[0], todayStr),
  ).length;
  const statusTxt =
    doneCount === total
      ? "✅ Tất cả đã hoàn thành!"
      : `⏳ ${doneCount}/${total} đã hoàn thành`;
  const names = todayGroups
    .map((g) => {
      const people = g.items.map(tenNguoi).filter(Boolean).join(", ");
      return `${g.khoa?.ten_khoa || ""}${people ? ` (${people})` : ""}`;
    })
    .join(" · ");

  return (
    <div
      onClick={() => navigate("/lich-danh-gia")}
      className="flex cursor-pointer flex-wrap items-center justify-between gap-x-3 gap-y-1 bg-gradient-to-r from-[#1B3A5C] to-[#185FA5] px-4 py-2.5 text-[13px] text-white sm:px-6"
    >
      <span className="flex items-center gap-1.5">
        <CalendarDays size={14} className="shrink-0" />
        <strong>Lịch hôm nay:</strong> {names} &nbsp;|&nbsp; {statusTxt}
      </span>
      <span className="shrink-0 text-[11px] opacity-80">Bấm để xem lịch →</span>
    </div>
  );
}
