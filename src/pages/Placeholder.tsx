interface PlaceholderProps {
  title: string
}

export default function Placeholder({ title }: PlaceholderProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white text-center">
      <h1 className="text-lg font-semibold text-gray-700">{title}</h1>
      <p className="mt-1 text-sm text-gray-400">Trang này sẽ được xây dựng và kết nối API ở bước tiếp theo.</p>
    </div>
  )
}
