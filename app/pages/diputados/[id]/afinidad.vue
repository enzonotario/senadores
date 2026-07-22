<script setup lang="ts">
import {
  getBloqueColores,
} from "@/lib/diputados-data";
import { bloquePath } from "@/utils/bloque";
import {
  memberActasInWindow,
  type AffinityMemberInput,
} from "@/utils/votingAffinity";
import type { Diputado } from "@/lib/types-diputados";

type MemberProfileResponse = {
  member: Diputado;
  chartActas: Array<{
    id: string;
    fecha?: string | null;
    titulo?: string | null;
    resultado?: string | null;
    tipoVotoDiputado?: string | null;
  }>;
  actasMeta: Array<{
    id: string;
    titulo?: string | null;
    resultado?: string | null;
  }>;
};

const route = useRoute();
const id = computed(() => String(route.params.id));
const { localFetch } = useLocalApi();

const { data, pending } = await useAsyncData(
  () => `diputado-afinidad-${id.value}`,
  () => localFetch<MemberProfileResponse>(`/api/members/${id.value}`),
  { watch: [id] },
);
const diputado = computed(() => data.value?.member || null);
const chartActas = computed(() => data.value?.chartActas || []);

const { data: peersPayload, pending: peersPending } = useAffinityPeers(
  "diputados-affinity-peers",
);

const affinityPeers = computed<AffinityMemberInput[]>(() => {
  const current = diputado.value;
  const ensure: AffinityMemberInput | null = current
    ? {
        id: current.id,
        name:
          current.nombreCompleto ||
          `${current.apellido}, ${current.nombre}` ||
          `${current.nombre} ${current.apellido}`,
        group: current.bloque,
        foto: current.foto,
        votes: memberActasInWindow(
          chartActas.value.map((a) => ({
            id: a.id,
            fecha: String(a.fecha || ""),
            voto: a.tipoVotoDiputado,
          })),
        ),
      }
    : null;
  return peersToAffinityInputs(peersPayload.value?.peers, { ensure });
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
  chartActas.value.map((a) => ({
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
  <div class="page-container">
    <AppDataSkeleton v-if="pending" variant="member" />

    <UCard v-else-if="!diputado">
      <template #header>
        <h1 class="text-xl font-semibold">Diputado no encontrado</h1>
      </template>
      <p class="text-gray-600 dark:text-gray-300">
        No se pudo encontrar información para el diputado solicitado.
      </p>
    </UCard>

    <AppDataSkeleton v-else-if="peersPending" variant="affinity" />

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
  </div>
</template>
