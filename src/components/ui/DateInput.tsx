import { useRef, useState } from "react";
import { Calendar } from "lucide-react";

// Ô chọn ngày luôn hiển thị dd/mm/yyyy (input type="date" gốc hiển thị theo
// ngôn ngữ trình duyệt/hệ điều hành nên hay ra mm/dd/yyyy). Giá trị vào/ra vẫn
// là chuỗi ISO "yyyy-mm-dd" và onChange vẫn đọc được bằng e.target.value, nên
// thay thế trực tiếp cho <input type="date">.
interface Props {
  value: string;
  onChange: (e: { target: { value: string } }) => void;
  min?: string;
  max?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
}

function isoToDisplay(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

function displayToIso(text: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]);
  const y = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  if (y < 1900 || dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) {
    return null;
  }
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function formatTyping(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export default function DateInput({
  value,
  onChange,
  min,
  max,
  className = "",
  disabled,
  id,
}: Props) {
  // text = nội dung đang gõ; null = đang theo giá trị `value` bên ngoài
  const [text, setText] = useState<string | null>(null);
  const pickerRef = useRef<HTMLInputElement>(null);
  const shown = text ?? isoToDisplay(value);

  function handleType(raw: string) {
    const next = formatTyping(raw);
    setText(next);
    if (next === "") {
      onChange({ target: { value: "" } });
      return;
    }
    const iso = displayToIso(next);
    if (iso) onChange({ target: { value: iso } });
  }

  function openPicker() {
    const el = pickerRef.current;
    if (!el || disabled) return;
    try {
      el.showPicker();
    } catch {
      el.focus();
      el.click();
    }
  }

  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        inputMode="numeric"
        placeholder="dd/mm/yyyy"
        maxLength={10}
        autoComplete="off"
        disabled={disabled}
        className={`${className} w-full pr-9`}
        value={shown}
        onChange={(e) => handleType(e.target.value)}
        // Rời ô mà còn gõ dở/không hợp lệ -> trả về đúng giá trị đang lưu
        onBlur={() => setText(null)}
      />
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled}
        onClick={openPicker}
        aria-label="Chọn ngày"
        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50 dark:hover:text-gray-300"
      >
        <Calendar size={16} />
      </button>
      <input
        ref={pickerRef}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        value={value || ""}
        min={min}
        max={max}
        onChange={(e) => {
          setText(null);
          onChange({ target: { value: e.target.value } });
        }}
        className="pointer-events-none absolute bottom-0 right-0 h-0 w-0 opacity-0"
      />
    </div>
  );
}
