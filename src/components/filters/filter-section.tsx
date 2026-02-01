import { ReactNode } from "react";

interface FilterSectionProps {
  icon: ReactNode;
  title: string;
  activeCount?: number;
  onClear?: () => void;
  collapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export function FilterSection({
  icon,
  title,
  activeCount,
  onClear,
  collapsed,
  onToggle,
  children,
}: FilterSectionProps) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between cursor-pointer ${!collapsed ? "mb-3" : ""}`}
      >
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 text-gray-500">{icon}</span>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
          {activeCount !== undefined && activeCount > 0 && (
            <span className="px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded">
              {activeCount}
            </span>
          )}
        </span>
        <span className="flex items-center gap-2">
          {activeCount !== undefined && activeCount > 0 && onClear && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="text-xs text-red-500 hover:text-red-600"
            >
              Obriši
            </span>
          )}
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${collapsed ? "" : "rotate-180"}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${collapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]"}`}>
        <div className="overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
