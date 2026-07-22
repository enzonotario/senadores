import type { AffinityMemberInput } from "@/utils/votingAffinity";

export type AffinityPeerDto = AffinityMemberInput & { activo: boolean };

/**
 * Peers slim desde la mini-API Nitro.
 * `server: false`: no embeber votos de afinidad en HTML (OG / scrapers).
 * El browser pide a /api/affinity-peers (cache RAM), nunca el dump de actas.
 * Las vistas deben envolver el UI en `<ClientOnly>` para evitar mismatch
 * de hidratación (SSR sin peers vs client pending/success).
 */
export function useAffinityPeers(key = "affinity-peers") {
  const { localFetch } = useLocalApi();
  return useAsyncData(
    key,
    () => localFetch<{ peers: AffinityPeerDto[] }>("/api/affinity-peers"),
    { server: false },
  );
}

export function peersToAffinityInputs(
  peers: AffinityPeerDto[] | null | undefined,
  opts?: { onlyActive?: boolean; ensure?: AffinityMemberInput | null },
): AffinityMemberInput[] {
  const onlyActive = opts?.onlyActive !== false;
  const byId = new Map<string, AffinityMemberInput>();
  for (const p of peers || []) {
    if (onlyActive && !p.activo) continue;
    byId.set(p.id, {
      id: p.id,
      name: p.name,
      group: p.group,
      foto: p.foto,
      votes: p.votes,
    });
  }
  if (opts?.ensure) {
    byId.set(opts.ensure.id, opts.ensure);
  }
  return [...byId.values()];
}
