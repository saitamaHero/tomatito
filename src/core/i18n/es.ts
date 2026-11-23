import type { Phase } from "../types";

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** Todo el texto de la app. Lo que lleva valores es una función: cada idioma decide
    el orden de las palabras y los plurales. */
export const es = {
  minutes: (n: number) => `${n} min`,
  cancel: "Cancelar",
  complete: "¡Tomatito completo!",

  phase: {
    focus: "Enfoque",
    short: "Descanso corto",
    long: "Descanso largo",
  } satisfies Record<Phase, string>,
  toggle: { idle: "Empezar", running: "Pausar", paused: "Seguir" },
  skip: { focus: "Terminar pomodoro", break: "Saltar descanso" },
  segment: { focus: "Enfoque", break: "Descanso" },

  dots: (done: number, total: number) => `${done} de ${total} pomodoros completados`,
  summary: (pomodoros: number, minutes: number) =>
    `${pomodoros} ${plural(pomodoros, "pomodoro", "pomodoros")} · ${minutes} min de enfoque`,

  date: {
    weekdays: ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"],
    /** Desde el domingo, como `Date.getDay()`. */
    initials: ["D", "L", "M", "X", "J", "V", "S"],
    months: [
      "ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic",
    ],
    short: (day: number, month: string) => `${day} ${month}`,
    full: (weekday: string, day: number, month: string) => `${weekday} ${day} ${month}`,
    today: "hoy",
    yesterday: "ayer",
  },

  nav: {
    label: "Principal",
    timer: "Temporizador",
    history: "Historial",
    settings: "Ajustes",
    back: "Volver al temporizador",
  },

  timer: {
    label: "Temporizador",
    phases: "Fase",
    breakHint: "Levántate, estira y bebe agua.",
    nextPomodoro: (n: number, total: number) => `Sigue el pomodoro ${n} de ${total}.`,
    nextSession: "Después empieza una sesión nueva.",
    startLong: (minutes: number) => `Empezar descanso largo · ${minutes} min`,
    newSession: "Nueva sesión",
    viewSummary: "Ver resumen",
    reset: "Reiniciar",
    space: "Espacio",
    withKey: (label: string, key: string) => `${label} (${key})`,
    discard: {
      title: "La fase en curso no contará",
      body: "El tiempo que llevas en esta fase se descarta.",
      changePhase: "Cambiar de fase",
      reset: "Reiniciar",
      cancel: "Seguir aquí",
    },
    finish: {
      title: "Terminar pomodoro",
      body: "Cuenta como hecho, con los minutos que llevas.",
      accept: "Terminar",
    },
  },

  goals: {
    title: "Objetivos de la sesión",
    titleDone: "Objetivos cumplidos",
    next: "Siguiente objetivo",
    empty: "Elige pocas cosas y que sean concretas.",
    emptyLocked: "Esta sesión no tuvo objetivos.",
    field: "Nuevo objetivo",
    placeholder: "Añade un objetivo concreto",
    add: "Añadir objetivo",
    today: (n: number, total: number) => `Hoy ${n}/${total}`,
    todayLabel: (n: number, total: number) => `Hoy ${n} de ${total} pomodoros`,
    end: "Terminar sesión",
    endBody:
      "Se guarda en el historial con lo hecho hasta ahora. La fase en curso no cuenta.",
    endBodyEmpty:
      "Aún no hay pomodoros, así que no quedará en el historial. Tus objetivos pendientes se conservan.",
    endCancel: "Seguir",
  },

  goal: {
    text: "Texto del objetivo",
    pomodoros: "Pomodoros",
    estimate: "Pomodoros estimados",
    less: "Bajar estimación",
    more: "Subir estimación",
    save: "Guardar objetivo",
    markDone: (text: string) => `Marcar como hecho: ${text}`,
    markPending: (text: string) => `Marcar como pendiente: ${text}`,
    edit: "Editar",
    editLabel: (text: string) => `Editar: ${text}`,
    remove: "Borrar",
    removeLabel: (text: string) => `Borrar: ${text}`,
    spent: (spent: number, est: number) => `${spent} de ${est} pomodoros estimados`,
  },

  history: {
    title: "Historial",
    ranges: "Periodo",
    range: { week: "7 días", month: "30 días" },
    summary: "Resumen",
    pomodoros: "Pomodoros",
    focusTime: "De enfoque",
    goals: "Objetivos",
    per: { week: "Por día", month: "Por semana" },
    sessions: "Sesiones",
    emptyTitle: "Nada por aquí todavía",
    emptyRange: "No hay sesiones en este periodo.",
    emptyEver: "Cuando termines tu primer pomodoro, la sesión aparecerá aquí.",
    goToTimer: "Ir al temporizador",
    untitled: "Sesión sin objetivos",
    inProgress: "En curso",
    goalsDone: (done: number, total: number) => `${done}/${total} objetivos`,
    chartToday: "Hoy",
    chartThisWeek: "Esta sem.",
    chartGoal: (n: number) => `Meta ${n}`,
    chartLabel: (bars: string, goal?: number) =>
      `Pomodoros: ${bars}` + (goal ? `. Meta diaria: ${goal}` : ""),
  },

  detail: {
    pomodoros: "pomodoros",
    focusMinutes: "min enfoque",
    breakMinutes: "min descanso",
    pauses: (n: number) => plural(n, "pausa", "pausas"),
    timeline: "Línea de tiempo",
    goals: "Objetivos",
    repeat: "Repetir esta sesión",
    repeatConfirm: {
      title: "Hay una sesión en curso",
      body: "Se terminará tal como está y empezarás otra con estos objetivos.",
      accept: "Terminar y repetir",
    },
  },

  settings: {
    title: "Ajustes",
    presets: "Plantillas",
    preset: { classic: "Clásico 25/5", deep: "Profundo 50/10", quick: "Ágil 15/3" },
    times: "Tiempos",
    field: {
      focus: { label: "Enfoque", hint: "Duración de cada pomodoro" },
      short: { label: "Descanso corto", hint: "Entre pomodoros" },
      long: { label: "Descanso largo", hint: "Al completar el ciclo" },
      rounds: { label: "Pomodoros por ciclo", hint: "Antes del descanso largo" },
    },
    decrease: (label: string) => `Bajar ${label.toLowerCase()}`,
    increase: (label: string) => `Subir ${label.toLowerCase()}`,
    cycle: "Un ciclo completo dura",
    dailyGoal: "Meta diaria",
    dailyGoalHint: (duration: string) => `Pomodoros al día · ${duration} de enfoque`,
    whenPhaseEnds: "Al terminar una fase",
    autoBreak: "Empezar el descanso solo",
    autoFocus: "Empezar el siguiente pomodoro solo",
    sound: "Sonido al terminar",
    notify: "Notificación del sistema",
    float: "Ventana flotante",
    floatHint: "El tiempo a la vista cuando usas otras apps",
    floatWhen: "Cuándo aparece",
    floatWhenOption: {
      always: "Al salir de la app",
      focus: "Solo en enfoque",
      running: "Solo si corre el tiempo",
    },
    floatSize: "Tamaño",
    floatSizeOption: { normal: "Normal", compact: "Compacta" },
    floatPreview: "Vista previa",
    floatProblem: {
      wayland: "En Wayland una aplicación no puede quedarse encima de las demás.",
    },
    desktop: "Escritorio",
    shortcut: "Atajo global",
    shortcutHint: "Ctrl/Cmd + Alt + Mayús + T empieza o pausa",
    shortcutProblem: {
      wayland: "El sistema no permitió el atajo: en Wayland no hay atajos globales.",
      taken: "El sistema no permitió el atajo: puede que otra aplicación ya lo use.",
      unknown: "El sistema no permitió el atajo.",
    },
    language: "Idioma",
    languageSystem: "Sistema",
    restore: "Restablecer valores clásicos",
    save: "Guardar",
    unsaved: {
      title: "Hay cambios sin guardar",
      body: "Si sales ahora, los ajustes se quedan como estaban.",
      accept: "Salir sin guardar",
      cancel: "Seguir editando",
    },
  },

  float: {
    focus: "ENFOQUE",
    paused: "EN PAUSA",
    break: "DESCANSO",
    open: (label: string, time: string) => `${label}, ${time}. Abrir Tomatito`,
    pomodoroDone: (n: number) => `Pomodoro ${n} terminado`,
    rest: (duration: string) => `Toca para descansar ${duration}`,
    restAction: "Descansar",
    breakDone: "Descanso terminado",
    nextPomodoro: (n: number, total: number) => `Toca para el pomodoro ${n} de ${total}`,
    newSession: "Toca para una sesión nueva",
    startAction: "Empezar",
  },

  notification: {
    focusTitle: "Pomodoro terminado",
    focusBody: (duration: string) => `Toca descanso corto de ${duration}.`,
    breakTitle: "Descanso terminado",
    breakBody: (n: number, total: number) => `Sigue el pomodoro ${n} de ${total}.`,
  },

  tray: {
    show: "Mostrar Tomatito",
    quit: "Salir",
    float: "Ventana flotante",
    noticeTitle: "Tomatito sigue abierto",
    noticeBody:
      "El reloj no se detiene. Para cerrarlo del todo, usa «Salir» en la bandeja.",
  },

  boot: {
    failed:
      "No se pudo abrir Tomatito. Comprueba que el navegador permite guardar datos.",
    otherTab: "Tomatito ya está abierto en otra pestaña.",
  },
};

export type Messages = typeof es;
