import { CheckCircle2 } from "lucide-react";
import { BANG_ICON } from "./constants";
import type { BangDefinition } from "./types";

export default function BangCard({
  bang,
  selected,
  onToggle,
  delay,
}: {
  bang: BangDefinition;
  selected: boolean;
  onToggle: () => void;
  delay: number;
}) {
  const Icon = BANG_ICON[bang.key];

  return (
    <button
      type="button"
      onClick={onToggle}
      style={{ animationDelay: `${delay}ms` }}
      className={`animate-rise-in group relative flex items-center gap-3 overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] ${
        selected
          ? "border-brand-400 bg-brand-50 shadow-sm dark:border-brand-500/50 dark:bg-brand-500/10"
          : "border-gray-200 bg-white hover:border-brand-200 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-brand-500/30"
      }`}
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors duration-200 ${
          selected
            ? "bg-brand-500 text-white"
            : "bg-gray-100 text-gray-400 group-hover:bg-brand-100 group-hover:text-brand-500 dark:bg-gray-800 dark:group-hover:bg-brand-500/10"
        }`}
      >
        <Icon size={20} strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm font-semibold transition-colors ${
            selected ? "text-brand-700 dark:text-brand-300" : "text-gray-700 dark:text-gray-200"
          }`}
        >
          {bang.label}
        </p>
        <p className="mt-0.5 truncate text-xs text-gray-400 dark:text-gray-500">
          {bang.description}
        </p>
      </div>
      <CheckCircle2
        size={20}
        className={`shrink-0 transition-all duration-200 ${
          selected
            ? "scale-100 text-brand-500 opacity-100"
            : "scale-75 text-gray-200 opacity-0 group-hover:opacity-60 dark:text-gray-700"
        }`}
      />
    </button>
  );
}
