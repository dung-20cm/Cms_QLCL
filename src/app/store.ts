import { configureStore } from '@reduxjs/toolkit'
import uiReducer from '../features/ui/uiSlice'
import themeReducer from '../features/theme/themeSlice'
import authReducer from '../features/auth/authSlice'
import catalogReducer from '../features/qlcl/catalogSlice'

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    theme: themeReducer,
    auth: authReducer,
    catalog: catalogReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
