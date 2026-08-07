import { createPortal } from "react-dom";
import SliderRaw from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { ChevronLeft, ChevronRight, Download, Trash2, X } from "lucide-react";
import type { Anh5SData } from "./useAnh5SData";

// FIX: Vite/esbuild bundle CJS cua react-slick bi "double-wrap" default export
// (chuoi re-export lib/index.js -> lib/slider.js) khien import mac dinh tra ve
// { default: Slider } thay vi chinh component Slider -- gay loi React #130
// "Element type is invalid ... but got: object" khi mo lightbox. Tu unwrap phong thu.
const Slider = ((SliderRaw as unknown as { default?: typeof SliderRaw })
  .default ?? SliderRaw) as typeof SliderRaw;

// Nut prev/next tuy chinh cho react-slick trong lightbox (thay the mui ten mac dinh)
function SliderArrow({
  dir,
  onClick,
}: {
  dir: "prev" | "next";
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={dir === "prev" ? "Ảnh trước" : "Ảnh sau"}
      className={`absolute top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-md transition hover:bg-white ${
        dir === "prev" ? "left-2" : "right-2"
      }`}
    >
      {dir === "prev" ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
    </button>
  );
}

// Lightbox xem nhiều ảnh cùng 1 lượt gửi -- trượt qua lại bằng react-slick.
export default function Lightbox({ a }: { a: Anh5SData }) {
  const {
    previewList,
    preview,
    previewIndex,
    setPreviewIndex,
    closePreview,
    isViewOnly,
    setDeleting,
  } = a;

  if (!previewList || !preview) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
      onClick={closePreview}
    >
      <div
        className="relative w-full max-w-4xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={closePreview}
          title="Đóng (Esc)"
          className="absolute -right-2 -top-2 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-700 shadow-lg transition hover:bg-gray-100"
        >
          <X size={18} />
        </button>

        {previewList.length > 1 ? (
          <Slider
            initialSlide={previewIndex}
            afterChange={(idx: number) => setPreviewIndex(idx)}
            dots
            infinite={false}
            speed={300}
            adaptiveHeight
            prevArrow={<SliderArrow dir="prev" />}
            nextArrow={<SliderArrow dir="next" />}
          >
            {previewList.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-center outline-none"
              >
                <img
                  src={p.url_anh}
                  alt={p.ten_file || ""}
                  className="mx-auto max-h-[70vh] rounded-xl object-contain"
                />
              </div>
            ))}
          </Slider>
        ) : (
          <img
            src={preview.url_anh}
            alt={preview.ten_file || ""}
            className="mx-auto max-h-[70vh] rounded-xl object-contain"
          />
        )}

        <div className="mt-3 flex items-center justify-between text-sm text-white/80">
          <span>
            {preview.danh_gia?.khoa?.ten_khoa || preview.khoa?.ten_khoa} ·{" "}
            {preview.ten_file}
            {previewList.length > 1 &&
              ` · Ảnh ${previewIndex + 1}/${previewList.length}`}
          </span>
          <div className="flex items-center gap-2">
            <a
              href={preview.url_anh}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs hover:bg-white/20"
            >
              <Download size={13} /> Mở ảnh gốc
            </a>
            {!isViewOnly && (
              <button
                onClick={() =>
                  setDeleting({ ids: [preview.id], label: "ảnh này" })
                }
                className="inline-flex items-center gap-1 rounded-lg bg-red-500/80 px-3 py-1.5 text-xs text-white hover:bg-red-500"
              >
                <Trash2 size={13} /> Xoá ảnh
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
