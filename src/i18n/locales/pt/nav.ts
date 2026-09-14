/**
 * Entradas da barra lateral e títulos de página, indexados pelo nome da rota.
 *
 * Terminologia fixada aqui: "Painel" (Dashboard), "Assiduidade" (Attendance),
 * "Diário de Bordo" (Daily report — o termo usado nos estágios das escolas
 * portuguesas), "Estágios" (Internships), "Definições" (Settings),
 * "Utilizadores" (contas de pessoal) por oposição a "Membros" (a lista de
 * alunos e da Equipa Técnica).
 */
export default {
  /* ------------------------------------------------------------- Aluno */
  "student-dashboard": { label: "Painel", description: "Vista geral pessoal" },
  "student-attendance": { label: "Assiduidade", description: "Registos diários e estado" },
  "student-worked-hours": { label: "Horas realizadas", description: "Progresso do estágio, horas e marcos" },
  "student-calendar": { label: "Calendário", description: "Os seus dias, eventos e prazos" },
  "student-project-management": { label: "Gestão de projetos", description: "Projetos e tarefas" },
  "student-projects": { label: "Projetos", description: "Os projetos em que participa. Abra um para trabalhar no quadro" },
  "student-tasks": { label: "As minhas tarefas", description: "Tudo o que lhe foi atribuído, do mais urgente para o menos" },
  "student-project-detail": { label: "Projeto", description: "Quadro, tarefas e atividade de um projeto" },
  "student-daily-log": { label: "Diário de Bordo", description: "Registe o que fez hoje" },
  "student-reports": { label: "Relatórios de estágio", description: "Relatórios mensais e final" },
  "student-certificates": { label: "Certificados", description: "Peça e transfira os seus comprovativos" },
  "student-moments": { label: "Momentos da equipa", description: "As fotografias de hoje da equipa" },
  "student-announcements": { label: "Avisos", description: "Últimos avisos dirigidos a si" },
  "student-profile": { label: "Perfil", description: "Informação pessoal" },
  "student-settings": { label: "Definições", description: "Preferências do portal" },

  /* ---------------------------------------------------------- Administração */
  dashboard: { label: "Painel", description: "Vista geral da operação" },
  members: { label: "Membros", description: "Alunos e Equipa Técnica" },
  "member-details": { label: "Detalhes do membro", description: "Perfil e detalhe do estágio" },
  "member-attendance-history": { label: "Histórico de assiduidade", description: "Registos detalhados por membro" },
  cards: { label: "Cartões", description: "Inventário e atribuição de cartões RFID" },
  attendance: { label: "Assiduidade", description: "Leituras, validações e histórico" },
  calendar: { label: "Calendário", description: "Assiduidade, eventos da equipa e prazos por dia" },
  internships: { label: "Estágios", description: "Colocações de FCT e horas excedentes" },
  "project-management": { label: "Gestão de projetos", description: "Projetos, tarefas e equipa" },
  "projects-overview": { label: "Vista geral", description: "Progresso, prazos e carga de trabalho num relance" },
  projects: { label: "Projetos", description: "Todos os projetos em curso" },
  "project-details": { label: "Projeto", description: "Tarefas, equipa e atividade de um projeto" },
  "project-tasks": { label: "Tarefas", description: "Trabalho em todos os projetos" },
  "project-team": { label: "Equipa", description: "Quem está atribuído a quê, e com que carga" },
  "project-activity": { label: "Atividade", description: "Tudo o que aconteceu nos projetos" },
  "team-moments": { label: "Momentos da equipa", description: "As fotografias de hoje da oficina e dos laboratórios" },
  reports: { label: "Relatórios", description: "Relatórios de estágio mensais e finais por rever" },
  announcements: { label: "Avisos", description: "Avisos dirigidos aos membros" },
  certificates: { label: "Certificados", description: "Comprovativos emitidos" },
  devices: { label: "Dispositivos", description: "Estado dos terminais e firmware" },
  audit: { label: "Auditoria", description: "Registos e ações do sistema" },
  users: { label: "Utilizadores", description: "Contas de pessoal com acesso ao sistema" },
  settings: { label: "Definições", description: "Configuração do sistema e acessos" },

  /* --------------------------------------------------------- Autenticação */
  login: { label: "Iniciar sessão", description: "Escolha a sua área de trabalho" },
} as const;
