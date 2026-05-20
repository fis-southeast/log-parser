<script lang="ts">
	import LogInput from '$lib/components/LogInput.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
</script>

<svelte:head>
	<title>Test Preview Deployment</title>
	<meta name="description" content="Turn noisy output into useful insight." />
</svelte:head>

<main class="min-h-screen bg-[#0b0b0f] px-4 text-zinc-100 sm:px-6">
	<section
		class="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center py-10"
	>
		<PageHeader />
		<LogInput />
	</section>
</main>
