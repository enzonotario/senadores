import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

type VotacionFilterProps = {
  selectedResult: string;
  selectedYear: string;
  searchQuery: string;
  onResultChange: (value: string) => void;
  onYearChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  possibleResults: string[];
  possibleYears: string[];
};

export default function VotacionFilter({
  selectedResult,
  selectedYear,
  searchQuery,
  onResultChange,
  onYearChange,
  onSearchChange,
  possibleResults,
  possibleYears
}: VotacionFilterProps) {
  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Buscar votaciones..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 w-full"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-4 md:w-96">
          <Select value={selectedResult} onValueChange={onResultChange}>
            <SelectTrigger className="w-full md:w-[220px] lg:w-96 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <SelectValue placeholder="Filtrar por resultado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos los resultados</SelectItem>
              {possibleResults.map((result) => (
                <SelectItem key={result} value={result}>
                  {result.charAt(0).toUpperCase() + result.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedYear} onValueChange={onYearChange}>
            <SelectTrigger className="w-full md:w-[150px] lg:w-64 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <SelectValue placeholder="Filtrar por año" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos los años</SelectItem>
              {possibleYears.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
