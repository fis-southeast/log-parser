<script lang="ts">
	type InlineSegment = {
		text: string;
		code: boolean;
	};

	type TextBlock = {
		type: 'text';
		lines: InlineSegment[][];
	};

	type CodeBlock = {
		type: 'code';
		code: string;
		language: string;
	};

	type Block = TextBlock | CodeBlock;

	let { text }: { text: string } = $props();

	function parseInline(line: string): InlineSegment[] {
		const segments: InlineSegment[] = [];
		const parts = line.split('`');

		for (let index = 0; index < parts.length; index += 1) {
			if (!parts[index] && index !== parts.length - 1) continue;

			segments.push({
				text: parts[index],
				code: index % 2 === 1
			});
		}

		return segments.length ? segments : [{ text: '', code: false }];
	}

	function parseMarkdown(value: string): Block[] {
		const blocks: Block[] = [];
		const lines = value.split('\n');
		let paragraph: string[] = [];
		let codeLines: string[] = [];
		let codeLanguage = '';
		let inCodeBlock = false;

		function flushParagraph() {
			if (!paragraph.length) return;

			blocks.push({
				type: 'text',
				lines: paragraph.map(parseInline)
			});
			paragraph = [];
		}

		for (const line of lines) {
			if (line.startsWith('```')) {
				if (inCodeBlock) {
					blocks.push({
						type: 'code',
						code: codeLines.join('\n'),
						language: codeLanguage
					});
					codeLines = [];
					codeLanguage = '';
					inCodeBlock = false;
				} else {
					flushParagraph();
					codeLanguage = line.slice(3).trim();
					inCodeBlock = true;
				}

				continue;
			}

			if (inCodeBlock) {
				codeLines.push(line);
				continue;
			}

			if (line.trim() === '') {
				flushParagraph();
				continue;
			}

			paragraph.push(line);
		}

		if (inCodeBlock) {
			blocks.push({
				type: 'code',
				code: codeLines.join('\n'),
				language: codeLanguage
			});
		}

		flushParagraph();

		return blocks.length
			? blocks
			: [
					{
						type: 'text',
						lines: [[{ text: '', code: false }]]
					}
				];
	}

	const blocks = $derived(parseMarkdown(text));
</script>

<div class="space-y-4">
	{#each blocks as block}
		{#if block.type === 'code'}
			<div class="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950">
				{#if block.language}
					<div
						class="border-b border-white/10 px-4 py-2 text-xs font-semibold text-zinc-500 uppercase"
					>
						{block.language}
					</div>
				{/if}
				<pre
					class="[scrollbar-thin] [scrollbar-color:rgba(255,255,255,0.22)_transparent] overflow-x-auto p-4 text-sm leading-6 whitespace-pre text-zinc-100"><code
						>{block.code}</code
					></pre>
			</div>
		{:else}
			<p>
				{#each block.lines as line, lineIndex}
					{#each line as segment}
						{#if segment.code}
							<code
								class="rounded-md border border-white/10 bg-white/8 px-1.5 py-0.5 text-[0.92em] text-zinc-100"
								>{segment.text}</code
							>
						{:else}
							{segment.text}
						{/if}
					{/each}
					{#if lineIndex < block.lines.length - 1}
						<br />
					{/if}
				{/each}
			</p>
		{/if}
	{/each}
</div>
