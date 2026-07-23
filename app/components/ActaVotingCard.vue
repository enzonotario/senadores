<script setup lang="ts">
import { formatDate } from "@/lib/utils";
import { actaVoteTotal } from "@/lib/payload-slim";

type ActaCard = {
  id: string;
  titulo: string;
  fecha: string;
  resultado: string;
  votosAfirmativos: number;
  votosNegativos: number;
  abstenciones: number;
  ausentes: number;
  votos?: unknown[];
};

const props = defineProps<{
  acta: ActaCard;
}>();

const totalVotos = computed(() => actaVoteTotal(props.acta));

function pct(n: number) {
  if (!totalVotos.value) return "0";
  return ((n / totalVotos.value) * 100).toFixed(0);
}
</script>

<template>
  <NuxtLink :to="`/actas/${acta.id}`" class="block group h-full">
    <UCard
      :ui="{
        header: 'border-0 p-2!',
        body: 'p-0! flex flex-grow',
      }"
      class="h-full overflow-hidden flex flex-col"
    >
      <template #header>
        <div class="space-y-2">
          <div
            class="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300"
          >
            <div class="flex items-center gap-1">
              <UIcon name="lucide:calendar" class="size-3" />
              <span>{{ formatDate(acta.fecha) }}</span>
            </div>
            <ResultadoBadge :resultado="acta.resultado" />
          </div>

          <h3
            class="line-clamp-3 text-lg font-semibold group-hover:text-primary transition-colors"
          >
            {{ acta.titulo }}
          </h3>
        </div>
      </template>

      <div class="flex flex-col justify-end flex-1 gap-3">
        <div class="grid grid-cols-4 gap-2 text-xs text-center">
          <div
            class="flex flex-col items-center justify-center text-teal-800 dark:text-teal-300"
          >
            <span>A favor</span>
            <span
              >{{ pct(acta.votosAfirmativos) }}% ({{
                acta.votosAfirmativos
              }})</span
            >
          </div>
          <div
            class="flex flex-col items-center justify-center text-red-800 dark:text-red-300"
          >
            <span>En contra</span>
            <span
              >{{ pct(acta.votosNegativos) }}% ({{ acta.votosNegativos }})</span
            >
          </div>
          <div
            class="flex flex-col items-center justify-center text-blue-800 dark:text-blue-300"
          >
            <span>Abstenciones</span>
            <span>{{ pct(acta.abstenciones) }}% ({{ acta.abstenciones }})</span>
          </div>
          <div
            class="flex flex-col items-center justify-center text-yellow-800 dark:text-yellow-300"
          >
            <span>Ausentes</span>
            <span>{{ pct(acta.ausentes) }}% ({{ acta.ausentes }})</span>
          </div>
        </div>

        <VotacionesProgress :acta="acta" :resultado="acta.resultado" />
      </div>
    </UCard>
  </NuxtLink>
</template>
