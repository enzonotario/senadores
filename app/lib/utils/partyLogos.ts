/**
 * Utility to map party names to their logo files
 */

// Function to normalize party name for file name comparison
const normalizePartyName = (partyName: string): string => {
  return partyName
    .toLowerCase()
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/\./g, '') // Remove dots
    .replace(/-/g, '_') // Replace hyphens with underscores
    .replace(/\+/g, '_plus_') // Replace + with _plus_
    .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Remove accents
};

// Function to get logo path based on party name
export function getPartyLogoPath(party: string | undefined): string | null {
  if (!party) return null;
  
  // Captura específica para "Eco + Vamos Corrientes"
  if (party === "Eco + Vamos Corrientes") {
    return "/logos_partidos/eco_mas_vamos_corrientes.jpg";
  }
  
  const normalized = normalizePartyName(party);
  
  // Log the normalized party name for debugging
  console.log(`Normalizing party: "${party}" -> "${normalized}"`);
  
  // Casos especiales para mapear nombres normalizados a rutas de archivos
  const specialCases: Record<string, string> = {
    "alianza_cambiemos": "/logos_partidos/Cambiemos_logo.png",
    "alianza_frente_de_todos": "/logos_partidos/alianza_frente_de_todos.svg",
    "alianza_la_libertad_avanza": "/logos_partidos/alianza_la_libertad_avanza.png",
    "alianza_union_por_la_patria": "/logos_partidos/union_por_la_patria.png",
    "alianza_frente_para_la_victoria": "/logos_partidos/frente_para_la_victoria.png",
    "frente_para_la_victoria": "/logos_partidos/frente_para_la_victoria.png",
    "alianza_union_pro": "/logos_partidos/union_pro.png",
    "union_por_cordoba": "/logos_partidos/union_por_cordoba.jpg",
    "alianza_union_por_cordoba": "/logos_partidos/union_por_cordoba.jpg",
    "hacemos_por_cordoba": "/logos_partidos/hacemos_por_ cordoba.png",
    "frente_renovador_de_la_concordia": "/logos_partidos/frente_renovador_de_la_concordia.png",
    "frente_renovador_de_la_concordia_innovacion_federal": "/logos_partidos/frente_renovador_de_la_concordia.png",
    "juntos_por_el_cambio": "/logos_partidos/juntos_por_el_cambio.png",
    "juntos_por_el_cambio_chubut": "/logos_partidos/juntos_por_el_cambio_chubut.png",
    "juntos_por_el_cambio_tierra_del_fuego": "/logos_partidos/juntos_por_el_cambio_tierra_del_fuego.jpeg",
    "union_civica_radical": "/logos_partidos/union_civica_radical.png",
    "unidad_ciudadana": "/logos_partidos/unidad_ciudadana.png",
    "frente_de_todos": "/logos_partidos/frente_de_todos.jpg",
    "frente_civico_por_santiago": "/logos_partidos/frente_civico_por_santiago.png",
    "frente_civico_y_social_de_catamarca": "/logos_partidos/frente_civico_y_social_de_catamarca.webp",
    "alianza_frente_civico": "/logos_partidos/alianza_frente_civico.png",
    "frente_cambia_mendoza": "/logos_partidos/frente_cambia_mendoza.png",
    "alianza_frente_progresista": "/logos_partidos/alianza_frente_progresista.png",
    "frente_amplio_progresista": "/logos_partidos/frente_amplio_progresista.png",
    "eco_mas_vamos_corrientes": "/logos_partidos/eco_mas_vamos_corrientes.jpg",
    "alianza_por_santa_cruz": "/logos_partidos/alianza_por_santa_cruz.png",
    "blanco_de_los_trabaj_jujuy": "/logos_partidos/blanco_de_los_trabaj_jujuy.jpg",
    "chubut_somos_todos": "/logos_partidos/chubut_somos_todos.png",
    "partido_renovador_federal": "/logos_partidos/partido_renovador_federal.jpg",
    "alianza_frente_justicialista": "/logos_partidos/alianza_frente_justicialista.png",
    "movimiento_popular_neuquino": "/logos_partidos/movimiento_popular_neuquino.png",
    "movimiento_popular_fueguino": "/logos_partidos/movimiento_popular_fueguino.png",
    "juntos_somos_rio_negro": "/logos_partidos/juntos_somos_rio_negro.png"
  };

  // Check if we have a direct mapping for this party
  if (specialCases[normalized]) {
    return specialCases[normalized];
  }

  // Try some common variations
  for (const [key, value] of Object.entries(specialCases)) {
    // Check if the normalized party name is contained in any key or vice versa
    if (key.includes(normalized) || normalized.includes(key)) {
      return value;
    }
  }

  // Default fallback: return null if no matching logo was found
  return null;
} 