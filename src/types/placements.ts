/**
 * Equipa Técnica is a school-founded IT club that runs entirely inside the school.
 *
 * Every person on the roster is first and foremost a **team member**: a volunteer who
 * helps around, gets projects assigned, and accumulates *team hours* which are credited
 * as an Equipa Técnica surplus-hours certificate.
 *
 * A subset of those members additionally carry out their **FCT internship** within the
 * club. Those internship hours are tracked on a separate record and must never be mixed
 * with team hours — the two count towards two different things:
 *
 * - team hours      → surplus-hours certificate (volunteer work)
 * - internship hours → the regulated FCT internship (Portaria n.º 235-A/2018)
 *
 * Because the club lives inside the school, an internship is always hosted at the school;
 * there is no notion of an external placement site.
 */
export type PlacementProgram = "equipa-hours" | "official-internship";

export const PLACEMENT_PROGRAM_LABELS: Record<PlacementProgram, string> = {
  "equipa-hours": "Equipa Técnica — surplus hours",
  "official-internship": "Official internship (FCT)",
};

function toOptions<T extends string>(labels: Record<T, string>) {
  return (Object.keys(labels) as T[]).map((value) => ({ label: labels[value], value }));
}

export const PLACEMENT_PROGRAM_OPTIONS = toOptions(PLACEMENT_PROGRAM_LABELS);

/**
 * Only the FCT internship track produces the regulated document set
 * (plano de trabalho, ficha de assiduidade, relatório de estágio).
 */
export function requiresOfficialDocuments(program: PlacementProgram): boolean {
  return program === "official-internship";
}

/** Volunteer team work is the track that yields the surplus-hours certificate. */
export function producesSurplusCertificate(program: PlacementProgram): boolean {
  return program === "equipa-hours";
}
