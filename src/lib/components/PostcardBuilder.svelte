<script lang="ts">
	import { COVER_COLORS } from '$lib/types';
	import { createCard } from '$lib/cards';

	let name = $state('');
	let note = $state('');
	let color = $state<string>(COVER_COLORS[0]);
	let imageFile = $state<File | null>(null);
	let imageUrl = $state<string | null>(null);

	let flipped = $state(false);
	let submitting = $state(false);
	let flying = $state(false);
	let done = $state(false);
	let error = $state<string | null>(null);

	const NOTE_MAX = 600;
	const canSubmit = $derived(name.trim().length > 0 && note.trim().length > 0 && !submitting);

	function pickImage(e: Event) {
		const f = (e.target as HTMLInputElement).files?.[0] ?? null;
		if (imageUrl) URL.revokeObjectURL(imageUrl);
		imageFile = f;
		imageUrl = f ? URL.createObjectURL(f) : null;
	}

	async function submit() {
		if (!canSubmit) return;
		submitting = true;
		error = null;
		try {
			await createCard({ senderName: name, coverColor: color, note, imageFile });
			flying = true;
			await new Promise((r) => setTimeout(r, 950)); // let the fold-and-fly play
			done = true;
		} catch (e) {
			flying = false;
			error = e instanceof Error ? e.message : 'Something went wrong — try again.';
		} finally {
			submitting = false;
		}
	}

	function reset() {
		if (imageUrl) URL.revokeObjectURL(imageUrl);
		name = '';
		note = '';
		color = COVER_COLORS[0];
		imageFile = null;
		imageUrl = null;
		flipped = false;
		flying = false;
		done = false;
		error = null;
	}
</script>

