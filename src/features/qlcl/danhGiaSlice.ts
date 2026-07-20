import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import type { DanhGia } from './types'
import { fetchDanhGiaList } from './api'
import type { RootState } from '../../app/store'

// Toàn bộ danh sách đánh giá — nhiều trang (Thống kê, Tổng hợp, Xu hướng, Báo
// cáo, banner "Lịch hôm nay") đều cần đúng tập dữ liệu này. Trước đây MỖI
// trang tự gọi API riêng dù dữ liệu giống hệt nhau -- vừa gọi lặp lại mỗi lần
// chuyển trang, vừa gọi dồn dập khi nhiều widget cùng mount lúc đăng nhập.
// Cache 1 lần trong Redux, trang nào cần chỉ đọc lại (dispatch fetch chỉ khi
// status còn 'idle'); gọi invalidateDanhGia() sau khi lưu 1 lượt đánh giá mới
// (Bảng kiểm) để lần đọc tiếp theo tự làm mới thay vì hiển thị dữ liệu cũ.
interface DanhGiaState {
  rows: DanhGia[]
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

const initialState: DanhGiaState = {
  rows: [],
  status: 'idle',
  error: null,
}

export const loadDanhGia = createAsyncThunk<DanhGia[], void, { rejectValue: string; state: RootState }>(
  'danhGia/load',
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetchDanhGiaList()
      return res.rows.filter((r) => r.active !== 0)
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Không tải được danh sách đánh giá')
    }
  },
  {
    // Chặn dispatch trùng: 2 component cùng mount trong 1 lượt render (VD
    // banner "Lịch hôm nay" + trang Thống kê) đều đọc status 'idle' từ closure
    // render của riêng mình rồi cùng dispatch -- condition đọc state SỐNG tại
    // thời điểm xử lý dispatch (không phải closure cũ) nên lượt dispatch thứ 2
    // sẽ thấy status đã là 'loading' (do lượt đầu vừa cập nhật) và tự huỷ.
    condition: (_, { getState }) => {
      const status = getState().danhGia.status
      return status !== 'loading' && status !== 'succeeded'
    },
  },
)

const danhGiaSlice = createSlice({
  name: 'danhGia',
  initialState,
  reducers: {
    // Đánh dấu cache cũ -- KHÔNG xoá rows ngay (tránh nháy trắng UI), chỉ đưa
    // status về 'idle' để lần useDanhGia() tiếp theo tự fetch lại bản mới.
    invalidateDanhGia(state) {
      state.status = 'idle'
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadDanhGia.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(loadDanhGia.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.rows = action.payload
      })
      .addCase(loadDanhGia.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || 'Không tải được danh sách đánh giá'
      })
  },
})

export const { invalidateDanhGia } = danhGiaSlice.actions
export default danhGiaSlice.reducer
