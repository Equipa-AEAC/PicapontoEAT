import admin from "./admin";
import auth from "./auth";
import common from "./common";
import components from "./components";
import errors from "./errors";
import nav from "./nav";
import projects from "./projects";
import projectsAdmin from "./projectsAdmin";
import shell from "./shell";
import student from "./student";
import vocabulary from "./vocabulary";

/**
 * English messages.
 *
 * Split by domain so the file you edit is the one that owns the screen you are
 * changing, and so `pt/` can stay a line-for-line mirror of `en/`. The key tree
 * must be identical in both languages — a key that exists here and not in `pt`
 * falls back to English at runtime rather than failing, which is safe but is
 * still a gap worth closing.
 */
export default {
  common,
  nav,
  shell,
  auth,
  /* `projectsAdmin` is merged in rather than kept apart: it is the same
   * vocabulary for a different audience, and splitting the tree would invite two
   * translations of "task". */
  projects: { ...projects, admin: projectsAdmin },
  admin,
  student,
  components,
  vocabulary,
  errors,
};
