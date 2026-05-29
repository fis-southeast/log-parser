/**
 * Utilities for cleansing sensitive tokens from logs and filtering to
 * error/fatal severity — supporting plain-text, structured JSON, and
 * multi-line stack-trace blocks.  Non-error context lines surrounding
 * each error are retained for AI analysis.
 */

// ----- Types -----

export type LogLevel =
	| 'trace'
	| 'debug'
	| 'info'
	| 'warn'
	| 'warning'
	| 'error'
	| 'fatal'
	| 'critical';

/** A structured log entry (JSON-based loggers: Winston, Pino, Bunyan, etc.) */
export interface StructuredLogEntry {
	level?: string;
	severity?: string;
	msg?: string;
	message?: string;
	timestamp?: string;
	time?: string | number;
	[key: string]: unknown;
}

/** Normalised shape passed to AI after processing */
export interface ProcessedLogEntry {
	/** "error" | "fatal" | … | "context" (surrounding non-error line) | "trace" */
	level: string;
	message: string;
	timestamp?: string;
	/** Cleansed original text (single line or full multi-line trace block) */
	raw: string;
	structured: boolean;
	/** Stack trace lines attached to this entry, already cleansed */
	stackTrace?: string[];
	/** True when this line is included only for surrounding context */
	isContext?: boolean;
}

export interface ProcessorOptions {
	/**
	 * Additional regex patterns to treat as sensitive tokens.
	 * Each is applied globally and replaced with the mask string.
	 */
	extraPatterns?: RegExp[];
	/**
	 * Replacement string for redacted values. Default: "[REDACTED]"
	 */
	mask?: string;
	/**
	 * Extra level strings beyond error/fatal to keep (case-insensitive).
	 */
	extraLevels?: string[];
	/**
	 * How many non-error lines to include before and after each error/fatal/trace
	 * for context. Default: 2
	 */
	contextLines?: number;
}

// ----- Built-in sensitive-token patterns -----

