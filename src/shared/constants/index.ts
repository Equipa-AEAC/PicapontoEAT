export const WORKSPACE_KEYS = {
  admin: "admin",
  student: "student",
} as const;

/**
 * The roster member the seeded student account signs in as.
 *
 * This is now *only* a mock fixture value, consumed by the mock auth service to
 * populate `AuthUser.memberId`. No page, store or service reads it directly —
 * they resolve the subject through `authStore.currentMemberId`, which is the
 * single seam a real session will fill instead.
 *
 * BACKEND CONTRACT: when the API issues sessions, the account→member mapping
 * moves server-side and this constant is deleted. Nothing above the auth service
 * changes. See docs/ai/BACKEND_CONTRACTS.md.
 */
export const SEEDED_STUDENT_MEMBER_ID = "stu-1001";

/**
 * Equipa Técnica is a club founded inside the school, so every internship it runs is
 * hosted by the school itself. This is the single source of truth for the host entity
 * printed on the FCT document set — internships can never be assigned elsewhere.
 */
export const SCHOOL_NAME = "Escola Secundária Augusto Cabrita";
export const INTERNSHIP_HOST_ENTITY = SCHOOL_NAME;

/**
 * Schools a member can be enrolled at. Equipa Técnica hosts FCT interns from other
 * schools, so the roster is not limited to our own students — but the host entity
 * above is always us. Members enrolled elsewhere are flagged `isExternal`, which
 * relaxes the course/class/year requirements (those come from their own school).
 */
export const PARTNER_SCHOOLS = [
  "Escola Secundária de Barreiro",
  "Escola Secundária Alfredo dos Reis Silveira",
  "Escola Profissional Bento de Jesus Caraça",
  "Escola Secundária de Palmela",
];

/** Sentinel that switches the origin-school select into a free-text input. */
export const OTHER_SCHOOL_VALUE = "__other__";

export const SCHOOL_OPTIONS = [
  { label: `${SCHOOL_NAME} (this school)`, value: SCHOOL_NAME },
  ...PARTNER_SCHOOLS.map((value) => ({ label: value, value })),
  { label: "Other school…", value: OTHER_SCHOOL_VALUE },
];

export function isExternalSchool(originSchool: string): boolean {
  return originSchool.trim().length > 0 && originSchool !== SCHOOL_NAME;
}
