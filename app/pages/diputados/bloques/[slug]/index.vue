<script setup lang="ts">
import { useRouteQuery } from "@vueuse/router";
import type { TabsItem } from "@nuxt/ui";
import type { Diputado } from "@/lib/types-diputados";
import { getBloqueColores } from "@/lib/diputados-data";
import { sortableHeader } from "@/utils/sortableHeader";
import { bloqueSlug } from "@/utils/bloque";
import type { AffinityMemberInput } from "@/utils/votingAffinity";

type GroupDetailResponse = {
  nombre: string;
  slug: string;
  color: string;
  presentismo: number | null;
  activos: Diputado[];
  inactivos: Diputado[];
  cohesionPeers: AffinityMemberInput[];
  actasMeta: Record<
    string,
    { id: string; titulo?: string | null; resultado?: string | null }
  >;
};

const route = useRoute();
const slug = computed(() => String(route.params.slug || ""));
const { localFetch } = useLocalApi();

const { data } = await useAsyncData(
  () => `bloque-${slug.value}`,
  () => localFetch<GroupDetailResponse>(`/api/groups/${slug.value}`),
  { watch: [slug] },
);

const bloque = computed(() => data.value || null);

const { data: peersPayload, pending: peersPending } = useAffinityPeers(
  "diputados-affinity-peers",
);

const cohesionMembers = computed<AffinityMemberInput[]>(
  () => bloque.value?.cohesionPeers || [],
);

const allActiveMembers = computed<AffinityMemberInput[]>(() =>
  peersToAffinityInputs(peersPayload.value?.peers),
);

const groupSlugs = computed(() => {
  const map: Record<string, string> = {};
  for (const d of allActiveMembers.value) {
    const name = d.group?.trim();
    if (!name || map[name]) continue;
    map[name] = bloqueSlug(name);
  }
  return map;
});

const groupColors = computed(() => {
  const names = Object.keys(groupSlugs.value);
  return getBloqueColores(names);
});

const actasMeta = computed(() => bloque.value?.actasMeta || {});
const pageVista = useRouteQuery("vista", "integrantes");
const pageVistaItems: TabsItem[] = [
  { label: "Integrantes", value: "integrantes", icon: "i-lucide-users" },
  { label: "Cómo votan juntos", value: "afinidad", icon: "i-lucide-git-compare" },
];

watch(
  pageVista,
  (value) => {
    if (value === "afinidad" || value === "integrantes") return;
    // Compat: /afinidad redirige con vista=afinidad; tabs viejos → integrantes
    pageVista.value = "integrantes";
  },
  { immediate: true },
);

const mostrarActivos = ref(true);
const integrantesVista = useLocalStorage<"lista" | "grilla">(
  "integrantes-vista",
  "lista",
  { initOnMounted: true },
);
const displayed = computed<Diputado[]>(() => {
  if (!bloque.value) return [];
  return mostrarActivos.value ? bloque.value.activos : bloque.value.inactivos;
});

const { sorting } = useTableSorting("nombreCompleto", false, {
  syncQuery: false,
});

const tableColumns = [
  {
    id: "foto",
    accessorKey: "foto",
    header: "",
    enableSorting: false,
    meta: {
      class: {
        th: "w-12 px-2",
        td: "w-12 px-2",
      },
    },
  },
  {
    accessorKey: "nombreCompleto",
    header: sortableHeader("Diputado"),
  },
  { accessorKey: "provincia", header: sortableHeader("Provincia") },
  {
    id: "presentismo",
    accessorKey: "estadisticas.presentismo",
    header: sortableHeader("Asistencia"),
  },
];

function onRowSelect(_e: Event, row: { original: Diputado }) {
  navigateTo(`/diputados/${row.original.id}`);
}

useChamberSeo(() => {
  const name = bloque.value?.nombre;
  const isAfinidad = pageVista.value === "afinidad";
  if (!name) {
    return {
      title: "Bloque",
      description:
        "Bloques de la Cámara de Diputados de la Nación Argentina.",
      og: { kind: "group", eyebrow: "bloque" },
    };
  }
  if (isAfinidad) {
    return {
      title: `Cómo votan juntos · ${name}`,
      description: `Qué tan unidos votan en ${name} y con qué otros bloques coinciden.`,
      og: { kind: "afinidad", eyebrow: "afinidad", badge: name },
    };
  }
  const n = bloque.value?.activos?.length;
  return {
    title: name,
    description:
      n != null
        ? `Bloque ${name}: ${n} diputados activos. Integrantes, presentismo y votos en la Cámara de Diputados.`
        : `Diputados del bloque ${name} en la Cámara de Diputados de la Nación Argentina.`,
    og: {
      kind: "group",
      eyebrow: "bloque",
      badge:
        n != null
          ? `${n} ${n === 1 ? "diputado" : "diputados"}`
          : undefined,
    },
  };
});
</script>

