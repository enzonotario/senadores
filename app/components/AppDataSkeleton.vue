<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: "list" | "member" | "affinity" | "acta" | "home" | "group";
  }>(),
  { variant: "list" },
);
</script>

<template>
  <div
    v-if="variant === 'list'"
    class="flex flex-col gap-3"
    role="status"
    aria-label="Cargando"
  >
    <div class="flex flex-col gap-2 sm:flex-row sm:gap-3">
      <USkeleton class="h-10 w-full sm:w-64" />
      <USkeleton class="h-10 w-full sm:w-40" />
      <USkeleton class="h-10 w-full sm:flex-1" />
    </div>
    <div class="rounded-lg border border-default overflow-hidden divide-y divide-default">
      <div
        v-for="i in 8"
        :key="i"
        class="flex items-center gap-3 p-3"
      >
        <USkeleton class="size-10 rounded-full shrink-0" />
        <div class="flex-1 flex flex-col gap-2 min-w-0">
          <USkeleton class="h-4 w-2/3" />
          <USkeleton class="h-3 w-1/3" />
        </div>
        <USkeleton class="h-4 w-16 hidden sm:block" />
        <USkeleton class="h-4 w-20 hidden md:block" />
      </div>
    </div>
  </div>

  <div
    v-else-if="variant === 'member'"
    class="flex flex-col gap-10"
    role="status"
    aria-label="Cargando perfil"
  >
    <div class="rounded-lg border border-default overflow-hidden">
      <div class="flex flex-col md:flex-row">
        <USkeleton class="w-40 sm:w-48 md:w-xs aspect-square shrink-0 mx-auto md:mx-0" />
        <div class="flex flex-col gap-4 flex-1 p-6">
          <USkeleton class="h-8 w-64" />
          <div class="grid sm:grid-cols-2 gap-3">
            <USkeleton v-for="i in 4" :key="i" class="h-4 w-full" />
          </div>
          <div class="grid sm:grid-cols-3 gap-4">
            <USkeleton v-for="i in 3" :key="i" class="h-20 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
    <USkeleton class="h-64 w-full rounded-lg" />
    <div class="flex flex-col gap-2">
      <USkeleton class="h-6 w-40" />
      <USkeleton v-for="i in 5" :key="i" class="h-12 w-full" />
    </div>
  </div>

  <div
    v-else-if="variant === 'affinity'"
    class="flex flex-col gap-4"
    role="status"
    aria-label="Cargando afinidad"
  >
    <USkeleton class="h-6 w-48" />
    <USkeleton class="h-72 w-full rounded-lg" />
    <div class="grid sm:grid-cols-2 gap-3">
      <USkeleton v-for="i in 4" :key="i" class="h-12 w-full" />
    </div>
  </div>

  <div
    v-else-if="variant === 'acta'"
    class="flex flex-col gap-6"
    role="status"
    aria-label="Cargando acta"
  >
    <div class="flex flex-col gap-3">
      <USkeleton class="h-8 w-3/4" />
      <USkeleton class="h-4 w-1/2" />
      <USkeleton class="h-4 w-1/3" />
    </div>
    <div class="grid sm:grid-cols-4 gap-3">
      <USkeleton v-for="i in 4" :key="i" class="h-20 rounded-lg" />
    </div>
    <USkeleton class="h-80 w-full rounded-lg" />
  </div>

  <div
    v-else-if="variant === 'home'"
    class="flex flex-col gap-8"
    role="status"
    aria-label="Cargando"
  >
    <div class="flex flex-col gap-3 max-w-2xl">
      <USkeleton class="h-10 w-72" />
      <USkeleton class="h-4 w-full" />
      <USkeleton class="h-4 w-5/6" />
    </div>
    <USkeleton class="h-64 w-full rounded-lg" />
    <div class="grid sm:grid-cols-3 gap-4">
      <USkeleton v-for="i in 3" :key="i" class="h-28 rounded-lg" />
    </div>
  </div>

  <div
    v-else-if="variant === 'group'"
    class="flex flex-col gap-8"
    role="status"
    aria-label="Cargando"
  >
    <div class="flex items-center gap-4">
      <USkeleton class="size-16 rounded-lg shrink-0" />
      <div class="flex flex-col gap-2 flex-1">
        <USkeleton class="h-8 w-56" />
        <USkeleton class="h-4 w-40" />
      </div>
    </div>
    <div class="grid sm:grid-cols-3 gap-4">
      <USkeleton v-for="i in 3" :key="i" class="h-20 rounded-lg" />
    </div>
    <USkeleton class="h-64 w-full rounded-lg" />
  </div>
</template>
