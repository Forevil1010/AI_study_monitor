const KEY = 'token'

/** 使用 sessionStorage：关闭标签页或浏览器后需重新登录 */
export function getToken() {
  return sessionStorage.getItem(KEY)
}

export function setToken(token) {
  sessionStorage.setItem(KEY, token)
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

export function removeToken() {
  sessionStorage.removeItem(KEY)
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
