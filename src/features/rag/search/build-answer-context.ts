import type { SourceCitation } from "./source-citation";
import { assertSourceCitation } from "./source-citation";

export type AnswerContext = {
  sources: SourceCitation[];
  contextText: string;
};

export function buildAnswerContext(sources: SourceCitation[]): AnswerContext {
  const validatedSources = sources.map(assertSourceCitation);

  return {
    sources: validatedSources,
    contextText: validatedSources
      .map(
        (source) =>
          `[${source.documentTitle} | p. ${source.pageNumber}] ${source.quotedText}`,
      )
      .join("\n\n"),
  };
}
