export default {
  /** Why a control is disabled, shown in its tooltip. */
  permissions: {
    signInAsStaff: "Sign in with a staff account to perform this action.",
    accountLacks: "This account does not have that permission.",
    roleDisallows: "Your {role} role does not allow this action.",
  },
  tagline: "RFID attendance platform",
  logoAlt: "School logo",
  email: "Email",
  /*
   * `@` starts vue-i18n's linked-message syntax, so a literal one has to be
   * escaped as `{'@'}` or the message fails to compile — which blanks the whole
   * screen rather than showing the wrong text. This is the only message in the
   * product that contains one.
   */
  emailPlaceholder: "name{'@'}school.local",
  password: "Password",
  passwordPlaceholder: "Your password",
  rememberMe: "Keep me signed in",
  forgotPassword: "Forgot your password?",
  recoveryHint:
    "Passwords are reset by the coordination team. Ask them in person, or write to {email} from your school address.",
  signIn: "Sign in",
  version: "Version {version}",
  failed: "Could not sign in. Check the email and password.",
} as const;
