<script setup lang="ts">
import type { CareerCargo } from "@/utils/memberCareer";
import { formatDate } from "@/lib/utils";
import {
  buildChamberAbsoluteUrl,
  getSiteConfig,
  type ChamberId,
} from "@/lib/chamber";

const props = defineProps<{
  cargos: CareerCargo[];
  /** Cámara del sitio actual (para links internos vs absolutos). */
  chamber: ChamberId;
}>();

const { chamberId } = useChamber();

function currentLocation() {
  try {
    const url = import.meta.server
      ? useRequestURL()
      : new URL(window.location.href);
    return {
      hostname: url.hostname,
      protocol: url.protocol,
      port: url.port,
    };
  } catch {
    return {
      hostname: getSiteConfig(chamberId.value).siteHost,
      protocol: "https:",
      port: "",
    };
  }
}

function periodLabel(cargo: CareerCargo): string {
  const inicio = cargo.inicio ? formatDate(cargo.inicio) : "—";
  const fin = cargo.fin ? formatDate(cargo.fin) : "en funciones";
  return `${inicio} – ${fin}`;
}

function groupLabel(cargo: CareerCargo): string {
  if (!cargo.group) return "";
  return cargo.chamber === "diputados"
    ? `Bloque ${cargo.group}`
    : cargo.group;
}

function hrefFor(cargo: CareerCargo): string {
  if (cargo.chamber === props.chamber) return cargo.path;
  const loc = currentLocation();
  return buildChamberAbsoluteUrl(cargo.chamber, {
    hostname: loc.hostname,
    protocol: loc.protocol,
    port: loc.port,
    path: cargo.path,
  });
}

function isExternal(cargo: CareerCargo): boolean {
  return cargo.chamber !== props.chamber;
}
</script>

<template>
  <section v-if="cargos.length" class="space-y-3">
    <div class="flex items-baseline justify-between gap-3 flex-wrap">
      <h2 class="text-lg font-semibold">Historial de cargos</h2>
      <p class="text-xs text-muted">
        Mandatos en Diputados y Senado vinculados por nombre.
      </p>
    </div>

    <ol class="relative ms-3 space-y-0 border-s border-default">
      <li
        v-for="(cargo, index) in cargos"
        :key="`${cargo.chamber}-${cargo.memberId}-${cargo.inicio}-${index}`"
        class="relative ps-6 pb-5 last:pb-0"
      >
        <span
          class="absolute -start-[5px] top-1.5 size-2.5 rounded-full ring-4 ring-default"
          :class="cargo.isActive ? 'bg-primary' : 'bg-muted'"
        />

        <div class="flex min-w-0 flex-col gap-1">
          <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
            <NuxtLink
              v-if="!isExternal(cargo)"
              :to="hrefFor(cargo)"
              class="font-medium hover:underline"
            >
              {{ cargo.label }}
            </NuxtLink>
            <a
              v-else
              :href="hrefFor(cargo)"
              class="font-medium hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ cargo.label }}
            </a>
            <span class="text-sm text-muted">{{ periodLabel(cargo) }}</span>
            <UBadge
              v-if="cargo.isActive"
              color="primary"
              variant="subtle"
              size="sm"
            >
              Cargo actual
            </UBadge>
            <UBadge
              v-if="cargo.isCurrentMember"
              color="neutral"
              variant="subtle"
              size="sm"
            >
              Este perfil
            </UBadge>
          </div>
          <p class="text-sm text-muted">
            <span v-if="cargo.provincia">{{ cargo.provincia }}</span>
            <span v-if="cargo.provincia && groupLabel(cargo)"> · </span>
            <span v-if="groupLabel(cargo)">{{ groupLabel(cargo) }}</span>
          </p>
        </div>
      </li>
    </ol>
  </section>
</template>
