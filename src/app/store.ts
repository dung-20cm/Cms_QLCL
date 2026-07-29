import { configureStore } from '@reduxjs/toolkit'
import uiReducer from '../features/ui/uiSlice'
import toastReducer from '../features/ui/toastSlice'
import themeReducer from '../features/theme/themeSlice'
import authReducer from '../features/auth/authSlice'
import catalogReducer from '../features/qlcl/catalogSlice'
import danhGiaReducer from '../features/qlcl/danhGiaSlice'
import khacPhucReducer from '../features/qlcl/khacPhucSlice'
import todayLichReducer from '../features/qlcl/todayLichSlice'

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    toast: toastReducer,
    theme: themeReducer,
    auth: authReducer,
    catalog: catalogReducer,
    danhGia: danhGiaReducer,
    khacPhuc: khacPhucReducer,
    todayLich: todayLichReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
