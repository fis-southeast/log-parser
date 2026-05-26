/**
 * Cleansing Example
 */

import {
    processLogBlob,
    formatForAI,
    type ProcessorOptions,
} from "./processor.ts";

// ----- Example log data -----

const RAW_LOGS = `
2024-06-01T10:00:01Z INFO  Server started on port 3000
2024-06-01T10:00:45Z DEBUG Received request GET /health
2024-06-01T10:01:02Z ERROR Database connection failed: host=db.internal token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3IxMjMifQ.abc123sig
2024-06-01T10:01:03Z INFO  Retrying connection (attempt 1/3)
2024-06-01T10:01:06Z ERROR Max retries exceeded. api_key=sk-live-4f9a2b1c8e3d7f0a5c6b9e2d api_secret=a3f1b2c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0
2024-06-01T10:01:07Z FATAL Process exiting: unrecoverable DB state
{"level":"info","msg":"Cache warmed","timestamp":"2024-06-01T10:02:00Z"}
{"level":"error","msg":"Payment gateway timeout","timestamp":"2024-06-01T10:02:15Z","service":"billing","authorization":"Bearer eyJhbGciOiJSUzI1NiJ9.payload.sig"}
{"level":"fatal","msg":"Out of memory","timestamp":"2024-06-01T10:02:30Z","heap_used_mb":4096}
`;

// ----- Options -----

const options: ProcessorOptions = {
    mask: "[REDACTED]",
    // Add domain-specific patterns on top of the built-in ones:
    extraPatterns: [
        // Internal correlation IDs that shouldn't leave the system
        /\bcorr-[a-f0-9]{32}\b/g,
        // Custom session tokens with a known prefix
        /\bsess_[A-Za-z0-9]{24,}\b/g,
    ],
    // Optionally promote extra levels to "keep" list:
    // extraLevels: ["warn"],
};

// ----- Process -----

const entries = processLogBlob(RAW_LOGS, options);
const prompt = formatForAI(entries);

console.log(prompt);
console.log(`\nTotal entries kept: ${entries.length}`);
