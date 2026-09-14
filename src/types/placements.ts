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

/* The names live in `i18n/vocabulary.ts` — see `programLabel`. */
export const PLACEMENT_PROGRAMS: PlacementProgram[] = ["equipa-hours", "official-internship"];

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
