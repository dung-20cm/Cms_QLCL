import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { apiClient, ApiError } from '../../lib/axiosClient'
import { saveToken, clearToken, getToken, isRemembered } from './tokenStorage'
import type { AuthUser, LoginPayload, LoginResponseData, PermissionItem, ProfileResponseData } from './authTypes'

interface AuthState {
  user: AuthUser | null
  permissions: PermissionItem[]
  isAuthenticated: boolean
  // true khi đang xác thực token đã lưu lúc load lại trang (gọi /login-by-token)
  initializing: boolean
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

const initialState: AuthState = {
  user: null,
  permissions: [],
  isAuthenticated: false,
  initializing: !!getToken(),
  status: 'idle',
  error: null,
}

function extractErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message
  if (err instanceof Error) return err.message
  return fallback
}

interface LoginApiResponse {
  data: LoginResponseData
}

interface ProfileApiResponse {
  data: ProfileResponseData
}

interface ChangePasswordPayload {
  old_password: string
  new_password: string
}

interface ChangePasswordApiResponse {
  data: { token: string }
}

export const loginUser = createAsyncThunk<LoginResponseData, LoginPayload, { rejectValue: string }>(
  'auth/loginUser',
  async ({ username, password, remember }, { rejectWithValue }) => {
    try {
      const res = await apiClient.post<LoginApiResponse>('/login', { username, password })
      const data = res.data.data
      saveToken(data.token, remember)
      return data
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Đăng nhập thất bại. Vui lòng thử lại!'))
    }
  },
)

// Gọi khi mở lại app: dùng token đã lưu để lấy lại thông tin user + quyền,
// đồng thời BE cấp token mới (xem service/user.service.js -> getProfile).
export const restoreSession = createAsyncThunk<ProfileResponseData, void, { rejectValue: string }>(
  'auth/restoreSession',
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiClient.get<ProfileApiResponse>('/login-by-token')
      const data = res.data.data
      saveToken(data.token, isRemembered())
      return data
    } catch (err) {
      clearToken()
      return rejectWithValue(extractErrorMessage(err, 'Phiên đăng nhập đã hết hạn!'))
    }
  },
)

// Đổi mật khẩu tài khoản đang đăng nhập. BE cấp token mới sau khi đổi (xem
// service/user.service.js -> changePassword) nên phải lưu lại token mới, nếu
// không lần gọi API tiếp theo vẫn dùng token cũ (vẫn còn hợp lệ nhưng để nhất quán).
export const changePassword = createAsyncThunk<void, ChangePasswordPayload, { rejectValue: string }>(
  'auth/changePassword',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await apiClient.post<ChangePasswordApiResponse>('/change_password', { data: payload })
      saveToken(res.data.data.token, isRemembered())
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Đổi mật khẩu thất bại. Vui lòng thử lại!'))
    }
  },
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      clearToken()
      state.user = null
      state.permissions = []
      state.isAuthenticated = false
      state.initializing = false
      state.status = 'idle'
      state.error = null
    },
    clearAuthError(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(loginUser.fulfilled, (state, action: PayloadAction<LoginResponseData>) => {
        state.status = 'succeeded'
        state.user = action.payload.user
        // BE /login trả quyền ở data.role.list_permission; /login-by-token trả ở data.list_permission
        state.permissions = action.payload.list_permission ?? action.payload.role?.list_permission ?? []
        state.isAuthenticated = true
        state.initializing = false
        state.error = null
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = 'failed'
        state.isAuthenticated = false
        state.error = action.payload || 'Đăng nhập thất bại. Vui lòng thử lại!'
      })
      .addCase(restoreSession.pending, (state) => {
        state.initializing = true
      })
      .addCase(restoreSession.fulfilled, (state, action: PayloadAction<ProfileResponseData>) => {
        state.user = action.payload.user
        state.permissions = action.payload.list_permission
        state.isAuthenticated = true
        state.initializing = false
      })
      .addCase(restoreSession.rejected, (state) => {
        state.user = null
        state.permissions = []
        state.isAuthenticated = false
        state.initializing = false
      })
  },
})

export const { logout, clearAuthError } = authSlice.actions
export default authSlice.reducer
