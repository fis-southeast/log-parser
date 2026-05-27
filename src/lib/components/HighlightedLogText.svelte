<script lang="ts">
	type Tone = 'default' | 'error' | 'warning' | 'info' | 'debug' | 'timestamp' | 'path' | 'secret';

	type Segment = {
		text: string;
		tone: Tone;
	};

	let { text, scrollTop = 0 }: { text: string; scrollTop?: number } = $props();

	const tokenPattern =
		/(?<secret>\b(?:sk-[A-Za-z0-9_-]{20,}|(?:api[_-]?key|token|password|secret)=\S+))|(?<level>\b(?:ERROR|FATAL|WARN(?:ING)?|INFO|DEBUG|TRACE)\b)|(?<status>\b[1-5]\d{2}\b)|(?<timestamp>\b\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?\b)|(?<path>(?:[A-Za-z]:)?[./\\][\w./\\-]+:\d+)/gi;

	function toneForMatch(match: RegExpExecArray): Tone {
		if (match.groups?.secret) return 'secret';
		if (match.groups?.timestamp) return 'timestamp';
		if (match.groups?.path) return 'path';

		const value = match[0].toUpperCase();

		if (match.groups?.status) {
			if (value.startsWith('5')) return 'error';
			if (value.startsWith('4')) return 'warning';
			return 'info';
		}

		if (value === 'ERROR' || value === 'FATAL') return 'error';
		if (value === 'WARN' || value === 'WARNING') return 'warning';
		if (value === 'DEBUG' || value === 'TRACE') return 'debug';

		return 'info';
	}

	function tokenizeLine(line: string): Segment[] {
		const segments: Segment[] = [];
		tokenPattern.lastIndex = 0;
		let lastIndex = 0;
		let match: RegExpExecArray | null;

		while ((match = tokenPattern.exec(line))) {
			if (match.index > lastIndex) {
				segments.push({ text: line.slice(lastIndex, match.index), tone: 'default' });
			}

			segments.push({ text: match[0], tone: toneForMatch(match) });
			lastIndex = match.index + match[0].length;
		}

		if (lastIndex < line.length) {
			segments.push({ text: line.slice(lastIndex), tone: 'default' });
		}

		return segments.length ? segments : [{ text: line || ' ', tone: 'default' }];
	}

	const lines = $derived(text.split('\n').map(tokenizeLine));
</script>

<pre
	class="pointer-events-none absolute inset-0 mr-3 max-h-60 overflow-hidden rounded-3xl px-5 py-5 text-base leading-7 whitespace-pre-wrap text-zinc-100"
	aria-hidden="true"><code class="block" style:transform={`translateY(-${scrollTop}px)`}
		>{#each lines as line, lineIndex}<span
				>{#each line as segment}<span
						class={[
							segment.tone === 'error' && 'font-semibold text-red-300',
							segment.tone === 'warning' && 'font-semibold text-amber-200',
							segment.tone === 'info' && 'text-sky-200',
							segment.tone === 'debug' && 'text-zinc-500',
							segment.tone === 'timestamp' && 'text-zinc-500',
							segment.tone === 'path' && 'text-violet-200',
							segment.tone === 'secret' &&
								'font-semibold text-red-200 underline decoration-red-300/60 decoration-wavy underline-offset-2',
							segment.tone === 'default' && 'text-zinc-100'
						]
							.filter(Boolean)
							.join(' ')}>{segment.text}</span
					>{/each}</span
			>{#if lineIndex < lines.length - 1}{'\n'}{/if}{/each}</code
	></pre>
