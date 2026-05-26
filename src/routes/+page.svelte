<script lang="ts">
	import AnalysisLoading from '$lib/components/AnalysisLoading.svelte';
	import AnalysisResult from '$lib/components/AnalysisResult.svelte';
	import LogInput from '$lib/components/LogInput.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import type { AnalysisResult as AnalysisResultType } from '$lib';
	import {formatForAI, processLogBlob} from "$lib/util/processor";

	let logs = $state('');
	let isLoading = $state(false);
	let analysisResult = $state<AnalysisResultType | null>(null);
	let errorMessage = $state('');

	async function parseLogs() {
		if (isLoading || !logs.trim()) return;

		isLoading = true;
		analysisResult = null;
		errorMessage = '';

		const entries = processLogBlob(logs);
		const prompt = formatForAI(entries);

		try {
			const response = await fetch('/api/analyze', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ logs: prompt }),
			});

			const body = await response.json();

			if (!response.ok) {
				throw new Error(body.error ?? 'Failed to analyze logs.');
			}

			analysisResult = body.result;
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Failed to analyze logs.';
		} finally {
			isLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Log Parser</title>
	<meta name="description" content="Turn noisy output into useful insight." />
</svelte:head>

<main class="min-h-screen bg-[#0b0b0f] px-4 text-zinc-100 sm:px-6">
	<section
		class="mx-auto flex min-h-screen w-full flex-col items-center justify-center py-10 transition-[max-width] duration-500 ease-out {analysisResult
			? 'max-w-5xl'
			: 'max-w-3xl'}"
	>
		<PageHeader />
		<LogInput bind:logs {isLoading} onSubmit={parseLogs} />

		{#if isLoading}
			<AnalysisLoading />
		{/if}

		{#if errorMessage}
			<p
				class="mt-6 w-full rounded-3xl border border-red-400/20 bg-red-400/10 px-5 py-4 text-sm leading-6 text-red-100"
				aria-live="polite"
			>
				{errorMessage}
			</p>
		{/if}

		{#if analysisResult}
			<AnalysisResult result={analysisResult} />
		{/if}
	</section>
</main>
