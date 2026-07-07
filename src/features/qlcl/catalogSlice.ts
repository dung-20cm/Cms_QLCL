import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import type { Khoa, VitriType, UserLite } from './types'
import { fetchKhoaList, fetchVitriTypeList, fetchUserList } from './api'

// Danh mục dùng chung toàn app (khoa, vị trí, cán bộ) — fetch 1 lần, cache trong Redux
interface CatalogState {
  khoaList: Khoa[]
  vitriTypes: VitriType[]
  users: UserLite[]
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

const initialState: CatalogState = {
  khoaList: [],
  vitriTypes: [],
  users: [],
  status: 'idle',
  error: null,
}

export const loadCatalog = createAsyncThunk<
  { khoaList: Khoa[]; vitriTypes: VitriType[]; users: UserLite[] },
  void,
  { rejectValue: string }
>('catalog/load', async (_, { rejectWithValue }) => {
  try {
    const [khoa, vitri, users] = await Promise.all([
      fetchKhoaList(),
      fetchVitriTypeList(),
      // user thường có thể không đủ quyền xem danh sách user — không chặn cả catalog
      fetchUserList().catch(() => ({ rows: [], total: 0 })),
    ])
    const sortByName = (a: Khoa, b: Khoa) => a.ten_khoa.localeCompare(b.ten_khoa, 'vi')
    return {
      khoaList: [...khoa.rows].filter((k) => k.active !== 0).sort(sortByName),
      vitriTypes: [...vitri.rows].filter((v) => v.active !== 0).sort((a, b) => a.thu_tu - b.thu_tu),
      users: users.rows,
    }
  } catch (err) {
    return rejectWithValue(err instanceof Error ? err.message : 'Không tải được danh mục')
  }
})

const catalogSlice = createSlice({
  name: 'catalog',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadCatalog.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(loadCatalog.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.khoaList = action.payload.khoaList
        state.vitriTypes = action.payload.vitriTypes
        state.users = action.payload.users
      })
      .addCase(loadCatalog.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || 'Không tải được danh mục'
      })
  },
})

export default catalogSlice.reducer
