/** Clave canónica para matchear nombres de provincia (API ↔ GeoJSON). */
export function provinciaKey(raw: string | null | undefined): string {
  let s = String(raw || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();

  if (!s || s === "sin-dato" || s === "sin provincia") return "";

  if (
    s.includes("ciudad") && s.includes("buenos aires")
  ) {
    return "caba";
  }
  if (s.startsWith("tierra del fuego")) {
    return "tierra del fuego";
  }

  return s.replace(/[^a-z0-9]+/g, " ").trim();
}
