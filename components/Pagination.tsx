'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface PaginationProps {
  totalItems: number;
  pageSize?: number;
  className?: string;
}

export default function Pagination({
  totalItems,
  pageSize = 20,
  className = "",
}: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentPage = Number(searchParams.get('page')) || 1;
  const totalPages = Math.ceil(totalItems / pageSize);

  const generatePagination = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 4) {
      pages.push(1, 2, 3, 4, 5, '...', totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(
        1,
        '...',
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      );
    } else {
      pages.push(
        1,
        '...',
        currentPage - 1,
        currentPage,
        currentPage + 1,
        '...',
        totalPages,
      );
    }
    return pages;
  };

  const pages = generatePagination();

  const handlePageChange = (page: number | string) => {
    if (typeof page === 'string') return;
    if (page < 1 || page > totalPages) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const baseClass =
    "relative inline-flex items-center px-4 py-2 text-sm font-medium border border-blue-200 transition-colors focus:z-10 cursor-pointer ";
  const normalClass = "bg-white text-blue-600 hover:bg-blue-50 cursor-pointer ";
  const activeClass = "z-10 bg-blue-600 text-white border-blue-600 cursor-pointer ";
  const disabledClass = "bg-gray-50 text-gray-300 cursor-not-allowed cursor-pointer ";

  return (
    <div className={`flex flex-col items-start gap-2 ${className}`}>
      {totalPages > 1 && (
        <nav
          className="isolate inline-flex -space-x-px rounded-md shadow-sm"
          aria-label="Pagination"
        >
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`${baseClass} rounded-l-md ${
              currentPage === 1 ? disabledClass : normalClass
            }`}
          >
            <span className="sr-only">Previous</span>
            <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
          </button>

          {pages.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handlePageChange(p)}
              disabled={p === '...'}
              className={`${baseClass} ${
                p === currentPage
                  ? activeClass
                  : p === '...'
                    ? "bg-white text-gray-700 cursor-default border-blue-200 hover:bg-white"
                    : normalClass
              }`}
            >
              {p}
            </button>
          ))}

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`${baseClass} rounded-r-md ${
              currentPage === totalPages ? disabledClass : normalClass
            }`}
          >
            <span className="sr-only">Next</span>
            <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        </nav>
      )}

      <div className="text-sm text-gray-500">
        &#20849; {totalItems} &#26465;&#25968;&#25454;
      </div>
    </div>
  );
}
