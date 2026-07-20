<script setup lang="ts">
import type { Acta } from "@/lib/types-diputados";
import {
  getDiputadoConActasById,
  getDiputadosConActas,
} from "@/lib/diputados-data";
import { formatDate, isDiputadoActivo } from "@/lib/utils";
import { sortableHeader } from "@/utils/sortableHeader";
import { bloquePath } from "@/utils/bloque";
import { formatGenero, type ProfileFactSection } from "@/utils/memberProfile";
import {
  votesFromDiputado,
  type AffinityMemberInput,
} from "@/utils/votingAffinity";

const route = useRoute();
const id = computed(() => String(route.params.id));

const { data } = await useAsyncData(
  "diputado",
  () => getDiputadoConActasById(id.value),
  { watch: [id] },
);
const diputado = computed(() => data.value || null);

const { data: allDiputados } = await useAsyncData("diputados-con-actas", () =>
  getDiputadosConActas(),
);

const affinityPeers = computed<AffinityMemberInput[]>(() => {
  const all = allDiputados.value || [];
  const byId = new Map<string, (typeof all)[number]>();
  for (const d of all) {
    if (isDiputadoActivo(d)) byId.set(d.id, d);
  }
  const current = diputado.value;
  if (current) byId.set(current.id, current);

  return [...byId.values()].map((d) => ({
    id: d.id,
    name:
      d.nombreCompleto ||
      `${d.apellido}, ${d.nombre}` ||
      `${d.nombre} ${d.apellido}`,
    group: d.bloque,
    foto: d.foto,
    votes: votesFromDiputado(d),
  }));
});

const affinityGroupPeers = computed(() => {
  const bloque = diputado.value?.bloque;
  if (!bloque) return [];
  return affinityPeers.value.filter((p) => p.group === bloque);
});

useChamberSeo(() => {
  const d = diputado.value;
  if (!d) {
    return {
      title: "Diputado",
      description:
        "Perfil de un diputado de la Cámara de Diputados de la Nación Argentina.",
      og: { kind: "member", eyebrow: "diputado" },
    };
  }
  const name = `${d.nombre} ${d.apellido}`.trim();
  const bits = [d.bloque, d.provincia].filter(Boolean);
  return {
    title: name,
    description: bits.length
      ? `${name} (${bits.join(" · ")}). Historial de votos, presentismo y afinidad en la Cámara de Diputados.`
      : `${name}. Historial de votos, presentismo y afinidad en la Cámara de Diputados.`,
    og: {
      kind: "member",
      eyebrow: "diputado",
      badge: d.bloque || undefined,
      photoSrc: d.foto || "/placeholder-user.jpg",
    },
  };
});

const { sorting } = useTableSorting("fecha", true, { syncQuery: false });
const searchQuery = ref("");

const actasFiltered = computed<Acta[]>(() => {
  const list = diputado.value?.actasDiputado || [];
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return list;
  return list.filter((a) => {
    return (
      a.titulo?.toLowerCase().includes(q) ||
      a.resultado?.toLowerCase().includes(q) ||
      a.fecha?.toLowerCase().includes(q) ||
      a.tipoVotoDiputado?.toLowerCase().includes(q)
    );
  });
});

const tableColumns = [
  { id: "fecha", accessorKey: "fecha", header: sortableHeader("Fecha") },
  {
    id: "titulo",
    accessorKey: "titulo",
    header: sortableHeader("Título"),
    meta: {
      class: {
        td: 'max-w-xs whitespace-normal',
      },
    }
  },
  {
    id: "resultado",
    accessorKey: "resultado",
    header: sortableHeader("Resultado"),
  },
  {
    id: "voto",
    accessorKey: "tipoVotoDiputado",
    header: sortableHeader("Voto"),
  },
];

function onRowSelect(_e: Event, row: { original: Acta }) {
  navigateTo(`/actas/${row.original.id}`);
}

const profileSections = computed<ProfileFactSection[]>(() => {
  const d = diputado.value;
  if (!d) return [];

  const mandatoFin = d.periodoMandato?.fin
    ? formatDate(d.periodoMandato.fin)
    : "—";
  const mandatoInicio = d.periodoMandato?.inicio
    ? formatDate(d.periodoMandato.inicio)
    : "—";

  const bloqueInicio = d.periodoBloque?.inicio
    ? formatDate(d.periodoBloque.inicio)
    : "";
  const bloqueFin = d.periodoBloque?.fin
    ? formatDate(d.periodoBloque.fin)
    : "hoy";
  const periodoBloque =
    bloqueInicio && `${bloqueInicio} – ${bloqueFin}`;

  return [
    {
      title: "Identidad",
      items: [
        { label: "Provincia", value: d.provincia },
        { label: "Género", value: formatGenero(d.genero) },
      ],
    },
    {
      title: "Bloque",
      items: [
        {
          label: "Bloque",
          value: d.bloque || "—",
          to: bloquePath(d.bloque),
        },
        {
          label: "En el bloque",
          value: periodoBloque || null,
        },
      ],
    },
    {
      title: "Mandato",
      items: [
        {
          label: "Período",
          value: `${mandatoInicio} – ${mandatoFin}`,
        },
        {
          label: "Juramento",
          value: d.juramentoFecha ? formatDate(d.juramentoFecha) : null,
        },
        {
          label: "Cese",
          value: d.ceseFecha
            ? formatDate(d.ceseFecha)
            : isDiputadoActivo(d)
              ? "En funciones"
              : null,
        },
      ],
    },
  ];
});
</script>

