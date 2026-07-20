<script setup lang="ts">
/**
 * Template OG Takumi — Nuxt OG Image (ver https://takumi.kane.tw/docs/integration/nuxt).
 * Props vía defineOgImage('Chamber.takumi', { ... }).
 *
 * `votes` es un string `afirmativos:negativos:abstenciones`.
 * `hemiciclo` es `45:14b8a6,30:ef4444` (grupos count:hex).
 */
import {
  decodeOgHemiciclo,
  layoutOgHemiciclo,
} from "@/lib/hemiciclo-layout";
import { OG_BAR_ACCENT } from "@/lib/og";

const props = withDefaults(
  defineProps<{
    title?: string;
    description?: string;
    brand?: string;
    /** Path o URL del logo; si falta, se elige por `brand`. */
    logoSrc?: string;
    eyebrow?: string;
    badge?: string;
    /** Hex del acento (resultado afirmativo → verde, etc.). */
    accent?: string;
    /** Indicador abajo a la izquierda (fecha, etc.). */
    footerLeft?: string;
    /** Conteos `46:25:1` (afirmativos:negativos:abstenciones). */
    votes?: string;
    /** Foto del miembro (URL absoluta preferible). */
    photoSrc?: string;
    /** Hemiciclo compacto `45:14b8a6,30:ef4444`. */
    hemiciclo?: string;
  }>(),
  {
    title: "Argentina Datos",
    description: "",
    brand: "senadores",
    logoSrc: "",
    eyebrow: "",
    badge: "",
    accent: OG_BAR_ACCENT,
    footerLeft: "",
    votes: "",
    photoSrc: "",
    hemiciclo: "",
  },
);

/** Solo para el gradiente de fondo. */
const CELESTE = "#75AADB";
/** Textos y UI (no el gradiente). */
const INK = "#111111";

const VOTE_COLORS = {
  afirmativo: "#14b8a6",
  negativo: "#ef4444",
  abstencion: "#3b82f6",
} as const;

const resolvedLogo = computed(() => {
  const explicit = (props.logoSrc || "").trim();
  if (explicit) return explicit;
  const brand = (props.brand || "").toLowerCase();
  if (brand.includes("diput")) return "/assets/diputados.png";
  return "/assets/senado.png";
});

const resolvedPhoto = computed(() => (props.photoSrc || "").trim());

const hemicicloLayout = computed(() => {
  const groups = decodeOgHemiciclo(props.hemiciclo);
  if (!groups.length) return null;
  return layoutOgHemiciclo(groups);
});

const showHemiciclo = computed(() => Boolean(hemicicloLayout.value?.seats.length));

const voteRows = computed(() => {
  const raw = String(props.votes || "").trim();
  if (!raw) return [];
  const parts = raw.split(":").map((p) => Number(p));
  if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) return [];
  const [afirm, neg, abst] = parts;
  return [
    {
      key: "afirmativo",
      label: "A favor",
      count: afirm,
      color: VOTE_COLORS.afirmativo,
    },
    {
      key: "negativo",
      label: "En contra",
      count: neg,
      color: VOTE_COLORS.negativo,
    },
    {
      key: "abstencion",
      label: "Abstención",
      count: abst,
      color: VOTE_COLORS.abstencion,
    },
  ];
});

const showVotes = computed(() => voteRows.value.length > 0);
</script>

<template>
  <div
    class="relative flex h-full w-full overflow-hidden"
    :style="{
      background: `linear-gradient(135deg, #ffffff 0%, #ffffff 42%, ${CELESTE}14 72%, ${CELESTE}28 100%)`,
      color: INK,
    }"
  >
    <!-- Barra de acento (resultado / cámara) -->
    <div
      class="absolute bottom-0 left-0 top-0 w-3"
      :style="{ background: accent }"
    />

    <div
      class="relative flex h-full w-full flex-col justify-between px-16 py-10 pl-[4.25rem]"
    >
      <!-- Arriba: header + título -->
      <div class="flex w-full flex-col gap-6">
        <div class="flex w-full items-center justify-between">
          <div class="flex items-center gap-5">
            <img
              :src="resolvedLogo"
              :alt="brand"
              width="96"
              height="96"
              class="h-24 w-24 object-contain"
            />
            <div
              v-if="eyebrow"
              class="text-[26px] font-semibold uppercase tracking-[0.08em]"
              :style="{ color: `${INK}99` }"
            >
              {{ eyebrow }}
            </div>
          </div>
          <div
            v-if="badge"
            class="rounded-full px-5 py-2.5 text-[24px] font-bold tracking-wide text-white"
            :style="{ background: accent }"
          >
            {{ badge }}
          </div>
        </div>

        <div
          class="flex w-full items-start gap-10"
          :class="resolvedPhoto || showHemiciclo ? 'justify-between' : ''"
        >
          <div
            class="flex min-w-0 flex-col gap-4"
            :class="
              resolvedPhoto || showHemiciclo ? 'max-w-[520px]' : 'max-w-[1020px]'
            "
          >
            <div
              class="text-[48px] font-extrabold leading-[1.12] tracking-tight"
              :style="{ color: INK }"
            >
              {{ title }}
            </div>

            <div
              v-if="!showVotes && description"
              class="text-[24px] font-medium leading-snug"
              :style="{ color: `${INK}b3` }"
            >
              {{ description }}
            </div>
          </div>

          <img
            v-if="resolvedPhoto"
            :src="resolvedPhoto"
            :alt="title"
            width="280"
            height="280"
            class="h-[280px] w-[280px] shrink-0 rounded-full object-cover"
            :style="{
              border: `6px solid ${INK}1a`,
              boxShadow: `0 18px 40px ${INK}26`,
            }"
          />

          <div
            v-else-if="hemicicloLayout"
            class="relative shrink-0"
            :style="{
              width: `${hemicicloLayout.width}px`,
              height: `${hemicicloLayout.height}px`,
            }"
          >
            <div
              v-for="(seat, i) in hemicicloLayout.seats"
              :key="i"
              class="absolute rounded-full"
              :style="{
                left: `${seat.x - seat.r}px`,
                top: `${seat.y - seat.r}px`,
                width: `${seat.r * 2}px`,
                height: `${seat.r * 2}px`,
                backgroundColor: seat.color,
              }"
            />
          </div>
        </div>
      </div>

      <!-- Abajo: votos (si hay) + footer -->
      <div class="flex w-full flex-col gap-7">
        <div v-if="showVotes" class="flex items-end gap-10">
          <div
            v-for="row in voteRows"
            :key="row.key"
            class="flex items-center gap-3"
          >
            <div
              class="h-5 w-5 rounded-full"
              :style="{ background: row.color }"
            />
            <div class="flex flex-col">
              <div
                class="text-[40px] font-extrabold leading-none tracking-tight"
                :style="{ color: row.color }"
              >
                {{ row.count }}
              </div>
              <div
                class="mt-1 text-[18px] font-semibold uppercase tracking-[0.06em]"
                :style="{ color: `${INK}99` }"
              >
                {{ row.label }}
              </div>
            </div>
          </div>
        </div>

        <div class="flex w-full items-baseline justify-between gap-8">
          <div
            class="min-w-0 text-[26px] font-semibold"
            :style="{ color: `${INK}b3` }"
          >
            {{ footerLeft }}
          </div>
          <div
            class="flex shrink-0 items-baseline gap-0 text-[28px] font-semibold"
          >
            <span :style="{ color: INK }">{{ brand }}</span>
            <span :style="{ color: `${INK}80` }">.argentinadatos.com</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
