export default defineNuxtPlugin(() => {
  const { chamber } = useChamber();

  // Defaults de cámara. Título / description / og:image → useChamberSeo + Takumi.
  useHead(() => ({
    meta: [
      { name: "keywords", content: chamber.value.keywords },
      { property: "og:site_name", content: chamber.value.siteName },
    ],
  }));
});
