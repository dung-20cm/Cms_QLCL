import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import type { LichPhanCong } from './types'
import { fetchLichPhanCongList } from './api'
import { fmt } from './lichUtils'
import type { RootState } from '../../app/store'

// Lịch phân công của ĐÚNG hôm nay -- dùng chung cho banner "Lịch hôm nay"
// (mọi trang) và trang Thống kê (khối "Lịch đánh giá hôm nay"). Trước đây 2
// nơi này tự gọi API giống hệt nhau (cùng khoảng ngày) mỗi khi cùng mount,
// nhân đôi số lần gọi ngay lúc vừa đăng nhập. Cache theo NGÀY -- nếu app mở
// qua nửa đêm sang ngày mới, lần đọc tiếp theo tự phát hiện lệch ngày và fetch lại.
interface TodayLichState {
  rows: LichPhanCong[]
  dateFetched: string | null
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

const initialState: TodayLichState = {
  rows: [],
  dateFetched: null,
  status: 'idle',
  error: null,
}

export const loadTodayLich = createAsyncThunk<
  { rows: LichPhanCong[]; dateFetched: string },
  void,
  { rejectValue: string; state: RootState }
>(
  'todayLich/load',
  async (_, { rejectWithValue }) => {
    try {
      const todayStr = fmt(new Date())
      const res = await fetchLichPhanCongList({ tu_ngay: todayStr, den_ngay: todayStr })
      return { rows: res.rows.filter((l) => l.active !== 0), dateFetched: todayStr }
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Không tải được lịch hôm nay')
    }
  },
  {
    // Chặn dispatch trùng khi nhiều component cùng mount 1 lượt render (banner
    // + trang Thống kê) — xem giải thích chi tiết ở danhGiaSlice.ts. Vẫn cho
    // dispatch lại nếu cache đã "succeeded" nhưng lệch ngày (app mở qua nửa đêm).
    condition: (_, { getState }) => {
      const s = getState().todayLich
      if (s.status === 'loading') return false
      if (s.status === 'succeeded' && s.dateFetched === fmt(new Date())) return false
      return true
    },
  },
)

const todayLichSlice = createSlice({
  name: 'todayLich',
  initialState,
  reducers: {
    invalidateTodayLich(state) {
      state.status = 'idle'
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadTodayLich.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(loadTodayLich.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.rows = action.payload.rows
        state.dateFetched = action.payload.dateFetched
      })
      .addCase(loadTodayLich.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || 'Không tải được lịch hôm nay'
      })
  },
})

export const { invalidateTodayLich } = todayLichSlice.actions
export default todayLichSlice.reducer
