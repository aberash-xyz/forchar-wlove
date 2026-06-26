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

  let svg = $state("");
  $effect(() => {
    if (!browser) return;
    let cancelled = false;
    import("qrcode").then((m) =>
      m.default
        .toString(target, {
          type: "svg",
          margin: 1,
          width: size,
          // fixed high-contrast colours for reliable scanning in either theme
          color: { dark: "#0b0f1a", light: "#ffffff" },
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
  <div class="frame" style:width="{size}px" style:height="{size}px">
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
    background: #fff;
    border-radius: 2.85rem;
    padding: 1.55rem;
    box-shadow: 0 12px 34px -14px rgba(0, 0, 0, 0.35);
  }
  .frame :global(svg) {
    display: block;
    width: 100%;
    height: 100%;
  }
  .caption {
    color: var(--ink);
    font-size: 0.95rem;
    text-align: center;
  }
</style>
