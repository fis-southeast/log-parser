<script lang="ts">
	let logs = $state('');
	let textarea: HTMLTextAreaElement;

	function resizeInput() {
		if (!textarea) return;

		textarea.style.height = 'auto';
		textarea.style.height = `${Math.min(textarea.scrollHeight, 240)}px`;
	}

	$effect(() => {
		logs;
		resizeInput();
	});
</script>

<svelte:head>
	<title>Log Parser</title>
	<meta
		name="description"
		content="Paste application logs into a clean dark interface for parsing."
	/>
</svelte:head>

<main class="min-h-screen bg-[#0b0b0f] px-4 text-zinc-100 sm:px-6">
	<section
		class="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center py-10"
	>
		<div class="mb-10 text-center">
			<p class="mb-4 text-sm font-medium tracking-[0.28em] text-zinc-500 uppercase">
				Analyze faster
			</p>
			<h1 class="text-5xl font-semibold tracking-[-0.055em] text-white sm:text-6xl">Log Parser</h1>
			<p class="mx-auto mt-5 max-w-xl text-base leading-7 text-zinc-400 sm:text-lg">
				Paste your logs below to start turning noisy output into useful insight.
			</p>
		</div>

		<form class="w-full" aria-label="Log parser input">
			<div
				class="rounded-4xl border border-white/10 bg-zinc-950/80 p-2 shadow-2xl ring-1 shadow-black/40 ring-white/3 backdrop-blur"
			>
				<label class="sr-only" for="logs">Paste your logs</label>
				<!-- svelte-ignore a11y_autofocus -->
				<textarea
					id="logs"
					bind:this={textarea}
					bind:value={logs}
					class="log-input mr-3 max-h-60 w-[calc(100%-0.75rem)] resize-none overflow-y-auto rounded-3xl border-0 bg-transparent px-5 py-5 text-base leading-7 text-zinc-100 placeholder:text-zinc-600 focus:ring-0 focus:outline-none"
					oninput={resizeInput}
					placeholder="Paste your logs here..."
					rows="1"
					spellcheck="false"
					autofocus
				></textarea>

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
	</section>
</main>

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
