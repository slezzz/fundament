import { analyzeUrl, type AnalyzeOptions } from "@engine/analyze";
import type { AnalysisInput, UrlAnalysis } from "@shared/types";

export class LocalSecurityAnalyzer {
  constructor(private readonly options: AnalyzeOptions = {}) {}

  analyze(input: AnalysisInput): Promise<UrlAnalysis> {
    return analyzeUrl(input, this.options);
  }
}
