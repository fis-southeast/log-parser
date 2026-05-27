<script lang="ts">
	import { tick } from 'svelte';

	let {
		logs = $bindable(''),
		isLoading = false,
		onSubmit
	}: {
		logs: string;
		isLoading?: boolean;
		onSubmit: () => void;
	} = $props();

	let error = $state('');
	let textarea: HTMLTextAreaElement;
	let isDraggingFile = $state(false);
	let canSubmit = $derived(logs.trim().length > 0 && !isLoading && error.length === 0);

	function resizeInput() {
		if (!textarea) return;

		textarea.style.height = 'auto';
		textarea.style.height = `${Math.min(textarea.scrollHeight, 240)}px`;
	}

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (!canSubmit) return;

		onSubmit();
	}

	async function loadFile(file: File) {
		if (file.size > 50 * 1024 * 1024) {
			logs = '';
			error = 'File too large!';
			return;
		}

		try {
			error = '';
			logs = await file.text();
			await tick();
			resizeInput();
		} catch {
			logs = '';
			error = 'Could not read that file.';
		}
	}

	function handleFileInput(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];

		if (!file || isLoading) return;

		void loadFile(file);
		input.value = '';
	}

	function handleDragOver(event: DragEvent) {
		if (isLoading) return;

		event.preventDefault();
		isDraggingFile = true;
	}

	function handleDragLeave(event: DragEvent) {
		if (!event.currentTarget || !event.relatedTarget) {
			isDraggingFile = false;
			return;
		}

		const dropZone = event.currentTarget as HTMLElement;
		const nextTarget = event.relatedTarget as Node;

		if (!dropZone.contains(nextTarget)) {
			isDraggingFile = false;
		}
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		isDraggingFile = false;

		if (isLoading) return;

		const file = event.dataTransfer?.files[0];
		if (!file) return;

		void loadFile(file);
	}
</script>

<form class="w-full" aria-label="Log parser input" aria-busy={isLoading} onsubmit={handleSubmit}>
	<div
		class="rounded-4xl border bg-zinc-950/80 p-2 shadow-2xl ring-1 shadow-black/40 backdrop-blur transition {isDraggingFile
			? 'border-white/30 ring-white/20'
			: 'border-white/10 ring-white/3'}"
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
		ondrop={handleDrop}
		role="region"
		aria-label="Paste logs or drop a log file"
	>
		<div class="relative">
			<label class="sr-only" for="logs">Paste your logs</label>
			<input
				id="log-file"
				class="sr-only"
				type="file"
				accept=".txt,text/plain,.log,.logs,.json,.out,.err,application/json"
				disabled={isLoading}
				onchange={handleFileInput}
			/>
			{#if !logs}
				<div
					class="pointer-events-none absolute top-5 left-5 z-10 text-base leading-7 text-zinc-600"
				>
					Paste your logs, drop a file, or
					<label
						class:pointer-events-auto={!isLoading}
						class:cursor-pointer={!isLoading}
						class="underline decoration-zinc-500 underline-offset-3 transition hover:text-zinc-400"
						for="log-file">upload a file</label
					>
				</div>
			{/if}
			<!-- svelte-ignore a11y_autofocus -->
			<textarea
				id="logs"
				bind:this={textarea}
				bind:value={logs}
				class="[scrollbar-thin] mr-3 max-h-60 w-[calc(100%-0.75rem)] resize-none [scrollbar-color:rgba(255,255,255,0.22)_transparent] overflow-y-auto rounded-3xl border-0 bg-transparent px-5 py-5 text-base leading-7 text-zinc-100 transition focus:ring-0 focus:outline-none disabled:cursor-not-allowed disabled:text-zinc-500 disabled:opacity-70 [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar-thumb]:min-h-11 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-4 [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:bg-clip-content hover:[&::-webkit-scrollbar-thumb]:bg-white/30 [&::-webkit-scrollbar-track]:bg-transparent"
				oninput={resizeInput}
				rows="1"
				spellcheck="false"
				disabled={isLoading}
				autofocus
			></textarea>
		</div>

		{#if error.length > 0}
			<div class="flex gap-3 border-t border-white/10 px-4 py-4 text-lg text-red-300">
				{error}
			</div>
		{/if}

		<div
			class="flex flex-col gap-3 border-t border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
		>
			<p class="text-sm text-zinc-500">Supports stack traces, server logs, and CLI output.</p>
			<button
				type="submit"
				class="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200 focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-zinc-950 focus:outline-none disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
				disabled={!canSubmit}
				aria-disabled={!canSubmit}
			>
				{#if isLoading}
					<span
						class="h-4 w-4 animate-spin rounded-full border-2 border-zinc-500 border-t-zinc-950"
						aria-hidden="true"
					></span>
					<span>Analyzing...</span>
				{:else}
					<span>Parse Logs</span>
				{/if}
			</button>
		</div>
	</div>

	{#if isLoading}
		<p class="sr-only" aria-live="polite">Analyzing your logs. Input is disabled.</p>
	{/if}
</form>