const DEFAULT_PATTERNS: RegExp[] = [
	// JWT  (header.payload.signature)
	/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,

	// Bearer / Authorization header values
	/\bBearer\s+[A-Za-z0-9\-._~+/]+=*\b/gi,

	// Generic API keys: key=<value>, api_key=<value>, apikey=<value>, token=<value>
	/\b(?:api[_-]?key|apikey|access[_-]?token|auth[_-]?token|secret[_-]?key|client[_-]?secret)\s*[:=]\s*["']?[A-Za-z0-9\-._~+/]{16,}["']?/gi,

	// AWS access key IDs  (AKIA…)
	/\bAKIA[0-9A-Z]{16}\b/g,

	// AWS secret access keys  (40-char base64-ish after known label)
	/(?:aws[_-]?secret[_-]?access[_-]?key|AWS_SECRET_ACCESS_KEY)\s*[:=]\s*["']?[A-Za-z0-9/+]{40}["']?/gi,

	// Generic secrets in JSON-like key/value pairs
	/("(?:password|passwd|secret|token|credential|private_key|auth)"\s*:\s*)"[^"]{4,}"/gi,

	// Hex strings that look like secrets (32+ hex chars, standalone)
	/\b[0-9a-fA-F]{32,}\b/g,

	// Basic auth in URLs  (user:pass@)
	/\/\/[^:]+:[^@]+@/g,

	// Private key blocks
	/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,

	// Credit card numbers (Luhn-shaped: 13–19 digits with optional dashes/spaces)
	/\b(?:\d[ -]?){13,19}\b/g,

	// digest hashes often attached to trace blocks  (digest: 'XXXXXXXXXX')
	/\bdigest\s*:\s*['"]?[A-Za-z0-9]{8,}['"]?/gi

	// IPv4 addresses (optional — uncomment if infra IPs are sensitive)
	// /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
];

// ----- Level classification -----

const ERROR_LEVELS = new Set<string>([
	'error',
	'err',
	'fatal',
	'critical',
	'crit',
	'severe',
	'alert',
	'emerg',
	'emergency'
]);

function isErrorLevel(level: string, extras: string[] = []): boolean {
	const n = level.toLowerCase().trim();
	return ERROR_LEVELS.has(n) || extras.map((e) => e.toLowerCase()).includes(n);
}

// ----- Core: token cleansing -----

/**
 * Scrub sensitive tokens from a raw string.
 */
export function cleanse(raw: string, options: ProcessorOptions = {}): string {
	const { extraPatterns = [], mask = '[REDACTED]' } = options;
	const patterns = [...DEFAULT_PATTERNS, ...extraPatterns];
	let cleansed = raw;
	for (const pattern of patterns) {
		pattern.lastIndex = 0;
		cleansed = cleansed.replace(pattern, mask);
	}
	return cleansed;
}

// ----- Stack-trace detection -----

/**
 * Matches the first line of a bare stack trace block, e.g.:
 *   TypeError: Cannot read properties of undefined
 *   Error: connect ECONNREFUSED
 *   RangeError: Maximum call stack size exceeded
 */
const TRACE_HEADER_RE =
	/^[A-Za-z][\w$.]*(?:Error|Exception|Fault|Panic|TypeError|RangeError|ReferenceError|SyntaxError|URIError|EvalError)[\w$]*\s*:/;

/**
 * Matches a stack frame line, e.g.:
 *   at UserProfile (./components/UserProfile.tsx:12:24)
 *   at Object.<anonymous> (/app/server.js:45:3)
 *   at renderWithHooks (react-dom.development.js:15486:18)
 */
const STACK_FRAME_RE = /^\s+at\s+/;

/** Matches the `digest:` trailer sometimes appended by Next.js / frameworks */
const DIGEST_RE = /^\s*digest\s*:\s*/i;

function isStackFrame(line: string): boolean {
	return STACK_FRAME_RE.test(line) || DIGEST_RE.test(line);
}

// ----- Segment types -----

/**
 * A "segment" is either a single log line or a multi-line trace block that has
 * been grouped together before per-segment processing begins.
 */
interface RawSegment {
	lines: string[]; // original (uncleansed) lines
	isTrace: boolean;
}

/**
 * Group raw lines into segments.  A trace block is:
 *   - A line matching TRACE_HEADER_RE
 *   - Followed by one or more stack-frame lines (and an optional digest line)
 *
 * Everything else is a single-line segment.
 */
function groupIntoSegments(lines: string[]): RawSegment[] {
	const segments: RawSegment[] = [];
	let i = 0;

	while (i < lines.length) {
		const line = lines[i];

		if (TRACE_HEADER_RE.test(line.trim())) {
			// Collect the header + all immediately following frame lines
			const block: string[] = [line];
			let j = i + 1;
			while (j < lines.length && (isStackFrame(lines[j]) || lines[j].trim() === '')) {
				// include blank lines inside the block but stop if content resumes
				if (
					lines[j].trim() === '' &&
					j + 1 < lines.length &&
					!isStackFrame(lines[j + 1]) &&
					!DIGEST_RE.test(lines[j + 1])
				) {
					break;
				}
				block.push(lines[j]);
				j++;
			}

			// Only treat as a trace block if we actually captured frame lines
			if (block.length > 1) {
				segments.push({ lines: block, isTrace: true });
				i = j;
				continue;
			}
		}

		segments.push({ lines: [line], isTrace: false });
		i++;
	}

	return segments;
}

// ----- Parsing helpers -----

function tryParseJson(line: string): StructuredLogEntry | null {
	const trimmed = line.trim();
	if (!trimmed.startsWith('{')) return null;
	try {
		const parsed = JSON.parse(trimmed);
		if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed))
			return parsed as StructuredLogEntry;
	} catch {
		/* not JSON */
	}
	return null;
}

const PLAIN_LEVEL_RE =
	/(?:^|\s)[<\[]?(TRACE|DEBUG|INFO|WARN(?:ING)?|ERROR|FATAL|CRITICAL|CRIT|SEVERE|ALERT|EMERG(?:ENCY)?)[>\]]?\s*[:\-–]?/i;

function extractPlainLevel(line: string): string | null {
	const match = PLAIN_LEVEL_RE.exec(line);
	return match ? match[1].toLowerCase() : null;
}

function extractStructuredLevel(entry: StructuredLogEntry): string | null {
	const raw = entry.level ?? entry.severity ?? null;
	return raw ? String(raw).toLowerCase() : null;
}

function extractStructuredMessage(entry: StructuredLogEntry): string {
	return String(entry.msg ?? entry.message ?? JSON.stringify(entry));
}

function extractStructuredTimestamp(entry: StructuredLogEntry): string | undefined {
	const ts = entry.timestamp ?? entry.time;
	return ts !== undefined ? String(ts) : undefined;
}

// ----- Segment → ProcessedLogEntry -----

