import type { RptType } from "./types";

// 4 thẻ chọn loại báo cáo -- thuần hiển thị, index.tsx truyền state + setter xuống.
export default function ReportTypeSelector({
  rptType,
  setRptType,
}: {
  rptType: RptType;
  setRptType: (t: RptType) => void;
}) {
  return (
    <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {/* Tạm ẩn theo yêu cầu -- bật lại bằng cách bỏ comment khối này (mọi
          logic/state/JSX liên quan ở dưới vẫn còn nguyên, không xoá gì).
      <button
        onClick={() => setRptType('luot')}
        className={`rounded-2xl border p-4 text-left transition ${
          rptType === 'luot'
            ? 'border-brand-500 bg-brand-25 ring-1 ring-brand-200 dark:bg-brand-500/5'
            : 'border-gray-200 bg-white hover:border-brand-200 dark:border-gray-800 dark:bg-gray-900'
        }`}
      >
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">📋 Báo cáo từng lượt đánh giá</p>
        <p className="mt-1 text-xs text-gray-400">Phiếu kết quả 1 lượt cụ thể — điểm tổng, tiêu chí lỗi, ký tên 2 bên</p>
      </button>
      */}
      <button
        onClick={() => setRptType("thang")}
        className={`rounded-2xl border p-4 text-left transition ${
          rptType === "thang"
            ? "border-brand-500 bg-brand-25 ring-1 ring-brand-200 dark:bg-brand-500/5"
            : "border-gray-200 bg-white hover:border-brand-200 dark:border-gray-800 dark:bg-gray-900"
        }`}
      >
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          📊 Báo cáo tổng hợp tháng
        </p>
        <p className="mt-1 text-xs text-gray-400">
          Bảng xếp hạng tất cả lượt trong tháng, điểm trung bình toàn viện
        </p>
      </button>
      <button
        onClick={() => setRptType("donvi")}
        className={`rounded-2xl border p-4 text-left transition ${
          rptType === "donvi"
            ? "border-brand-500 bg-brand-25 ring-1 ring-brand-200 dark:bg-brand-500/5"
            : "border-gray-200 bg-white hover:border-brand-200 dark:border-gray-800 dark:bg-gray-900"
        }`}
      >
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          🏥 Báo cáo theo đơn vị & ngày
        </p>
        <p className="mt-1 text-xs text-gray-400">
          Lịch sử toàn bộ lượt đánh giá của 1 khoa trong 1 khoảng thời gian
        </p>
      </button>
      <button
        onClick={() => setRptType("dot")}
        className={`rounded-2xl border p-4 text-left transition ${
          rptType === "dot"
            ? "border-brand-500 bg-brand-25 ring-1 ring-brand-200 dark:bg-brand-500/5"
            : "border-gray-200 bg-white hover:border-brand-200 dark:border-gray-800 dark:bg-gray-900"
        }`}
      >
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          🗂️ Báo cáo theo đợt đánh giá
        </p>
        <p className="mt-1 text-xs text-gray-400">
          Tổng hợp toàn bộ lượt trong 1 đợt đánh giá của 1 khoa/phòng — kèm
          khắc phục, nhận xét
        </p>
      </button>
      <button
        onClick={() => setRptType("guikhoa")}
        className={`rounded-2xl border p-4 text-left transition ${
          rptType === "guikhoa"
            ? "border-brand-500 bg-brand-25 ring-1 ring-brand-200 dark:bg-brand-500/5"
            : "border-gray-200 bg-white hover:border-brand-200 dark:border-gray-800 dark:bg-gray-900"
        }`}
      >
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          📨 Phiếu yêu cầu khắc phục (gửi đơn vị)
        </p>
        <p className="mt-1 text-xs text-gray-400">
          Chỉ liệt kê lỗi — yêu cầu đơn vị điền hành động KP và nộp về trong
          hạn quy định
        </p>
      </button>
    </div>
  );
}
