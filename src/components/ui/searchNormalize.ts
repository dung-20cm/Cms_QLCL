// Bỏ dấu tiếng Việt để so khớp không phân biệt có dấu/không dấu (gõ "phong kham"
// vẫn lọc ra "Phòng khám bệnh"). Dùng bảng ánh xạ ký tự tường minh thay vì regex
// unicode range để tránh rủi ro sai lệch ký tự khi lưu/đọc file.
const VN_CHAR_MAP: Record<string, string> = {
  a: 'aàáạảãâầấậẩẫăằắặẳẵ',
  e: 'eèéẹẻẽêềếệểễ',
  i: 'iìíịỉĩ',
  o: 'oòóọỏõôồốộổỗơờớợởỡ',
  u: 'uùúụủũưừứựửữ',
  y: 'yỳýỵỷỹ',
  d: 'dđ',
}
const CHAR_TO_BASE: Record<string, string> = {}
for (const base of Object.keys(VN_CHAR_MAP)) {
  for (const ch of VN_CHAR_MAP[base]) {
    CHAR_TO_BASE[ch] = base
  }
}

export function normalizeVn(s: string): string {
  let out = ''
  for (const ch of s.toLowerCase()) {
    out += CHAR_TO_BASE[ch] ?? ch
  }
  return out.trim()
}
