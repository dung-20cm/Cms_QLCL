import { LoaderCircle } from 'lucide-react'

export default function AuthLoadingScreen() {
  return (
    <div className="flex min-h-screen animate-fade-in items-center justify-center bg-white dark:bg-gray-950">
      <LoaderCircle className="animate-spin text-brand-500" size={28} />
    </div>
  )
}
