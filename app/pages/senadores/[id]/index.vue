<script setup lang="ts">
import type { Acta } from "@/lib/types";
import {
  getSenadorConActasById,
  getSenadoresConActas,
} from "@/lib/senadores-data";
import { formatDate, isSenadorActivo } from "@/lib/utils";
import { sortableHeader } from "@/utils/sortableHeader";
import { partidoPath } from "@/utils/partido";
import {
  type ProfileFactSection,
} from "@/utils/memberProfile";
import {
  votesFromSenador,
  type AffinityMemberInput,
} from "@/utils/votingAffinity";

const route = useRoute();
const id = computed(() => String(route.params.id));

const { data } = await useAsyncData(
  "senador",
  () => getSenadorConActasById(id.value),
  { watch: [id] },
);
const senador = computed(() => data.value || null);

// Next legacy: /senadores/{nombre encodeURIComponent} → /senadores/{id}
if (senador.value && senador.value.id !== id.value) {
  await navigateTo(`/senadores/${senador.value.id}`, {
    redirectCode: 301,
    replace: true,
  });
}

const { data: allSenadores } = await useAsyncData("senadores-con-actas", () =>
  getSenadoresConActas(),
);

const affinityPeers = computed<AffinityMemberInput[]>(() => {
  const all = allSenadores.value || [];
  const byId = new Map<string, (typeof all)[number]>();
  for (const s of all) {
    if (isSenadorActivo(s)) byId.set(s.id, s);
  }
  const current = senador.value;
  if (current) byId.set(current.id, current);

  return [...byId.values()].map((s) => ({
    id: s.id,
    name: s.nombreCompleto || s.nombre,
    group: s.partido,
    foto: s.foto,
    votes: votesFromSenador(s),
  }));
});

const affinityGroupPeers = computed(() => {
  const partido = senador.value?.partido;
  if (!partido) return [];
  return affinityPeers.value.filter((p) => p.group === partido);
});

useChamberSeo(() => {
  const s = senador.value;
  if (!s) {
    return {
      title: "Senador",
      description: "Perfil de un senador del Senado de la Nación Argentina.",
      og: { kind: "member", eyebrow: "senador" },
    };
  }
  const name = s.nombreCompleto || s.nombre;
  const bits = [s.partido, s.provincia].filter(Boolean);
  return {
    title: name,
    description: bits.length
      ? `${name} (${bits.join(" · ")}). Historial de votos, presentismo y afinidad en el Senado.`
      : `${name}. Historial de votos, presentismo y afinidad en el Senado.`,
    og: {
      kind: "member",
      eyebrow: "senador",
      badge: s.partido || undefined,
      photoSrc: s.foto || "/placeholder-user.jpg",
    },
  };
});

const { sorting } = useTableSorting("fecha", true, { syncQuery: false });
const searchQuery = ref("");