<template>
  <div class="page-container flex flex-col gap-8">
    <div class="flex flex-wrap items-center gap-3">
      <UButton
        to="/diputados/bloques"
        variant="ghost"
        color="neutral"
        size="sm"
      >
        <UIcon name="lucide:arrow-left" class="size-4" />
        Todos los bloques
      </UButton>
    </div>

    <UCard v-if="!bloque">
      <template #header>
        <h1 class="text-xl font-semibold">Bloque no encontrado</h1>
      </template>
      <p class="text-gray-600 dark:text-gray-300">
        No se pudo encontrar información para el bloque solicitado.
      </p>
    </UCard>

    <template v-else>
      <UCard :ui="{ body: 'p-0!' }" class="overflow-hidden">
        <div class="h-2" :style="{ backgroundColor: bloque.color }" />
        <div
          class="flex flex-col gap-4 p-6 sm:flex-row sm:items-end sm:justify-between"
        >
          <div class="min-w-0 space-y-2">
            <p class="text-sm text-toned">Bloque</p>
            <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">
              {{ bloque.nombre }}
            </h1>
            <p class="text-sm text-muted">
              {{ bloque.activos.length }}
              {{
                bloque.activos.length === 1
                  ? "diputado activo"
                  : "diputados activos"
              }}
              <span v-if="bloque.inactivos.length">
                · {{ bloque.inactivos.length }}
                {{
                  bloque.inactivos.length === 1 ? "inactivo" : "inactivos"
                }}
              </span>
            </p>
            <div
              v-if="bloque.presentismo != null"
              class="max-w-xs space-y-1.5 pt-1"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="text-sm font-medium">Asistencia del bloque</span>
                <span class="text-sm font-medium"
                  >{{ bloque.presentismo }}%</span
                >
              </div>
              <UProgress
                :model-value="bloque.presentismo"
                size="sm"
                :color="bloque.presentismo > 80 ? 'success' : 'error'"
              />
            </div>
          </div>
          <div
            class="size-12 shrink-0 rounded-full ring-4 ring-default"
            :style="{ backgroundColor: bloque.color }"
            aria-hidden="true"
          />
        </div>
      </UCard>

      <SegmentedTabs
        v-model="pageVista"
        :items="pageVistaItems"
        :center="false"
      />

      <template v-if="pageVista === 'afinidad'">
        <ClientOnly>
          <AppDataSkeleton v-if="peersPending" variant="affinity" />
          <AnalisisGroupAffinityDetail
            v-else
            embedded
            group-label="bloque"
            :group-name="bloque.nombre"
            :group-color="bloque.color"
            :members="cohesionMembers"
            :all-members="allActiveMembers"
            member-base-path="/diputados"
            group-base-path="/diputados/bloques"
            :group-slugs="groupSlugs"
            :actas-meta="actasMeta"
            :group-colors="groupColors"
          />
          <template #fallback>
            <AppDataSkeleton variant="affinity" />
          </template>
        </ClientOnly>
      </template>

      <template v-else>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-lg font-semibold">Integrantes</h2>
          <div class="flex flex-wrap items-center gap-3">
            <UFieldGroup size="sm">
              <UButton
                color="neutral"
                :variant="integrantesVista === 'lista' ? 'solid' : 'outline'"
                icon="i-lucide-list"
                aria-label="Vista lista"
                @click="integrantesVista = 'lista'"
              />
              <UButton
                color="neutral"
                :variant="integrantesVista === 'grilla' ? 'solid' : 'outline'"
                icon="i-lucide-layout-grid"
                aria-label="Vista grilla"
                @click="integrantesVista = 'grilla'"
              />
            </UFieldGroup>
            <div class="flex items-center gap-2">
              <span class="text-sm text-toned">Solo activos</span>
              <USwitch v-model="mostrarActivos" />
            </div>
          </div>
        </div>

        <DataTableCard v-if="integrantesVista === 'lista'">
          <UTable
            v-model:sorting="sorting"
            :data="displayed"
            :columns="tableColumns"
            :ui="{ tr: 'cursor-pointer hover:bg-elevated/50' }"
            empty="No hay diputados para mostrar."
            :on-select="onRowSelect"
          >
            <template #foto-cell="{ row }">
              <DiputadoTableAvatar
                :src="(row.original as Diputado).foto"
                :alt="
                  (row.original as Diputado).nombreCompleto ||
                  `${(row.original as Diputado).apellido}, ${(row.original as Diputado).nombre}`
                "
              />
            </template>
            <template #nombreCompleto-cell="{ row }">
              <NuxtLink
                :to="`/diputados/${(row.original as Diputado).id}`"
                class="hover:underline"
                @click.stop
              >
                {{
                  (row.original as Diputado).nombreCompleto ||
                  `${(row.original as Diputado).apellido}, ${(row.original as Diputado).nombre}`
                }}
              </NuxtLink>
            </template>
            <template #presentismo-cell="{ row }">
              <span>
                {{
                  (row.original as Diputado).estadisticas?.presentismo ?? "—"
                }}{{ (row.original as Diputado).estadisticas ? "%" : "" }}
              </span>
            </template>
          </UTable>
        </DataTableCard>

        <DiputadoAvatarGrid
          v-else
          :diputados="displayed"
          grid-class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 justify-items-center"
        />
      </template>
    </template>
  </div>
</template>
