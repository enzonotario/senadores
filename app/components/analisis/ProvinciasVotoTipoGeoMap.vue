<script setup lang="ts">
import {
  getVotoTipoConfig,
  normalizeVotoTipo,
  VOTO_TIPO_ORDER,
} from "@/utils/votoTipo";
import type { ProvinciaCompositionMember } from "@/components/analisis/ProvinciasCompositionGeoMap.vue";

const props = withDefaults(
  defineProps<{
    members: Array<{
      provincia?: string | null;
      tipoVoto?: string | null;
    }>;
    catalog?: string[];
    selected?: string[];
    membersLabel?: string;
    height?: string;
  }>(),
  {
    catalog: () => [],
    selected: () => [],
    membersLabel: "integrantes",
    height: "32rem",
  },
);

const emit = defineEmits<{
  select: [name: string];
}>();

const compositionMembers = computed<ProvinciaCompositionMember[]>(() =>
  (props.members || []).map((m) => ({
    provincia: m.provincia,
    category: normalizeVotoTipo(m.tipoVoto),
  })),
);

const categories = computed(() =>
  VOTO_TIPO_ORDER.map((key) => {
    const cfg = getVotoTipoConfig(key);
    return { key, label: cfg.label, color: cfg.color };
  }),
);
</script>

<template>
  <AnalisisProvinciasCompositionGeoMap
    :members="compositionMembers"
    :categories="categories"
    :catalog="catalog"
    :selected="selected"
    :members-label="membersLabel"
    :height="height"
    title="Votos por provincia"
    description="Cada torta muestra cómo se repartieron los votos en esa provincia. Clic para filtrar."
    @select="emit('select', $event)"
  />
</template>