const actasFiltered = computed<Acta[]>(() => {
  const list = senador.value?.actasSenador || [];
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return list;
  return list.filter((a) => {
    return (
      a.titulo?.toLowerCase().includes(q) ||
      a.resultado?.toLowerCase().includes(q) ||
      a.fecha?.toLowerCase().includes(q) ||
      a.tipoVotoSenador?.toLowerCase().includes(q)
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
    accessorKey: "tipoVotoSenador",
    header: sortableHeader("Voto"),
  },
];

function onRowSelect(_e: Event, row: { original: Acta }) {
  navigateTo(`/actas/${row.original.id}`);
}

const profileSections = computed<ProfileFactSection[]>(() => {
  const s = senador.value;
  if (!s) return [];

  const legalInicio = s.periodoLegal?.inicio
    ? formatDate(s.periodoLegal.inicio)
    : "—";
  const legalFin = s.periodoLegal?.fin
    ? formatDate(s.periodoLegal.fin)
    : "—";

  return [
    {
      title: "Identidad",
      items: [
        { label: "Provincia", value: s.provincia },
        {
          label: "Partido",
          value: s.partido || "—",
          to: partidoPath(s.partido),
        },
      ],
    },
    {
      title: "Mandato",
      items: [
        {
          label: "Período legal",
          value: `${legalInicio} – ${legalFin}`,
        },
        {
          label: "Inicio real",
          value: s.periodoReal?.inicio
            ? formatDate(s.periodoReal.inicio)
            : null,
        },
        {
          label: "Cese",
          value: s.periodoReal?.fin
            ? formatDate(s.periodoReal.fin)
            : isSenadorActivo(s)
              ? "En funciones"
              : null,
        },
      ],
    },
    {
      title: "Contacto",
      items: [
        {
          label: "Email",
          value: s.email || null,
          href: s.email ? `mailto:${s.email}` : null,
        },
      ],
    },
    {
      title: "Notas",
      items: [
        { label: "Reemplazo", value: s.reemplazo || null },
        { label: "Observaciones", value: s.observaciones || null },
      ],
    },
  ];
});
</script>

<template>
  <div class="page-container flex flex-col gap-10">
    <UCard v-if="!senador">
      <template #header>
        <h1 class="text-xl font-semibold">Senador no encontrado</h1>
      </template>
      <p class="text-gray-600 dark:text-gray-300">
        No se pudo encontrar información para el senador solicitado.
      </p>
    </UCard>

    <UCard v-else :ui="{ body: 'p-0!' }" class="overflow-hidden">
      <div class="flex flex-col md:flex-row">
        <div
          class="w-40 sm:w-48 md:w-xs shrink-0 mx-auto md:mx-0 aspect-square overflow-hidden bg-elevated"
        >
          <NuxtImg
            :src="senador.foto || '/placeholder-user.jpg'"
            :alt="senador.nombreCompleto || senador.nombre"
            width="208"
            height="208"
            sizes="160px sm:192px md:208px"
            densities="x1"
            class="w-full h-full object-cover"
            loading="eager"
          />
        </div>

        <div class="flex flex-col gap-5 flex-1 p-6">
          <div
            class="flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap"
          >
            <h1 class="text-2xl font-bold min-w-0">
              {{ senador.nombreCompleto || senador.nombre }}
            </h1>
            <PartidoLogo
              :partido="senador.partido"
              img-class="h-10 w-auto max-w-28 object-contain shrink-0"
            />
          </div>

          <MemberProfileFacts :sections="profileSections" />

          <div v-if="senador.estadisticas" class="grid grid-cols-1 gap-4">
            <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div
                class="rounded-lg border border-teal-300! p-3 bg-teal-50 dark:border-teal-700! dark:bg-teal-950"
              >
                <div
                  class="text-3xl font-bold text-teal-600 dark:text-teal-400"
                >
                  {{ senador.estadisticas.votosAfirmativos }}
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-300">
                  A favor
                </div>
              </div>
              <div
                class="rounded-lg border border-red-300! p-3 bg-red-50 dark:border-red-700! dark:bg-red-950"
              >
                <div class="text-3xl font-bold text-red-600 dark:text-red-400">
                  {{ senador.estadisticas.votosNegativos }}
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
                  {{ senador.estadisticas.abstenciones }}
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
                  {{ senador.estadisticas.totalVotaciones }}
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
                  {{ senador.estadisticas.ausencias }}
                </div>
              </div>
            </div>

            <div>
              <div class="flex justify-between mb-2">
                <span class="text-sm font-medium">Asistencia</span>
                <span class="text-sm font-medium"
                  >{{ senador.estadisticas.presentismo }}%</span
                >
              </div>
              <UProgress
                :model-value="senador.estadisticas.presentismo"
                size="sm"
                color="neutral"
              />
            </div>
          </div>
        </div>
      </div>
    </UCard>

    <ChartsMemberVotingCharts
      v-if="senador?.actasSenador?.length"
      :actas="senador.actasSenador"
      :member-label="senador.nombreCompleto || senador.nombre"
    />

    <AnalisisMemberAffinityPanel
      v-if="senador && affinityPeers.length"
      :member-id="senador.id"
      :member-name="senador.nombreCompleto || senador.nombre"
      group-label="partido"
      :group-name="senador.partido"
      member-base-path="/senadores"
      :peers="affinityPeers"
      :group-peers="affinityGroupPeers"
      :actas="senador.actasSenador"
      :detail-to="`/senadores/${senador.id}/afinidad`"
    />

    <DataTableCard v-if="senador" title="Sus votos">
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
        empty="No se encontraron votaciones para este senador."
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
            :tipo="(row.original as Acta).tipoVotoSenador || 'ausente'"
          />
        </template>
      </UTable>
    </DataTableCard>
  </div>
</template>
