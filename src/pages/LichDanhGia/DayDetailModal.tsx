import { Modal } from "../../components/ui/PageShell";
import { groupLich } from "../../features/qlcl/lichUtils";
import { fmt, fmtVN } from "./dateUtils";
import LichCard from "./LichCard";
import type { LichDanhGiaData } from "./useLichDanhGiaData";

// Modal "Xem thêm" — đủ lịch của 1 ngày (khi ngày đó có > DAY_VISIBLE_LIMIT buổi)
export default function DayDetailModal({ lg }: { lg: LichDanhGiaData }) {
  const {
    dayModalDate,
    setDayModalDate,
    lichForDay,
    today,
    todayStr,
    isDone,
    canManageThisView,
    openEditModal,
    setConfirmDeleteGroup,
    setDeleteError,
  } = lg;

  return (
    <Modal
      open={!!dayModalDate}
      title={
        dayModalDate
          ? `Lịch ngày ${fmtVN(dayModalDate)}${fmt(dayModalDate) === todayStr ? " • Hôm nay" : ""}`
          : "Lịch trong ngày"
      }
      onClose={() => setDayModalDate(null)}
    >
      {dayModalDate && (
        <div className="grid gap-2 sm:grid-cols-2">
          {groupLich(lichForDay(dayModalDate)).map((g) => (
            <LichCard
              key={g.key}
              g={g}
              d={dayModalDate}
              today={today}
              isDone={isDone}
              canManageThisView={canManageThisView}
              onEdit={() => openEditModal(g)}
              onDelete={() => {
                setDeleteError(null);
                setConfirmDeleteGroup(g);
              }}
            />
          ))}
        </div>
      )}
    </Modal>
  );
}
