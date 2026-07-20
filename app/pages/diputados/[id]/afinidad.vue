<script setup lang="ts">
import {
  getBloqueColores,
  getDiputadoConActasById,
  getDiputadosConActas,
} from "@/lib/diputados-data";
import { isDiputadoActivo } from "@/lib/utils";
import { bloquePath } from "@/utils/bloque";
import {
  votesFromDiputado,
  type AffinityMemberInput,
} from "@/utils/votingAffinity";

const route = useRoute();
const id = computed(() => String(route.params.id));

const { data } = await useAsyncData(
  "diputado-afinidad",
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

const groupColors = computed(() => {
  const names = [
    ...new Set(
      affinityPeers.value.map((p) => p.group).filter(Boolean) as string[],
    ),
  ];
  return getBloqueColores(names);
});

const actas = computed(() =>
  (diputado.value?.actasDiputado || []).map((a) => ({
    id: String(a.id),
    titulo: a.titulo,
    resultado: a.resultado,
    fecha: a.fecha,
    voto: a.tipoVotoDiputado,
  })),
);

const memberName = computed(() =>
  diputado.value
    ? `${diputado.value.nombre} ${diputado.value.apellido}`
    : "Diputado",
);

useChamberSeo(() => {
  if (!diputado.value) {
    return {
      title: "Con quién vota parecido",
      description: "Quién vota parecido a quién en Diputados.",
      og: { kind: "afinidad", eyebrow: "afinidad" },
    };
  }
  return {
    title: `Con quién vota parecido · ${memberName.value}`,
    description: `Con quién coincide ${memberName.value}, con quién no, y cuántas veces se apartó de su bloque.`,
    og: {
      kind: "afinidad",
      eyebrow: "afinidad",
      badge: diputado.value.bloque || undefined,
    },
  };
});
</script>

<template>
  <UCard v-if="!diputado">
    <template #header>
      <h1 class="text-xl font-semibold">Diputado no encontrado</h1>
    </template>
    <p class="text-gray-600 dark:text-gray-300">
      No se pudo encontrar información para el diputado solicitado.
    </p>
  </UCard>

  <AnalisisMemberAffinityDetail
    v-else
    :member-id="diputado.id"
    :member-name="memberName"
    :member-foto="diputado.foto"
    :member-to="`/diputados/${diputado.id}`"
    group-label="bloque"
    :group-name="diputado.bloque"
    :group-to="bloquePath(diputado.bloque)"
    member-base-path="/diputados"
    :peers="affinityPeers"
    :group-peers="affinityGroupPeers"
    :actas="actas"
    :group-colors="groupColors"
  />
</template>
