"use client";

import { ChevronRight, HardDrive } from "lucide-react";

export interface BreadcrumbItem {
  id: number | null;
  name: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  onNavigate: (folderId: number | null) => void;
}

export function Breadcrumbs({ items, onNavigate }: BreadcrumbsProps) {
  return (
    <nav className="flex items-center space-x-1 text-xs text-slate-500 overflow-x-auto py-1">
      <button
        onClick={() => onNavigate(null)}
        className="flex items-center gap-1.5 font-medium hover:text-sky-600 transition-colors shrink-0"
      >
        <HardDrive className="h-3.5 w-3.5" />
        <span>My Files</span>
      </button>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <div key={item.id ?? index} className="flex items-center space-x-1 shrink-0">
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            {isLast ? (
              <span className="font-semibold text-slate-900 truncate max-w-[150px]">
                {item.name}
              </span>
            ) : (
              <button
                onClick={() => onNavigate(item.id)}
                className="font-medium hover:text-sky-600 transition-colors truncate max-w-[120px]"
              >
                {item.name}
              </button>
            )}
          </div>
        );
      })}
    </nav>
  );
}
