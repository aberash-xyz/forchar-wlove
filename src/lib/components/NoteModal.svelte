<script lang="ts">
	import Postcard from './Postcard.svelte';

	type CardLike = { id: string; senderName: string; coverColor: string; imageUrl: string | null };

	let {
		card,
		body = undefined,
		unlocked = false,
		onClose,
		onUnlock
	}: {
		card: CardLike;
		body?: string;
		unlocked?: boolean;
		onClose: () => void;
		onUnlock: (code: string) => Promise<{ ok: boolean; error?: string }>;
	} = $props();

	let code = $state('');
	let submitting = $state(false);
	let error = $state<string | null>(null);

	async function submit(e: Event) {
		e.preventDefault();
		if (!code.trim() || submitting) return;
		submitting = true;
		error = null;
		const res = await onUnlock(code.trim());
		submitting = false;
		if (!res.ok) error = res.error ?? 'Something went wrong.';
		else code = '';
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}
</script>

<svelte:window onkeydown={onKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="backdrop" onclick={onClose}>
	<div
		class="panel"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onclick={(e) => e.stopPropagation()}
	>
		<button class="close" onclick={onClose} aria-label="Close">×</button>

		<div class="card-side">
			<Postcard color={card.coverColor} name={card.senderName} imageUrl={card.imageUrl} />
		</div>

		<div class="note-side">
			{#if unlocked && body !== undefined}
				<p class="from">From {card.senderName || 'someone'}</p>
				<p class="note font-serif">{body}</p>
			{:else if unlocked}
				<p class="muted font-serif">No note on this card.</p>
			{:else}
				<form class="lock" onsubmit={submit}>
					<p class="lock-title font-serif">This note is sealed.</p>
					<p class="muted">Enter the passcode to read the notes.</p>
					<input
						class="code"
						type="password"
						bind:value={code}
						placeholder="Passcode"
						autocomplete="off"
						aria-label="Passcode"
					/>
					<button class="btn" type="submit" disabled={submitting || !code.trim()}>
						{submitting ? 'Unlocking…' : 'Unlock'}
					</button>
					{#if error}<p class="err">{error}</p>{/if}
				</form>
			{/if}
		</div>
	</div>
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 100;
		display: grid;
		place-items: center;
		padding: 1.25rem;
		background: rgba(3, 5, 12, 0.72);
		backdrop-filter: blur(3px);
	}
	.panel {
		position: relative;
		display: flex;
		gap: 1.25rem;
		max-width: 40rem;
		width: 100%;
		max-height: 90dvh;
		padding: 1.25rem;
		border-radius: 1rem;
		background: var(--bg-elev);
		color: var(--ink);
		box-shadow: 0 30px 80px -20px rgba(0, 0, 0, 0.7);
	}
	.close {
		position: absolute;
		top: 0.4rem;
		right: 0.65rem;
		font-size: 1.6rem;
		line-height: 1;
		color: var(--ink-muted);
		cursor: pointer;
	}
	.card-side {
		flex: 0 0 44%;
		max-width: 12rem;
	}
	.note-side {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		justify-content: center;
		overflow-y: auto;
	}
	.from {
		font-size: 0.8rem;
		color: var(--ink-muted);
		margin-bottom: 0.5rem;
	}
	.note {
		font-size: 1.3rem;
		line-height: 1.5;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
	.muted {
		color: var(--ink-muted);
		font-size: 0.9rem;
	}
	.lock {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.lock-title {
		font-size: 1.4rem;
	}
	.code {
		padding: 0.6rem 0.75rem;
		border-radius: 0.5rem;
		border: 1px solid color-mix(in srgb, var(--ink) 30%, transparent);
		background: color-mix(in srgb, var(--ink) 6%, transparent);
		color: var(--ink);
		outline: none;
	}
	.btn {
		padding: 0.6rem 1rem;
		border-radius: 0.5rem;
		background: var(--accent);
		color: var(--accent-ink);
		font-weight: 600;
		cursor: pointer;
	}
	.btn:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
	.err {
		color: var(--ember);
		font-size: 0.85rem;
	}

	@media (max-width: 540px) {
		.panel {
			flex-direction: column;
			align-items: center;
		}
		.card-side {
			flex: none;
			width: 9rem;
		}
		.note-side {
			width: 100%;
		}
	}
</style>
