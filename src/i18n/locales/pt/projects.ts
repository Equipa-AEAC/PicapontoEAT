/**
 * Gestão de projetos.
 *
 * "Quadro" é a tradução de "board" (o quadro de tarefas). "Kanban" mantém-se
 * apenas onde é o nome próprio do método, nunca como rótulo de interface.
 */
export default {
  status: {
    planned: "Planeado",
    active: "Em curso",
    paused: "Suspenso",
    done: "Concluído",
    archived: "Arquivado",
  },

  priority: {
    low: "Baixa",
    normal: "Normal",
    high: "Alta",
    critical: "Crítica",
  },

  taskStatus: {
    todo: "Por fazer",
    "in-progress": "Em curso",
    blocked: "Bloqueada",
    review: "Em revisão",
    done: "Concluída",
  },

  participantRole: {
    intern: "Estagiário",
    teamMember: "Membro da equipa",
    administrator: "Administrador",
    coordinator: "Coordenador",
    teacher: "Professor",
    viewer: "Consulta",
  },

  /*
   * Frases da cronologia. São geradas a partir do evento registado e não
   * guardadas como texto, para que um registo escrito em julho continue a ler-se
   * na língua escolhida por quem o abre.
   */
  activity: {
    entryCount: "{shown} de {total} entradas",
    projectCreated: "Criou o projeto",
    projectUpdated: "Atualizou os detalhes do projeto",
    projectStatusChanged: "Estado alterado de {fromStatus} para {toStatus}",
    projectArchived: "Arquivou o projeto",
    projectRestored: "Recuperou o projeto do arquivo",
    taskCreated: "Criou “{title}”",
    taskUpdated: "Atualizou “{title}”",
    taskStatusChanged: "Moveu “{title}” para {status}",
    taskAssigned: "Atribuiu “{title}” a {names}",
    taskUnassigned: "Retirou todos de “{title}”",
    taskArchived: "Removeu “{title}” do quadro",
    memberAssigned: "Adicionou {names} ao projeto",
    memberRemoved: "Removeu {names} do projeto",
    empty: "Ainda não aconteceu nada aqui.",
  },

  board: {
    empty: "Nada aqui.",
    addTo: "Adicionar uma tarefa a {column}",
    hint: "Arraste um cartão entre colunas ou abra-o para mudar o estado. Tudo o que fizer aqui fica logo visível para a equipa de coordenação.",
    readOnlyHint: "Abra um cartão para o ler. Mover e editar cabe a quem está atribuído a este projeto.",
  },

  task: {
    one: "tarefa",
    many: "tarefas",
    fallbackTitle: "Tarefa",
    assignedTo: "Atribuída a",
    nobodyAssigned: "Sem responsável",
    noDescription: "Esta tarefa não tem descrição.",
    estimated: "Estimativa",
    yours: "Sua",
    openBoard: "Abrir o quadro de {project}",
    createdBy: "Criada por {name}",
  },

  form: {
    newTitle: "Nova tarefa",
    editTitle: "Editar tarefa",
    create: "Criar tarefa",
    project: "Projeto",
    chooseProject: "Escolha um projeto",
    title: "Título",
    titlePlaceholder: "Instalar o firmware nos terminais do laboratório",
    description: "Descrição",
    descriptionPlaceholder: "O que tem de ser feito e como se sabe que está concluído.",
    dueDate: "Data-limite",
    estimatedHours: "Horas estimadas",
    responsible: "Responsável por esta tarefa",
    onlyProjectPeople: "Só aparecem as pessoas atribuídas ao projeto.",
    errorTitle: "Dê um título à tarefa.",
    errorProject: "Escolha o projeto a que esta tarefa pertence.",
  },

  projectForm: {
    newTitle: "Novo projeto",
    editTitle: "Editar projeto",
    create: "Criar projeto",
    subtitle: "Os projetos agrupam o trabalho da equipa e as pessoas que o fazem.",
    namePlaceholder: "Terminais de assiduidade RFID",
    descriptionPlaceholder: "O que este projeto abrange e o que significa estar concluído.",
    owner: "Responsável",
    people: "Pessoas neste projeto",
    coordinators: "Coordenadores de tarefas",
    coordinatorsHint:
      "Estas pessoas podem atribuir trabalho a qualquer pessoa do projeto e editar ou remover qualquer tarefa. As restantes podem criar tarefas, mover cartões e alterar o trabalho que é seu. O responsável tem sempre esta permissão.",
    errorName: "Dê um nome ao projeto.",
    errorDeadline: "O prazo não pode ser anterior à data de início.",
  },

  assignment: {
    selfOnlyLabel: "Quem faz isto",
    assignToMe: "Atribuir esta tarefa a mim",
    assignedToYou: "Esta tarefa está na sua lista.",
    notAssignedToYou: "Esta tarefa não está na sua lista.",
    selfOnlyHint:
      "Pode colocar esta tarefa na sua própria lista. Atribuí-la a outra pessoa cabe ao responsável do projeto ou a um coordenador de tarefas.",
    othersKept: "Também atribuída a: {names}",
    othersKeptHint: "A atribuição dessas pessoas mantém-se.",
    coordinatorHint: "Pode atribuir esta tarefa a qualquer pessoa do projeto.",
  },

  remove: {
    title: "Remover esta tarefa?",
    message:
      "“{title}” sai do quadro. Fica arquivada e não eliminada, por isso a equipa de coordenação continua a encontrá-la.",
    confirm: "Remover tarefa",
  },

  participants: {
    legend: "Pessoas atribuídas",
    selected: "{count} selecionadas",
    filter: "Filtrar pessoas",
    members: "Membros",
    staff: "Pessoal",
    external: "Externo",
    noMatches: "Ninguém corresponde a esse filtro.",
  },

  progress: {
    barCounts: "{done} de {total} tarefas",
    overdueCount: "{count} em atraso",
    blockedCount: "{count} bloqueadas",
    label: "Progresso",
    doneOfTotal: "{done} de {total} tarefas concluídas",
    doneOfTotalTeam: "{done} de {total} tarefas concluídas por toda a equipa",
  },

  /* -------------------------------------------------------- Páginas do aluno */
  studentList: {
    title: "Projetos",
    description: "Os projetos em que participa. Abra um para trabalhar no quadro.",
    metricProjects: "Projetos",
    metricProjectsCaption: "Está atribuído a estes",
    metricOpen: "Tarefas por concluir",
    metricOpenCaption: "Atribuídas a si e ainda por terminar",
    metricLate: "Fora de prazo",
    metricLateCaption: "Avise o seu monitor se houver algo a bloqueá-lo",
    metricDone: "Concluídas",
    metricDoneCaption: "Tarefas que já terminou",
    emptyTitle: "Ainda não está em nenhum projeto",
    emptyDescription:
      "Quando a equipa de coordenação o colocar num projeto, ele aparece aqui com o quadro, os prazos e a sua parte do trabalho.",
    noDescription: "Este projeto não tem descrição.",
    yourShare: "{done}/{total} das suas tarefas concluídas",
    dueOn: "prazo {date}",
    lateOne: "1 das suas tarefas está fora de prazo",
    lateMany: "{count} das suas tarefas estão fora de prazo",
    openBoard: "Abrir o quadro",
  },

  studentTasks: {
    title: "As minhas tarefas",
    description: "Tudo o que lhe foi atribuído, do mais urgente para o menos. Abra uma para a ler ou alterar.",
    metricOpen: "Por concluir",
    metricOpenCaption: "Atribuídas a si e ainda por terminar",
    metricLate: "Fora de prazo",
    metricLateCaption: "Avise o seu monitor se houver algo a bloqueá-lo",
    metricNothingLate: "Não há nada atrasado",
    metricSoon: "A terminar",
    metricSoonCaption: "Dentro da próxima semana",
    metricDone: "Concluídas",
    metricDoneCaption: "Tarefas que já terminou",
    filterOpen: "Tarefas por concluir",
    filterEverything: "Tudo",
    filterAllProjects: "Todos os projetos",
    countTitle: "{count} tarefa | {count} tarefas",
    countDescription: "Primeiro as atrasadas, depois por prazo. A linha mostra o que a ordena; o resto está lá dentro.",
    emptyFilteredTitle: "Nada corresponde a estes filtros",
    emptyFilteredDescription: "Limpe os filtros para ver o resto do seu trabalho.",
    emptyTitle: "Não tem tarefas atribuídas",
    emptyDescription:
      "Quando lhe atribuírem uma tarefa de projeto, ela aparece aqui, com o prazo e o ponto de situação.",
  },

  studentDetail: {
    allProjects: "Todos os projetos",
    projectDetails: "Detalhes do projeto",
    newTask: "Nova tarefa",
    loadingBoard: "A carregar o quadro.",
    unavailableTitle: "Projeto indisponível",
    unavailableDescription:
      "Este projeto não é seu ou foi arquivado. Volte atrás e escolha um da sua lista.",
    assignedToYou: "{count} atribuídas a si",
    noDeadlineSet: "Sem prazo definido",
    dueOn: "Prazo {date}",
    overdue: "fora de prazo",
    tabBoard: "Quadro",
    tabList: "Lista",
    tabActivity: "Atividade",
    listTitle: "Todas as tarefas deste projeto",
    listDescription: "Ordenadas por prazo. As suas estão assinaladas.",
    listEmptyTitle: "Ainda não há tarefas",
    listEmptyDescription: "Crie a primeira e ela aparece no quadro.",
    activityTitle: "O que aconteceu",
    activityDescription: "Tudo o que ficou registado neste projeto, do mais recente para o mais antigo.",
    eventsTitle: "A seguir neste projeto",
    eventsDescription: "Eventos partilhados dirigidos a quem está neste projeto.",
    seeOnCalendar: "Ver no calendário",
    noProjectDescription: "Este projeto não tem descrição.",
    owner: "Responsável",
    starts: "Início",
    team: "Equipa",
    taskCoordinators: "Coordenadores de tarefas",
    taskCoordinatorsNone: "Ainda ninguém — só o responsável pode atribuir trabalho a outras pessoas.",
    yourWork: "O seu trabalho",
    yourWorkValue: "{done} de {total} concluídas",
    maintainedNote:
      "O projeto em si — descrição, datas e quem participa — é mantido pela equipa de coordenação.",
    yourRights: "O que pode fazer aqui",
    rightsCoordinator:
      "Pode criar, editar e mover qualquer tarefa e atribuir trabalho a qualquer pessoa deste projeto.",
    rightsOwner:
      "Este projeto é da sua responsabilidade: pode criar, editar e mover qualquer tarefa e atribuir trabalho a qualquer pessoa.",
    rightsParticipant:
      "Pode criar tarefas, mover qualquer cartão e editar ou remover as tarefas que são suas. Atribuir trabalho a outras pessoas cabe ao responsável do projeto ou a um coordenador de tarefas.",
    logTime: "Registar tempo neste projeto",
  },

  filters: {
    everyone: "Todos",
    allProjects: "Todos os projetos",
    allStatuses: "Todos os estados",
    allPriorities: "Todas as prioridades",
    unassigned: "Sem responsável",
  },

  errors: {
    notOnProject: "Não pertence a esse projeto.",
    taskNotYours: "Essa tarefa não pertence a nenhum dos seus projetos.",
    cannotAssignOthers: "Não pode atribuir esta tarefa a outras pessoas.",
    cannotEditTask: "Só pode alterar tarefas que sejam suas.",
    cannotRemoveTask: "Só pode remover tarefas que sejam suas.",

    /* Falhas ao carregar ou guardar, ditas pelo que não foi possível fazer. */
    loadTeam: "Não foi possível carregar a equipa.",
    loadProjects: "Não foi possível carregar os projetos.",
    loadOverview: "Não foi possível carregar a vista geral dos projetos.",
    loadProject: "Não foi possível carregar o projeto.",
    loadTasks: "Não foi possível carregar as tarefas.",
    loadMyTasks: "Não foi possível carregar as suas tarefas.",
    loadMemberWork: "Não foi possível carregar o trabalho deste membro nos projetos.",
    loadJournal: "Não foi possível carregar os registos do diário deste projeto.",
    loadMyProjects: "Não foi possível carregar os seus projetos.",
    loadPersonWork: "Não foi possível carregar o trabalho dessa pessoa.",
    loadUnassigned: "Não foi possível carregar o trabalho sem responsável.",
    loadWorkload: "Não foi possível carregar a carga de trabalho da equipa.",
    loadActivity: "Não foi possível carregar a atividade do projeto.",
    saveTask: "Não foi possível guardar a tarefa.",
    moveTask: "Não foi possível mover a tarefa.",
    removeTask: "Não foi possível remover a tarefa.",
    archiveTask: "Não foi possível arquivar a tarefa.",
    assign: "Não foi possível alterar quem está atribuído.",
    saveProject: "Não foi possível guardar o projeto.",
    archiveProject: "Não foi possível arquivar o projeto.",
    restoreProject: "Não foi possível restaurar o projeto.",
  },
} as const;
