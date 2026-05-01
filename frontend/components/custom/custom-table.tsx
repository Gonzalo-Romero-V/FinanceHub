"use client"

import * as React from "react"
import { CalendarIcon, Pencil, Trash2, MoreVertical } from "lucide-react"
import { addDays, format, differenceInCalendarDays } from "date-fns"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface ColumnConfig<T> {
  align?: "left" | "center" | "right";
  render?: (value: any, item: T) => React.ReactNode;
}

interface CustomTableProps<T> {
  title: string;
  titleIcon?: React.ReactNode;
  data: T[];
  columns: (keyof T)[];
  columnHeaders: Record<keyof T, string>;
  columnConfig?: Partial<Record<keyof T, ColumnConfig<T>>>;
  rowsOnDisplay?: number;
  dateFilter?: boolean;
  dateFilterColumn?: keyof T;
  hideHeaders?: boolean;
  footer?: React.ReactNode;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
}

export function CustomTable<T extends { [key: string]: any }>({
  title,
  titleIcon,
  data: initialData,
  columns,
  columnHeaders,
  columnConfig,
  rowsOnDisplay = 10,
  dateFilter = false,
  dateFilterColumn,
  hideHeaders = false,
  footer,
  onEdit,
  onDelete,
}: CustomTableProps<T>) {
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: new Date(),
    to: new Date(),
  });

  const handleDateSelect = (selectedRange: DateRange | undefined) => {
    if (!selectedRange || !selectedRange.from) {
      setDate({ from: new Date(), to: new Date() });
      return;
    }

    let { from, to } = selectedRange;

    if (from && to) {
      // Asegurarse de que 'from' sea siempre la fecha anterior a 'to'
      if (from > to) {
        [from, to] = [to, from]; // Intercambiar fechas
      }

      // Validar que el rango no exceda los 90 días
      if (differenceInCalendarDays(to, from) > 90) {
        to = addDays(from, 90); // Ajustar la fecha 'to'
      }
    }

    setDate({ from, to });
  };

  const filteredData = React.useMemo(() => {
    if (!dateFilter || !dateFilterColumn) {
      return initialData;
    }

    const filterFrom = date?.from ? new Date(date.from) : new Date();
    filterFrom.setHours(0, 0, 0, 0);

    const filterTo = date?.to ? new Date(date.to) : new Date(filterFrom);
    filterTo.setHours(23, 59, 59, 999);

    return initialData.filter(item => {
      // Cast the item as any temporarily to avoid TS indexing errors on generic T
      const record = item as any;
      if (!record[dateFilterColumn]) return false;
      
      const itemDate = new Date(record[dateFilterColumn]);
      return itemDate >= filterFrom && itemDate <= filterTo;
    });
  }, [initialData, date, dateFilter, dateFilterColumn]);

  const tableContainerStyle: React.CSSProperties = {
    height: '350px', // Altura un poco más reducida
    overflowY: 'auto',
  };

  const hasActions = !!onEdit || !!onDelete;

  return (
    <div className="w-full bg-background">
      {/* Encabezado sin bordes externos para fundirse con el fondo */}
      <div className="flex items-center justify-between p-2 md:px-4 bg-transparent mb-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          {titleIcon}
        </div>
        {dateFilter && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className={cn(
                  "w-[260px] justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "LLL dd, y")} -{" "}
                      {format(date.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(date.from, "LLL dd, y")
                  )
                ) : (
                  <span>Selecciona un rango</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={handleDateSelect}
                numberOfMonths={1} // Mostrar solo un mes
                disabled={{ after: new Date() }} // Deshabilitar fechas futuras
              />
            </PopoverContent>
          </Popover>
        )}
      </div>

      <div 
        className="relative bg-transparent"
        style={tableContainerStyle}
      >
        <Table>
          {!hideHeaders && (
            <TableHeader className="sticky top-0 bg-muted/30 backdrop-blur-sm z-10">
              <TableRow className="hover:bg-transparent border-b">
                {columns.map((key) => {
                  const align = columnConfig?.[key]?.align;
                  return (
                    <TableHead
                      key={String(key)}
                      className={cn(
                        "text-xs uppercase tracking-wider text-muted-foreground/70 font-bold",
                        align === "right" ? "text-right" :
                          align === "center" ? "text-center" : ""
                      )}
                    >
                      {columnHeaders[key]}
                    </TableHead>
                  );
                })}
                {hasActions && <TableHead className="w-[70px]"></TableHead>}
              </TableRow>
            </TableHeader>
          )}
          <TableBody>
            {filteredData.length > 0 ? (
              filteredData.map((item, index) => (
                <TableRow key={index} className="group transition-colors border-b border-border/50">
                  {columns.map((key) => {
                    const config = columnConfig?.[key];
                    const align = config?.align;
                    const content = config?.render
                      ? config.render(item[key], item)
                      : item[key];

                    return (
                      <TableCell
                        key={String(key)}
                        className={cn(
                          "py-3 font-medium", // Compacto y legible
                          index === filteredData.length - 1 && footer ? "border-b-0" : "",
                          align === "right" ? "text-right" :
                            align === "center" ? "text-center" : ""
                        )}
                      >
                        {content}
                      </TableCell>
                    );
                  })}

                  {hasActions && (
                    <TableCell className="w-[70px] text-right">
                      {/* Desktop Actions: Hover */}
                      <div className="hidden md:flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {onEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-brand-1 hover:bg-brand-1/10"
                            onClick={() => onEdit(item)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {onDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => onDelete(item)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      {/* Mobile Actions: Popover (Three dots vertical) */}
                      <div className="flex md:hidden items-center justify-end">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-40 p-1" align="end">
                            <div className="flex flex-col gap-1">
                              {onEdit && (
                                <Button
                                  variant="ghost"
                                  className="justify-start gap-2 h-9 px-2 text-sm"
                                  onClick={() => onEdit(item)}
                                >
                                  <Pencil className="h-4 w-4" />
                                  Editar
                                </Button>
                              )}
                              {onDelete && (
                                <Button
                                  variant="ghost"
                                  className="justify-start gap-2 h-9 px-2 text-sm text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => onDelete(item)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Eliminar
                                </Button>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length + (hasActions ? 1 : 0)} className="h-24 text-center">
                  No hay resultados.
                </TableCell>
              </TableRow>
            )}
            {footer}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
