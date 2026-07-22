<script setup lang="ts">
import { getSenadoresPorPartidos } from "@/lib/senadores-data";
import {
  encodeOgHemiciclo,
  groupsForOgHemiciclo,
} from "@/lib/hemiciclo-layout";

const { localFetch } = useLocalApi();

const { data: partidosData, pending: pendingPartidos } = useAsyncData(
  "senadores-por-partidos",
  () => getSenadoresPorPartidos(),
  { lazy: true },
);

const { data: actasData, pending: pendingActas } = useAsyncData(
  "actas",
  async () => {
    const res = await localFetch<{ actas: any[] }>("/api/actas");
    return res.actas || [];
  },
  { lazy: true },
);

const pendingHome = computed(() => pendingPartidos.value || pendingActas.value);

const senadores = computed(() => partidosData.value?.senadores || []);
const partidoColores = computed(() => partidosData.value?.partidoColores || {});

useChamberSeo(() => {
  const groups = groupsForOgHemiciclo(
    senadores.value.map((s) => ({ group: s.partido })),
    partidoColores.value,
  );
  return {
    title: "Cómo votan los senadores",
    description:
      "Actas, hemiciclo y perfiles: mirá cómo votó cada senador en cada proyecto de ley del Senado de la Nación.",
    og: {
      kind: "home",
      eyebrow: "senadores",
      hemiciclo: encodeOgHemiciclo(groups),
    },
  };
});

const actasRecientes = computed(() => {
  const actas = [...(actasData.value || [])];
  actas.sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
  );
  return actas.slice(0, 9);
});
</script>

<template>
  <div class="page-container">
    <section
      class="flex flex-col items-center justify-center space-y-4 text-center"
    >
      <AppBrand :show-text="false" size="lg" class="justify-center" />
      <h1 class="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">
        Votaciones de Senadores
      </h1>
      <p
        class="max-w-[700px] text-lg text-gray-600 dark:text-gray-300 md:text-xl"
      >
        Mirá cómo votaron los senadores en cada proyecto de ley del Senado
      </p>
      <div class="flex flex-col sm:flex-row gap-4">
        <UButton to="/actas" size="lg">
          <UIcon name="lucide:file-text" class="size-4" />
          <span>Ver votaciones</span>
        </UButton>
        <UButton to="/senadores" size="lg" variant="soft" color="neutral">
          <UIcon name="lucide:users" class="size-4" />
          <span>Ver Senadores</span>
        </UButton>
      </div>
    </section>

    <USeparator class="my-20" />

    <AppDataSkeleton v-if="pendingHome" variant="home" />

    <template v-else>
      <section>
        <ClientOnly>
          <SenadoresChart
            :senadores="senadores"
            :partido-colores="partidoColores"
          />
          <template #fallback>
            <div
              class="w-full aspect-[2/1] max-w-4xl mx-auto rounded-lg bg-gray-100 dark:bg-gray-900 animate-pulse"
              aria-hidden="true"
            />
          </template>
        </ClientOnly>
      </section>

      <USeparator class="my-20" />

      <section class="space-y-4">
        <div class="space-y-1">
          <h2 class="text-2xl font-bold tracking-tight">Cómo viene votando el Senado</h2>
          <p class="text-sm text-muted max-w-2xl">
            Cuántas votaciones se aprueban o rechazan, y cuántos senadores asisten, mes a mes.
          </p>
        </div>
        <ChartsActasOverviewCharts :actas="actasData || []" />
      </section>

      <USeparator class="my-20" />

      <section>
        <RecentVotings :actas="actasRecientes" />
      </section>
    </template>

    <USeparator class="my-20" />

    <ChamberOtherChamberCta />
  </div>
</template>
