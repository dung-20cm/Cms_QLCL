import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

export interface ToastItem {
  id: number
  type: 'success' | 'error'
  message: string
}

interface ToastState {
  items: ToastItem[]
}

const initialState: ToastState = {
  items: [],
}

let nextId = 1

const toastSlice = createSlice({
  name: 'toast',
  initialState,
  reducers: {
    addToast: {
      reducer(state, action: PayloadAction<ToastItem>) {
        state.items.push(action.payload)
      },
      prepare(payload: { type: 'success' | 'error'; message: string }) {
        return { payload: { id: nextId++, ...payload } }
      },
    },
    removeToast(state, action: PayloadAction<number>) {
      state.items = state.items.filter((t) => t.id !== action.payload)
    },
  },
})

export const { addToast, removeToast } = toastSlice.actions
export default toastSlice.reducer
