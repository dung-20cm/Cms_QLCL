// Lưu access token cho phiên đăng nhập.
// "Ghi nhớ đăng nhập" (remember) => lưu localStorage (còn sau khi đóng trình duyệt).
// Không tick => lưu sessionStorage (mất khi đóng tab/trình duyệt).
const TOKEN_KEY = 'qlcl_token'
const REMEMBER_KEY = 'qlcl_remember'

export function saveToken(token: string, remember: boolean) {
  if (remember) {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(REMEMBER_KEY, '1')
    sessionStorage.removeItem(TOKEN_KEY)
  } else {
    sessionStorage.setItem(TOKEN_KEY, token)
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REMEMBER_KEY)
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REMEMBER_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
}

export function isRemembered(): boolean {
  return localStorage.getItem(REMEMBER_KEY) === '1'
}
