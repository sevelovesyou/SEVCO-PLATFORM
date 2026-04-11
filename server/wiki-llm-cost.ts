import { storage } from "./storage";

export type WikiOperation =
  | "gap_analysis"
  | "rewikify"
  | "wikify"
  | "ingest_url"
  | "ingest_academic"
  | "ingest_pdf"
  | "semantic_relink";

export interface LlmRates {
  inputPer1k: number;
  outputPer1k: number;
}

const DEFAULT_RATES: Record<string, LlmRates> = {
  "claude-haiku": { inputPer1k: 0.0008, outputPer1k: 0.004 },
  "claude-sonnet": { inputPer1k: 0.003, outputPer1k: 0.015 },
  "default": { inputPer1k: 0.001, outputPer1k: 0.005 },
};

function matchRates(model: string, ratesMap: Record<string, LlmRates>): LlmRates {
  const lc = model.toLowerCase();
  for (const [key, rates] of Object.entries(ratesMap)) {
    if (lc.includes(key.toLowerCase())) return rates;
  }
  return ratesMap["default"] ?? { inputPer1k: 0.001, outputPer1k: 0.005 };
}

export async function getEffectiveRates(model: string): Promise<LlmRates> {
  try {
    const settings = await storage.getPlatformSettings();
    const raw = settings["wiki.llmRates"];
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, LlmRates>;
      return matchRates(model, parsed);
    }
  } catch {}
  return matchRates(model, DEFAULT_RATES);
}

export function computeCostUsd(inputTokens: number, outputTokens: number, rates: LlmRates): number {
  return (inputTokens / 1000) * rates.inputPer1k + (outputTokens / 1000) * rates.outputPer1k;
}

export async function logWikiLlmUsage(opts: {
  operation: WikiOperation;
  model: string;
  inputTokens: number;
  outputTokens: number;
  userId?: string | null;
  articleId?: number | null;
}): Promise<void> {
  try {
    const rates = await getEffectiveRates(opts.model);
    const estimatedCostUsd = computeCostUsd(opts.inputTokens, opts.outputTokens, rates);
    await storage.logWikiLlmUsage({
      operation: opts.operation,
      model: opts.model,
      inputTokens: opts.inputTokens,
      outputTokens: opts.outputTokens,
      estimatedCostUsd,
      userId: opts.userId ?? null,
      articleId: opts.articleId ?? null,
    });
  } catch (err) {
    console.error("[wiki-llm-cost] Failed to log usage:", err);
  }
}
