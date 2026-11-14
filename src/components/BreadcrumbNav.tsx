/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  view?: string;
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[];
  onNavigate: (view: string) => void;
}

export default function BreadcrumbNav({ items, onNavigate }: BreadcrumbNavProps) {
  if (!items || items.length === 0) return null;

  return (
    <div className="w-full bg-slate-50/90 dark:bg-slate-900/50 border-b border-slate-200/70 dark:border-slate-800/70 transition-colors duration-300 print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <nav
          className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 overflow-x-auto scrollbar-none"
          aria-label="Breadcrumb"
        >
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="hover:text-primary transition-colors cursor-pointer shrink-0 font-medium"
          >
            হোম
          </button>

          {items.map((item, idx) => {
            const isLast = idx === items.length - 1;
            return (
              <React.Fragment key={`${item.label}-${idx}`}>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                {!isLast && item.view ? (
                  <button
                    type="button"
                    onClick={() => onNavigate(item.view!)}
                    className="hover:text-primary transition-colors cursor-pointer shrink-0 font-medium truncate max-w-[200px]"
                  >
                    {item.label}
                  </button>
                ) : (
                  <span className="text-slate-900 dark:text-white font-semibold truncate max-w-[260px] sm:max-w-md">
                    {item.label}
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
