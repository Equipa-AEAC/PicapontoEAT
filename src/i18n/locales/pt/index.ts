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
 * Mensagens em português europeu.
 *
 * Espelha `locales/en` ficheiro a ficheiro e chave a chave. Português é a
 * língua por omissão do produto; o inglês é o recurso quando falta uma chave.
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
