import { useEffect, useMemo, useState } from "react";
import { ClipboardCheck, Percent, Building2, Wrench } from "lucide-react";
import StatCard from "../components/ui/StatCard";
import ChartCard from "../components/ui/ChartCard";
import CountUp from "../components/ui/CountUp";
import TrendChart from "../components/charts/TrendChart";
import GroupBreakdownChart from "../components/charts/GroupBreakdownChart";
import TargetChart from "../components/charts/TargetChart";
import {
  LoadingRow,
  ErrorBanner,
  EmptyState,
  useDanhGia,
  useKhacPhuc,
  useTodayLich,
} from "../components/ui/PageShell";
import { fetchDanhGiaList } from "../features/qlcl/api";
import type { DanhGia, LichPhanCong } from "../features/qlcl/types";
import { toneBadgeClass, toneFromPct } from "../features/qlcl/types";
import { isLichDone, isLichSelfReview } from "../features/qlcl/lichUtils";

const TARGET_PCT = 90;

const S_IDS = ["S1", "S2", "S3", "S4", "S5"];

// "2026-07-05" -> "T7/26"
function monthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  return `T${Number(m)}/${y.slice(2)}`;
}
const fmt = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export default function Dashboard() {
  // Dữ liệu lấy từ cache Redux dùng chung (xem danhGiaSlice/khacPhucSlice/
  // todayLichSlice) -- không tự gọi API riêng nữa. Nếu trang khác (Tổng hợp,
  // Xu hướng, Báo cáo, banner "Lịch hôm nay") đã tải trước đó thì dùng lại
  // ngay, không gọi lại API; nếu chưa, hook tự fetch và trang này hiện
  // "Đang tải..." trong lúc chờ.
  const danhGia = useDanhGia();
  const khacPhucState = useKhacPhuc();
  const todayLichState = useTodayLich();

  // Khối "Hôm nay" cần đúng số liệu MỚI NHẤT ngay khi vào trang. Cache dùng
  // chung (useDanhGia) chỉ tự fetch khi status còn 'idle' -- nếu trang khác đã
  // tải trước đó trong phiên, Dashboard có thể đang hiển thị bản cache cũ
  // (thiếu lượt vừa lưu vài phút trước). Giống cách trang "Lịch đánh giá" luôn
  // tự gọi fetchDanhGiaList() riêng mỗi lần vào trang, ở đây gọi thêm 1 lần
  // fetch độc lập chỉ để tính todayStats -- không đụng tới cache dùng chung
  // nên các card khác vẫn dùng bản cache mượt như cũ, không nháy trắng cả
  // trang trong lúc chờ.
  const [todayRowsLive, setTodayRowsLive] = useState<DanhGia[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchDanhGiaList()
      .then((res) => {
        if (!cancelled)
          setTodayRowsLive(res.rows.filter((r) => r.active !== 0));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = danhGia.rows;
  const khacPhuc = khacPhucState.rows;
  const lichList = todayLichState.rows;
  const loading =
    danhGia.status === "idle" ||
    danhGia.status === "loading" ||
    khacPhucState.status === "idle" ||
    khacPhucState.status === "loading" ||
    todayLichState.status === "idle" ||
    todayLichState.status === "loading";
  const error = danhGia.error || khacPhucState.error || todayLichState.error;

  const sorted = useMemo(
    () =>
      [...rows].sort(
        (a, b) => b.ngay_danh_gia.localeCompare(a.ngay_danh_gia) || b.id - a.id,
      ),
    [rows],
  );

  const today = new Date();
  const todayStr = fmt(today);
  const thisMonth = todayStr.slice(0, 7);

  // ── KPI hôm nay -- ưu tiên bản fetch riêng (todayRowsLive, luôn mới nhất);
  // trong lúc chờ fetch đó trả về thì tạm dùng bản cache dùng chung (rows) để
  // không hiện trống/0 ngay từ khung hình đầu tiên. ──
  const todayStats = useMemo(() => {
    const source = todayRowsLive ?? rows;
    const todayRows = source.filter((r) => r.ngay_danh_gia === todayStr);
    const dat = todayRows.filter((r) => r.pct >= 70).length;
    const chuaDat = todayRows.length - dat;
    const avg = todayRows.length
      ? Math.round(todayRows.reduce((s, r) => s + r.pct, 0) / todayRows.length)
      : 0;
    return { luot: todayRows.length, dat, chuaDat, avg };
  }, [todayRowsLive, rows, todayStr]);

  // ── Thống kê tổng quan (luỹ kế toàn viện) ──
  const stats = useMemo(() => {
    const n = rows.length;
    const avg = n ? Math.round(rows.reduce((s, r) => s + r.pct, 0) / n) : 0;

    const byKhoa = new Map<number, { sum: number; n: number; name: string }>();
    for (const r of rows) {
      const cur = byKhoa.get(r.khoa_id) || {
        sum: 0,
        n: 0,
        name: r.khoa?.ten_khoa || String(r.khoa_id),
      };
      cur.sum += r.pct;
      cur.n++;
      byKhoa.set(r.khoa_id, cur);
    }
    const excellent = [...byKhoa.values()].filter(
      (v) => v.sum / v.n >= 90,
    ).length;

    const openKP = khacPhuc.filter(
      (k) => k.trang_thai !== "Đã xong" && k.trang_thai !== "Hoàn thành",
    ).length;

    const byMonth = new Map<string, { sum: number; n: number }>();
    for (const r of rows) {
      const ym = r.ngay_danh_gia.slice(0, 7);
      const cur = byMonth.get(ym) || { sum: 0, n: 0 };
      cur.sum += r.pct;
      cur.n++;
      byMonth.set(ym, cur);
    }
    const months = [...byMonth.keys()].sort();
    let dLuot = 0;
    let dPct = 0;
    if (months.length >= 2) {
      const cur = byMonth.get(months[months.length - 1])!;
      const prev = byMonth.get(months[months.length - 2])!;
      dLuot = prev.n ? Math.round(((cur.n - prev.n) / prev.n) * 100) : 0;
      const curAvg = cur.sum / cur.n;
      const prevAvg = prev.sum / prev.n;
      dPct = prevAvg ? Math.round(((curAvg - prevAvg) / prevAvg) * 10) / 10 : 0;
    }

    return {
      n,
      avg,
      excellent,
      totalKhoa: byKhoa.size,
      openKP,
      dLuot,
      dPct,
      byKhoa,
    };
  }, [rows, khacPhuc]);

  // ── Xếp hạng khoa theo tháng này ──
  const khoaThangNay = useMemo(() => {
    const monthRows = rows.filter((r) => r.ngay_danh_gia.startsWith(thisMonth));
    const map = new Map<number, { sum: number; n: number; name: string }>();
    for (const r of monthRows) {
      const cur = map.get(r.khoa_id) || {
        sum: 0,
        n: 0,
        name: r.khoa?.ten_khoa || String(r.khoa_id),
      };
      cur.sum += r.pct;
      cur.n++;
      map.set(r.khoa_id, cur);
    }
    return [...map.entries()]
      .map(([khoa_id, v]) => ({
        khoa_id,
        khoa: v.name,
        avg: Math.round(v.sum / v.n),
        n: v.n,
      }))
      .sort((a, b) => b.avg - a.avg);
  }, [rows, thisMonth]);

  const topGood = khoaThangNay.slice(0, 5);
  const topBad = [...khoaThangNay].reverse().slice(0, 5);
  const topLow = [...khoaThangNay].reverse().slice(0, 6);

  // ── Xu hướng theo tháng (tối đa 7 tháng gần nhất) ──
  const trend = useMemo(() => {
    const byMonth = new Map<
      string,
      { sum: number; n: number; khoa: Set<number> }
    >();
    for (const r of rows) {
      const ym = r.ngay_danh_gia.slice(0, 7);
      const cur = byMonth.get(ym) || { sum: 0, n: 0, khoa: new Set<number>() };
      cur.sum += r.pct;
      cur.n++;
      cur.khoa.add(r.khoa_id);
      byMonth.set(ym, cur);
    }
    const months = [...byMonth.keys()].sort().slice(-7);
    return {
      categories: months.map(monthLabel),
      series: [
        {
          name: "Tỷ lệ đạt trung bình (%)",
          data: months.map((m) =>
            Math.round(byMonth.get(m)!.sum / byMonth.get(m)!.n),
          ),
        },
        {
          name: "Số khoa tham gia đánh giá",
          data: months.map((m) => byMonth.get(m)!.khoa.size),
        },
      ],
    };
  }, [rows]);

  // ── Tỷ lệ đạt S1..S5 tháng này (từ sScores backend tính sẵn) ──
  const groupData = useMemo(() => {
    const monthRows = rows.filter((r) => r.ngay_danh_gia.startsWith(thisMonth));
    const agg: Record<string, { ok: number; total: number }> = {};
    for (const r of monthRows) {
      for (const s of r.sScores || []) {
        const cur = agg[s.id] || { ok: 0, total: 0 };
        cur.ok += s.ok;
        cur.total += s.total;
        agg[s.id] = cur;
      }
    }
    return S_IDS.map((id) => {
      const v = agg[id];
      return v && v.total ? Math.round((v.ok / v.total) * 100) : 0;
    });
  }, [rows, thisMonth]);

  // ── Lịch hôm nay ──
  const lichHomNay = useMemo(() => {
    const thu = today.getDay() === 0 ? 7 : today.getDay();
    return lichList.filter((l) => {
      if (l.loai_lich === "dinh_ky") {
        if (l.thu_trong_tuan !== thu) return false;
        if (l.ngay_thuc_hien && todayStr < l.ngay_thuc_hien) return false;
        return true;
      }
      return l.ngay_thuc_hien === todayStr;
    });
  }, [lichList, todayStr]); // eslint-disable-line react-hooks/exhaustive-deps

  // Gom các lịch cùng khoa + vị trí + LUỒNG (chỉ khác người đánh giá) thành 1
  // dòng -- trước đây mỗi người đánh giá phụ trách cùng 1 khoa/vị trí tạo ra 1
  // bản ghi lich_phan_cong riêng nên khoa đó bị lặp lại nhiều lần trong danh
  // sách. BẮT BUỘC tách riêng theo luồng (tự đánh giá / Phòng QLCL đánh giá,
  // xem isLichSelfReview ở lichUtils.ts) -- nếu không, 2 lịch của 2 luồng khác
  // nhau (VD Phòng QLCL giao cán bộ đi đánh giá 1 khoa, VÀ khoa đó tự giao
  // nhân viên mình tự đánh giá, trùng vị trí/ngày) sẽ bị gộp chung 1 dòng,
  // dùng "sample" của người này để báo hoàn thành cho cả người kia.
  const lichHomNayGrouped = useMemo(() => {
    const map = new Map<
      string,
      {
        khoa_id: number;
        vitri_type_id: number | null;
        khoaTen: string;
        vitriTen?: string;
        nguoiSet: Set<string>;
        items: LichPhanCong[];
      }
    >();
    for (const l of lichHomNay) {
      const key = `${l.khoa_id}-${l.vitri_type_id ?? "all"}-${isLichSelfReview(l) ? "tu" : "qlcl"}`;
      const cur = map.get(key) || {
        khoa_id: l.khoa_id,
        vitri_type_id: l.vitri_type_id,
        khoaTen: l.khoa?.ten_khoa || String(l.khoa_id),
        vitriTen: l.vitri_type?.ten_vitri,
        nguoiSet: new Set<string>(),
        items: [],
      };
      const ten = l.nguoi_thuc_hien?.email || l.nguoi_thuc_hien?.username;
      if (ten) cur.nguoiSet.add(ten);
      cur.items.push(l);
      map.set(key, cur);
    }
    return [...map.values()].map((g) => ({
      ...g,
      nguoiList: [...g.nguoiSet],
      // Hoàn thành nếu BẤT KỲ người nào trong nhóm (cùng luồng) đã nộp đánh
      // giá đúng khớp lịch của mình -- không chỉ kiểm tra 1 người "đại diện".
      done: g.items.some((l) => isLichDone(rows, l, todayStr)),
    }));
  }, [lichHomNay, rows, todayStr]); // eslint-disable-line react-hooks/exhaustive-deps

  const statCards = [
    {
      label: "Tổng lượt đánh giá",
      value: <CountUp value={stats.n} />,
      change: stats.dLuot,
      icon: ClipboardCheck,
    },
    {
      label: "Tỷ lệ đạt trung bình",
      value: <CountUp value={stats.avg} suffix="%" />,
      change: stats.dPct,
      icon: Percent,
    },
    {
      label: "Khoa/Phòng đạt Xuất sắc",
      value: (
        <>
          <CountUp value={stats.excellent} /> /{" "}
          <CountUp value={stats.totalKhoa} />
        </>
      ),
      change: 0,
      icon: Building2,
    },
    {
      label: "Hành động khắc phục đang mở",
      value: <CountUp value={stats.openKP} />,
      change: 0,
      icon: Wrench,
    },
  ];

  if (loading) return <LoadingRow text="Đang tải số liệu tổng quan..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
          Thống kê — Tổng quan chất lượng 5S
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Số liệu tổng hợp toàn viện từ các lượt đánh giá đã lưu trên máy chủ.
        </p>
      </div>

      {error && <ErrorBanner message={error} />}

      {rows.length === 0 && !error ? (
        <EmptyState message="Chưa có lượt đánh giá nào. Vào Bảng kiểm để chấm điểm 5S đầu tiên." />
      ) : (
        <>
          {/* ── KPI hôm nay ── */}
          <div
            className="animate-rise-in rounded-2xl p-5 text-white"
            style={{
              background: "linear-gradient(135deg,#1B3A5C,#185FA5)",
            }}
          >
            <p className="mb-3 text-xs font-bold uppercase tracking-wide opacity-70">
              📅 Hôm nay — {today.toLocaleDateString("vi-VN")}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="text-center">
                <p className="text-3xl font-extrabold">
                  <CountUp value={todayStats.luot} />
                </p>
                <p className="text-xs opacity-80">Lượt đánh giá</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-extrabold text-emerald-300">
                  <CountUp value={todayStats.dat} />
                </p>
                <p className="text-xs opacity-80">Đạt / Đạt tốt</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-extrabold text-red-300">
                  <CountUp value={todayStats.chuaDat} />
                </p>
                <p className="text-xs opacity-80">Chưa đạt</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-extrabold">
                  {todayStats.luot ? (
                    <CountUp value={todayStats.avg} suffix="%" />
                  ) : (
                    "–"
                  )}
                </p>
                <p className="text-xs opacity-80">Điểm TB hôm nay</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map((s, i) => (
              <StatCard key={s.label} {...s} delay={i * 70} />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <ChartCard
                title="Xu hướng đánh giá theo tháng"
                subtitle={`${trend.categories.length} tháng gần nhất`}
              >
                <TrendChart
                  categories={trend.categories}
                  series={trend.series}
                />
              </ChartCard>
            </div>
            <ChartCard title="Mục tiêu tỷ lệ đạt" subtitle="Toàn viện — luỹ kế">
              <TargetChart value={stats.avg} />
              <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
                Mục tiêu {TARGET_PCT}% · Hiện tại{" "}
                <CountUp value={stats.avg} suffix="%" />
              </p>
            </ChartCard>
          </div>

          {/* ── Lịch hôm nay · Khoa cần chú ý · Điểm S1-S5 tháng này ── */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <ChartCard
              title="📅 Lịch đánh giá hôm nay"
              // subtitle={`${lichHomNayGrouped.length} buổi`}
            >
              {lichHomNayGrouped.length === 0 ? (
                <p className="text-sm text-gray-400">Không có lịch hôm nay</p>
              ) : (
                <div className="max-h-[260px] overflow-y-auto">
                  {lichHomNayGrouped.map((g) => (
                    <div
                      key={`${g.khoa_id}-${g.vitri_type_id ?? "all"}`}
                      className="flex items-center gap-2 border-b border-gray-100 py-2 text-xs last:border-0 dark:border-gray-800"
                    >
                      <span className="text-base">{g.done ? "✅" : "⏳"}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-[#1B3A5C] dark:text-gray-100">
                          {g.khoaTen}
                          {g.vitriTen && (
                            <span className="ml-1 font-normal text-gray-400">
                              · {g.vitriTen}
                            </span>
                          )}
                        </p>
                        <p className="truncate text-[10.5px] text-gray-400">
                          {g.nguoiList.length ? g.nguoiList.join(" · ") : "—"}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          g.done
                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                            : "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400"
                        }`}
                      >
                        {g.done ? "Đã xong" : "Chưa"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </ChartCard>

            <ChartCard
              title="🔴 Khoa cần chú ý"
              subtitle="Điểm thấp nhất tháng này"
            >
              {topLow.length === 0 ? (
                <p className="text-sm text-gray-400">
                  Chưa có dữ liệu tháng này
                </p>
              ) : (
                <ul className="max-h-[220px] space-y-2 overflow-y-auto">
                  {topLow.map((k, i) => (
                    <li
                      key={k.khoa_id}
                      className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm dark:bg-gray-800/50"
                    >
                      <span className="text-gray-700 dark:text-gray-200">
                        <span className="mr-1.5 text-gray-400">{i + 1}.</span>
                        {k.khoa}
                      </span>
                      <span
                        className="font-bold"
                        style={{
                          color:
                            k.avg < 60
                              ? "#E24B4A"
                              : k.avg < 75
                                ? "#BA7517"
                                : "#185FA5",
                        }}
                      >
                        {k.avg}%
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </ChartCard>

            {/* <ChartCard title="Tỷ lệ đạt theo nhóm 5S" subtitle="Tháng này">
              <GroupBreakdownChart data={groupData} />
            </ChartCard> */}
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-1">
            <ChartCard title="Tỷ lệ đạt theo nhóm 5S" subtitle="Tháng này">
              <GroupBreakdownChart data={groupData} />
            </ChartCard>
          </div>
          {/* ── Top 5 khoa tốt / cần cải thiện ── */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <ChartCard
              title="🏆 Top 5 khoa tốt nhất tháng"
              subtitle={`Tháng ${thisMonth.slice(5)}/${thisMonth.slice(0, 4)}`}
            >
              {topGood.length === 0 ? (
                <p className="text-sm text-gray-400">
                  Chưa có dữ liệu tháng này
                </p>
              ) : (
                <ul className="space-y-2">
                  {topGood.map((k, i) => (
                    <li
                      key={k.khoa_id}
                      className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-sm dark:bg-emerald-500/10"
                    >
                      <span className="font-medium text-gray-700 dark:text-gray-200">
                        <span className="mr-1.5 text-gray-400">#{i + 1}</span>
                        {k.khoa}
                      </span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {k.avg}%
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </ChartCard>
            <ChartCard
              title="⚠ Top 5 khoa cần cải thiện"
              subtitle={`Tháng ${thisMonth.slice(5)}/${thisMonth.slice(0, 4)}`}
            >
              {topBad.length === 0 ? (
                <p className="text-sm text-gray-400">
                  Chưa có dữ liệu tháng này
                </p>
              ) : (
                <ul className="space-y-2">
                  {topBad.map((k, i) => (
                    <li
                      key={k.khoa_id}
                      className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2 text-sm dark:bg-red-500/10"
                    >
                      <span className="font-medium text-gray-700 dark:text-gray-200">
                        <span className="mr-1.5 text-gray-400">#{i + 1}</span>
                        {k.khoa}
                      </span>
                      <span className="font-bold text-red-500">{k.avg}%</span>
                    </li>
                  ))}
                </ul>
              )}
            </ChartCard>
          </div>

          {/* ── Bảng xếp hạng khoa đầy đủ + Kết quả gần đây ── */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <ChartCard
              title="🏅 Bảng xếp hạng khoa — tháng này"
              subtitle="Sắp xếp theo tỷ lệ đạt trung bình"
            >
              <div className="max-h-[340px] overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-white dark:bg-gray-900">
                    <tr className="border-b border-gray-100 text-xs uppercase text-gray-400 dark:border-gray-800">
                      <th className="py-2 pr-3 font-medium">Hạng</th>
                      <th className="py-2 pr-3 font-medium">Khoa/Phòng</th>
                      <th className="py-2 pr-3 font-medium">Lượt</th>
                      <th className="py-2 font-medium">Tỷ lệ đạt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {khoaThangNay.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="py-6 text-center text-gray-400"
                        >
                          Chưa có dữ liệu tháng này
                        </td>
                      </tr>
                    )}
                    {khoaThangNay.map((k, i) => (
                      <tr
                        key={k.khoa_id}
                        className="border-b border-gray-50 last:border-0 dark:border-gray-800"
                      >
                        <td className="py-2 pr-3">
                          <span
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                              i === 0
                                ? "bg-amber-100 text-amber-700"
                                : i === 1
                                  ? "bg-gray-200 text-gray-600"
                                  : i === 2
                                    ? "bg-orange-100 text-orange-700"
                                    : "text-gray-400"
                            }`}
                          >
                            {i + 1}
                          </span>
                        </td>
                        <td className="py-2 pr-3 font-medium text-gray-700 dark:text-gray-200">
                          {k.khoa}
                        </td>
                        <td className="py-2 pr-3 text-gray-500 dark:text-gray-400">
                          {k.n}
                        </td>
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${k.avg}%`,
                                  background:
                                    k.avg >= 90
                                      ? "#1D9E75"
                                      : k.avg >= 75
                                        ? "#185FA5"
                                        : k.avg >= 60
                                          ? "#BA7517"
                                          : "#E24B4A",
                                }}
                              />
                            </div>
                            <span className="font-semibold text-gray-700 dark:text-gray-200">
                              {k.avg}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>

            <ChartCard
              title="Kết quả gần đây"
              subtitle="5 lượt đánh giá mới nhất"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="whitespace-nowrap border-b border-gray-100 text-xs uppercase text-gray-400 dark:border-gray-800">
                      <th className="pb-3 pr-4 font-medium">Khoa/Phòng</th>
                      <th className="pb-3 pr-4 font-medium">Vị trí</th>
                      <th className="pb-3 pr-4 font-medium">Ngày</th>
                      <th className="pb-3 pr-4 font-medium">% Đạt</th>
                      <th className="pb-3 font-medium">Xếp loại</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.slice(0, 5).map((r) => (
                      <tr
                        key={r.id}
                        className="whitespace-nowrap border-b border-gray-50 last:border-0 dark:border-gray-800"
                      >
                        <td className="py-3 pr-4 font-medium text-gray-700 dark:text-gray-200">
                          {r.khoa?.ten_khoa || r.khoa_id}
                        </td>
                        <td className="py-3 pr-4 text-gray-500 dark:text-gray-400">
                          {r.vitri_type?.ten_vitri || "—"}
                        </td>
                        <td className="py-3 pr-4 text-gray-500 dark:text-gray-400">
                          {r.ngay_danh_gia}
                        </td>
                        <td
                          className="py-3 pr-4 font-semibold"
                          style={{
                            color:
                              r.pct >= 90
                                ? "#1D9E75"
                                : r.pct >= 75
                                  ? "#185FA5"
                                  : r.pct >= 60
                                    ? "#BA7517"
                                    : "#E24B4A",
                          }}
                        >
                          {r.pct}%
                        </td>
                        <td className="py-3">
                          <span
                            className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${toneBadgeClass[toneFromPct(r.pct)]}`}
                          >
                            {r.xep_loai}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}
