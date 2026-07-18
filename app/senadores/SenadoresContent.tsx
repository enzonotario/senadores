"use client";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { AlertCircle, Check, ChevronsUpDown, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { PaginationComponent } from "../components/Pagination";
import SenadorCard from "../components/SenadorCard";
import Skeleton from "../components/Skeleton";
import { useSenatorsData, useVotaciones } from "../lib/data";
import type { Senator } from "../types";
import { useRouter, useSearchParams } from "next/navigation";

const SENATORS_PER_PAGE = 9;

type SortOption = {
  value: string;
  label: string;
  sortFn: (a: Senator, b: Senator) => number;
};

export default function SenadoresContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [senadores, setSenadores] = useState<Senator[]>([]);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const currentPage = Number(searchParams.get("page")) || 1;
  const searchTerm = searchParams.get("search") || "";
  const selectedParty = searchParams.get("party") || "TODOS";
  const sortBy = searchParams.get("sort") || "period";
  const sortOrder = (searchParams.get("order") || "desc") as "asc" | "desc";

  const {
    votaciones,
    isLoading: isLoadingVotaciones,
    isError: isErrorVotaciones
  } = useVotaciones();
  const {
    senatorsData,
    isLoading: isLoadingSenatorsData,
    isError: isErrorSenatorsData
  } = useSenatorsData();

  useEffect(() => {
    if (votaciones && senatorsData) {
      const senadoresData = getSenadores(votaciones, senatorsData);
      setSenadores(senadoresData);
    }
  }, [votaciones, senatorsData]);

  // Get unique parties from senators
  const uniqueParties = Array.from(
    new Set(
      senadores
        .map((senator) => senator.party || "Sin partido")
        .filter((party) => party !== "Sin partido")
    )
  ).sort();

  const sortOptions: SortOption[] = [
    {
      value: "none",
      label: "Sin ordenar",
      sortFn: () => 0
    },
    {
      value: "period",
      label: "Período",
      sortFn: (a, b) => {
        if (!a.periodoReal || !b.periodoReal) return 0;
        return (
          new Date(b.periodoReal.inicio).getTime() -
          new Date(a.periodoReal.inicio).getTime()
        );
      }
    },
    {
      value: "votes",
      label: "Cantidad de votos",
      sortFn: (a, b) => b.totalVotes - a.totalVotes
    },
    {
      value: "positive",
      label: "Votos positivos",
      sortFn: (a, b) => b.affirmativeVotes - a.affirmativeVotes
    },
    {
      value: "negative",
      label: "Votos negativos",
      sortFn: (a, b) => b.negativeVotes - a.negativeVotes
    },
    {
      value: "abstentions",
      label: "Abstenciones",
      sortFn: (a, b) =>
        b.totalVotes -
        b.affirmativeVotes -
        b.negativeVotes -
        (a.totalVotes - a.affirmativeVotes - a.negativeVotes)
    },
    {
      value: "attendance",
      label: "Presentismo",
      sortFn: (a, b) => {
        const getAttendancePercentage = (senator: Senator) => {
          const totalVotes = senator.totalVotes;
          // Present votes are affirmative + negative votes only
          const presentVotes = senator.affirmativeVotes + senator.negativeVotes;
          return (presentVotes / totalVotes) * 100;
        };

        return getAttendancePercentage(b) - getAttendancePercentage(a);
      }
    }
  ];

  const filteredSenadores = senadores
    .filter((senador) => {
      const matchesSearch = senador.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesParty =
        selectedParty === "TODOS" || senador.party === selectedParty;
      return matchesSearch && matchesParty;
    })
    .sort((a, b) => {
      const sortOption = sortOptions.find((option) => option.value === sortBy);
      if (!sortOption) return 0;
      return sortOrder === "desc"
        ? sortOption.sortFn(a, b)
        : sortOption.sortFn(b, a);
    });

  const paginatedSenadores = filteredSenadores.slice(
    (currentPage - 1) * SENATORS_PER_PAGE,
    currentPage * SENATORS_PER_PAGE
  );

  const totalPages = Math.ceil(filteredSenadores.length / SENATORS_PER_PAGE);

  const updateUrlParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    router.push(`/senadores?${params.toString()}`);
  };

  const handleSearch = (value: string) => {
    updateUrlParams({ search: value, page: "1" });
  };

  const handlePartySelect = (value: string) => {
    updateUrlParams({ party: value, page: "1" });
    setPopoverOpen(false);
  };

  const handleSortChange = (value: string) => {
    updateUrlParams({ sort: value, page: "1" });
  };

  const handleSortOrderToggle = () => {
    updateUrlParams({ order: sortOrder === "asc" ? "desc" : "asc", page: "1" });
  };

  const handlePageChange = (page: number) => {
    updateUrlParams({ page: page.toString() });
  };

  if (isErrorVotaciones || isErrorSenatorsData) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="bg-red-100 dark:bg-red-900/20 p-4 rounded-full mb-6">
            <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-500" />
          </div>
          <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-gray-100">
            No pudimos cargar los senadores
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-md mb-8">
            Hubo un problema al cargar los datos de los senadores. Esto puede
            deberse a problemas de conexión o mantenimiento del servidor.
          </p>
          <Button
            onClick={() => window.location.reload()}
            variant="secondary"
            size="lg"
            className="font-medium"
          >
            Intentar nuevamente
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8 text-gray-900 dark:text-gray-100">
        Senadores
      </h1>
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Buscar senador..."
            className="w-full p-2 pl-10 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500/40"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
        </div>

        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className="w-full md:w-[200px] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 justify-between"
            >
              <span className="truncate">
                {selectedParty === "TODOS"
                  ? "Todos los partidos"
                  : selectedParty || "Seleccionar partido"}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0">
            <Command>
              <CommandInput placeholder="Buscar partido..." />
              <CommandEmpty>No se encontró el partido.</CommandEmpty>
              <CommandList>
                <CommandGroup>
                  <CommandItem
                    value="TODOS"
                    onSelect={() => handlePartySelect("TODOS")}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedParty === "TODOS" ? "opacity-100" : "opacity-0"
                      )}
                    />
                    Todos los partidos
                  </CommandItem>
                  {uniqueParties.map((party) => (
                    <CommandItem
                      key={party}
                      value={party}
                      onSelect={() => handlePartySelect(party)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedParty === party ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {party}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <div className="flex">
          <Select value={sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="w-full md:w-[200px] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-r-none border-r-0">
              <SelectValue placeholder="Ordenar por..." />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={handleSortOrderToggle}
            className="aspect-square h-10 rounded-l-none border-l-0 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
          >
            {sortOrder === "desc" ? "↓" : "↑"}
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoadingVotaciones || isLoadingSenatorsData
          ? Array.from({ length: SENATORS_PER_PAGE }).map((_, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
              >
                <div className="flex items-center gap-4 mb-4">
                  <Skeleton className="w-16 h-16 rounded-full" />
                  <Skeleton className="h-6 w-3/4" />
                </div>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-2.5 w-full mb-2" />
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
              </div>
            ))
          : paginatedSenadores.map((senador) => (
              <SenadorCard key={senador.name} {...senador} />
            ))}
      </div>
      {totalPages > 1 && (
        <div className="mt-8">
          <PaginationComponent
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </main>
  );
}

function getSenadores(votaciones: any[], senatorsData: any[]): Senator[] {
  const senadores: { [key: string]: Senator } = {};

  votaciones.forEach((votacion: any) => {
    votacion.votos.forEach((vote: any) => {
      if (!senadores[vote.nombre]) {
        const senatorInfo =
          senatorsData.find((s) => s.nombre === vote.nombre) || {};
        senadores[vote.nombre] = {
          name: vote.nombre,
          totalVotes: 0,
          affirmativeVotes: 0,
          negativeVotes: 0,
          img: senatorInfo.foto,
          party: senatorInfo.partido,
          province: senatorInfo.provincia,
          email: senatorInfo.email,
          telefono: senatorInfo.telefono,
          twitter: senatorInfo.redes?.find((red: string) =>
            red.includes("twitter.com")
          ),
          instagram: senatorInfo.redes?.find((red: string) =>
            red.includes("instagram.com")
          ),
          periodoReal: senatorInfo.periodoReal
        };
      }
      senadores[vote.nombre].totalVotes++;
      if (vote.voto === "si") senadores[vote.nombre].affirmativeVotes++;
      if (vote.voto === "no") senadores[vote.nombre].negativeVotes++;
    });
  });

  return Object.values(senadores);
}
