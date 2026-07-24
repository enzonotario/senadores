<script setup lang="ts">
import { getPartidoColores } from "@/lib/senadores-data";
import { partidoPath } from "@/utils/partido";
import {
  memberActasInWindow,
  type AffinityMemberInput,
} from "@/utils/votingAffinity";
import type { CareerCargo } from "@/utils/memberCareer";
import { mandatoRangesForChamber } from "@/utils/memberCareer";
import type { Senador } from "@/lib/types";

type MemberProfileResponse = {
  member: Senador;
  chartActas: Array<{
    id: string;
    fecha?: string | null;
    titulo?: string | null;
    resultado?: string | null;
    tipoVotoSenador?: string | null;
  }>;
  career?: CareerCargo[];
};

const route = useRoute();
const id = computed(() => String(route.params.id));
const { localFetch } = useLocalApi();

const { data, pending } = await useAsyncData(
  () => `senador-afinidad-${id.value}`,
  () => localFetch<MemberProfileResponse>(`/api/members/${id.value}`),
  { watch: [id] },
);
const senador = computed(() => data.value?.member || null);
const chartActas = computed(() => data.value?.chartActas || []);
const mandatoRanges = computed(() =>
  mandatoRangesForChamber(data.value?.career, "senadores"),
);

if (senador.value && senador.value.id !== id.value) {
  await navigateTo(`/senadores/${senador.value.id}/afinidad`, {
    redirectCode: 301,
    replace: true,
  });
}

const { data: peersPayload, pending: peersPending } = useAffinityPeers(
  "senadores-affinity-peers",
);

const affinityPeers = computed<AffinityMemberInput[]>(() => {
  const current = senador.value;
  const ensure: AffinityMemberInput | null = current
    ? {
        id: current.id,
        name: current.nombreCompleto || current.nombre,
        group: current.partido,
        foto: current.foto,
        votes: memberActasInWindow(
          chartActas.value.map((a) => ({
            id: a.id,
            fecha: String(a.fecha || ""),
            voto: a.tipoVotoSenador,
          })),
        ),
      }
    : null;
  return peersToAffinityInputs(peersPayload.value?.peers, { ensure });
});

const affinityGroupPeers = computed(() => {
  const partido = senador.value?.partido;
  if (!partido) return [];
  return affinityPeers.value.filter((p) => p.group === partido);
});

const groupColors = computed(() => {
  const names = [
    ...new Set(
      affinityPeers.value.map((p) => p.group).filter(Boolean) as string[],
    ),
  ];
  return getPartidoColores(names);
});

const actas = computed(() =>
  chartActas.value.map((a) => ({
    id: String(a.id),
    titulo: a.titulo,
    resultado: a.resultado,
    fecha: a.fecha,
    voto: a.tipoVotoSenador,
  })),
);

const memberName = computed(
  () => senador.value?.nombreCompleto || senador.value?.nombre || "Senador",
);

useChamberSeo(() => {
  if (!senador.value) {
    return {
      title: "Con quién vota parecido",
      description: "Quién vota parecido a quién en el Senado.",
      og: { kind: "afinidad", eyebrow: "afinidad" },
    };
  }
  return {
    title: `Con quién vota parecido · ${memberName.value}`,
    description: `Con quién coincide ${memberName.value}, con quién no, y cuántas veces se apartó de su partido.`,
    og: {
      kind: "afinidad",
      eyebrow: "afinidad",
      badge: senador.value.partido || undefined,
    },
  };
});
</script>

<template>
  <div class="page-container">
    <AppDataSkeleton v-if="pending" variant="member" />

    <UCard v-else-if="!senador">
      <template #header>
        <h1 class="text-xl font-semibold">Senador no encontrado</h1>
      </template>
      <p class="text-gray-600 dark:text-gray-300">
        No se pudo encontrar información para el senador solicitado.
      </p>
    </UCard>

    <ClientOnly v-else>
      <AppDataSkeleton v-if="peersPending" variant="affinity" />
      <AnalisisMemberAffinityDetail
        v-else
        :member-id="senador.id"
        :member-name="memberName"
        :member-foto="senador.foto"
        :member-to="`/senadores/${senador.id}`"
        group-label="partido"
        :group-name="senador.partido"
        :group-to="partidoPath(senador.partido)"
        member-base-path="/senadores"
        :peers="affinityPeers"
        :group-peers="affinityGroupPeers"
        :actas="actas"
        :group-colors="groupColors"
        :mandatos="mandatoRanges"
      />
      <template #fallback>
        <AppDataSkeleton variant="affinity" />
      </template>
    </ClientOnly>
  </div>
</template>
