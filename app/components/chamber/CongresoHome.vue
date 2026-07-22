<script setup lang="ts">
import { CHAMBERS } from "@/lib/chamber";

useChamberSeo({
  title: "Cómo votan en el Congreso",
  description:
    "Elegí Cámara de Diputados o Senado y mirá cómo votan en el Congreso de la Nación Argentina.",
});

const { diputadosUrl, senadoresUrl } = useChamber();

const cards = computed(() => [
  {
    id: "diputados" as const,
    url: diputadosUrl.value,
    cta: "Ir a Diputados",
    config: CHAMBERS.diputados,
  },
  {
    id: "senadores" as const,
    url: senadoresUrl.value,
    cta: "Ir a Senadores",
    config: CHAMBERS.senadores,
  },
]);
</script>

<template>
  <div
    class="relative isolate flex min-h-[calc(100vh-var(--ui-header-height))] flex-col"
  >
    <div class="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
      <img
        src="/assets/congreso.png"
        alt=""
        class="absolute inset-0 h-full w-full object-cover object-[center_35%]"
        width="1920"
        height="1080"
        decoding="async"
        fetchpriority="high"
      />
      <div
        class="absolute inset-0 bg-gradient-to-b from-white/70 via-white/55 to-white/85 dark:from-black/65 dark:via-black/55 dark:to-black/85"
      />
    </div>

    <div class="page-container relative flex flex-1 flex-col justify-center py-10 sm:py-14">
      <section
        class="flex flex-col items-center justify-center space-y-4 text-center"
      >
        <AppBrand
          :logo="false"
          size="lg"
          class="justify-center text-gray-950 dark:text-white [&_.text-muted]:text-gray-600 dark:[&_.text-muted]:text-white/70"
        />
        <h1
          class="text-4xl font-bold tracking-tighter text-gray-950 dark:text-white sm:text-5xl md:text-6xl"
        >
          Votaciones del Congreso
        </h1>
        <p
          class="max-w-[700px] text-lg text-gray-700 dark:text-white/85 md:text-xl"
        >
          Elegí una cámara para ver cómo votan, quiénes son y cómo se agrupan
        </p>
      </section>

      <section
        class="mx-auto mt-12 grid max-w-3xl gap-6 sm:mt-16 sm:grid-cols-2"
        aria-label="Elegir cámara"
      >
        <a
          v-for="item in cards"
          :key="item.id"
          :href="item.url"
          class="group flex flex-col items-center gap-5 rounded-xl border border-gray-200/80 bg-white/90 p-8 text-center shadow-lg backdrop-blur-md transition-colors hover:border-primary hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-white/15 dark:bg-gray-950/85 dark:hover:border-white/50 dark:hover:bg-gray-950 dark:focus-visible:ring-white"
        >
          <span class="relative shrink-0">
            <img
              :src="item.config.logoSrc"
              :alt="item.config.siteName"
              class="h-24 w-auto object-contain sm:h-28 dark:hidden"
              width="180"
              height="180"
              decoding="async"
            />
            <img
              :src="item.config.logoSrcDark"
              :alt="item.config.siteName"
              class="hidden h-24 w-auto object-contain sm:h-28 dark:block"
              width="180"
              height="180"
              decoding="async"
            />
          </span>
          <div class="space-y-1">
            <h2 class="text-xl font-bold tracking-tight sm:text-2xl">
              {{ item.config.membersLabel }}
            </h2>
            <p class="text-sm text-muted">
              {{ item.config.brand }}.argentinadatos.com
            </p>
          </div>
          <UButton
            :label="item.cta"
            size="lg"
            trailing-icon="i-lucide-arrow-right"
            class="pointer-events-none"
            tabindex="-1"
          />
        </a>
      </section>
    </div>
  </div>
</template>