function parseSegment(segment: RawSegment, options: ProcessorOptions): ProcessedLogEntry | null {
	// ----- Trace block -----
	if (segment.isTrace) {
		const cleansedLines = segment.lines.map((l) => cleanse(l, options));
		const header = cleansedLines[0];
		const frames = cleansedLines.slice(1).filter((l) => l.trim() !== '');
		return {
			level: 'error', // treat trace blocks as errors
			message: header.trim(),
			raw: cleansedLines.join('\n'),
			structured: false,
			stackTrace: frames
		};
	}

	// ----- Single line -----
	const line = segment.lines[0];
	if (!line.trim()) return null;

	const cleansedLine = cleanse(line, options);

	// Structured JSON path
	const structured = tryParseJson(cleansedLine);
	if (structured) {
		const level = extractStructuredLevel(structured);
		if (!level) return null;
		return {
			level,
			message: cleanse(extractStructuredMessage(structured), options),
			timestamp: extractStructuredTimestamp(structured),
			raw: cleansedLine,
			structured: true
		};
	}

	// Plain-text path
	const level = extractPlainLevel(cleansedLine) ?? 'unknown';
	return {
		level,
		message: cleansedLine.trim(),
		raw: cleansedLine,
		structured: false
	};
}

// ----- Context windowing -----

/**
 * Given an array of all parsed segments (including non-error ones), mark the
 * indices that should be kept: every error/fatal/trace index plus the
 * `contextLines` neighbors on each side.
 */
function applyContextWindow(
	all: Array<ProcessedLogEntry | null>,
	contextLines: number,
	extraLevels: string[]
): ProcessedLogEntry[] {
	const keepIdx = new Set<number>();

	for (let i = 0; i < all.length; i++) {
		const e = all[i];
		if (!e) continue;
		if (isErrorLevel(e.level, extraLevels) || e.stackTrace) {
			for (
				let k = Math.max(0, i - contextLines);
				k <= Math.min(all.length - 1, i + contextLines);
				k++
			) {
				keepIdx.add(k);
			}
		}
	}

	const results: ProcessedLogEntry[] = [];
	let lastKept = -1;

	for (const i of Array.from(keepIdx).sort((a, b) => a - b)) {
		// Insert a separator when there's a gap in the kept indices
		if (lastKept !== -1 && i > lastKept + 1) {
			results.push({
				level: 'separator',
				message: `--- ${i - lastKept - 1} line(s) omitted ---`,
				raw: '',
				structured: false,
				isContext: true
			});
		}

		const entry = all[i];
		// Skip slots that parsed to null (blank lines, unrecognized segments)
		if (!entry) continue;

		// Tag context lines so the caller / AI can distinguish them
		const isContext = !isErrorLevel(entry.level, extraLevels) && !entry.stackTrace;
		results.push({ ...entry, isContext });
		lastKept = i;
	}

	return results;
}

// ----- Public API -----

/**
 * Process an array of raw log lines.
 *
 * Steps:
 *  1. Group lines into segments (single lines or multi-line trace blocks).
 *  2. Cleanse each segment of sensitive tokens.
 *  3. Parse the log level.
 *  4. Retain error/fatal/trace entries AND up to `contextLines` surrounding
 *     non-error lines for each one.
 *
 * @param lines   Raw log lines.
 * @param options Processor options.
 */
export function processLines(lines: string[], options: ProcessorOptions = {}): ProcessedLogEntry[] {
	const { contextLines = 2, extraLevels = [] } = options;

	const segments = groupIntoSegments(lines);
	const parsed = segments.map((seg) => parseSegment(seg, options));

	return applyContextWindow(parsed, contextLines, extraLevels);
}

/**
 * Convenience wrapper: split a multi-line log blob and process it.
 */
export function processLogBlob(raw: string, options: ProcessorOptions = {}): ProcessedLogEntry[] {
	return processLines(raw.split(/\r?\n/), options);
}

/**
 * Format processed entries into a compact string suitable for an AI prompt.
 *
 * @param entries    Processed log entries (from processLines / processLogBlob).
 * @param maxEntries Cap the number of error entries sent (default: 50).
 *                   Context and separator lines are always included alongside
 *                   their parent error.
 */
export function formatForAI(entries: ProcessedLogEntry[], maxEntries = 50): string {
	let errorCount = 0;
	const lines: string[] = [];

	for (const e of entries) {
		if (e.level === 'separator') {
			lines.push(`\n  ${e.message}\n`);
			continue;
		}

		if (e.isContext) {
			const ts = e.timestamp ? `[${e.timestamp}] ` : '';
			lines.push(`  (context) ${ts}[${e.level.toUpperCase()}] ${e.message}`);
			continue;
		}

		if (errorCount >= maxEntries) continue;
		errorCount++;

		const ts = e.timestamp ? `[${e.timestamp}] ` : '';
		const header = `${errorCount}. ${ts}[${e.level.toUpperCase()}] ${e.message}`;
		lines.push(header);

		if (e.stackTrace && e.stackTrace.length > 0) {
			e.stackTrace.forEach((frame) => lines.push(`     ${frame}`));
		}
	}

	return lines.join('\n');
}
