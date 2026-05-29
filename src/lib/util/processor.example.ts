/**
 * Cleansing Example
 */

import { processLogBlob, formatForAI, type ProcessorOptions } from './processor';

// ----- Example log data -----

const RAW_LOGS = `
2024-06-01T10:00:01Z INFO  Server started on port 3000
2024-06-01T10:00:45Z DEBUG Received request GET /profile/42
2024-06-01T10:00:45Z DEBUG Fetching user record id=42
2024-06-01T10:00:46Z WARN  User record returned empty object for id=42
TypeError: Cannot read properties of undefined (reading 'name')
    at UserProfile (./components/UserProfile.tsx:12:24)
    at renderWithHooks (./node_modules/react-dom/cjs/react-dom.development.js:15486:18)
    at mountIndeterminateComponent (./node_modules/react-dom/cjs/react-dom.development.js:19000:13)
    at beginWork (./node_modules/react-dom/cjs/react-dom.development.js:20320:16)
 digest: '1234567890'

2024-06-01T10:00:47Z INFO  Render pipeline recovered, sending 500 to client
2024-06-01T10:01:02Z ERROR Database connection failed token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3IxMjMifQ.abc123sig
2024-06-01T10:01:03Z INFO  Retrying connection (attempt 1/3)
2024-06-01T10:01:06Z ERROR Max retries exceeded. api_key=sk-live-4f9a2b1c8e3d7f0a5c6b9e2d
2024-06-01T10:01:07Z FATAL Process exiting: unrecoverable DB state
2024-06-01T10:01:08Z INFO  Shutdown hook triggered
{"level":"info","msg":"Cache warming started","timestamp":"2024-06-01T10:02:00Z"}
{"level":"error","msg":"Payment gateway timeout","timestamp":"2024-06-01T10:02:15Z","service":"billing","authorization":"Bearer eyJhbGciOiJSUzI1NiJ9.payload.sig"}
{"level":"info","msg":"Retry queued for billing","timestamp":"2024-06-01T10:02:16Z"}
{"level":"fatal","msg":"Out of memory","timestamp":"2024-06-01T10:02:30Z","heap_used_mb":4096}
{"level":"info","msg":"Process manager restarting worker","timestamp":"2024-06-01T10:02:31Z"}
`;

// ----- Options -----

const options: ProcessorOptions = {
	mask: '[REDACTED]',
	contextLines: 2, // keep 2 lines before/after each error or trace block
	extraPatterns: [
		/\bsess_[A-Za-z0-9]{24,}\b/g,
		/\bcorr-[a-f0-9]{32}\b/g
	]
};

// ----- Process -----

const entries = processLogBlob(RAW_LOGS, options);
const prompt = formatForAI(entries);

console.log(prompt);
