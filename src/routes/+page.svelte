<script lang="ts">
	import AnalysisResult from '$lib/components/AnalysisResult.svelte';
	import LogInput from '$lib/components/LogInput.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import type { AnalysisResult as AnalysisResultType } from '$lib';

	let logs = $state('');
	let isLoading = $state(false);
	let analysisResult = $state<AnalysisResultType | null>(null);
	let loadingTimer: ReturnType<typeof setTimeout>;

	function parseLogs() {
		if (isLoading || !logs.trim()) return;

		isLoading = true;
		analysisResult = null;
		clearTimeout(loadingTimer);

		loadingTimer = setTimeout(() => {
			analysisResult = {
				summary: 'The application is failing while trying to complete a database-backed request.',
				severity: 'High',
				likelyCause:
					'A required database connection or query is timing out before the request can finish.',
				evidence: [
					'The logs contain repeated timeout messages near the failed request.',
					'The error appears after the app starts database work, not during initial startup.',
					'Multiple retries end with the same failure pattern.'
				],
				suggestedFixes: [
					'Check that the database is reachable from the app environment.',
					'Confirm the connection string, credentials, and network rules are correct.',
					'Inspect the slow query or increase timeout limits only after confirming the database is healthy.'
				],
				beginnerExplanation:
					'The app is asking the database for information, but the database is not answering quickly enough. The next step is to verify that the app can connect to the database and that the query is not getting stuck.'
			};
			isLoading = false;
		}, 1200);
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
			<section class="mt-8 w-full" aria-live="polite" aria-label="Analysis loading state">
				<div
					class="rounded-4xl border border-white/10 bg-zinc-950/80 p-5 shadow-2xl ring-1 shadow-black/40 ring-white/3 backdrop-blur sm:p-6"
				>
					<div class="mb-5 flex items-center gap-3">
						<span
							class="h-5 w-5 animate-spin rounded-full border-2 border-zinc-600 border-t-white"
							aria-hidden="true"
						></span>
						<div>
							<h2 class="text-lg font-semibold text-white">Analyzing your logs...</h2>
							<p class="text-sm text-zinc-500">Finding the summary, cause, evidence, and fixes.</p>
						</div>
					</div>

					<div class="grid gap-4 lg:grid-cols-2" aria-hidden="true">
						<div class="h-28 animate-pulse rounded-3xl border border-white/10 bg-white/3"></div>
						<div class="h-28 animate-pulse rounded-3xl border border-white/10 bg-white/3"></div>
						<div class="h-36 animate-pulse rounded-3xl border border-white/10 bg-white/3"></div>
						<div class="h-36 animate-pulse rounded-3xl border border-white/10 bg-white/3"></div>
					</div>
				</div>
			</section>
		{/if}

		{#if analysisResult}
			<AnalysisResult result={analysisResult} />
		{/if}
	</section>
</main>
