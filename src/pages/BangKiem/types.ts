import type { ChecklistItem } from "../../features/qlcl/types";

export type KetQua = 0 | 1 | null;
export type ViewMode = "new" | "result" | "edit";

export interface SGroup {
  s_id: string;
  s_name: string;
  s_color: string;
  s_lt: string;
  items: ChecklistItem[];
}

export interface LichCheckResult {
  ok: boolean;
  message?: string;
}