<template>
  <div class="page-container flex flex-col gap-10">
    <UCard v-if="!diputado">
      <template #header>
        <h1 class="text-xl font-semibold">Diputado no encontrado</h1>
      </template>
      <p class="text-gray-600 dark:text-gray-300">
        No se pudo encontrar información para el diputado solicitado.
      </p>
    </UCard>

    <UCard v-else :ui="{ body: 'p-0!' }" class="overflow-hidden">
      <div class="flex flex-col md:flex-row">
        <div
          class="w-40 sm:w-48 md:w-xs shrink-0 mx-auto md:mx-0 aspect-square overflow-hidden bg-elevated"
        >
          <NuxtImg
            :src="diputado.foto || '/placeholder-user.jpg'"
            :alt="`${diputado.nombre} ${diputado.apellido}`"
            width="208"
            height="208"
            sizes="160px sm:192px md:208px"
            densities="x1"
            class="w-full h-full object-cover"
            loading="eager"
          />
        </div>

        <div class="flex flex-col gap-5 flex-1 p-6">
          <h1 class="text-2xl font-bold">
            {{ diputado.nombre }} {{ diputado.apellido }}
          </h1>

          <MemberProfileFacts :sections="profileSections" />

          <div v-if="diputado.estadisticas" class="grid grid-cols-1 gap-4">
            <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div
                class="rounded-lg border border-teal-300! p-3 bg-teal-50 dark:border-teal-700! dark:bg-teal-950"
              >
                <div
                  class="text-3xl font-bold text-teal-600 dark:text-teal-400"
                >
                  {{ diputado.estadisticas.votosAfirmativos }}
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-300">
                  A favor
                </div>
              </div>
              <div
                class="rounded-lg border border-red-300! p-3 bg-red-50 dark:border-red-700! dark:bg-red-950"
              >
                <div class="text-3xl font-bold text-red-600 dark:text-red-400">
                  {{ diputado.estadisticas.votosNegativos }}
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-300">
                  En contra
                </div>
              </div>
              <div
                class="rounded-lg border border-blue-300! p-3 bg-blue-50 dark:border-blue-700! dark:bg-blue-950"
              >
                <div
                  class="text-3xl font-bold text-blue-600 dark:text-blue-400"
                >
                  {{ diputado.estadisticas.abstenciones }}
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-300">
                  Abstenciones
                </div>
              </div>
            </div>

            <div class="grid sm:grid-cols-2 gap-4">
              <div class="rounded-lg border p-3">
                <div class="text-sm text-gray-600 dark:text-gray-300">
                  Total Votaciones
                </div>
                <div class="text-2xl font-bold">
                  {{ diputado.estadisticas.totalVotaciones }}
                </div>
              </div>
              <div
                class="rounded-lg border border-gray-300! p-3 bg-gray-50 dark:border-gray-600! dark:bg-gray-950"
              >                <div class="text-sm text-gray-600 dark:text-gray-300">
                  Ausencias
                </div>
                <div
                  class="text-2xl font-bold text-gray-700 dark:text-gray-200"
                >
                  {{ diputado.estadisticas.ausencias }}
                </div>
              </div>
            </div>

            <div>
              <div class="flex justify-between mb-2">
                <span class="text-sm font-medium">Asistencia</span>
                <span class="text-sm font-medium"
                  >{{ diputado.estadisticas.presentismo }}%</span
                >
              </div>
              <UProgress
                :model-value="diputado.estadisticas.presentismo"
                size="sm"
                color="neutral"
              />
            </div>
          </div>
        </div>
      </div>
    </UCard>

    <ChartsMemberVotingCharts
      v-if="diputado?.actasDiputado?.length"
      :actas="diputado.actasDiputado"
      :member-label="`${diputado.nombre} ${diputado.apellido}`"
    />

    <AnalisisMemberAffinityPanel
      v-if="diputado && affinityPeers.length"
      :member-id="diputado.id"
      :member-name="`${diputado.nombre} ${diputado.apellido}`"
      group-label="bloque"
      :group-name="diputado.bloque"
      member-base-path="/diputados"
      :peers="affinityPeers"
      :group-peers="affinityGroupPeers"
      :actas="diputado.actasDiputado"
      :detail-to="`/diputados/${diputado.id}/afinidad`"
    />

    <DataTableCard v-if="diputado" title="Sus votos">
      <template #filters>
        <div class="w-full sm:max-w-sm">
          <FilterSearch
            v-model="searchQuery"
            placeholder="Título o resultado..."
          />
        </div>
      </template>

      <UTable
        v-model:sorting="sorting"
        :data="actasFiltered"
        :columns="tableColumns"
        :ui="{ tr: 'cursor-pointer hover:bg-elevated/50' }"
        empty="No se encontraron votaciones para este diputado."
        :on-select="onRowSelect"
      >
        <template #fecha-cell="{ row }">
          <span>{{ formatDate((row.original as Acta).fecha) }}</span>
        </template>
        <template #titulo-cell="{ row }">
          <NuxtLink
            :to="`/actas/${(row.original as Acta).id}`"
            class="hover:underline line-clamp-5"
            @click.stop
          >
            {{ (row.original as Acta).titulo }}
          </NuxtLink>
        </template>
        <template #resultado-cell="{ row }">
          <ResultadoBadge :resultado="(row.original as Acta).resultado" />
        </template>
        <template #voto-cell="{ row }">
          <TipoVotoLabel
            :tipo="(row.original as Acta).tipoVotoDiputado || 'ausente'"
          />
        </template>
      </UTable>
    </DataTableCard>
  </div>
</template>
