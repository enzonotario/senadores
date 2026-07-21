<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const route = useRoute();
const { chamber, otherChamber, otherChamberUrl } = useChamber();

const navItems = computed<NavigationMenuItem[]>(() => {
  const path = route.path;
  const groupsActive =
    path.startsWith(chamber.value.groupsPath) ||
    path.includes("/bloques") ||
    path.includes("/partidos");
  const membersActive =
    !groupsActive &&
    (path.startsWith(chamber.value.membersPath) ||
      path.startsWith("/diputados") ||
      path.startsWith("/senadores"));

  return [
    {
      label: "Inicio",
      to: "/",
      active: path === "/",
    },
    {
      label: "Votaciones",
      to: "/actas",
      active: path.startsWith("/actas"),
    },
    {
      label: chamber.value.membersLabel,
      to: chamber.value.membersPath,
      active: membersActive,
    },
    {
      label: chamber.value.groupsLabel,
      to: chamber.value.groupsPath,
      active: groupsActive,
    },
  ];
});

const sidebarItems = computed<NavigationMenuItem[]>(() => {
  const icons = [
    "i-lucide-house",
    "i-lucide-file-text",
    "i-lucide-users",
    "i-lucide-shapes",
  ] as const;

  return [
    ...navItems.value.map((item, index) => ({
      ...item,
      icon: icons[index],
    })),
    {
      label: otherChamber.value.membersLabel,
      icon: "i-lucide-external-link",
      to: otherChamberUrl.value,
      target: "_blank",
      external: true,
    },
  ];
});
</script>

<template>
  <!-- Solo slideover en mobile. El panel desktop del theme es
       `hidden lg:flex`; hay que forzar !hidden o reaparece en lg+. -->
  <UDashboardSidebar
    mode="slideover"
    toggle-side="left"
    class="!hidden"
    :ui="{ root: '!hidden' }"
  >
    <template #header>
      <AppBrand />
    </template>

    <div class="px-2 pb-2">
      <UDashboardSearchButton label="Buscar" class="w-full" />
    </div>

    <UNavigationMenu
      :items="sidebarItems"
      orientation="vertical"
      class="w-full"
    />
  </UDashboardSidebar>

  <UDashboardNavbar
    toggle-side="left"
    :ui="{
      root: 'sticky top-0 z-50 h-(--ui-header-height) shrink-0 flex items-center justify-between border-b-0 bg-white/70 dark:bg-gray-950/70 backdrop-blur supports-[backdrop-filter]:bg-white/50 page-container !py-0 gap-2 sm:gap-3',
      left: 'flex items-center gap-1.5 min-w-0',
      center: 'hidden lg:flex flex-1 min-w-0 justify-end h-full',
      right: 'flex items-center shrink-0 gap-1.5',
    }"
  >
    <template #leading>
      <AppBrand />
    </template>

    <!-- Slot default = center: oculto en mobile (lg:flex) -->
    <nav class="h-full flex justify-end" aria-label="Navegación principal">
      <UNavigationMenu
        :items="navItems"
        variant="link"
        color="neutral"
        highlight
        :ui="{
          root: 'h-full w-auto gap-0 [&>div]:h-full',
          list: 'h-full w-auto gap-0',
          item: 'h-full py-0',
          link: 'h-full rounded-none px-3 sm:px-4 text-sm whitespace-nowrap after:!bottom-0 after:!inset-x-3 after:h-0.5 after:!rounded-none',
        }"
        class="h-full"
      />
    </nav>

    <template #right>
      <UDashboardSearchButton
        class="hidden sm:inline-flex"
        size="sm"
        label="Buscar"
      />
      <UDashboardSearchButton
        class="sm:hidden"
        size="sm"
        collapsed
        aria-label="Buscar"
      />
      <UButton
        :to="otherChamberUrl"
        target="_blank"
        external
        color="neutral"
        variant="ghost"
        size="sm"
        trailing-icon="i-lucide-external-link"
        class="hidden sm:inline-flex"
        :aria-label="`Abrir ${otherChamber.membersLabel} en una pestaña nueva`"
      >
        {{ otherChamber.membersLabel }}
      </UButton>
      <ColorModeToggle />
    </template>
  </UDashboardNavbar>
</template>
