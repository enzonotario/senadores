<script setup lang="ts">
import { getActas, getDiputadosPorBloques } from "@/lib/diputados-data";
import {
  encodeOgHemiciclo,
  groupsForOgHemiciclo,
} from "@/lib/hemiciclo-layout";
import { slimActas } from "@/lib/payload-slim";

const { data: bloquesData } = await useAsyncData("diputados-por-bloques", () =>
  getDiputadosPorBloques(),
);

const { data: actasData } = await useAsyncData("diputados-actas-home", async () =>
  slimActas(await getActas()),
);

const diputados = computed(() => bloquesData.value?.diputados || []);
const bloqueColores = computed(() => bloquesData.value?.bloqueColores || {});

useChamberSeo(() => {
  const groups = groupsForOgHemiciclo(
    diputados.value.map((d) => ({ group: d.bloque })),
    bloqueColores.value,
  );
  return {
    title: "Cómo votan los diputados",
    description:
      "Actas, hemiciclo y perfiles: mirá cómo votó cada diputado en cada proyecto de ley de la Cámara de Diputados.",
    og: {
      kind: "home",
      eyebrow: "diputados",
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
        Votaciones de Diputados
      </h1>
      <p
        class="max-w-[700px] text-lg text-gray-600 dark:text-gray-300 md:text-xl"
      >
        Mirá cómo votaron los diputados en cada proyecto de ley de la Cámara
      </p>
      <div class="flex flex-col sm:flex-row gap-4">
        <UButton to="/actas" size="lg">
          <UIcon name="lucide:file-text" class="size-4" />
          <span>Ver votaciones</span>
        </UButton>
        <UButton to="/diputados" size="lg" variant="soft" color="neutral">
          <UIcon name="lucide:users" class="size-4" />
          <span>Ver Diputados</span>
        </UButton>
      </div>
    </section>

    <USeparator class="my-20" />

    <section>
      <ClientOnly>
        <DiputadosChart
          :diputados="diputados"
          :bloque-colores="bloqueColores"
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
        <h2 class="text-2xl font-bold tracking-tight">Cómo viene votando la Cámara</h2>
        <p class="text-sm text-muted max-w-2xl">
          Cuántas votaciones se aprueban o rechazan, y cuántos diputados asisten, mes a mes.
        </p>
      </div>
      <ChartsActasOverviewCharts :actas="actasData || []" :from-year="2021" />
    </section>

    <USeparator class="my-20" />

    <section>
      <RecentVotings :actas="actasRecientes" />
    </section>

    <USeparator class="my-20" />

    <ChamberOtherChamberCta />
  </div>
</template>
