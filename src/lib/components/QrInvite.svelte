<script lang="ts">
  import { browser } from "$app/environment";
  import { env } from "$env/dynamic/public";

  let {
    path = "/new",
    size = 200,
    caption = "Scan to add your postcard",
  }: { path?: string; size?: number; caption?: string } = $props();

  // Absolute target so the code is scannable from a phone. PUBLIC_BASE_URL is
  // the deployed origin (e.g. https://your-domain.com); falls back to the
  // current origin in dev.
  const base = (env.PUBLIC_BASE_URL ?? "").replace(/\/+$/, "");
  const target = $derived(`${base || (browser ? location.origin : "")}${path}`);

  // QR colours follow the theme: warm paper field in dark mode (soft, on-theme),
  // crisp white in light mode. Near-black modules keep contrast high for scanning.
  let themeDark = $state(true);
  $effect(() => {
    const el = document.documentElement;
    const read = () => (themeDark = el.dataset.theme !== "light");
    read();
    const obs = new MutationObserver(read);
    obs.observe(el, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  });
  const colors = $derived(
    themeDark
      ? { dark: "#0c1222", light: "#f4dca0" } // night modules on warm paper
      : { dark: "#0c1222", light: "#ffffff" }, // night modules on white
  );

  let svg = $state("");
  $effect(() => {
    if (!browser) return;
    const url = target; // sync reads so the effect re-runs on theme/target change
    const col = colors;
    let cancelled = false;
    import("qrcode").then((m) =>
      m.default
        .toString(url, {
          type: "svg",
          margin: 1,
          width: size,
          color: { dark: col.dark, light: col.light },
        })
        .then((s) => {
          if (!cancelled) svg = s;
        }),
    );
    return () => {
      cancelled = true;
    };
  });
</script>

<div class="qr">
  <div
    class="frame"
    style:width="{size}px"
    style:height="{size}px"
    style:background={colors.light}
  >
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {#if svg}{@html svg}{/if}
  </div>
  {#if caption}<p class="caption font-serif mt-4">{caption}</p>{/if}
</div>

<style>
  .qr {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }
  .frame {
    /* background is theme-reactive (set inline): paper in dark, white in light */
    border-radius: 3.85rem;
    padding: 1.55rem;
    box-shadow: 0 12px 34px -14px rgba(0, 0, 0, 0.35);
  }
  .frame :global(svg) {
    display: block;
    width: 100%;
    height: 100%;
  }
  .caption {
    color: var(--ink-muted);
    font-size: 0.95rem;
    text-align: center;
  }
</style>
