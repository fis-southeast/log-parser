<script lang="ts">
	import MarkdownText from '$lib/components/MarkdownText.svelte';
	import type { AnalysisResult } from '$lib';

	let { result }: { result: AnalysisResult } = $props();
</script>

<section class="mt-8 w-full" aria-labelledby="analysis-heading" aria-live="polite">
	<div
		class="rounded-4xl border border-white/10 bg-zinc-950/80 p-5 shadow-2xl ring-1 shadow-black/40 ring-white/3 backdrop-blur sm:p-6"
	>
		<div class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
			<div>
				<p class="mb-2 text-xs font-semibold tracking-[0.22em] text-zinc-500 uppercase">
					Analysis Result
				</p>
				<h2 id="analysis-heading" class="text-2xl font-semibold tracking-[-0.035em] text-white">
					What the logs are telling you
				</h2>
			</div>

			<div
				class="inline-flex w-fit items-center rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-sm font-semibold text-amber-200"
			>
				Severity: {result.severity}
			</div>
		</div>

		<div class="grid gap-4 lg:grid-cols-2">
			<article class="rounded-3xl border border-white/10 bg-white/3 p-5 lg:col-span-2">
				<h3 class="mb-3 text-sm font-semibold tracking-[0.16em] text-zinc-400 uppercase">
					Summary
				</h3>
				<div class="text-base leading-7 text-zinc-100">
					<MarkdownText text={result.summary} />
				</div>
			</article>

			<article class="rounded-3xl border border-white/10 bg-white/3 p-5">
				<h3 class="mb-3 text-sm font-semibold tracking-[0.16em] text-zinc-400 uppercase">
					Likely Cause
				</h3>
				<div class="text-base leading-7 text-zinc-200">
					<MarkdownText text={result.likelyCause} />
				</div>
			</article>

			<article class="rounded-3xl border border-white/10 bg-white/3 p-5">
				<h3 class="mb-3 text-sm font-semibold tracking-[0.16em] text-zinc-400 uppercase">
					Beginner-Friendly Explanation
				</h3>
				<div class="text-base leading-7 text-zinc-200">
					<MarkdownText text={result.beginnerExplanation} />
				</div>
			</article>

			<article class="rounded-3xl border border-white/10 bg-white/3 p-5">
				<h3 class="mb-3 text-sm font-semibold tracking-[0.16em] text-zinc-400 uppercase">
					Evidence
				</h3>
				<ul class="space-y-3 text-base leading-7 text-zinc-200">
					{#each result.evidence as item (item)}
						<li class="flex gap-3">
							<span class="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-500"></span>
							<span><MarkdownText text={item} /></span>
						</li>
					{/each}
				</ul>
			</article>

			<article class="rounded-3xl border border-white/10 bg-white/3 p-5">
				<h3 class="mb-3 text-sm font-semibold tracking-[0.16em] text-zinc-400 uppercase">
					Suggested Fixes
				</h3>
				<ul class="space-y-3 text-base leading-7 text-zinc-200">
					{#each result.suggestedFixes as item (item)}
						<li class="flex gap-3">
							<span class="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300"></span>
							<span><MarkdownText text={item} /></span>
						</li>
					{/each}
				</ul>
			</article>
		</div>
	</div>
</section>
