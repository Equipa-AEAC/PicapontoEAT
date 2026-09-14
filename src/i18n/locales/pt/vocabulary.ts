/**
 * Todos os valores enumerados a que o produto dá um nome.
 *
 * Um único ficheiro, porque são estas as palavras que não podem divergir: "Em
 * revisão" tem de se ler da mesma maneira no quadro, na fila de relatórios e num
 * filtro.
 *
 * Decisões de terminologia (português europeu):
 * - "Assiduidade" para *attendance* — é o termo escolar, ao contrário de
 *   "Frequência", que se confunde com a frequência de um curso.
 * - "FCT" (Formação em Contexto de Trabalho) mantém-se: é o nome oficial do
 *   estágio curricular português e traduzi-lo tornaria o produto menos claro.
 * - "RFID", "firmware", "beta" e "edge" ficam em inglês por serem nomes próprios
 *   de tecnologias ou de canais de distribuição.
 * - "Equipa Técnica" é o nome da equipa da escola e não se traduz.
 */
export default {
  attendanceStatus: {
    present: "Presente",
    late: "Atrasado",
    missing: "Em falta",
    corrected: "Corrigido",
  },

  attendanceCorrectionReason: {
    "forgot-to-check-out": "Esqueceu-se de registar a saída",
    "wrong-device": "Dispositivo errado",
    "duplicate-scan": "Leitura duplicada",
    "manual-entry": "Introdução manual",
  },

  /**
   * As linhas a que um registo de auditoria pode dizer respeito, e o que lhes
   * foi feito. O registo guarda-as como substantivos da base de dados; a
   * interface imprimia-as tal e qual.
   */
  auditEntity: {
    attendance: "Registo de assiduidade",
    "attendance-correction": "Pedido de correção",
    "calendar-event": "Evento de calendário",
    card: "Cartão",
    certificate: "Certificado",
    "certificate-request": "Pedido de certificado",
    device: "Dispositivo",
    "final-report": "Relatório final",
    "monthly-report": "Relatório mensal",
    "participation-period": "Período de participação",
    "profile-change-request": "Pedido de alteração de perfil",
    project: "Projeto",
    "project-task": "Tarefa",
    user: "Conta",
    member: "Membro",
  },

  auditAction: {
    CREATE: "Criado",
    UPDATE: "Atualizado",
    DELETE: "Removido",
  },

  memberStatus: {
    active: "Ativo",
    inactive: "Inativo",
    pending: "Pendente",
    graduated: "Concluiu o curso",
  },

  memberInternshipStatus: {
    "not-assigned": "Sem colocação",
    "in-progress": "Em estágio",
    complete: "Estágio concluído",
  },

  participationKind: {
    "team-member": "Equipa Técnica",
    internship: "Estágio",
  },

  participationCredit: {
    "team-member": "Conta para a declaração de horas excedentes",
    internship: "Conta para as horas exigidas de FCT",
  },

  correctionStatus: {
    pending: "A aguardar análise",
    approved: "Aprovado",
    rejected: "Sem alteração",
    withdrawn: "Retirado",
  },

  correctionKind: {
    "missing-entry": "Falta o registo de entrada",
    "missing-exit": "Falta o registo de saída",
    "wrong-times": "As horas estão erradas",
    "wrong-day": "Não estive presente neste dia",
    "not-mine": "Este registo não é meu",
  },

  correctionKindShort: {
    "missing-entry": "Entrada em falta",
    "missing-exit": "Saída em falta",
    "wrong-times": "Horas erradas",
    "wrong-day": "Dia errado",
    "not-mine": "Registo alheio",
  },

  reportStatus: {
    draft: "Rascunho",
    submitted: "Em análise",
    approved: "Aprovado",
    rejected: "Devolvido para correção",
  },

  dailyLogStatus: {
    draft: "Rascunho",
    submitted: "Submetido",
  },

  reportType: {
    attendance: "Assiduidade",
    "team-hours": "Horas de equipa (excedentes)",
    internship: "Estágio (FCT)",
    project: "Execução de projetos",
    student: "Membro",
    device: "Dispositivo",
  },

  internshipStatus: {
    planned: "Planeado",
    active: "Em curso",
    paused: "Suspenso",
    complete: "Concluído",
  },

  certificateKind: {
    surplus: "Declaração de horas excedentes",
    fct: "Certificado de estágio (FCT)",
  },

  certificateRequestStatus: {
    requested: "A aguardar análise",
    approved: "Aprovado",
    rejected: "Rejeitado",
  },

  announcementAudience: {
    all: "Todos",
    "equipa-hours": "Membros com horas excedentes",
    "official-internship": "Estagiários oficiais",
  },

  announcementStatus: {
    draft: "Rascunho",
    published: "Publicado",
    archived: "Arquivado",
  },

  announcementPriority: {
    normal: "Normal",
    important: "Importante",
    urgent: "Urgente",
  },

  calendarVisibility: {
    personal: "Só eu",
    team: "Toda a equipa",
    project: "Pessoas de um projeto",
  },

  calendarVisibilityHint: {
    personal: "Mais ninguém vê isto.",
    team: "Todos os membros da Equipa Técnica veem no calendário.",
    project: "Apenas as pessoas atribuídas ao projeto que escolher.",
  },

  calendarCategory: {
    session: "Sessão de trabalho",
    meeting: "Reunião",
    deadline: "Prazo",
    other: "Outro",
  },

  momentReportReason: {
    inappropriate: "Conteúdo inadequado",
    "wrong-person": "Mostra alguém que não deu consentimento",
    "not-work-related": "Não tem que ver com o trabalho da equipa",
    other: "Outro",
  },

  deviceStatus: {
    online: "Ligado",
    offline: "Desligado",
    warning: "Com aviso",
    maintenance: "Em manutenção",
  },

  firmwareChannel: {
    // Nomes de canais de distribuição: mantêm-se em inglês.
    stable: "Stable",
    beta: "Beta",
    edge: "Edge",
  },

  cardStatus: {
    available: "Disponível",
    assigned: "Atribuído",
    inactive: "Inativo",
    replaced: "Substituído",
  },

  userRole: {
    administrator: "Administrador",
    coordinator: "Coordenador",
    teacher: "Professor",
    viewer: "Consulta",
  },

  userRoleDescription: {
    administrator: "Controlo total, incluindo criar e desativar outras contas.",
    coordinator:
      "Gere a lista de membros no dia a dia: edita contas e repõe palavras-passe, mas não pode criá-las nem desativá-las.",
    teacher: "Apenas consulta de membros, assiduidade e relatórios.",
    viewer: "Apenas consulta de relatórios e painéis.",
  },

  permission: {
    "users:create": "Criar contas",
    "users:update": "Editar contas",
    "users:reset-password": "Repor palavras-passe",
    "users:deactivate": "Desativar e reativar contas",
    "members:grant-access": "Dar acesso a membros da lista",
    "settings:update": "Alterar definições do sistema",
  },

  weekday: {
    monday: "Segunda-feira",
    tuesday: "Terça-feira",
    wednesday: "Quarta-feira",
    thursday: "Quinta-feira",
    friday: "Sexta-feira",
    saturday: "Sábado",
    sunday: "Domingo",
  },

  program: {
    "equipa-hours": "Equipa Técnica — horas excedentes",
    "official-internship": "Estágio oficial (FCT)",
  },
} as const;
