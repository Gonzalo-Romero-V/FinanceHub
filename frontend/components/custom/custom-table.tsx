"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
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

interface CustomTableProps<T> {
  title: string;
  data: T[];
  columns: (keyof T)[];
  columnHeaders: Record<keyof T, string>;
  rowsOnDisplay?: number;
  dateFilter?: boolean;
  dateFilterColumn?: keyof T;
}

export function CustomTable<T extends { [key: string]: any }>({
  title,
  data: initialData,
  columns,
  columnHeaders,
  rowsOnDisplay = 10,
  dateFilter = false,
  dateFilterColumn,
}: CustomTableProps<T>) {
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

  const handleDateSelect = (selectedRange: DateRange | undefined) => {
    if (!selectedRange) {
      setDate(selectedRange);
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
    if (!dateFilter || !date?.from || !dateFilterColumn) {
      return initialData;
    }

    const fromDate = new Date(date.from);
    fromDate.setHours(0, 0, 0, 0);

    const toDate = date.to ? new Date(date.to) : new Date(date.from);
    toDate.setHours(23, 59, 59, 999);

    return initialData.filter(item => {
      const itemDate = new Date(item[dateFilterColumn]);
      return itemDate >= fromDate && itemDate <= toDate;
    });
  }, [initialData, date, dateFilter, dateFilterColumn]);

  const tableContainerStyle: React.CSSProperties = {
    maxHeight: `${rowsOnDisplay * 3.5}rem`, // Aproximadamente 3.5rem por fila
    overflowY: 'auto',
  };

  return (
    <div className="bg-card border rounded-2xl shadow-sm">
      <div className="flex items-center justify-between p-4 md:p-6 border-b">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
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
        className="relative"
        style={filteredData.length > rowsOnDisplay ? tableContainerStyle : {}}
      >
        <Table>
          <TableHeader className="sticky top-0 bg-card">
            <TableRow>
              {columns.map((key) => (
                <TableHead key={String(key)}>{columnHeaders[key]}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length > 0 ? (
              filteredData.map((item, index) => (
                <TableRow key={index}>
                  {columns.map((key) => (
                    <TableCell key={String(key)}>{item[key]}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No hay resultados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
