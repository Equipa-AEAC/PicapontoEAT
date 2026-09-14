export default {
  /** Porque é que um controlo está desativado, mostrado na dica. */
  permissions: {
    signInAsStaff: "Inicie sessão com uma conta de funcionário para executar esta ação.",
    accountLacks: "Esta conta não tem essa permissão.",
    roleDisallows: "O seu perfil {role} não permite esta ação.",
  },
  // "RFID" mantém-se em inglês: é o nome da tecnologia, não um termo traduzível.
  tagline: "Plataforma de assiduidade RFID",
  logoAlt: "Logótipo da escola",
  email: "Email",
  /*
   * `@` starts vue-i18n's linked-message syntax, so a literal one has to be
   * escaped as `{'@'}` or the message fails to compile — which blanks the whole
   * screen rather than showing the wrong text. This is the only message in the
   * product that contains one.
   */
  emailPlaceholder: "nome{'@'}escola.local",
  password: "Palavra-passe",
  passwordPlaceholder: "A sua palavra-passe",
  rememberMe: "Manter a sessão iniciada",
  forgotPassword: "Esqueceu-se da palavra-passe?",
  recoveryHint:
    "As palavras-passe são repostas pela equipa de coordenação. Peça pessoalmente ou escreva para {email} a partir do email da escola.",
  signIn: "Iniciar sessão",
  version: "Versão {version}",
  failed: "Não foi possível iniciar sessão. Verifique o email e a palavra-passe.",
} as const;
