import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import type { KhacPhuc } from './types'
import { fetchKhacPhucList } from './api'
import type { RootState } from '../../app/store'

// Toàn bộ danh sách hành động khắc phục -- dùng chung cho Thống kê, Báo cáo,
// Tiến độ khắc phục. Cache 1 lần, gọi invalidateKhacPhuc() sau khi tạo/sửa/xoá
// (trang Tiến độ khắc phục) để lần đọc tiếp theo tự làm mới.
interface KhacPhucState {
  rows: KhacPhuc[]
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

const initialState: KhacPhucState = {
  rows: [],
  status: 'idle',
  error: null,
}

export const loadKhacPhuc = createAsyncThunk<KhacPhuc[], void, { rejectValue: string; state: RootState }>(
  'khacPhuc/load',
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetchKhacPhucList()
      return res.rows.filter((r) => r.active !== 0)
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Không tải được danh sách khắc phục')
    }
  },
  {
    // Chặn dispatch trùng khi nhiều component cùng mount 1 lượt render — xem
    // giải thích chi tiết ở danhGiaSlice.ts.
    condition: (_, { getState }) => {
      const status = getState().khacPhuc.status
      return status !== 'loading' && status !== 'succeeded'
    },
  },
)

const khacPhucSlice = createSlice({
  name: 'khacPhuc',
  initialState,
  reducers: {
    invalidateKhacPhuc(state) {
      state.status = 'idle'
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadKhacPhuc.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(loadKhacPhuc.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.rows = action.payload
      })
      .addCase(loadKhacPhuc.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || 'Không tải được danh sách khắc phục'
      })
  },
})

export const { invalidateKhacPhuc } = khacPhucSlice.actions
export default khacPhucSlice.reducer
