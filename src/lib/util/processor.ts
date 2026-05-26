/**
 * Utilities for cleansing sensitive tokens from logs and filtering to
 * error/fatal severity — supporting both plain-text and structured log formats.
 */

// ----- Types -----

export type LogLevel =
    | "trace"
    | "debug"
    | "info"
    | "warn"
    | "warning"
    | "error"
    | "fatal"
    | "critical";

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
    level: string;
    message: string;
    timestamp?: string;
    raw: string; // cleansed original line/object
    structured: boolean;
}

export interface ProcessorOptions {
    /**
     * Additional regex patterns to treat as sensitive tokens.
     * Each pattern is applied globally and replaced with the mask.
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

    // GitHub personal access token
    /gh[pousr]_[A-Za-z0-9_]{36,}/g,

    // Stripe API keys
    /[sp]k_(?:live|test)_[A-Za-z0-9]{24,}/g,

    // Tokens with common prefixes
    /(?:api|token|key|secret|auth)[_-]?[A-Za-z0-9+/=]{32,}/gi,

    // Google API key
    /AIza[0-9A-Za-z\-_]{35}/g,

    // Slack tokens
    /xox[baprs]-[A-Za-z0-9-]{10,}/g,

    // Private key blocks
    /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC )?PRIVATE KEY-----/g,

    // OAuth tokens
    /ya29\.[A-Za-z0-9\-_]+/g,

    // Twilio tokens
    /SK[0-9a-fA-F]{32}/g,

    // IPv4 addresses (optional — uncomment if infra IPs are sensitive)
    // /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
];

// ----- Level classification -----

const ERROR_LEVELS = new Set<string>([
    "error",
    "err",
    "fatal",
    "critical",
    "crit",
    "severe",
    "alert",
    "emerg",
    "emergency",
]);

function isErrorLevel(level: string, extras: string[] = []): boolean {
    const normalised = level.toLowerCase().trim();
    return (
        ERROR_LEVELS.has(normalised) ||
        extras.map((e) => e.toLowerCase()).includes(normalised)
    );
}

// ----- Core: token cleansing -----

/**
 * Scrub sensitive tokens from a raw string.
 *
 * @param raw     The original log line or serialised JSON object.
 * @param options Processor options (extra patterns, mask string).
 * @returns       The cleansed string.
 */
export function processor(raw: string, options: ProcessorOptions = {}): string {
    const { extraPatterns = [], mask = "[REDACTED]" } = options;
    const patterns = [...DEFAULT_PATTERNS, ...extraPatterns];

    let cleansed = raw;
    for (const pattern of patterns) {
        // Reset lastIndex so global regexes work correctly across calls.
        pattern.lastIndex = 0;
        cleansed = cleansed.replace(pattern, mask);
    }
    return cleansed;
}

// ----- Parsing helpers -----

function tryParseJson(line: string): StructuredLogEntry | null {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return null;
    try {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed))
            return parsed as StructuredLogEntry;
    } catch {
        // not valid JSON
    }
    return null;
}

/**
 * Extract level from a plain-text log line.
 *
 * Handles common formats:
 *   [ERROR]  …
 *   ERROR:   …
 *   2024-01-01 ERROR …
 *   <ERROR>  …
 *   FATAL —  …
 */
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

// ----- Core: parsing a single line -----

function parseLine(
    line: string,
    options: ProcessorOptions
): ProcessedLogEntry | null {
    const cleansedLine = processor(line, options);
    const structured = tryParseJson(cleansedLine);

    if (structured) {
        const level = extractStructuredLevel(structured);
        if (!level) return null;
        if (!isErrorLevel(level, options.extraLevels)) return null;

        return {
            level,
            message: processor(extractStructuredMessage(structured), options),
            timestamp: extractStructuredTimestamp(structured),
            raw: cleansedLine,
            structured: true,
        };
    }

    // Plain-text path
    const level = extractPlainLevel(cleansedLine);
    if (!level || !isErrorLevel(level, options.extraLevels)) return null;

    return {
        level,
        message: cleansedLine.trim(),
        raw: cleansedLine,
        structured: false,
    };
}

// ----- Public API -----

/**
 * Process an array of raw log lines.
 *
 * Steps:
 *  1. Cleanse each line of sensitive tokens.
 *  2. Parse the log level (structured or plain text).
 *  3. Keep only error / fatal entries.
 *
 * @param lines   Raw log lines (split on newlines before passing in).
 * @param options Processor options.
 * @returns       Array of ProcessedLogEntry ready to send to AI.
 */
export function processLines(
    lines: string[],
    options: ProcessorOptions = {}
): ProcessedLogEntry[] {
    const results: ProcessedLogEntry[] = [];

    for (const line of lines) {
        if (!line.trim()) continue;
        const entry = parseLine(line, options);
        if (entry) results.push(entry);
    }

    return results;
}

/**
 * Convenience wrapper: split a multi-line log blob and process it.
 *
 * @param raw     Full log output as a single string.
 * @param options Processor options.
 */
export function processLogBlob(
    raw: string,
    options: ProcessorOptions = {}
): ProcessedLogEntry[] {
    return processLines(raw.split(/\r?\n/), options);
}

/**
 * Format processed entries into a compact string suitable for an AI prompt.
 *
 * @param entries Processed log entries.
 * @param maxEntries Cap the number sent to avoid token bloat (default: 50).
 */
export function formatForAI(
    entries: ProcessedLogEntry[],
    maxEntries = 50
): string {
    const capped = entries.slice(0, maxEntries);
    return capped
        .map((e, i) => {
            const ts = e.timestamp ? `[${e.timestamp}] ` : "";
            return `${i + 1}. ${ts}[${e.level.toUpperCase()}] ${e.message}`;
        })
        .join("\n");
}
