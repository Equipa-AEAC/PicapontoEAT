export default {
  attendance: {
    title: "Assiduidade",
    description:
      "Todos os dias registados com o seu cartão e a participação em que cada um contou. Se algo estiver errado, diga-o aqui.",
    allMonths: "Todos os meses",
    notRecorded: "Sem registo",
    since: "desde {date}",
    noPeriodYet: "Ainda não há nenhum período de participação registado",

    metricParticipation: "Participação atual",
    metricTeamHours: "Horas de Equipa Técnica",
    metricTeamHoursCaption: "Trabalho voluntário — conta para a declaração de horas excedentes",
    metricInternshipHours: "Horas de estágio",
    metricInternshipHoursCaption: "Contam para as horas exigidas de FCT",
    metricWaiting: "A aguardar análise",
    metricWaitingCaption: "Dias que comunicou e a que ninguém respondeu",
    metricNothingWaiting: "Não tem nada por responder",

    unclassifiedTitle: "Dias sem participação atribuída",
    unclassifiedDescription:
      "{count} dia do seu registo está fora de qualquer período de participação, por isso {hours} não contam para nenhum certificado. Peça à equipa de coordenação para registar o período que o cobre. | {count} dias do seu registo estão fora de qualquer período de participação, por isso {hours} não contam para nenhum certificado. Peça à equipa de coordenação para registar o período que os cobre.",

    waitingTitle: "A aguardar análise",
    waitingDescription: "Comunicou estes dias. Ainda ninguém respondeu.",
    sent: "Enviado {time}",
    withdraw: "Retirar",

    answeredTitle: "Respondidos",
    answeredDescription: "O que a equipa de coordenação decidiu sobre os dias que comunicou.",
    recordCorrected: "O registo foi corrigido.",
    noNote: "Não foi deixada nenhuma nota.",
    recordUpdated: "registo atualizado",

    recordTitle: "O seu registo",
    recordDescription: "{days} dia · {hours} em {scope} | {days} dias · {hours} em {scope}",
    scopeAll: "todo o seu registo",
    scopeMonth: "o mês selecionado",
    emptyTitle: "Ainda não há nada registado",
    emptyAll: "As suas entradas aparecem aqui assim que passar o cartão num terminal.",
    emptyMonth: "Não foram registados dias no mês que escolheu.",
    reported: "Comunicado",
    reportProblem: "Comunicar um problema",
    footerNote:
      "Comunicar um dia envia-o para a equipa de coordenação. Só ela pode alterar um registo de assiduidade.",
  },

  workedHours: {
    chartCompleted: "Feitas",
    chartRemaining: "Em falta",
    title: "Horas realizadas",
    description: "O progresso do seu estágio: horas feitas, horas em falta e os marcos que já atingiu.",
    internshipHours: "Horas de estágio",
    internshipHoursCaption: "Contam para as horas exigidas de FCT",
    teamHours: "Horas de Equipa Técnica",
    teamHoursCaption: "Trabalho voluntário — não conta para o estágio",
    stillRequired: "Ainda em falta",
    stillRequiredCaption: "Horas de estágio que faltam para concluir a colocação",
    progress: "Progresso do estágio",
    progressCaption: "{done} de {required} exigidas",

    participationTitle: "A sua participação",
    participationDescription:
      "O que faz agora e o que fez antes. Cada período mantém as horas que ganhou durante ele.",
    currently: "Atualmente",
    since: "desde {date}",

    weeklyTitle: "Horas por semana",
    weeklyDescription: "As suas últimas dez semanas registadas, cada barra identificada pela segunda-feira em que começa.",
    weeklyEmptyTitle: "Sem assiduidade registada",
    weeklyEmptyDescription: "Assim que começar a passar o cartão, a sua carga semanal aparece aqui.",
    weeklySeries: "Horas",

    splitTitle: "Repartição do progresso do estágio",
    splitDescription: "Horas de estágio face ao exigido. As horas de voluntariado não entram nesta conta.",

    milestonesTitle: "Marcos",
    milestonesDescription: "Conquistas alcançadas à medida que o estágio avança.",
    milestonesEmptyTitle: "Ainda não há marcos",
    milestonesEmptyDescription: "Os marcos são atribuídos à medida que acumula horas de estágio.",

    recentTitle: "Assiduidade recente",
    recentDescription: "Os seus dias registados mais recentes.",
    recentEmptyTitle: "Sem registos de assiduidade",
    recentEmptyDescription: "As suas entradas aparecem aqui assim que passar o cartão num terminal.",
    colEntry: "Entrada",
    colExit: "Saída",
    notRecorded: "Sem registo",
  },

  calendar: {
    title: "Calendário",
    description: "O seu mês: os dias registados, o trabalho a entregar e o que a equipa tem planeado.",
    addEvent: "Criar evento",
    summary: "{days} dia · {hours} · {events} evento | {days} dias · {hours} · {events} eventos",
    legendEvents: "Eventos",
    legendTasks: "Tarefas a terminar",

    pickDay: "Escolha um dia",
    dayDescription: "Tudo o que ficou registado neste dia.",
    pickDayDescription: "Escolha um dia no calendário para ver o que aconteceu.",
    noDayTitle: "Nenhum dia selecionado",
    noDayDescription:
      "Clique em qualquer dia do calendário — mesmo num sem nada — para ver o que ficou registado.",

    attendance: "Assiduidade",
    openAttendance: "Abrir o registo de assiduidade",
    futureDay: "Um dia que ainda está para vir — sem registos.",
    noScan: "Não houve nenhuma leitura de cartão neste dia.",

    dailyReport: "Diário de Bordo",
    openDraft: "Abrir o rascunho",
    openInDailyReport: "Abrir no Diário de Bordo",
    noEntry: "Ainda não escreveu nada para este dia.",
    entryLater: "Pode escrever o registo depois de o dia ter passado.",
    nothingToReport: "Não foram registadas horas, por isso não há nada a registar neste dia.",
    writeEntry: "Escrever o registo deste dia",

    dueToday: "A terminar hoje",
    openBoard: "{project} · abrir o quadro",

    events: "Eventos",
    editEvent: "Editar evento",
    removeEvent: "Remover evento",
    nothingPlanned: "Não há nada planeado para este dia.",
    addEventOnDay: "Criar um evento neste dia",
    removeEventTitle: "Remover evento",
    removeEventMessage: "O evento é removido do seu calendário e do de todas as pessoas com quem foi partilhado.",
  },

  announcements: {
    title: "Avisos",
    description: "Avisos para todos, mais os que são dirigidos à sua participação.",
    search: "Pesquisar avisos",
    unreadCount: "{count} por ler",
    unread: "Por ler",
    read: "Lido {time}",
    emptyTitle: "Não há nada para ler",
    emptySearch: "Nenhum aviso corresponde ao que pesquisou.",
    emptyDescription: "Os avisos da equipa de coordenação aparecem aqui.",
  },

  profile: {
    title: "Perfil",
    description: "O que a escola tem registado sobre si e como pedir alterações.",
    unavailableTitle: "Perfil indisponível",
    unavailableDescription:
      "Não foi possível carregar o seu perfil. Tente novamente ou peça à equipa de coordenação para verificar o seu registo.",

    noPlacement: "Sem colocação",
    internshipProgress: "Progresso do estágio",
    progressSplit: "{done} feitas · {remaining} em falta",

    studentNumber: "Número de aluno",
    orientador: "Orientador de Estágio",
    orientadorNote: "Na escola onde está matriculado",
    monitor: "Monitor de Estágio",
    monitorNote: "Na Equipa Técnica",

    waitingTitle: "A aguardar análise",
    waitingDescription:
      "Pediu estas alterações. O seu registo continua a mostrar o valor antigo até alguém aprovar.",
    newPicture: "Uma nova fotografia",
    sent: "Enviado {time} · {reason}",

    answeredTitle: "Respondidos",
    answeredDescription: "O que a equipa de coordenação decidiu sobre as alterações que pediu.",
    recordUpdatedNote: "O seu registo foi atualizado.",
    noNote: "Não foi deixada nenhuma nota.",
    recordUpdated: "registo atualizado",

    identityTitle: "Identificação",
    identityDescription:
      "Mantida pela escola. Os contactos e a fotografia podem ser alterados a pedido; os campos académicos são corrigidos pela escola.",
    requested: "Pedido",
    requestChange: "Pedir alteração",
    photoOnFile: "Registada",
    photoMissing: "Sem fotografia registada",

    supervisionTitle: "Acompanhamento",
    supervisionDescription: "As duas pessoas que acompanham o seu estágio.",

    shortcutsTitle: "O que pode fazer",
    shortcutsDescription: "O seu registo é apenas de consulta. Estas são as páginas onde pode agir.",
    shortcutEntry: "Escrever o registo de hoje",
    shortcutEntryHint: "O seu diário de trabalho",
    shortcutHours: "Ver as suas horas",
    shortcutHoursHint: "Feitas e em falta",
    shortcutAttendance: "Registo de assiduidade",
    shortcutAttendanceHint: "Entradas dia a dia",
    shortcutReports: "Relatórios de estágio",
    shortcutReportsHint: "Mensais e final",

    fieldEmail: "Endereço de email",
    fieldPhone: "Número de telemóvel",
    fieldPhoto: "Fotografia de perfil",
    hintEmail: "Onde a equipa de coordenação lhe escreve.",
    hintPhone: "Usado para o contactar sobre assiduidade e estágio.",
    hintPhoto: "Aparece junto ao seu nome em toda a aplicação.",

    duplicateRequest: "Já tem um pedido de {field} a aguardar análise.",

    changeStatus: {
      pending: "A aguardar análise",
      approved: "Aprovado",
      rejected: "Rejeitado",
      withdrawn: "Retirado",
    },
  },

  reports: {
    title: "Relatórios de estágio",
    description: "O balanço mensal e o relatório final, ambos construídos a partir dos registos diários que escreveu.",
    newReport: "Novo relatório",
    tabMonthly: "Relatórios mensais",
    tabFinal: "Relatório final",

    metricEntries: "Registos do diário",
    metricEntriesCaption: "A matéria-prima de que todos os relatórios são feitos",
    metricHours: "Horas registadas",
    metricHoursCaption: "Soma de todos os registos diários que escreveu",
    metricDrafts: "Rascunhos",
    metricDraftsCaption: "Guardados mas não submetidos — ainda pode editá-los",
    metricNoDrafts: "Não há nada a meio",
    metricReturned: "Devolvidos",
    metricReturnedCaption: "Analisados e devolvidos para alterações",
    metricNothingReturned: "Não foi devolvido nada",

    balanceTitle: "Balanço mensal de {month}",
    balanceDescription: "{from} a {to} · {entries} registos · {hours}",
    editing: "A editar",
    generatedPreview: "Pré-visualização gerada",
    generatedNote:
      "Isto é o que os seus registos diários produziram, tal como foram escritos. Use {edit} se precisar de alterar antes de guardar.",
    activitiesDone: "Atividades realizadas",
    activitiesEmptyTitle: "Não há atividades neste período",
    activitiesEmptyDescription:
      "Nenhum registo diário cai dentro das datas que escolheu. Ajuste o período ou escreva primeiro os registos.",
    onePerLine: "Uma atividade por linha",
    activitiesPlanned: "Atividades previstas para o período seguinte",
    nothingPlanned: "Ainda não há nada previsto — acrescente com Editar.",
    difficulties: "Principais dificuldades sentidas",
    discard: "Descartar",
    regenerate: "Voltar a gerar a partir dos meus registos",
    saveDraft: "Guardar rascunho",

    listTitle: "Os seus relatórios mensais",
    listDescription:
      "Um rascunho continua seu para editar. Depois de submetido fica com a equipa de coordenação até haver resposta.",
    listEmptyTitle: "Ainda não há relatórios mensais",
    listEmptyDescription:
      "Um relatório mensal é o balanço do trabalho de um mês, feito a partir dos seus registos diários. Crie o primeiro quando um mês estiver completo.",
    colPeriod: "Período",
    colEntries: "Registos",
    colSubmitted: "Submetido",
    continueEditing: "Continuar a editar",
    reopenAndRevise: "Reabrir e corrigir",
    withReviewer: "Com quem analisa",
    approvedBy: "Aprovado por {name}",
    theCoordinationTeam: "a equipa de coordenação",

    finalTitle: "Relatório final de estágio",
    finalDescription:
      "Secção a secção, seguindo o Relatório de Estágio entregue no fim da colocação.",
    finalReturned: "Devolvido para correção por {name}: {note}",
    finalNoNote: "não foi deixada nenhuma nota.",
    finalApproved: "Este relatório foi aprovado e é final.",
    finalLocked: "Este relatório está com a equipa de coordenação. Não pode ser editado enquanto o analisam.",
    periodStarts: "Início do período",
    periodEnds: "Fim do período",
    placementRuns: "O seu estágio decorre de {from} a {to} em {host}.",
    fillFromJournal: "Preencher a partir do meu diário",
    submitFinal: "Submeter relatório final",

    submitMonthlyTitle: "Submeter relatório mensal",
    submitFinalTitle: "Submeter relatório final",
    submitMessage:
      "Vai para análise da equipa de coordenação. Só o poderá editar outra vez se lho devolverem.",

    /* Títulos das secções do dossiê oficial. Ficam iguais nas duas línguas: são
     * os nomes das secções do documento regulamentado. */
    sectionCompany: "Caracterização da empresa",
    sectionActivities: "Atividades realizadas no estágio",
    sectionDifficulties: "Dificuldades sentidas na concretização das atividades",
    sectionLearnings: "Novas aprendizagens",
    sectionIncidents: "Ocorrências durante o estágio",
    sectionOther: "Outros",
  },

  settings: {
    title: "Definições",
    description: "Como o portal se apresenta e comporta neste dispositivo, e a conta com que iniciou sessão.",

    appearanceTitle: "Aspeto",
    appearanceDescription: "Aplica-se só a este dispositivo e fica guardado para a próxima vez que entrar aqui.",
    themeGroup: "Tema de cor",
    themeLight: "Claro",
    themeLightHint: "Melhor numa sala com luz",
    themeDark: "Escuro",
    themeDarkHint: "Melhor no laboratório",
    themeSystem: "Igual ao sistema",
    themeSystemHint: "Acompanha o seu dispositivo",

    languageTitle: "Idioma",
    languageDescription:
      "O idioma de toda a interface. Fica guardado neste dispositivo, por isso acompanha-o entre sessões.",

    alertsTitle: "Alertas",
    alertsDescription:
      "O que o portal lhe assinala no painel. Nada aqui envia email ou mensagem — o portal não tem entrega própria, por isso isto decide apenas o que lhe é mostrado quando entra.",

    sidebarTitle: "Ordem da barra lateral",
    sidebarDescription:
      "Ponha em cima as páginas que mais usa. Não é possível remover páginas — isto muda apenas a ordem.",
    sidebarDefault: "Está na ordem por omissão.",
    sidebarCustom: "Está a usar a sua própria ordem.",

    accessTitle: "Acesso",
    accessDescription: "A sua palavra-passe é emitida pela escola e reposta presencialmente.",
    moveUp: "Subir {label}",
    moveDown: "Descer {label}",
    resetOrder: "Repor a ordem por omissão",
    signedInAs: "Sessão iniciada como",
    accessNote:
      "Para repor a palavra-passe, fale com a equipa de coordenação — não há reposição automática.",
    thisAccount: "esta conta",
    storedLocally:
      "O aspeto, o idioma, os alertas e a ordem da barra lateral ficam guardados neste navegador e não na sua conta, por isso iniciar sessão noutro computador começa outra vez pelas predefinições.",
    openProfile: "Abrir o meu perfil",
  },

  moments: {
    galleryDescription:
      "O que a equipa está a fazer hoje. As fotografias desaparecem {hours} horas depois de publicadas.",
    title: "Momentos da equipa",
    emptyTitle: "Ainda não foi publicado nada hoje",
    emptyDescription: "Mostre o que está a fazer — a oficina, uma reparação, um projeto a ganhar forma.",
    emptyAction: "Publicar o primeiro momento",
    removeTitle: "Remover o seu momento",
    removeMessage: "Esta fotografia é removida da galeria de imediato.",
    reportTitle: "Denunciar este momento",
    reportSubtitle: "Um administrador vai analisar. A fotografia continua visível até haver decisão.",
    reportConfirm: "Enviar denúncia",
    reportReason: "Motivo",
    reportNote: "Mais alguma coisa que o administrador deva saber",
    reportNotePlaceholder: "Opcional",
  },

  alertCategory: {
    "attendance-corrections": "Pedidos de correção de assiduidade",
    "report-reviews": "Decisões sobre relatórios de estágio",
    "certificate-requests": "Pedidos de certificado",
    "profile-requests": "Pedidos de alteração de perfil",
    announcements: "Avisos",
    "task-deadlines": "Prazos de tarefas",
  },

  alertHint: {
    "attendance-corrections": "Quando um dia que comunicou é aprovado ou rejeitado.",
    "report-reviews": "Quando um relatório mensal ou final é aprovado ou devolvido.",
    "certificate-requests": "Quando um certificado que pediu é aprovado ou rejeitado.",
    "profile-requests": "Quando é decidida uma alteração ao seu email, telemóvel ou fotografia.",
    announcements: "Quando a equipa de coordenação publica algo dirigido a si.",
    "task-deadlines": "Quando uma tarefa sua está a terminar ou já está atrasada.",
  },

  dailyLog: {
    draftCount: "1 rascunho | {count} rascunhos",
    title: "Diário de Bordo",
    description:
      "Registe o que fez em cada dia. Estes registos alimentam os relatórios mensais e o relatório final de estágio.",
    newEntry: "Novo registo",
    allStatuses: "Todos os estados",
    allMonths: "Todos os meses",
    noProject: "Sem projeto",
    search: "Pesquisar nos seus registos",

    metricEntries: "Registos",
    metricEntriesCaption: "Dias registados no diário",
    metricSubmitted: "Submetidos",
    metricSubmittedCaption: "Já não podem ser editados",
    metricHours: "Horas registadas",
    metricHoursCaption: "Soma de todos os registos diários",
    metricLast: "Último registo",
    metricLastCaption: "Dia mais recente escrito",

    journalTitle: "Diário de Bordo",
    journalDescription: "Os rascunhos ainda podem ser editados. Submeter um registo fecha-o para o orientador.",
    emptyTitle: "Ainda não há registos",
    emptyDescription: "Registe o seu primeiro dia para começar a construir o diário.",

    colProject: "Projeto",
    colActivities: "Atividades",
    colDifficulties: "Dificuldades",

    dialogNew: "Novo registo diário",
    dialogEdit: "Editar registo diário",
    dialogSubtitle: "Descreva o dia como o faria no dossiê de estágio.",
    dialogConfirm: "Guardar registo",
    fieldDate: "Data *",
    fieldHours: "Horas trabalhadas *",
    fieldProject: "Projeto",
    projectHint: "Opcional, mas permite ao clube ver quanto tempo cada projeto realmente levou.",
    fieldActivities: "Atividades realizadas *",
    fieldLearnings: "Novas aprendizagens",
    fieldDifficulties: "Dificuldades sentidas",

    submitTitle: "Submeter registo",
    submitMessage: "Depois de submetido, o registo já não pode ser editado.",
    deleteTitle: "Eliminar registo",
    deleteMessage: "Este registo diário é removido do seu diário.",
  },

  certificates: {
    reasonNoTeamHours:
      "Ainda não tem horas dentro de um período de Equipa Técnica. É o trabalho voluntário que este certificado atesta.",
    reasonPlacementIncomplete: "Disponível assim que a equipa de coordenação der o estágio por concluído.",
    title: "Certificados",
    description:
      "A que a sua participação lhe dá direito, como pedir e onde transferir depois de emitido.",
    metricTeamHours: "Horas de Equipa Técnica",
    metricTeamHoursCaption: "Trabalho voluntário — é o que a declaração de horas excedentes atesta",
    metricInternshipHours: "Horas de estágio",
    metricInternshipHoursCaption: "Tempo de FCT — contado à parte",
    metricAvailable: "Disponíveis para transferir",
    metricAvailableCaption: "Emitidos e prontos",
    metricNothingIssued: "Ainda não foi emitido nada",

    availableTitle: "Disponíveis para si",
    availableDescription:
      "Com base nos períodos de participação registados na sua assiduidade. Só aparecem aqui os certificados que o seu registo suporta.",
    surplusDescription: "Atribuída pelo trabalho voluntário como membro da Equipa Técnica.",
    fctDescription: "O certificado oficial, atribuído quando o estágio estiver concluído.",
    waitingForReview: "A aguardar análise",
    issued: "Emitido",
    canRequest: "Pode pedir",
    notYet: "Ainda não",
    sentOn: "Enviado {time}. A equipa de coordenação vai responder.",
    requestUpdated: "Pedir uma cópia atualizada",
    requestCertificate: "Pedir certificado",
    alreadyRequested: "Já pedido.",

    issuedTitle: "Os seus certificados",
    issuedDescription: "Documentos emitidos, prontos a transferir.",
    issuedEmptyTitle: "Ainda não foi emitido nada",
    issuedEmptyDescription:
      "Quando a equipa de coordenação aprovar um pedido, o certificado aparece aqui com o período que abrange e uma ligação para transferir.",
    issuedOn: "{hours} · emitido {time}",
    countersigned: "Cópia assinada anexada {time}",
    signed: "Assinado",

    answeredTitle: "Pedidos respondidos",
    answeredDescription: "O que a equipa de coordenação decidiu sobre os certificados que pediu.",
    noNote: "Não foi deixada nenhuma nota.",

    requestTitle: "Pedir {kind}",
    requestSubtitle: "A equipa de coordenação analisa o pedido. É a aprovação que gera o documento.",
    requestConfirm: "Enviar pedido",
    requestAttests: "O certificado vai atestar {hours} registadas na sua {source}.",
    sourceSurplus: "participação na Equipa Técnica",
    sourceFct: "colocação de FCT",
    requestNote: "Algo que a pessoa que analisa deva saber (opcional)",
    requestNotePlaceholder: "Por exemplo, a data em que precisa dele.",
  },

  dashboard: {
    fallbackTitle: "Painel",
    loading: "A carregar o seu registo.",
    writeEntry: "Escrever o registo de hoje",
    unavailable: "Painel indisponível",
    loadFailed: "Não foi possível carregar o seu painel.",

    metricInternship: "Progresso do estágio",
    metricInternshipCaption: "{done} de {required} exigidas",
    metricTeamHours: "Horas de Equipa Técnica",
    metricTeamHoursCaptionTeam: "Trabalho voluntário, para a declaração de horas excedentes",
    metricTeamHoursCaptionIntern: "Trabalho voluntário — contado à parte do estágio",
    metricDays: "Dias registados",
    metricDaysCaption: "Dias em que passou o cartão",
    metricToday: "Hoje",
    metricTodayCaption: "O seu estado de assiduidade em tempo real",
    metricMonth: "Este mês",
    metricMonthCaption: "Horas registadas desde o dia 1",

    attentionTitle: "A precisar da sua atenção",
    attentionDescription: "Decisões, prazos e rascunhos à sua espera.",
    attentionNone: "Não há nada à sua espera neste momento.",
    attentionEmptyTitle: "Está em dia",
    attentionEmptyDescription:
      "Pedidos de correção respondidos, relatórios devolvidos, decisões sobre certificados e prazos a chegar aparecem aqui. Escolha nas Definições o que quer ver assinalado.",

    monthTitle: "Este mês",
    monthDescription: "Os dias registados com o seu cartão. Clique num dia para o abrir no calendário.",
    monthRecorded: "{hours} registadas",

    upNextTitle: "A seguir",
    upNextDescription: "Eventos e prazos de hoje em diante.",
    upNextEmptyTitle: "Nada agendado",
    upNextEmptyDescription:
      "Os eventos da equipa e os prazos das tarefas aparecem aqui à medida que são marcados. Pode criar os seus no calendário.",
    openCalendar: "Abrir o calendário",
    openTheCalendar: "Abrir o calendário",
    event: "Evento",
    due: "Prazo",

    weeklyTitle: "Horas por semana este mês",
    weeklyDescription:
      "Cada barra é uma semana do mês em curso, por isso o desenho é o mês que realmente trabalhou.",
    weeklyEmptyTitle: "Ainda não há nada registado este mês",
    weeklyEmptyDescription: "Assim que passar o cartão, as horas aparecem aqui semana a semana.",
    weeklySeries: "Horas",

    activityTitle: "Atividade recente",
    activityDescription: "Os seus últimos dias e os registos que escreveu sobre eles.",
    activityEmptyTitle: "Ainda não há nada registado",
    activityEmptyDescription: "As entradas e os registos diários aparecem aqui à medida que acontecem.",
    activityAttendance: "Assiduidade",
    activityEntries: "Registos diários",
    fullAttendance: "Registo completo de assiduidade",

    reportsTitle: "Relatórios de estágio",
    reportsDescription: "Como estão os seus balanços mensais e o relatório final.",
    reportEntries: "{count} registo · {hours} | {count} registos · {hours}",
    finalReport: "Relatório final",
    finalReportName: "Relatório de Estágio",
    reportsEmptyTitle: "Ainda não há relatórios mensais",
    reportsEmptyDescription:
      "O balanço mensal é construído a partir dos registos diários que escreve. Crie o primeiro quando um mês estiver completo.",
    openReports: "Abrir relatórios",
    openInternshipReports: "Abrir os relatórios de estágio",

    unclassified:
      "{days} dos seus dias registados ficam fora de qualquer período de participação, por isso {hours} não contam para nenhum certificado. Peça à equipa de coordenação para registar o período que os cobre.",

    alertCorrection: "Pedido de correção: {status}",
    alertCorrectionDetail: "{date} — {note}",
    alertNoNote: "Não foi deixada nenhuma nota.",
    alertOpenAttendance: "Abrir assiduidade",
    alertReportReturned: "Relatório mensal de {month} devolvido",
    alertReopenAndResubmit: "Reabra-o para fazer as alterações e submeta outra vez.",
    alertReportDraft: "O relatório mensal de {month} ainda é um rascunho",
    alertReportDraftDetail: "Ainda não foi submetido para análise.",
    alertFinishIt: "Terminar",
    alertFinalReturned: "Relatório final devolvido para correção",
    alertCertificate: "Pedido de certificado: {status}",
    alertCertificateReady: "Está pronto a transferir.",
    alertOpenCertificates: "Abrir certificados",
    alertProfile: "Alteração de perfil: {status}",
    alertProfileApplied: "O seu registo foi atualizado.",
    alertOpenProfile: "Abrir perfil",
    alertUnread: "{count} aviso por ler | {count} avisos por ler",
    alertUnreadDetail: "Publicados pela equipa de coordenação e dirigidos a si.",
    alertReadThem: "Ler",
    alertOverdue: "{count} tarefa fora de prazo | {count} tarefas fora de prazo",
    alertDueSoon: "{count} tarefa a terminar em breve | {count} tarefas a terminar em breve",
    alertOpenTasks: "Abrir as minhas tarefas",
    notRecorded: "Sem registo",
  },
} as const;
