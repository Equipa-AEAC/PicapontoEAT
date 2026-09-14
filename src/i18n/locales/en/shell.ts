/** The application frame: brand panel, topbar, profile menu, shell dialogs. */
export default {
  brand: {
    name: "Pica Ponto",
    admin: "Administration",
    student: "Student portal",
  },

  workspace: {
    admin: "Administration workspace",
    student: "Student workspace",
    adminNav: "Admin workspace",
    studentNav: "Student workspace",
    openAdmin: "Open admin",
  },

  topbar: {
    toggleNavigation: "Toggle navigation",
    switchToLight: "Switch to light theme",
    switchToDark: "Switch to dark theme",
    languageLabel: "Change language",
  },

  profile: {
    menu: "Account menu",
    myProfile: "My profile",
    settings: "Settings",
    about: "About",
    logout: "Sign out",
    noEmail: "No email on file",
    fallbackName: "User",
  },

  role: {
    administrator: "Administrator",
    student: "Student",
    user: "User",
  },

  logout: {
    title: "Sign out?",
    message: "This clears your session and returns you to the sign-in screen.",
    confirm: "Sign out",
  },

  about: {
    title: "About Pica Ponto",
    body: "Attendance and member management for the school's internships and technical team.",
    version: "Version: development build",
  },
} as const;
