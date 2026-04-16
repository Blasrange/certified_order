"use client";

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DataTablePaginationProps {
  totalRows: number;
  pageSize: number;
  onPageSizeChange: (value: number) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function DataTablePagination({
  totalRows,
  pageSize,
  onPageSizeChange,
  currentPage,
  totalPages,
  onPageChange,
}: DataTablePaginationProps) {
  return (
    <div className="flex w-full flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-2.5">
      <div className="flex-1 text-center text-sm font-medium text-muted-foreground sm:text-left">
        Total {totalRows} filas.
      </div>
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-5 lg:gap-8">
        <div className="flex items-center gap-3">
          <p className="text-sm font-semibold text-slate-600">Filas por página</p>
          <Select
            value={`${pageSize}`}
            onValueChange={(value) => {
              onPageSizeChange(Number(value));
            }}
          >
            <SelectTrigger className="h-9 w-[80px] bg-slate-50 border-none shadow-none focus:ring-0">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top" className="border-none shadow-xl rounded-xl">
              {[10, 20, 30, 40, 50].map((size) => (
                <SelectItem key={size} value={`${size}`} className="rounded-lg">
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex min-w-[136px] items-center justify-center text-sm font-bold text-slate-600">
          Página {currentPage} de {totalPages || 1}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            className="hidden h-9 w-9 p-0 lg:flex hover:bg-primary/10 text-primary"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
          >
            <span className="sr-only">Ir a la primera página</span>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            className="h-9 w-9 p-0 hover:bg-primary/10 text-primary"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <span className="sr-only">Ir a la página anterior</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            className="h-9 w-9 p-0 hover:bg-primary/10 text-primary"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            <span className="sr-only">Ir a la página siguiente</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            className="hidden h-9 w-9 p-0 lg:flex hover:bg-primary/10 text-primary"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage >= totalPages}
          >
            <span className="sr-only">Ir a la última página</span>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}