import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableHead } from "@/components/ui/table";
import { nextClientSort, type ClientSort, type ClientSortKey } from "@/utils/clientListSorting";

interface ClientSortHeadingProps {
  label: string;
  sortKey: ClientSortKey;
  sort: ClientSort;
  onSort: (sort: ClientSort) => void;
}

export function ClientSortHeading({ label, sortKey, sort, onSort }: ClientSortHeadingProps) {
  const active = sort?.key === sortKey;
  const next = nextClientSort(sort, sortKey);
  const action = next ? `Sort ${label} ${next.direction === "asc" ? "ascending" : "descending"}` : "Restore default order";
  return (
    <TableHead scope="col" aria-sort={active ? sort.direction === "asc" ? "ascending" : "descending" : undefined} className="px-1">
      <Button type="button" variant="ghost" className="h-auto min-h-11 w-full justify-start rounded-sm px-3 py-2 text-left font-medium text-muted-foreground" onClick={() => onSort(next)} title={action}>
        <span>{label}</span>
        <span className="inline-flex h-4 w-4 shrink-0" aria-hidden="true">
          {active && (sort.direction === "asc" ? <ArrowUp /> : <ArrowDown />)}
        </span>
      </Button>
    </TableHead>
  );
}