<script lang="ts">
  // Presentational card front: 4:6 postcard, image (object-cover) or color
  // placeholder, with a ❤️-name strip along the bottom.
  let {
    color,
    name,
    imageUrl = null,
  }: { color: string; name: string; imageUrl?: string | null } = $props();
</script>

<div class="front" style:background-color={color}>
  {#if imageUrl}
    <img class="cover" src={imageUrl} alt="" />
  {/if}
  <div class="namebar">
    <span class="font-serif">❤️ {name || "someone"}</span>
  </div>
</div>

<style>
  .front {
    position: relative;
    aspect-ratio: 4 / 6; /* real-postcard portrait; swap to 6/4 for landscape */
    width: 100%;
    overflow: hidden;
    border-radius: 0.75rem;
    box-shadow: 0 10px 30px -12px rgba(0, 0, 0, 0.6);
  }
  .cover {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .namebar {
    position: absolute;
    inset-inline: 0;
    bottom: 0;
    padding: 1.5rem 1rem 0.85rem;
    color: #f4dca0;
    font-size: 1.25rem;
    line-height: 1.1;
    background: linear-gradient(
      to top,
      rgba(7, 10, 20, 0.85),
      rgba(7, 10, 20, 0)
    );
    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
    text-align: right;
  }
</style>
