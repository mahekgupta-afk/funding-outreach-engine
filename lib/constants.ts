/** Marker used in seeded sample data's source_url so the dashboard can label it clearly. */
export const SAMPLE_SOURCE_MARKER = "sample-data.internal";

export function isSampleSource(sourceUrl: string | null | undefined): boolean {
  return Boolean(sourceUrl?.includes(SAMPLE_SOURCE_MARKER));
}
