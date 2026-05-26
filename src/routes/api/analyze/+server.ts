import { env } from '$env/dynamic/private';
import type { AnalysisResult } from '$lib';
import { json, type RequestHandler } from '@sveltejs/kit';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import systemPrompt from '../../../../prompts/log-parser-system.md?raw';

const MODEL = 'gpt-5.4-mini';

const analysisResultSchema = z.object({
	summary: z.string(),
	severity: z.enum(['Low', 'Medium', 'High', 'Critical']),
	likelyCause: z.string(),
	evidence: z.array(z.string()),
	suggestedFixes: z.array(z.string()),
	beginnerExplanation: z.string()
}) satisfies z.ZodType<AnalysisResult>;

async function analyzeLogsWithOpenAI(analysisInput: string): Promise<AnalysisResult> {
	const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

	const response = await openai.responses.parse({
		model: MODEL,
		reasoning: { effort: 'low' },
		input: [
			{ role: 'system', content: systemPrompt },
			{
				role: 'user',
				content: `Analyze these logs and return the result in the requested structure:\n\n${analysisInput}`
			}
		],
		text: {
			format: zodTextFormat(analysisResultSchema, 'analysis_result')
		}
	});

	const result = response.output_parsed;

	if (!result) {
		throw new Error('The model did not return a structured analysis.');
	}

	return result;
}

export const POST: RequestHandler = async ({ request }) => {
	const { logs } = await request.json().catch(() => ({ logs: '' }));
	const trimmedLogs = typeof logs === 'string' ? logs.trim() : '';

	if (!trimmedLogs) {
		return json({ error: 'Paste logs before requesting an analysis.' }, { status: 400 });
	}

	if (!env.OPENAI_API_KEY) {
		return json({ error: 'OPENAI_API_KEY is not configured.' }, { status: 500 });
	}

	try {
		const analysisInput = trimmedLogs;
		const result = await analyzeLogsWithOpenAI(analysisInput);

		return json({ result });
	} catch (error) {
		console.error('OpenAI log analysis failed:', error);
		return json({ error: 'Failed to analyze logs. Please try again.' }, { status: 500 });
	}
};
