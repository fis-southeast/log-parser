<script lang="ts">
	let logs = $state('');
	let textarea: HTMLTextAreaElement;

	function resizeInput() {
		if (!textarea) return;

		textarea.style.height = 'auto';
		textarea.style.height = `${Math.min(textarea.scrollHeight, 240)}px`;
	}

	$effect(() => {
		resizeInput();
	});

	async function uploadLogFile(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];

		if (!file) return;

		logs = await file.text();
		input.value = '';
	}
</script>

<form class="w-full" aria-label="Log parser input">
	<div
		class="rounded-4xl border border-white/10 bg-zinc-950/80 p-2 shadow-2xl ring-1 shadow-black/40 ring-white/3 backdrop-blur"
	>
		<div class="relative">
			<label class="sr-only" for="logs">Paste your logs</label>
			<input id="log-file" class="sr-only" type="file" onchange={uploadLogFile} />
			{#if !logs}
				<div
					class="pointer-events-none absolute top-5 left-5 z-10 text-base leading-7 text-zinc-600"
				>
					Paste your logs or
					<label
						class="pointer-events-auto cursor-pointer underline decoration-zinc-500 underline-offset-3 transition hover:text-zinc-400"
						for="log-file">upload a file</label
					>
				</div>
			{/if}
			<!-- svelte-ignore a11y_autofocus -->
			<textarea
				id="logs"
				bind:this={textarea}
				bind:value={logs}
				class="log-input mr-3 max-h-60 w-[calc(100%-0.75rem)] resize-none overflow-y-auto rounded-3xl border-0 bg-transparent px-5 py-5 text-base leading-7 text-zinc-100 focus:ring-0 focus:outline-none"
				oninput={resizeInput}
				rows="1"
				spellcheck="false"
				autofocus
			></textarea>
		</div>

		<div
			class="flex flex-col gap-3 border-t border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
		>
			<p class="text-sm text-zinc-500">Supports stack traces, server logs, and CLI output.</p>
			<button
				type="submit"
				class="inline-flex cursor-pointer items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200 focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-zinc-950 focus:outline-none"
			>
				Parse Logs
			</button>
		</div>
	</div>
</form>

<style>
	.log-input {
		scrollbar-color: rgba(255, 255, 255, 0.22) transparent;
		scrollbar-width: thin;
	}

	.log-input::-webkit-scrollbar {
		width: 12px;
	}

	.log-input::-webkit-scrollbar-track {
		background: transparent;
	}

	.log-input::-webkit-scrollbar-thumb {
		min-height: 44px;
		border: 4px solid transparent;
		border-radius: 999px;
		background-color: rgba(255, 255, 255, 0.22);
		background-clip: content-box;
	}

	.log-input::-webkit-scrollbar-thumb:hover {
		background-color: rgba(255, 255, 255, 0.32);
	}
</style>
