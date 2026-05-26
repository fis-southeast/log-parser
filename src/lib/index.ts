export type AnalysisResult = {
	summary: string;
	severity: string;
	likelyCause: string;
	evidence: string[];
	suggestedFixes: string[];
	beginnerExplanation: string;
};