{#if done}
	<div class="confirm">
		<p class="font-serif text-3xl text-ink">Sent to the sky. ✦</p>
		<p class="mt-2 text-sm text-ink-muted">Your card is on the wall.</p>
		<button class="btn mt-6" onclick={reset}>Send another</button>
	</div>
{:else}
	<div class="builder">
		<div class="stage" class:flying>
			<div class="card" class:flipped>
				<!-- FRONT: cover + photo + ❤️-name -->
				<div class="face front" style:background-color={color}>
					{#if imageUrl}
						<img class="cover" src={imageUrl} alt="" />
					{/if}

					<label class="photo-btn">
						<input type="file" accept="image/*" onchange={pickImage} hidden />
						{imageUrl ? 'Change photo' : '＋ Add photo'}
					</label>

					<div class="front-bottom">
						<div class="swatches">
							{#each COVER_COLORS as c (c)}
								<button
									type="button"
									class="swatch"
									class:selected={c === color}
									style:background-color={c}
									aria-label="cover color"
									onclick={() => (color = c)}
								></button>
							{/each}
						</div>
						<div class="nameline">
							<span aria-hidden="true">❤️</span>
							<input
								class="name-input font-serif"
								bind:value={name}
								maxlength="40"
								placeholder="your name"
								aria-label="your name"
							/>
						</div>
					</div>
				</div>

				<!-- BACK: the note -->
				<div class="face back">
					<textarea
						class="note font-serif"
						bind:value={note}
						maxlength={NOTE_MAX}
						placeholder="Write your note…"
						aria-label="your note"
					></textarea>
					<div class="count">{note.length}/{NOTE_MAX}</div>
				</div>
			</div>
		</div>

		<div class="controls">
			<button type="button" class="btn ghost" onclick={() => (flipped = !flipped)}>
				{flipped ? 'See front' : 'Write note ✎'}
			</button>
			<button type="button" class="btn" disabled={!canSubmit} onclick={submit}>
				{submitting ? 'Sending…' : 'Send'}
			</button>
		</div>

		{#if error}<p class="err">{error}</p>{/if}
		{#if !flipped && note.trim().length === 0}
			<p class="hint">Flip the card to write your note.</p>
		{/if}
	</div>
{/if}

<style>
	.builder,
	.confirm {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		width: 100%;
		max-width: 22rem;
		margin-inline: auto;
	}
	.confirm {
		text-align: center;
		padding: 4rem 1rem;
	}

	.stage {
		width: 100%;
		perspective: 1400px;
	}
	.stage.flying {
		animation: fly 0.95s cubic-bezier(0.5, 0, 0.7, 1) forwards;
	}

	.card {
		position: relative;
		width: 100%;
		aspect-ratio: 4 / 6; /* real-postcard portrait */
		-webkit-transform-style: preserve-3d;
		transform-style: preserve-3d;
		transition: transform 0.6s cubic-bezier(0.4, 0.1, 0.2, 1);
	}
	.card.flipped {
		-webkit-transform: rotateY(180deg);
		transform: rotateY(180deg);
	}

	.face {
		position: absolute;
		inset: 0;
		-webkit-backface-visibility: hidden; /* Safari/iOS: hide the turned-away face */
		backface-visibility: hidden;
		border-radius: 0.75rem;
		overflow: hidden;
		box-shadow: 0 14px 36px -14px rgba(0, 0, 0, 0.7);
	}
	.front {
		display: block;
	}
	.back {
		-webkit-transform: rotateY(180deg);
		transform: rotateY(180deg);
		background: #11182b;
		padding: 1rem;
		display: flex;
		flex-direction: column;
	}

	/* Native form controls can ignore 3D rotation / backface culling, so the
	   turned-away face's inputs bleed through. Hard-hide each face at the flip's
	   edge-on midpoint (~0.3s of the 0.6s turn) so its contents truly vanish. */
	.back {
		visibility: hidden;
		transition: visibility 0s linear 0.3s;
	}
	.front {
		transition: visibility 0s linear 0.3s;
	}
	.card.flipped .front {
		visibility: hidden;
	}
	.card.flipped .back {
		visibility: visible;
	}

	.cover {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.photo-btn {
		position: absolute;
		top: 0.75rem;
		left: 50%;
		transform: translateX(-50%);
		z-index: 2;
		padding: 0.4rem 0.85rem;
		font-size: 0.8rem;
		color: #070a14;
		background: rgba(244, 220, 160, 0.92);
		border-radius: 999px;
		cursor: pointer;
		white-space: nowrap;
	}

	.front-bottom {
		position: absolute;
		inset-inline: 0;
		bottom: 0;
		z-index: 2;
		padding: 2rem 0.85rem 0.85rem;
		background: linear-gradient(to top, rgba(7, 10, 20, 0.9), rgba(7, 10, 20, 0));
	}
	.swatches {
		display: flex;
		justify-content: center;
		gap: 0.4rem;
		margin-bottom: 0.6rem;
	}
	.swatch {
		width: 1.35rem;
		height: 1.35rem;
		border-radius: 999px;
		border: 2px solid rgba(255, 255, 255, 0.35);
		cursor: pointer;
	}
	.swatch.selected {
		border-color: #f4dca0;
		box-shadow: 0 0 0 2px rgba(244, 220, 160, 0.4);
	}
	.nameline {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		color: #f4dca0;
		font-size: 1.25rem;
	}
	.name-input {
		flex: 1;
		min-width: 0;
		background: transparent;
		border: none;
		border-bottom: 1px solid rgba(244, 220, 160, 0.35);
		color: #f4dca0;
		font-size: 1.25rem;
		padding: 0.1rem 0;
		outline: none;
	}
	.name-input::placeholder {
		color: rgba(244, 220, 160, 0.45);
	}

	.note {
		flex: 1;
		width: 100%;
		resize: none;
		background: transparent;
		border: none;
		outline: none;
		color: #f4dca0;
		font-size: 1.2rem;
		line-height: 1.5;
	}
	.note::placeholder {
		color: rgba(244, 220, 160, 0.4);
	}
	.count {
		text-align: right;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.45);
	}

	.controls {
		display: flex;
		gap: 0.6rem;
		width: 100%;
	}
	.btn {
		flex: 1;
		padding: 0.7rem 1rem;
		border-radius: 0.6rem;
		background: var(--accent);
		color: var(--accent-ink);
		font-weight: 600;
		cursor: pointer;
		transition: opacity 0.15s;
	}
	.btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.btn.ghost {
		background: transparent;
		color: var(--ink);
		border: 1px solid color-mix(in srgb, var(--ink) 40%, transparent);
	}
	.err {
		color: var(--ember);
		font-size: 0.85rem;
	}
	.hint {
		color: var(--ink-muted);
		font-size: 0.8rem;
	}

	@keyframes fly {
		0% {
			transform: translateY(0) rotate(0) scale(1);
			opacity: 1;
		}
		25% {
			transform: translateY(8px) rotateX(-18deg) scale(0.97);
		}
		100% {
			transform: translateY(-120vh) rotate(7deg) scale(0.28);
			opacity: 0;
		}
	}
</style>
