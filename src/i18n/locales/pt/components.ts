/**
 * Caixas de diálogo e componentes partilhados — as peças usadas por mais do que
 * uma área de trabalho.
 *
 * Estão juntas porque não pertencem a nenhuma página em particular: o pedido de
 * correção é feito por um aluno e analisado pelo pessoal, e as duas leituras têm
 * de usar as mesmas palavras para a mesma coisa.
 */
export default {
  moment: {
    postedByAlt: "Momento publicado por {name}",
    reportCount: "1 denúncia | {count} denúncias",
    lifetimeSubtitle: "As fotografias ficam na galeria durante {hours} horas e depois desaparecem sozinhas.",
    dropzoneHint: "PNG, JPG ou WebP. É redimensionada antes de ser guardada.",
    storedSize: "Tamanho guardado {size}",
    change: "Trocar",
    caption: "Legenda",
    project: "Projeto",
    quotaLeft: "Ainda pode publicar 1 momento hoje. | Ainda pode publicar {count} momentos hoje.",
    processing: "A processar a fotografia…",
    choosePhoto: "Escolher uma fotografia",
    noProject: "Sem ligação a um projeto",
    report: "Denunciar este momento",
    remove: "Remover este momento",
    hidden: "Oculto",
    composeTitle: "Publicar um momento",
    compose: "Publicar",
    previewAlt: "Pré-visualização da fotografia que vai publicar",
    captionPlaceholder: "A reparar os terminais do laboratório antes do dia aberto.",
  },

  taskAssign: {
    reassign: "Reatribuir",
    assign: "Atribuir",
    responsible: "Responsável",
    nobodyAssigned: "Sem responsável",
  },

  participation: {
    why: "Porquê",
    internshipTotal: "Estágio",
    fctRequirement: "Requisito da FCT",
    unclassifiedWarning:
      "{days} dia(s) — {hours} — ficam fora de todos os períodos, por isso não contam para nenhum dos totais. Alargue um período para os incluir.",
    rangeLine: "{range} · {days} dia(s) registados",
    transition: "transição",
    editPeriod: "Editar período de participação",
    addPeriod: "Adicionar período de participação",
    savePeriod: "Guardar período",
    addPeriodShort: "Adicionar período",
    emptyTitle: "Sem participação registada",
    emptyDescription:
      "Adicione um período para que a assiduidade deste membro possa contar como horas de equipa ou de estágio. Até lá fica por classificar.",
    current: "Atual",
    teamCertificate: "Declaração de horas excedentes",

    dialogSubtitle:
      "As duas datas são inclusivas e abrangem dias inteiros. Um dia pertence por completo ao período que o contém.",
    notePlaceholder: "ex.: início do estágio de FCT",
    kind: "Participação *",
    internship: "Estágio *",
    noInternship:
      "Este membro ainda não tem registo de estágio. Atribua um antes de registar um período de estágio.",
    firstDay: "Primeiro dia *",
    lastDay: "Último dia",
    lastDayHint: "Deixe vazio enquanto a participação estiver a decorrer.",
  },

  calendarEvent: {
    nothingRecordedSuffix: "{summary} — sem registos",
    editTitle: "Editar evento",
    addTitle: "Criar um evento",
    add: "Criar evento",
    subtitle:
      "Os eventos são notas no calendário. Nunca afetam as suas horas — essas vêm da assiduidade.",
    titlePlaceholder: "Sessão de montagem de terminais",
    pickProject: "Escolha um projeto",
    descriptionPlaceholder: "Para que é e o que levar.",
    fieldTitle: "Título *",
    fieldDate: "Data *",
    fieldVisibility: "Quem pode ver",
    fieldProject: "Projeto *",
  },

  correctionRequest: {
    minimumHint: "Pelo menos {count} caracteres — diga o que aconteceu para que possa ser verificado.",
    title: "Comunicar um registo incorreto",
    confirm: "Enviar pedido",
    reasonPlaceholder:
      "Por exemplo: saí às 12:10 mas o terminal do Laboratório 3 não leu o meu cartão à saída.",
    recapAbout: "Está a comunicar {date}, atualmente registado como {entry} até {exit}.",
    noCheckIn: "sem entrada",
    noCheckOut: "sem saída",
    whatIsWrong: "O que está errado?",
    checkInShouldBe: "A entrada devia ser",
    checkOutShouldBe: "A saída devia ser",
    whatHappened: "O que aconteceu?",
    footnote:
      "Alguém da equipa de coordenação analisa este pedido. Verá a resposta nesta página, quer o registo seja alterado ou não.",
  },

  correctionQueue: {
    recordedAs: "Registado {entry} – {exit} ({hours}h) em {device}",
    unknownDevice: "dispositivo desconhecido",
    memberSays: "o membro indica {entry} – {exit}",
    sentAgo: "Enviado {when}",
    closedBy: "fechado por {name} {when}",
    recordCorrected: "registo corrigido",
    reportedLine: "{member} comunicou {date}: {kind}.",
    currentlyReads: "O registo indica atualmente {entry} – {exit} em {device}.",
    noteOptional: "Nota para o membro (opcional)",
    noteRequired: "Nota para o membro (obrigatória)",
    emptyNone: "Nenhum membro comunicou problemas de assiduidade. Os pedidos aparecem aqui assim que houver.",
    emptyFiltered: "Nenhum pedido corresponde ao estado que escolheu.",
    approveNotePlaceholder: "Por exemplo: verifiquei o registo do terminal do Laboratório 3 e corrigi a saída.",
    rejectNotePlaceholder: "Explique porque é que o registo vai ficar como está.",
    allRequests: "Todos os pedidos",
    title: "Pedidos de correção",
    description:
      "Dias que os membros comunicaram como errados. Aprovar pode reescrever o registo; a decisão fica auditada em qualquer dos casos.",
    emptyTitle: "Não há nada para analisar",
    review: "Analisar",
    reviewTitle: "Analisar pedido de correção",
    saveDecision: "Guardar decisão",
    approve: "Aprovar este pedido",
    approveHint: "Desmarque para fechar sem concordar. O membro vê a sua nota.",
    alsoCorrect: "Corrigir também o registo de assiduidade",
    alsoCorrectHint: "Reescreve as horas, recalcula o total e marca o dia como corrigido.",
  },

  profileRequest: {
    alreadyRequested: "{field} (já pedido)",
    emailPlaceholder: "nome{'@'}escola.local",
    phonePlaceholder: "+351 900 000 000",
    newValueLabel: "Novo/a {field} *",
    photoHint: "PNG, JPG ou WebP, 2 MB ou menos. Só é visível para si até o pedido ser aprovado.",
    whyRequired: "Porquê *",
    noPictureOnFile: "Sem fotografia registada",
    nothingRecorded: "Sem registo",
    title: "Pedir uma alteração",
    subtitle:
      "O seu registo é mantido pela equipa de coordenação, por isso isto pede-lhes a alteração em vez de a fazer diretamente.",
    confirm: "Enviar pedido",
    currentAlt: "Fotografia de perfil atual",
    proposedAlt: "Fotografia de perfil proposta",
    reasonPlaceholder: "Quem analisa vê apenas o que escrever aqui.",
    whatNeedsChanging: "O que precisa de ser alterado *",
    currentlyRecorded: "Registado atualmente",
    youAreAskingFor: "Está a pedir",
    newPicture: "Nova fotografia *",
  },

  memberForm: {
    school: "Escola",
    courseOptional: "Curso (opcional)",
    classOptional: "Turma (opcional)",
    academicYear: "Ano letivo",
    academicYearOptional: "Ano letivo (opcional)",
    title: "Formulário de membro",
    subtitle:
      "Registe a identificação do membro, a escola onde está matriculado, os contactos e a atribuição de cartão RFID.",
    schoolPlaceholder: "Escola Secundária de…",
    memberNumber: "Número de membro",
    fullName: "Nome completo",
    externalHint:
      "Matriculado noutra escola — estagiário de FCT acolhido pela Equipa Técnica. O orientador pertence a essa escola.",
    schoolName: "Nome da escola",
    birthDate: "Data de nascimento",
    emergencyContact: "Contacto de emergência",
    assignedCard: "Cartão atribuído",
  },

  internshipForm: {
    subtitle: "O estágio decorre em {host}, uma vez que a Equipa Técnica funciona dentro da escola.",
    title: "Atribuir estágio",
    confirm: "Atribuir",
    pickMember: "Selecione um membro da equipa",
    external: "Estagiário externo",
    orientadorPlaceholder: "Prof. …",
    monitorPlaceholder: "Eng. …",
    member: "Membro da equipa *",
    enrolledAtNote: "Matriculado em {school} — o orientador abaixo pertence a essa escola.",
    enrolledAt: "Matriculado em",
    requiredHours: "Horas exigidas *",
    status: "Estado *",
    orientador: "Orientador de Estágio *",
    orientadorHint: "Professor responsável na escola onde o estagiário está matriculado.",
    monitor: "Monitor de Estágio *",
    monitorHint: "Pessoa da Equipa Técnica que acompanha o estagiário no dia a dia.",
    startDate: "Data de início *",
    endDate: "Data de fim *",
  },

  internshipDetails: {
    progress: "Progresso",
    hoursLine: "{done} de {required} · faltam {remaining}",
    behindPace: "Atrasado face ao ritmo que a data de fim implica",
    inStep: "A par das datas do estágio",
    placement: "Estágio",
    certificate: "Certificado",
    issuedOn: "Emitido a {when}",
    notIssued: "Ainda não emitido",
    reportsHeading: "Relatórios · {submitted} de {total} entregues",
    entriesAndHours: "{entries} entradas · {hours}h",
    header: "Estágio",
    unavailableTitle: "Estágio indisponível",
    unavailableDescription: "Não foi possível carregar esta colocação. Feche e tente novamente.",
    noReportsTitle: "Ainda não há relatórios",
    noReportsDescription:
      "Os balanços mensais e o relatório final são escritos pelo membro na sua própria área.",
    openMember: "Abrir registo do membro",
    updateState: "Atualizar estado da colocação",
    internshipHours: "Horas de estágio",
    calendarElapsed: "Tempo decorrido",
    hoursNote:
      "As horas são somadas a partir da assiduidade dentro dos períodos de participação de estágio deste membro. Não são introduzidas à mão, e o tempo de voluntariado nunca é contado aqui.",
    enrolledAt: "Matriculado em",
    orientador: "Orientador de Estágio",
    monitor: "Monitor de Estágio",
    participationHistory: "Histórico de participação",
    noParticipation: "Não há períodos de participação registados para este membro.",
    finalReport: "Relatório final",
    finalReportName: "Relatório de Estágio",
  },

  reportCreation: {
    generateBalance: "Gerar o balanço",
    startFinal: "Começar o relatório final",
    header: "Novo relatório de estágio",
    pickMonth: "Escolha um mês",
    intro:
      "Os dois relatórios servem propósitos diferentes e são entregues em alturas diferentes. Escolha o que vai escrever.",
    monthly: "Relatório mensal",
    monthlyDescription:
      "O balanço do trabalho de um mês, feito a partir dos registos diários que escreveu. Ficha de Evolução Intermédia.",
    monthlyExhausted: "Todos os meses em que escreveu registos já têm relatório.",
    final: "Relatório final",
    finalDescription: "O relatório entregue no fim do estágio, secção a secção. Relatório de Estágio.",
    finalExists: "O seu relatório final já foi submetido.",
    monthlyNote:
      "O balanço é montado a partir dos registos diários dentro do período abaixo. Verá o resultado antes de ser guardado seja o que for.",
    month: "Mês *",
    periodStarts: "Início do período",
    periodEnds: "Fim do período",
    monthHint:
      "Por omissão é o mês inteiro. Reduza-o quando o mês só estiver parcialmente coberto pelo estágio — os registos contados seguem estas datas.",
    finalNote:
      "O relatório final consolida tudo o que escreveu durante o estágio. Só são usados os registos dentro deste período.",
    placementStarts: "Início do estágio",
    placementEnds: "Fim do estágio",
    placementHint:
      "Por omissão são as datas do seu estágio. O tempo de voluntariado anterior ao início do estágio nunca é incluído.",
  },
} as const;
