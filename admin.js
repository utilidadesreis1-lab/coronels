import {
  addDoc,
  deleteDoc,
  doc,
  getBarbersCollection,
  getDocs,
  getAppointmentsCollection,
  hasFirebaseConfig,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "./firebase-config.js";

const adminLoginForm = document.querySelector("[data-admin-login-form]");
const adminFeedback = document.querySelector("[data-admin-feedback]");
const adminContent = document.querySelector("[data-admin-content]");
const adminTotal = document.querySelector("[data-admin-total]");
const adminPending = document.querySelector("[data-admin-pending]");
const adminCompleted = document.querySelector("[data-admin-completed]");
const adminCancelled = document.querySelector("[data-admin-cancelled]");
const adminToggleManualButton = document.querySelector("[data-admin-toggle-manual]");
const adminManualForm = document.querySelector("[data-admin-manual-form]");
const adminManualFeedback = document.querySelector("[data-admin-manual-feedback]");
const adminCloseManualButton = document.querySelector("[data-admin-close-manual]");
const adminManualServiceSelect = document.querySelector("[data-admin-manual-service-select]");
const adminManualBarberSelect = document.querySelector(
  "[data-admin-manual-barber-select]"
);
const adminManualTimeSelect = document.querySelector("[data-admin-manual-time-select]");
const adminManualServiceGrid = document.querySelector("[data-admin-manual-service-grid]");
const adminManualServiceShell = document.querySelector("[data-admin-manual-service-shell]");
const adminManualServiceToggle = document.querySelector("[data-admin-manual-service-toggle]");
const adminManualServiceSummary = document.querySelector("[data-admin-manual-service-summary]");
const adminManualServicePanel = document.querySelector("[data-admin-manual-service-panel]");
const adminManualBarberShell = document.querySelector("[data-admin-manual-barber-shell]");
const adminManualBarberGrid = document.querySelector("[data-admin-manual-barber-grid]");
const adminManualDateShell = document.querySelector("[data-admin-manual-date-shell]");
const adminManualDateGrid = document.querySelector("[data-admin-manual-date-grid]");
const adminManualDateInput = document.querySelector("[data-admin-manual-date-input]");
const adminManualScheduleGrid = document.querySelector("[data-admin-manual-schedule-grid]");
const adminManualScheduleShell = document.querySelector("[data-admin-manual-schedule-shell]");
const adminManualScheduleHelper = document.querySelector("[data-admin-manual-schedule-helper]");
const adminBarberForm = document.querySelector("[data-admin-barber-form]");
const adminBarberFeedback = document.querySelector("[data-admin-barber-feedback]");
const adminBarbersList = document.querySelector("[data-admin-barbers-list]");
const adminFiltersForm = document.querySelector("[data-admin-filters-form]");
const adminStatusFilter = document.querySelector("[data-admin-status-filter]");
const adminDateStartFilter = document.querySelector("[data-admin-date-start-filter]");
const adminDateEndFilter = document.querySelector("[data-admin-date-end-filter]");
const adminBarberFilter = document.querySelector("[data-admin-barber-filter]");
const adminSearchFilter = document.querySelector("[data-admin-search-filter]");
const adminFilterTodayButton = document.querySelector("[data-admin-filter-today]");
const adminClearFiltersButton = document.querySelector("[data-admin-clear-filters]");
const adminList = document.querySelector("[data-admin-list]");
const adminEmpty = document.querySelector("[data-admin-empty]");
const adminLogoutButton = document.querySelector("[data-admin-logout]");
const adminTabTriggers = document.querySelectorAll("[data-admin-tab-trigger]");
const adminViews = document.querySelectorAll("[data-admin-view]");
const adminCurrentTitle = document.querySelector("[data-admin-current-title]");
const adminCurrentCopy = document.querySelector("[data-admin-current-copy]");
const adminUpcomingList = document.querySelector("[data-admin-upcoming-list]");
const adminDashboardOpenAgendaButton = document.querySelector(
  "[data-admin-dashboard-open-agenda]"
);
const adminToday = document.querySelector("[data-admin-today]");
const adminUpcomingCount = document.querySelector("[data-admin-upcoming-count]");
const adminBusySlots = document.querySelector("[data-admin-busy-slots]");
const adminActiveBarbers = document.querySelector("[data-admin-active-barbers]");
const adminTableBody = document.querySelector("[data-admin-table-body]");
const adminBarberAgendaGrid = document.querySelector("[data-admin-barber-agenda-grid]");

const adminAuthStorageKey = "coronelsBarbeariaAdminLoggedIn";
const adminCredentials = {
  email: "admin@coronels.com",
  password: "Coronels@2026",
};
const adminWhatsappMessage =
  "Olá, aqui é da Coronel's Barbearia. Estamos entrando em contato sobre seu agendamento.";
const defaultBarbers = [
  { id: "guerra", nome: "Guerra", fotoUrl: "assets/barbeiros/guerra.jfif", ativo: true },
  { id: "caio", nome: "Caio", fotoUrl: "assets/barbeiros/caio.png", ativo: true },
  { id: "felipe", nome: "Felipe", fotoUrl: "", ativo: true },
  { id: "olivan", nome: "Olivan", fotoUrl: "", ativo: true },
];
const defaultAdminEmptyMessage = "Nenhum agendamento salvo até o momento.";
const defaultAdminManualScheduleHelper =
  "Escolha o profissional e a data para ver os horários.";
const adminServiceMeta = {
  Corte: {
    price: "R$ 40",
    description: "Acabamento alinhado para manter o visual masculino sempre em dia.",
  },
  Barba: {
    price: "R$ 30",
    description: "Desenho e finalização com presença e precisão.",
  },
  Sobrancelha: {
    price: "R$ 15",
    description: "Detalhe rápido para reforçar expressão e limpeza.",
  },
  Selagem: {
    price: "R$ 35",
    description: "Controle de fios com acabamento disciplinado e elegante.",
  },
  Botox: {
    price: "R$ 50",
    description: "Tratamento capilar para reduzir volume e melhorar o toque.",
  },
  Progressiva: {
    price: "R$ 80",
    description: "Alinhamento intenso para um visual mais polido.",
  },
  Relaxamento: {
    price: "R$ 50",
    description: "Controle de textura com caimento mais natural.",
  },
  "Perfil do cabelo": {
    price: "R$ 20",
    description: "Contorno e precisão para um acabamento limpo.",
  },
  Luzes: {
    price: "R$ 120",
    description: "Iluminação estratégica para destacar o visual.",
  },
  Platinado: {
    price: "R$ 150",
    description: "Coloração de alto impacto com acabamento premium.",
  },
  "Corte com visagismo": {
    price: "R$ 600",
    description:
      "Análise personalizada de rosto, estilo e imagem para um visual exclusivo.",
  },
  "Barba com visagismo": {
    price: "R$ 100",
    description:
      "Desenho de barba personalizado com proporção facial e acabamento premium.",
  },
};

const sanitizePhoneDigits = (value) => String(value || "").replace(/\D/g, "");

const getLocalPhoneDigits = (value) => {
  const digits = sanitizePhoneDigits(value);

  if (digits.startsWith("55") && digits.length === 13) {
    return digits.slice(2);
  }

  return digits;
};

const formatPhone = (value) => {
  const digits = getLocalPhoneDigits(value).slice(0, 11);

  if (!digits) {
    return "";
  }

  if (digits.length <= 2) {
    return `(${digits}`;
  }

  if (digits.length <= 7) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};

const hasValidPhoneDigits = (value) => getLocalPhoneDigits(value).length === 11;

let appointmentsState = [];
let unsubscribeAppointments = null;
let barbersState = defaultBarbers.map((barber) => ({ ...barber }));
let unsubscribeBarbers = null;
let isSeedingDefaultBarbers = false;
let lastAppointmentConflict = false;
let activeAdminTab = "dashboard";
let manualScheduleOccupiedSlots = new Set();
let unsubscribeManualSchedule = null;

const normalizeBarber = (barber) => {
  if (!barber || typeof barber !== "object") {
    return null;
  }

  const nome = String(barber.nome || "").trim();
  const fotoUrl = String(barber.fotoUrl || "").trim();
  const ativo = barber.ativo !== false;
  const id = String(barber.id || "").trim();

  if (!nome) {
    return null;
  }

  return {
    id,
    nome,
    fotoUrl,
    ativo,
  };
};

const sortBarbers = (barbers) => {
  const defaultOrder = new Map(defaultBarbers.map((barber, index) => [barber.nome, index]));

  return [...barbers].sort((firstBarber, secondBarber) => {
    const firstOrder = defaultOrder.get(firstBarber.nome);
    const secondOrder = defaultOrder.get(secondBarber.nome);

    if (typeof firstOrder === "number" && typeof secondOrder === "number") {
      return firstOrder - secondOrder;
    }

    if (typeof firstOrder === "number") {
      return -1;
    }

    if (typeof secondOrder === "number") {
      return 1;
    }

    return firstBarber.nome.localeCompare(secondBarber.nome, "pt-BR", {
      sensitivity: "base",
    });
  });
};

const getAvailableBarbers = () =>
  barbersState.length
    ? sortBarbers(barbersState)
    : defaultBarbers.map((barber) => ({ ...barber }));

const getBarberInitial = (name) => {
  const safeName = String(name || "").trim();
  return safeName ? safeName.charAt(0).toUpperCase() : "?";
};

const shortWeekdayFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
});

const shortMonthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "short",
});

const getTodayDateValue = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const toDateValue = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const parseDateValue = (dateValue) => {
  const normalizedDate = String(dateValue || "").trim();

  if (!normalizedDate) {
    return null;
  }

  const [year, month, day] = normalizedDate.split("-").map((part) => Number(part));

  if (!year || !month || !day) {
    return null;
  }

  const parsedDate = new Date(year, month - 1, day);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const formatDate = (dateValue) => {
  const [year, month, day] = String(dateValue).split("-");

  if (!year || !month || !day) {
    return String(dateValue);
  }

  return `${day}/${month}/${year}`;
};

const normalizeStatusClass = (status) =>
  String(status)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase();

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const toggleFieldError = (field, isInvalid) => {
  const wrapper = field.closest(".field");

  if (!wrapper) {
    return;
  }

  wrapper.classList.toggle("is-invalid", isInvalid);
};

const clearFormErrors = (form) => {
  form
    .querySelectorAll(".field.is-invalid")
    .forEach((field) => field.classList.remove("is-invalid"));
};

const toggleManualChoiceShellError = (shell, isInvalid) => {
  if (!shell) {
    return;
  }

  shell.classList.toggle("is-invalid", isInvalid);
};

const getAdminBarberVisual = (barber) => {
  const safeName = String(barber?.nome || "").trim();

  return {
    initial: getBarberInitial(safeName),
    image: String(barber?.fotoUrl || "").trim(),
  };
};

const setFeedbackMessage = (element, message, isSuccess = false) => {
  if (!element) {
    return;
  }

  element.textContent = message;
  element.classList.toggle("is-success", isSuccess);
};

const getAdminManualScheduleSlots = () =>
  adminManualTimeSelect
    ? [...adminManualTimeSelect.options].map((option) => option.value).filter(Boolean)
    : [];

const setAdminManualScheduleHelper = (message) => {
  if (!adminManualScheduleHelper) {
    return;
  }

  adminManualScheduleHelper.textContent = message;
};

const setAdminManualServicePanelState = (isOpen) => {
  if (!adminManualServiceToggle || !adminManualServicePanel) {
    return;
  }

  adminManualServiceToggle.setAttribute("aria-expanded", String(isOpen));
  adminManualServicePanel.hidden = !isOpen;
  adminManualServiceShell?.classList.toggle("is-open", isOpen);
};

const updateAdminManualServiceSummary = () => {
  if (!adminManualServiceSummary || !adminManualServiceSelect) {
    return;
  }

  const selectedService = String(adminManualServiceSelect.value || "").trim();

  if (!selectedService) {
    adminManualServiceSummary.textContent = "Selecione um serviço";
    return;
  }

  const details = adminServiceMeta[selectedService];
  const priceLabel = details?.price ? ` — ${details.price}` : "";
  adminManualServiceSummary.textContent = `Serviço selecionado: ${selectedService}${priceLabel}`;
};

const renderAdminManualServiceCards = () => {
  if (!adminManualServiceGrid || !adminManualServiceSelect) {
    return;
  }

  const selectedService = String(adminManualServiceSelect.value || "").trim();

  adminManualServiceGrid.innerHTML = [...adminManualServiceSelect.options]
    .filter((option) => option.value)
    .map((option) => {
      const serviceName = option.value;
      const details = adminServiceMeta[serviceName] || {
        price: "",
        description: "Atendimento premium da Coronel's Barbearia.",
      };
      const isSelected = selectedService === serviceName;

      return `
        <button
          class="admin-manual-service-card ${isSelected ? "is-selected" : ""}"
          type="button"
          data-admin-manual-service="${escapeHtml(serviceName)}"
          aria-pressed="${isSelected ? "true" : "false"}"
        >
          <div class="admin-manual-service-card-top">
            <strong>${escapeHtml(serviceName)}</strong>
            <span>${escapeHtml(details.price || "")}</span>
          </div>
        </button>
      `;
    })
    .join("");

  updateAdminManualServiceSummary();
};

const selectAdminManualService = (serviceName) => {
  if (!adminManualServiceSelect) {
    return false;
  }

  const normalizedService = String(serviceName || "").trim();

  if (!normalizedService) {
    return false;
  }

  const hasOption = [...adminManualServiceSelect.options].some(
    (option) => option.value === normalizedService
  );

  if (!hasOption) {
    return false;
  }

  adminManualServiceSelect.value = normalizedService;
  toggleFieldError(adminManualServiceSelect, false);
  toggleManualChoiceShellError(adminManualServiceShell, false);
  renderAdminManualServiceCards();
  setAdminManualServicePanelState(false);
  return true;
};

const renderAdminManualBarberCards = () => {
  if (!adminManualBarberGrid || !adminManualBarberSelect) {
    return;
  }

  const currentValue = String(adminManualBarberSelect.value || "").trim();
  const availableBarbers = getAvailableBarbers();

  adminManualBarberGrid.innerHTML = availableBarbers
    .map((barber) => {
      const isSelected = currentValue === barber.nome;
      const visual = getAdminBarberVisual(barber);
      const hasImage = Boolean(visual.image);

      return `
        <button
          class="admin-manual-barber-card ${isSelected ? "is-selected" : ""}"
          type="button"
          data-admin-manual-barber="${escapeHtml(barber.nome)}"
          aria-pressed="${isSelected ? "true" : "false"}"
        >
          <div class="admin-manual-barber-card-media">
            <div class="admin-manual-barber-avatar" data-admin-manual-barber-avatar>
              ${
                hasImage
                  ? `<img
                      src="${escapeHtml(visual.image)}"
                      alt="${escapeHtml(barber.nome)}"
                      loading="lazy"
                      data-admin-manual-barber-image
                    >`
                  : ""
              }
              <span>${escapeHtml(visual.initial)}</span>
            </div>
          </div>
          <strong>${escapeHtml(barber.nome)}</strong>
          <span>Barbeiro profissional</span>
        </button>
      `;
    })
    .join("");

  adminManualBarberGrid
    .querySelectorAll("[data-admin-manual-barber-image]")
    .forEach((imageElement) => {
      const avatar = imageElement.closest("[data-admin-manual-barber-avatar]");

      if (!avatar) {
        return;
      }

      const applyLoadedState = () => {
        avatar.classList.add("has-photo");
      };

      if (imageElement.complete && imageElement.naturalWidth > 0) {
        applyLoadedState();
        return;
      }

      imageElement.addEventListener("load", applyLoadedState, { once: true });
      imageElement.addEventListener(
        "error",
        () => {
          avatar.classList.remove("has-photo");
        },
        { once: true }
      );
    });
};

const selectAdminManualBarber = (barberName) => {
  if (!adminManualBarberSelect) {
    return false;
  }

  const normalizedBarber = String(barberName || "").trim();

  if (!normalizedBarber) {
    return false;
  }

  const hasOption = [...adminManualBarberSelect.options].some(
    (option) => option.value === normalizedBarber
  );

  if (!hasOption) {
    return false;
  }

  adminManualBarberSelect.value = normalizedBarber;
  toggleFieldError(adminManualBarberSelect, false);
  toggleManualChoiceShellError(adminManualBarberShell, false);
  renderAdminManualBarberCards();
  syncAdminManualScheduleContext();
  return true;
};

const getAdminManualDateChipValues = (selectedDate = "") => {
  const values = [];
  const today = new Date();

  for (let index = 0; index < 7; index += 1) {
    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + index);
    values.push(toDateValue(nextDate));
  }

  if (selectedDate && !values.includes(selectedDate)) {
    values.push(selectedDate);
  }

  return [...new Set(values)];
};

const updateAdminManualDateInput = () => {
  if (!adminManualDateInput || !adminManualForm) {
    return;
  }

  const manualDateField = adminManualForm.querySelector('input[name="data"]');

  if (!manualDateField) {
    return;
  }

  adminManualDateInput.value = manualDateField.value;
};

const renderAdminManualDateChips = () => {
  if (!adminManualDateGrid || !adminManualForm) {
    return;
  }

  const manualDateField = adminManualForm.querySelector('input[name="data"]');

  if (!manualDateField) {
    return;
  }

  const selectedDate = String(manualDateField.value || "").trim();
  const todayValue = getTodayDateValue();

  adminManualDateGrid.innerHTML = getAdminManualDateChipValues(selectedDate)
    .map((dateValue) => {
      const parsedDate = parseDateValue(dateValue);

      if (!parsedDate) {
        return "";
      }

      const isSelected = selectedDate === dateValue;
      const isToday = dateValue === todayValue;
      const weekdayLabel = isToday
        ? "Hoje"
        : shortWeekdayFormatter
            .format(parsedDate)
            .replace(".", "")
            .replace(/^\w/, (letter) => letter.toUpperCase());
      const monthLabel = shortMonthFormatter
        .format(parsedDate)
        .replace(".", "")
        .replace(/^\w/, (letter) => letter.toUpperCase());

      return `
        <button
          class="admin-manual-date-chip ${isSelected ? "is-selected" : ""}"
          type="button"
          data-admin-manual-date="${dateValue}"
          aria-pressed="${isSelected ? "true" : "false"}"
        >
          <span class="admin-manual-date-chip-day">${weekdayLabel}</span>
          <strong class="admin-manual-date-chip-date">${String(parsedDate.getDate()).padStart(2, "0")}</strong>
          <span class="admin-manual-date-chip-month">${monthLabel}</span>
        </button>
      `;
    })
    .join("");

  updateAdminManualDateInput();
};

const selectAdminManualDate = (dateValue) => {
  if (!adminManualForm) {
    return false;
  }

  const manualDateField = adminManualForm.querySelector('input[name="data"]');
  const normalizedDate = String(dateValue || "").trim();

  if (!manualDateField || !normalizedDate) {
    return false;
  }

  manualDateField.value = normalizedDate;
  toggleFieldError(manualDateField, false);
  toggleManualChoiceShellError(adminManualDateShell, false);
  renderAdminManualDateChips();
  syncAdminManualScheduleContext();
  return true;
};

const clearSelectedAdminManualTime = () => {
  if (!adminManualTimeSelect) {
    return;
  }

  adminManualTimeSelect.value = "";
  toggleFieldError(adminManualTimeSelect, false);
  toggleManualChoiceShellError(adminManualScheduleShell, false);
};

const renderAdminManualScheduleGrid = () => {
  if (!adminManualScheduleGrid || !adminManualTimeSelect) {
    return;
  }

  const selectedTime = String(adminManualTimeSelect.value || "").trim();
  const slots = getAdminManualScheduleSlots();
  const hasContext =
    Boolean(String(adminManualBarberSelect?.value || "").trim()) &&
    Boolean(String(adminManualForm?.querySelector('input[name="data"]')?.value || "").trim());

  if (!hasContext) {
    adminManualScheduleGrid.innerHTML = "";
    setAdminManualScheduleHelper(defaultAdminManualScheduleHelper);
    return;
  }

  adminManualScheduleGrid.innerHTML = slots
    .map((time) => {
      const isOccupied = manualScheduleOccupiedSlots.has(time);
      const isSelected = selectedTime === time && !isOccupied;
      const statusLabel = isOccupied ? "Ocupado" : isSelected ? "Selecionado" : "Livre";

      return `
        <button
          class="schedule-slot ${isOccupied ? "is-occupied" : "is-available"} ${isSelected ? "is-selected" : ""}"
          type="button"
          data-admin-manual-time="${escapeHtml(time)}"
          ${isOccupied ? "disabled" : ""}
          aria-pressed="${isSelected ? "true" : "false"}"
        >
          <strong>${escapeHtml(time)}</strong>
          <span>${escapeHtml(statusLabel)}</span>
        </button>
      `;
    })
    .join("");

  setAdminManualScheduleHelper(
    manualScheduleOccupiedSlots.size
      ? "Horários livres e ocupados atualizados em tempo real."
      : "Todos os horários mostrados abaixo estão livres no momento."
  );
};

const stopManualScheduleSubscription = () => {
  if (typeof unsubscribeManualSchedule === "function") {
    unsubscribeManualSchedule();
    unsubscribeManualSchedule = null;
  }
};

const subscribeManualScheduleAvailability = (barbeiro, data) => {
  stopManualScheduleSubscription();
  manualScheduleOccupiedSlots = new Set();

  if (!barbeiro || !data) {
    renderAdminManualScheduleGrid();
    return;
  }

  if (!hasFirebaseConfig) {
    renderAdminManualScheduleGrid();
    setAdminManualScheduleHelper("Os horários online não estão disponíveis agora.");
    return;
  }

  const scheduleQuery = query(
    getAppointmentsCollection(),
    where("barbeiro", "==", barbeiro),
    where("data", "==", data)
  );

  unsubscribeManualSchedule = onSnapshot(
    scheduleQuery,
    (snapshot) => {
      manualScheduleOccupiedSlots = new Set(
        snapshot.docs
          .map((appointmentDoc) => appointmentDoc.data())
          .filter(
            (appointment) =>
              String(appointment.status || "pendente").trim().toLowerCase() !== "cancelado"
          )
          .map((appointment) => String(appointment.horario || "").trim())
          .filter(Boolean)
      );

      if (
        adminManualTimeSelect?.value &&
        manualScheduleOccupiedSlots.has(adminManualTimeSelect.value)
      ) {
        clearSelectedAdminManualTime();
        setFeedbackMessage(
          adminManualFeedback,
          "O horário selecionado ficou indisponível. Escolha outro horário."
        );
      }

      renderAdminManualScheduleGrid();
    },
    () => {
      manualScheduleOccupiedSlots = new Set();
      renderAdminManualScheduleGrid();
      setAdminManualScheduleHelper("Não foi possível atualizar os horários agora.");
    }
  );
};

const syncAdminManualScheduleContext = () => {
  const selectedBarber = String(adminManualBarberSelect?.value || "").trim();
  const selectedDate = String(
    adminManualForm?.querySelector('input[name="data"]')?.value || ""
  ).trim();

  clearSelectedAdminManualTime();
  subscribeManualScheduleAvailability(selectedBarber, selectedDate);
};

const selectAdminManualTime = (time) => {
  if (!adminManualTimeSelect) {
    return false;
  }

  const normalizedTime = String(time || "").trim();

  if (!normalizedTime || manualScheduleOccupiedSlots.has(normalizedTime)) {
    return false;
  }

  const hasOption = [...adminManualTimeSelect.options].some(
    (option) => option.value === normalizedTime
  );

  if (!hasOption) {
    return false;
  }

  adminManualTimeSelect.value = normalizedTime;
  toggleFieldError(adminManualTimeSelect, false);
  toggleManualChoiceShellError(adminManualScheduleShell, false);
  renderAdminManualScheduleGrid();
  return true;
};

const attachRequiredFieldValidation = (fields) => {
  fields.forEach((field) => {
    const clearError = () => {
      if (field.value.trim()) {
        toggleFieldError(field, false);
      }
    };

    field.addEventListener("input", clearError);
    field.addEventListener("change", clearError);
  });
};

const buildWhatsappNumber = (phone) => {
  const sanitizedPhone = sanitizePhoneDigits(phone);

  if (!sanitizedPhone) {
    return "";
  }

  if (sanitizedPhone.startsWith("55") && sanitizedPhone.length === 13) {
    return sanitizedPhone;
  }

  if (sanitizedPhone.length !== 11) {
    return "";
  }

  return sanitizedPhone.startsWith("55")
    ? sanitizedPhone
    : `55${sanitizedPhone}`;
};

const buildAdminWhatsappUrl = (phone) => {
  const whatsappNumber = buildWhatsappNumber(phone);

  if (!whatsappNumber) {
    return "";
  }

  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    adminWhatsappMessage
  )}`;
};

const getAppointmentPayload = (formData, origem) => ({
  nome: String(formData.get("nome") || "").trim(),
  telefone: formatPhone(formData.get("telefone")),
  servico: String(formData.get("servico") || "").trim(),
  barbeiro: String(formData.get("barbeiro") || "").trim(),
  data: String(formData.get("data") || "").trim(),
  horario: String(formData.get("horario") || "").trim(),
  status: "pendente",
  origem,
});

const getBarberPayload = (formData) => ({
  nome: String(formData.get("nome") || "").trim(),
  fotoUrl: String(formData.get("fotoUrl") || "").trim(),
  ativo: true,
});

const isAdminLoggedIn = () =>
  localStorage.getItem(adminAuthStorageKey) === "true";

const setAdminLoggedIn = (isLoggedIn) => {
  localStorage.setItem(adminAuthStorageKey, String(isLoggedIn));
};

const populateBarberSelect = (select, barbers, placeholder) => {
  if (!select) {
    return;
  }

  const currentValue = select.value;
  select.innerHTML = "";

  const placeholderOption = document.createElement("option");
  placeholderOption.value = "";
  placeholderOption.textContent = placeholder;
  placeholderOption.disabled = true;
  placeholderOption.selected = true;
  select.append(placeholderOption);

  barbers.forEach((barber) => {
    const option = document.createElement("option");
    option.value = barber.nome;
    option.textContent = barber.nome;
    select.append(option);
  });

  if (currentValue && barbers.some((barber) => barber.nome === currentValue)) {
    select.value = currentValue;
    return;
  }

  select.value = "";
};

const populateBarberFilter = () => {
  if (!adminBarberFilter) {
    return;
  }

  const currentValue = adminBarberFilter.value || "all";
  const availableBarbers = getAvailableBarbers();
  adminBarberFilter.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "Todos os profissionais";
  adminBarberFilter.append(allOption);

  availableBarbers.forEach((barber) => {
    const option = document.createElement("option");
    option.value = barber.nome;
    option.textContent = barber.nome;
    adminBarberFilter.append(option);
  });

  adminBarberFilter.value = availableBarbers.some((barber) => barber.nome === currentValue)
    ? currentValue
    : "all";
};

const renderBarbers = () => {
  const availableBarbers = getAvailableBarbers();
  populateBarberSelect(
    adminManualBarberSelect,
    availableBarbers,
    "Selecione um barbeiro"
  );
  populateBarberFilter();

  if (!adminBarbersList) {
    return;
  }

  if (!availableBarbers.length) {
    adminBarbersList.innerHTML =
      '<p class="admin-empty-copy">Nenhum barbeiro cadastrado ainda.</p>';
    return;
  }

  renderAdminManualBarberCards();
  adminBarbersList.innerHTML = availableBarbers
    .map(
      (barber) => `
        <article class="admin-barber-card">
          <div class="admin-barber-card-media">
            <div class="admin-barber-avatar ${barber.fotoUrl ? "has-photo" : ""}">
              ${
                barber.fotoUrl
                  ? `<img src="${escapeHtml(barber.fotoUrl)}" alt="${escapeHtml(
                      barber.nome
                    )}" loading="lazy" onerror="this.remove(); this.parentElement.classList.remove('has-photo');">`
                  : ""
              }
              <span>${escapeHtml(getBarberInitial(barber.nome))}</span>
            </div>
          </div>
          <div class="admin-barber-card-head">
            <div>
              <h4>${escapeHtml(barber.nome)}</h4>
              <p>Barbeiro profissional</p>
            </div>
            <button
              class="admin-action action-delete"
              type="button"
              data-admin-barber-action="delete"
              data-admin-barber-id="${escapeHtml(barber.id)}"
            >
              Excluir
            </button>
          </div>
        </article>
      `
    )
    .join("");

  renderAdminDashboardOverview();
};

const seedDefaultBarbers = async () => {
  if (!hasFirebaseConfig || isSeedingDefaultBarbers) {
    return;
  }

  isSeedingDefaultBarbers = true;

  try {
    await Promise.all(
      defaultBarbers.map((barber) =>
        setDoc(doc(getBarbersCollection(), barber.id), {
          nome: barber.nome,
          fotoUrl: barber.fotoUrl,
          ativo: true,
          criadoEm: serverTimestamp(),
        })
      )
    );
  } finally {
    isSeedingDefaultBarbers = false;
  }
};

const stopBarbersSubscription = () => {
  if (typeof unsubscribeBarbers === "function") {
    unsubscribeBarbers();
    unsubscribeBarbers = null;
  }
};

const subscribeBarbers = () => {
  stopBarbersSubscription();

  if (!hasFirebaseConfig) {
    barbersState = defaultBarbers.map((barber) => ({ ...barber }));
    renderBarbers();
    setFeedbackMessage(
      adminBarberFeedback,
      "O Firebase dos barbeiros ainda não está disponível."
    );
    return;
  }

  unsubscribeBarbers = onSnapshot(
    getBarbersCollection(),
    (snapshot) => {
      if (snapshot.empty) {
        barbersState = defaultBarbers.map((barber) => ({ ...barber }));
        renderBarbers();
        seedDefaultBarbers();
        return;
      }

      barbersState = snapshot.docs
        .map((snapshotDoc) =>
          normalizeBarber({
            id: snapshotDoc.id,
            ...snapshotDoc.data(),
          })
        )
        .filter((barber) => barber && barber.ativo);

      renderBarbers();
      setFeedbackMessage(adminBarberFeedback, "");
    },
    () => {
      setFeedbackMessage(
        adminBarberFeedback,
        "Não foi possível carregar os barbeiros agora."
      );
    }
  );
};

const saveBarber = async (barber) => {
  if (!hasFirebaseConfig) {
    throw new Error("firebase-not-configured");
  }

  await addDoc(getBarbersCollection(), {
    nome: barber.nome,
    fotoUrl: barber.fotoUrl,
    ativo: true,
    criadoEm: serverTimestamp(),
  });
};

const deleteBarber = async (barberId) => {
  if (!hasFirebaseConfig) {
    throw new Error("firebase-not-configured");
  }

  await deleteDoc(doc(getBarbersCollection(), barberId));
};

const updateAdminVisibility = () => {
  const isLoggedIn = isAdminLoggedIn();
  document.body.classList.toggle("is-admin-authenticated", isLoggedIn);

  if (adminLoginForm) {
    adminLoginForm.hidden = isLoggedIn;
  }

  if (adminContent) {
    adminContent.hidden = !isLoggedIn;
  }
};

const setActiveAdminTab = (tabId) => {
  const requestedTabId = tabId || "dashboard";
  const nextTabId =
    requestedTabId === "comandas"
      ? "agenda"
      : requestedTabId && [...adminViews].some((view) => view.getAttribute("data-admin-view") === requestedTabId)
        ? requestedTabId
        : "dashboard";

  activeAdminTab = requestedTabId;

  adminTabTriggers.forEach((trigger) => {
    const isActive = trigger.getAttribute("data-admin-tab-trigger") === requestedTabId;
    trigger.classList.toggle("is-active", isActive);
    trigger.setAttribute("aria-pressed", String(isActive));

    if (isActive) {
      if (adminCurrentTitle) {
        adminCurrentTitle.textContent =
          trigger.getAttribute("data-admin-tab-title") || "Dashboard";
      }

      if (adminCurrentCopy) {
        adminCurrentCopy.textContent =
          trigger.getAttribute("data-admin-tab-copy") ||
          "Visão geral rápida da operação, próximos atendimentos e status do dia.";
      }
    }
  });

  adminViews.forEach((view) => {
    const isActive = view.getAttribute("data-admin-view") === nextTabId;
    view.hidden = !isActive;
    view.classList.toggle("is-active", isActive);
  });
};

const closeManualForm = () => {
  if (!adminManualForm) {
    return;
  }

  stopManualScheduleSubscription();
  manualScheduleOccupiedSlots = new Set();
  adminManualForm.hidden = true;
  adminManualForm.reset();
  clearFormErrors(adminManualForm);
  populateBarberSelect(
    adminManualBarberSelect,
    getAvailableBarbers(),
    "Selecione um barbeiro"
  );
  renderAdminManualBarberCards();
  renderAdminManualDateChips();
  updateAdminManualDateInput();
  toggleManualChoiceShellError(adminManualServiceShell, false);
  toggleManualChoiceShellError(adminManualBarberShell, false);
  toggleManualChoiceShellError(adminManualDateShell, false);
  toggleManualChoiceShellError(adminManualScheduleShell, false);
  renderAdminManualServiceCards();
  setAdminManualServicePanelState(false);
  renderAdminManualScheduleGrid();
  setFeedbackMessage(adminManualFeedback, "");
};

const openManualForm = () => {
  if (!adminManualForm) {
    return;
  }

  setActiveAdminTab("agenda");
  adminManualForm.hidden = false;
  populateBarberSelect(
    adminManualBarberSelect,
    getAvailableBarbers(),
    "Selecione um barbeiro"
  );
  renderAdminManualBarberCards();

  const manualDateField = adminManualForm.querySelector('input[name="data"]');

  if (manualDateField) {
    manualDateField.min = getTodayDateValue();

    if (adminManualDateInput) {
      adminManualDateInput.min = manualDateField.min;
    }
  }

  renderAdminManualDateChips();
  updateAdminManualDateInput();
  renderAdminManualServiceCards();
  setAdminManualServicePanelState(false);
  renderAdminManualScheduleGrid();
  setAdminManualScheduleHelper(defaultAdminManualScheduleHelper);
};

const renderAdminSummary = (appointments) => {
  if (!adminTotal || !adminPending || !adminCompleted || !adminCancelled) {
    return;
  }

  adminTotal.textContent = String(appointments.length);
  adminPending.textContent = String(
    appointments.filter((appointment) => appointment.status === "pendente").length
  );
  adminCompleted.textContent = String(
    appointments.filter((appointment) => appointment.status === "concluído").length
  );
  adminCancelled.textContent = String(
    appointments.filter((appointment) => appointment.status === "cancelado").length
  );
};

const renderAdminDashboardBarberAgenda = () => {
  if (!adminBarberAgendaGrid) {
    return;
  }

  const todayValue = getTodayDateValue();
  const slots = getAdminManualScheduleSlots();
  const availableBarbers = getAvailableBarbers();
  const todayAppointments = appointmentsState
    .filter(
      (appointment) =>
        String(appointment.data || "").trim() === todayValue &&
        normalizeStatusClass(appointment.status || "pendente") !== "cancelado"
    )
    .sort(
      (firstAppointment, secondAppointment) =>
        getAppointmentTimestamp(firstAppointment) - getAppointmentTimestamp(secondAppointment)
    );

  adminBarberAgendaGrid.innerHTML = availableBarbers
    .map((barber) => {
      const barberAppointments = todayAppointments.filter(
        (appointment) => String(appointment.barbeiro || "").trim() === barber.nome
      );
      const barberNextSlot = barberAppointments.length
        ? String(barberAppointments[0].horario || "").trim()
        : "";

      const scheduleRows = slots
        .map((time) => {
          const occupiedAppointment = barberAppointments.find(
            (appointment) => String(appointment.horario || "").trim() === time
          );
          const isOccupied = Boolean(occupiedAppointment);
          const isNext = Boolean(barberNextSlot) && barberNextSlot === time;
          const statusLabel = isOccupied ? "Ocupado" : "Livre";
          const serviceLabel = isOccupied
            ? escapeHtml(occupiedAppointment.servico || "Serviço")
            : "Livre";
          const clientLabel = isOccupied
            ? `Cliente: ${escapeHtml(occupiedAppointment.nome || "Cliente")}`
            : "Livre";

          return `
            <article class="admin-barber-slot ${isOccupied ? "is-occupied" : "is-free"} ${isNext ? "is-next" : ""}">
              <div class="admin-barber-slot-time">
                <strong>${escapeHtml(time)}</strong>
                ${isNext ? '<span class="admin-barber-slot-badge">Próximo</span>' : ""}
              </div>
              <div class="admin-barber-slot-content">
                <span class="admin-barber-slot-status">${statusLabel}</span>
                ${
                  isOccupied
                    ? `
                      <span class="admin-barber-slot-client">${clientLabel}</span>
                      <span class="admin-barber-slot-service">Serviço: ${serviceLabel}</span>
                    `
                    : '<span class="admin-barber-slot-free-copy">Livre</span>'
                }
              </div>
            </article>
          `;
        })
        .join("");

      return `
        <article class="admin-barber-agenda-card">
          <div class="admin-barber-agenda-head">
            <div>
              <h4>${escapeHtml(barber.nome)}</h4>
              <p>${escapeHtml(formatDate(todayValue))}</p>
            </div>
            <span class="admin-barber-agenda-meta">
              ${barberAppointments.length ? `${barberAppointments.length} ocupados` : "Agenda livre"}
            </span>
          </div>
          <div class="admin-barber-agenda-slots">
            ${scheduleRows || '<p class="admin-empty-copy">Nenhum horário disponível hoje.</p>'}
          </div>
        </article>
      `;
    })
    .join("");
};

const getAppointmentTimestamp = (appointment) => {
  const date = String(appointment?.data || "").trim();
  const time = String(appointment?.horario || "").trim();

  if (!date || !time) {
    return Number.POSITIVE_INFINITY;
  }

  return new Date(`${date}T${time}:00`).getTime();
};

const renderAdminDashboardOverview = () => {
  const activeAppointments = appointmentsState.filter(
    (appointment) => normalizeStatusClass(appointment.status || "pendente") !== "cancelado"
  );
  const sortedUpcomingAppointments = [...activeAppointments].sort(
    (firstAppointment, secondAppointment) =>
      getAppointmentTimestamp(firstAppointment) - getAppointmentTimestamp(secondAppointment)
  );
  const todayValue = getTodayDateValue();
  const todayAppointments = activeAppointments.filter(
    (appointment) => String(appointment.data || "").trim() === todayValue
  );

  if (adminToday) {
    adminToday.textContent = String(todayAppointments.length);
  }

  if (adminUpcomingCount) {
    adminUpcomingCount.textContent = String(sortedUpcomingAppointments.length);
  }

  if (adminBusySlots) {
    adminBusySlots.textContent = String(activeAppointments.length);
  }

  if (adminActiveBarbers) {
    adminActiveBarbers.textContent = String(getAvailableBarbers().length);
  }

  renderAdminDashboardBarberAgenda();

  if (!adminUpcomingList) {
    return;
  }

  const nextAppointments = sortedUpcomingAppointments.slice(0, 5);

  if (!nextAppointments.length) {
    adminUpcomingList.innerHTML =
      '<p class="admin-empty-copy">Nenhum atendimento próximo encontrado.</p>';
    return;
  }

  const hasMoreUpcomingAppointments = sortedUpcomingAppointments.length > nextAppointments.length;

  adminUpcomingList.innerHTML = `
    <div class="admin-upcoming-table-shell">
      <div class="admin-upcoming-table">
        <div class="admin-upcoming-table-head">
          <span>Hora</span>
          <span>Cliente</span>
          <span>Serviço</span>
          <span>Barbeiro</span>
          <span>Status</span>
        </div>
        <div class="admin-upcoming-table-body">
          ${nextAppointments
            .map(
              (appointment, index) => `
                <article class="admin-upcoming-row ${index === 0 ? "is-next" : ""}">
                  <div class="admin-upcoming-cell admin-upcoming-cell--time">
                    <div class="admin-upcoming-time-top">
                      <strong>${escapeHtml(appointment.horario || "-")}</strong>
                      ${index === 0 ? '<span class="admin-upcoming-badge">Próximo</span>' : ""}
                    </div>
                  </div>
                  <div class="admin-upcoming-cell admin-upcoming-cell--client">
                    <strong>${escapeHtml(appointment.nome || "Cliente")}</strong>
                  </div>
                  <div class="admin-upcoming-cell admin-upcoming-cell--service">
                    <span>${escapeHtml(appointment.servico || "-")}</span>
                  </div>
                  <div class="admin-upcoming-cell admin-upcoming-cell--barber">
                    <span>${escapeHtml(appointment.barbeiro || "-")}</span>
                  </div>
                  <div class="admin-upcoming-cell admin-upcoming-cell--status">
                    <span class="admin-status status-${normalizeStatusClass(
                      appointment.status || "pendente"
                    )}">${escapeHtml(appointment.status || "pendente")}</span>
                  </div>
                </article>
              `
            )
            .join("")}
        </div>
      </div>
      ${
        hasMoreUpcomingAppointments
          ? '<p class="admin-upcoming-note">Veja todos na agenda completa.</p>'
          : ""
      }
    </div>
  `;
};

const getFilteredAppointments = (appointments) => {
  const selectedStatus = adminStatusFilter?.value || "all";
  const selectedStartDate = adminDateStartFilter?.value || "";
  const selectedEndDate = adminDateEndFilter?.value || "";
  const selectedBarber = adminBarberFilter?.value || "all";
  const searchTerm = String(adminSearchFilter?.value || "")
    .trim()
    .toLocaleLowerCase("pt-BR");

  return appointments.filter((appointment) => {
    const matchesStatus =
      selectedStatus === "all" ||
      normalizeStatusClass(appointment.status || "") === selectedStatus;
    const appointmentDate = String(appointment.data || "").trim();
    const matchesStartDate = !selectedStartDate || appointmentDate >= selectedStartDate;
    const matchesEndDate = !selectedEndDate || appointmentDate <= selectedEndDate;
    const matchesBarber =
      selectedBarber === "all" || String(appointment.barbeiro || "").trim() === selectedBarber;
    const searchableContent = [
      String(appointment.nome || ""),
      String(appointment.telefone || ""),
    ]
      .join(" ")
      .toLocaleLowerCase("pt-BR");
    const matchesSearch = !searchTerm || searchableContent.includes(searchTerm);

    return (
      matchesStatus &&
      matchesStartDate &&
      matchesEndDate &&
      matchesBarber &&
      matchesSearch
    );
  });
};

const updateAdminEmptyState = (message = defaultAdminEmptyMessage) => {
  if (!adminEmpty) {
    return;
  }

  adminEmpty.textContent = message;
};

const hasActiveAppointmentFilters = () =>
  Boolean(
    (adminStatusFilter && adminStatusFilter.value !== "all") ||
      (adminDateStartFilter && adminDateStartFilter.value) ||
      (adminDateEndFilter && adminDateEndFilter.value) ||
      (adminBarberFilter && adminBarberFilter.value !== "all") ||
      (adminSearchFilter && adminSearchFilter.value.trim())
  );

const renderAppointments = () => {
  if (!adminList || !adminEmpty) {
    return;
  }

  renderAdminSummary(appointmentsState);
  renderAdminDashboardOverview();
  const filteredAppointments = getFilteredAppointments(appointmentsState);
  const emptyMessage = hasActiveAppointmentFilters()
    ? "Nenhum agendamento encontrado para os filtros selecionados."
    : defaultAdminEmptyMessage;

  updateAdminEmptyState(emptyMessage);
  adminEmpty.hidden = filteredAppointments.length > 0;
  adminList.innerHTML = filteredAppointments
    .map(
      (appointment) => `
        <article class="admin-card">
          <div class="admin-card-head">
            <h3>${escapeHtml(appointment.nome || "Cliente")}</h3>
            <span class="admin-status status-${normalizeStatusClass(
              appointment.status || "pendente"
            )}">${escapeHtml(appointment.status || "pendente")}</span>
          </div>

          <div class="admin-details">
            <div class="admin-item">
              <span>Telefone</span>
              <strong>${escapeHtml(appointment.telefone || "-")}</strong>
            </div>
            <div class="admin-item">
              <span>Serviço</span>
              <strong>${escapeHtml(appointment.servico || "-")}</strong>
            </div>
            <div class="admin-item">
              <span>Barbeiro</span>
              <strong>${escapeHtml(appointment.barbeiro || "-")}</strong>
            </div>
            <div class="admin-item">
              <span>Data</span>
              <strong>${escapeHtml(
                formatDate(String(appointment.data || "-"))
              )}</strong>
            </div>
            <div class="admin-item">
              <span>Horário</span>
              <strong>${escapeHtml(appointment.horario || "-")}</strong>
            </div>
            <div class="admin-item">
              <span>Status</span>
              <strong>${escapeHtml(appointment.status || "pendente")}</strong>
            </div>
          </div>

          <div class="admin-actions">
            <button
              class="admin-action action-whatsapp"
              type="button"
              data-admin-action="whatsapp"
              data-admin-id="${escapeHtml(appointment.id)}"
            >
              Chamar no WhatsApp
            </button>
            <button
              class="admin-action action-complete"
              type="button"
              data-admin-action="complete"
              data-admin-id="${escapeHtml(appointment.id)}"
            >
              Concluir
            </button>
            <button
              class="admin-action action-cancel"
              type="button"
              data-admin-action="cancel"
              data-admin-id="${escapeHtml(appointment.id)}"
            >
              Cancelar
            </button>
            <button
              class="admin-action action-delete"
              type="button"
              data-admin-action="delete"
              data-admin-id="${escapeHtml(appointment.id)}"
            >
              Excluir
            </button>
          </div>
        </article>
      `
    )
    .join("");

  if (!adminTableBody) {
    return;
  }

  if (!filteredAppointments.length) {
    adminTableBody.innerHTML =
      '<tr><td colspan="8" class="admin-table-empty">Nenhum agendamento encontrado para os filtros selecionados.</td></tr>';
    return;
  }

  adminTableBody.innerHTML = filteredAppointments
    .map(
      (appointment) => `
        <tr>
          <td>${escapeHtml(appointment.nome || "-")}</td>
          <td>${escapeHtml(appointment.telefone || "-")}</td>
          <td>${escapeHtml(appointment.servico || "-")}</td>
          <td>${escapeHtml(appointment.barbeiro || "-")}</td>
          <td>${escapeHtml(formatDate(String(appointment.data || "-")))}</td>
          <td>${escapeHtml(appointment.horario || "-")}</td>
          <td>
            <span class="admin-status status-${normalizeStatusClass(
              appointment.status || "pendente"
            )}">${escapeHtml(appointment.status || "pendente")}</span>
          </td>
          <td>
            <div class="admin-table-actions">
              <button
                class="admin-action action-whatsapp"
                type="button"
                data-admin-action="whatsapp"
                data-admin-id="${escapeHtml(appointment.id)}"
                >
                  WhatsApp
                </button>
                <button
                  class="admin-action action-complete"
                type="button"
                data-admin-action="complete"
                data-admin-id="${escapeHtml(appointment.id)}"
                >
                  Concluir
                </button>
                <button
                  class="admin-action action-cancel"
                  type="button"
                  data-admin-action="cancel"
                  data-admin-id="${escapeHtml(appointment.id)}"
                >
                  Cancelar
                </button>
              </div>
            </td>
        </tr>
      `
    )
    .join("");
};

const getFirebaseErrorMessage = (fallbackMessage) => {
  if (lastAppointmentConflict) {
    lastAppointmentConflict = false;
    return "Esse hor\u00e1rio j\u00e1 est\u00e1 ocupado para este profissional. Escolha outro hor\u00e1rio.";
  }

  if (!hasFirebaseConfig) {
    return "O Firebase ainda não está configurado. Cole o firebaseConfig em firebase-config.js para liberar os agendamentos online.";
  }

  return fallbackMessage;
};

const stopAppointmentsSubscription = () => {
  if (typeof unsubscribeAppointments === "function") {
    unsubscribeAppointments();
    unsubscribeAppointments = null;
  }
};

const subscribeAppointments = () => {
  stopAppointmentsSubscription();

  if (!hasFirebaseConfig) {
    appointmentsState = [];
    updateAdminEmptyState(getFirebaseErrorMessage(defaultAdminEmptyMessage));
    renderAppointments();
    setFeedbackMessage(
      adminFeedback,
      getFirebaseErrorMessage(defaultAdminEmptyMessage)
    );
    return;
  }

  updateAdminEmptyState(defaultAdminEmptyMessage);

  const appointmentsQuery = query(
    getAppointmentsCollection(),
    orderBy("criadoEm", "desc")
  );

  unsubscribeAppointments = onSnapshot(
    appointmentsQuery,
    (snapshot) => {
      appointmentsState = snapshot.docs.map((snapshotDoc) => ({
        id: snapshotDoc.id,
        ...snapshotDoc.data(),
      }));

      updateAdminEmptyState(defaultAdminEmptyMessage);
      renderAppointments();
      setFeedbackMessage(adminFeedback, "");
    },
    () => {
      appointmentsState = [];
      updateAdminEmptyState(
        getFirebaseErrorMessage(
          "Não foi possível carregar os agendamentos agora. Tente novamente em instantes."
        )
      );
      renderAppointments();
      setFeedbackMessage(
        adminFeedback,
        getFirebaseErrorMessage(
          "Não foi possível carregar os agendamentos agora. Tente novamente em instantes."
        )
      );
    }
  );
};

const findAppointmentConflict = async ({ barbeiro, data, horario }) => {
  if (!hasFirebaseConfig) {
    throw new Error("firebase-not-configured");
  }

  const appointmentsQuery = query(
    getAppointmentsCollection(),
    where("barbeiro", "==", barbeiro),
    where("data", "==", data),
    where("horario", "==", horario)
  );
  const snapshot = await getDocs(appointmentsQuery);

  return snapshot.docs.some((appointmentDoc) => {
    const status = String(appointmentDoc.data().status || "pendente").trim().toLowerCase();

    return status !== "cancelado";
  });
};

const saveAppointment = async (appointment) => {
  if (!hasFirebaseConfig) {
    throw new Error("firebase-not-configured");
  }

  lastAppointmentConflict = false;

  if (await findAppointmentConflict(appointment)) {
    lastAppointmentConflict = true;
    throw new Error("slot-conflict");
  }

  await addDoc(getAppointmentsCollection(), {
    ...appointment,
    criadoEm: serverTimestamp(),
  });
};

const updateAppointmentStatus = async (appointmentId, status) => {
  if (!hasFirebaseConfig) {
    throw new Error("firebase-not-configured");
  }

  await updateDoc(doc(getAppointmentsCollection(), appointmentId), { status });
};

const deleteAppointment = async (appointmentId) => {
  if (!hasFirebaseConfig) {
    throw new Error("firebase-not-configured");
  }

  await deleteDoc(doc(getAppointmentsCollection(), appointmentId));
};

if (adminLoginForm && adminFeedback) {
  adminLoginForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(adminLoginForm);
    const email = String(formData.get("adminEmail") || "").trim().toLowerCase();
    const password = String(formData.get("adminPassword") || "").trim();

    if (
      email !== adminCredentials.email ||
      password !== adminCredentials.password
    ) {
      setFeedbackMessage(adminFeedback, "E-mail ou senha incorretos.");
      return;
    }

    setAdminLoggedIn(true);
    setFeedbackMessage(adminFeedback, "");
    adminLoginForm.reset();
    updateAdminVisibility();
    subscribeBarbers();
    subscribeAppointments();
  });
}

if (adminLogoutButton) {
  adminLogoutButton.addEventListener("click", () => {
    setAdminLoggedIn(false);
    stopAppointmentsSubscription();
    stopBarbersSubscription();
    appointmentsState = [];
    barbersState = defaultBarbers.map((barber) => ({ ...barber }));
    closeManualForm();
    setFeedbackMessage(adminFeedback, "");
    setFeedbackMessage(adminBarberFeedback, "");
    updateAdminVisibility();
  });
}

if (adminToggleManualButton) {
  adminToggleManualButton.addEventListener("click", () => {
    if (!adminManualForm) {
      return;
    }

    if (adminManualForm.hidden) {
      openManualForm();
      return;
    }

    closeManualForm();
  });
}

if (adminCloseManualButton) {
  adminCloseManualButton.addEventListener("click", closeManualForm);
}

if (adminDashboardOpenAgendaButton) {
  adminDashboardOpenAgendaButton.addEventListener("click", () => {
    setActiveAdminTab("agenda");
  });
}

if (adminManualForm && adminManualFeedback) {
  const manualRequiredFields = [...adminManualForm.querySelectorAll("[required]")];
  const manualDateField = adminManualForm.querySelector('input[name="data"]');
  const manualPhoneField = adminManualForm.querySelector('input[name="telefone"]');

  if (manualDateField) {
    manualDateField.min = getTodayDateValue();

    if (adminManualDateInput) {
      adminManualDateInput.min = manualDateField.min;
    }
  }

  if (manualPhoneField) {
    manualPhoneField.setAttribute("inputmode", "numeric");
    manualPhoneField.setAttribute("autocomplete", "tel");
    manualPhoneField.setAttribute("maxlength", "15");
    manualPhoneField.addEventListener("input", () => {
      manualPhoneField.value = formatPhone(manualPhoneField.value);
    });
  }

  if (adminManualServiceSelect) {
    adminManualServiceSelect.addEventListener("change", () => {
      toggleManualChoiceShellError(adminManualServiceShell, false);
      renderAdminManualServiceCards();
    });
  }

  if (adminManualServiceToggle) {
    adminManualServiceToggle.addEventListener("click", () => {
      const isExpanded = adminManualServiceToggle.getAttribute("aria-expanded") === "true";
      setAdminManualServicePanelState(!isExpanded);
    });
  }

  if (adminManualServiceGrid) {
    adminManualServiceGrid.addEventListener("click", (event) => {
      const serviceButton = event.target.closest("[data-admin-manual-service]");

      if (!serviceButton) {
        return;
      }

      const selectedService = String(
        serviceButton.getAttribute("data-admin-manual-service") || ""
      ).trim();

      if (!selectedService) {
        return;
      }

      selectAdminManualService(selectedService);
    });
  }

  if (adminManualBarberSelect) {
    adminManualBarberSelect.addEventListener("change", () => {
      toggleFieldError(adminManualBarberSelect, false);
      toggleManualChoiceShellError(adminManualBarberShell, false);
      renderAdminManualBarberCards();
      syncAdminManualScheduleContext();
    });
  }

  if (adminManualBarberGrid) {
    adminManualBarberGrid.addEventListener("click", (event) => {
      const barberButton = event.target.closest("[data-admin-manual-barber]");

      if (!barberButton) {
        return;
      }

      const selectedBarber = String(
        barberButton.getAttribute("data-admin-manual-barber") || ""
      ).trim();

      if (!selectedBarber) {
        return;
      }

      selectAdminManualBarber(selectedBarber);
    });
  }

  if (manualDateField) {
    manualDateField.addEventListener("change", () => {
      toggleFieldError(manualDateField, false);
      toggleManualChoiceShellError(adminManualDateShell, false);
      renderAdminManualDateChips();
      syncAdminManualScheduleContext();
    });
  }

  if (adminManualDateGrid) {
    adminManualDateGrid.addEventListener("click", (event) => {
      const dateButton = event.target.closest("[data-admin-manual-date]");

      if (!dateButton) {
        return;
      }

      const selectedDate = String(
        dateButton.getAttribute("data-admin-manual-date") || ""
      ).trim();

      if (!selectedDate) {
        return;
      }

      selectAdminManualDate(selectedDate);
    });
  }

  if (adminManualDateInput) {
    adminManualDateInput.addEventListener("change", () => {
      const selectedDate = String(adminManualDateInput.value || "").trim();

      if (!selectedDate) {
        return;
      }

      selectAdminManualDate(selectedDate);
    });
  }

  if (adminManualTimeSelect) {
    adminManualTimeSelect.addEventListener("change", () => {
      toggleManualChoiceShellError(adminManualScheduleShell, false);
      renderAdminManualScheduleGrid();
    });
  }

  if (adminManualScheduleGrid) {
    adminManualScheduleGrid.addEventListener("click", (event) => {
      const timeButton = event.target.closest("[data-admin-manual-time]");

      if (!timeButton || timeButton.disabled) {
        return;
      }

      const selectedTime = String(
        timeButton.getAttribute("data-admin-manual-time") || ""
      ).trim();

      if (!selectedTime) {
        return;
      }

      selectAdminManualTime(selectedTime);
    });
  }

  attachRequiredFieldValidation(manualRequiredFields);
  renderAdminManualServiceCards();
  renderAdminManualBarberCards();
  renderAdminManualDateChips();
  updateAdminManualDateInput();
  setAdminManualServicePanelState(false);
  renderAdminManualScheduleGrid();

  adminManualForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    let hasError = false;

    manualRequiredFields.forEach((field) => {
      const isInvalid = field.value.trim() === "";
      toggleFieldError(field, isInvalid);

      if (isInvalid) {
        hasError = true;
      }
    });

    toggleManualChoiceShellError(
      adminManualServiceShell,
      !String(adminManualServiceSelect?.value || "").trim()
    );
    toggleManualChoiceShellError(
      adminManualBarberShell,
      !String(adminManualBarberSelect?.value || "").trim()
    );
    toggleManualChoiceShellError(
      adminManualDateShell,
      !String(manualDateField?.value || "").trim()
    );
    toggleManualChoiceShellError(
      adminManualScheduleShell,
      !String(adminManualTimeSelect?.value || "").trim()
    );

    if (hasError) {
      setFeedbackMessage(
        adminManualFeedback,
        "Preencha todos os campos para continuar."
      );
      return;
    }

    if (manualDateField && manualDateField.value < getTodayDateValue()) {
      toggleFieldError(manualDateField, true);
      setFeedbackMessage(
        adminManualFeedback,
        "Escolha uma data igual ou posterior ao dia de hoje."
      );
      return;
    }

    if (manualPhoneField && !hasValidPhoneDigits(manualPhoneField.value)) {
      toggleFieldError(manualPhoneField, true);
      setFeedbackMessage(
        adminManualFeedback,
        "Informe um telefone válido com DDD."
      );
      return;
    }

    const submitButton = adminManualForm.querySelector('button[type="submit"]');
    const appointment = getAppointmentPayload(new FormData(adminManualForm), "admin");

    if (submitButton) {
      submitButton.disabled = true;
    }

    setFeedbackMessage(adminManualFeedback, "Salvando agendamento...");

    try {
      await saveAppointment(appointment);
      setFeedbackMessage(
        adminManualFeedback,
        "Agendamento manual salvo com sucesso.",
        true
      );

      setTimeout(() => {
        closeManualForm();
      }, 500);
    } catch (error) {
      setFeedbackMessage(
        adminManualFeedback,
        getFirebaseErrorMessage(
          "Não foi possível salvar o agendamento manual agora. Tente novamente."
        )
      );
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  });
}

document.addEventListener("click", (event) => {
  if (
    !adminManualServiceShell ||
    !adminManualServiceToggle ||
    !adminManualServicePanel ||
    adminManualServicePanel.hidden
  ) {
    return;
  }

  const clickedInsideServiceShell = event.target.closest("[data-admin-manual-service-shell]");

  if (!clickedInsideServiceShell) {
    setAdminManualServicePanelState(false);
  }
});

if (adminBarberForm && adminBarberFeedback) {
  const barberRequiredFields = [...adminBarberForm.querySelectorAll('[name="nome"][required]')];

  attachRequiredFieldValidation(barberRequiredFields);

  adminBarberForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    let hasError = false;

    barberRequiredFields.forEach((field) => {
      const isInvalid = field.value.trim() === "";
      toggleFieldError(field, isInvalid);

      if (isInvalid) {
        hasError = true;
      }
    });

    if (hasError) {
      setFeedbackMessage(
        adminBarberFeedback,
        "Preencha o nome do barbeiro para continuar."
      );
      return;
    }

    const barber = getBarberPayload(new FormData(adminBarberForm));
    const barberAlreadyExists = getAvailableBarbers().some(
      (savedBarber) =>
        savedBarber.nome.localeCompare(barber.nome, "pt-BR", {
          sensitivity: "base",
        }) === 0
    );

    if (barberAlreadyExists) {
      setFeedbackMessage(
        adminBarberFeedback,
        "Já existe um barbeiro cadastrado com esse nome."
      );
      return;
    }

    const submitButton = adminBarberForm.querySelector('button[type="submit"]');

    if (submitButton) {
      submitButton.disabled = true;
    }

    setFeedbackMessage(adminBarberFeedback, "Salvando barbeiro...");

    try {
      await saveBarber(barber);
      adminBarberForm.reset();
      clearFormErrors(adminBarberForm);
      setFeedbackMessage(
        adminBarberFeedback,
        "Barbeiro salvo com sucesso.",
        true
      );
    } catch (error) {
      setFeedbackMessage(
        adminBarberFeedback,
        "Não foi possível salvar o barbeiro agora. Tente novamente."
      );
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  });
}

if (adminStatusFilter) {
  adminStatusFilter.addEventListener("change", renderAppointments);
}

if (adminDateStartFilter) {
  adminDateStartFilter.addEventListener("change", renderAppointments);
}

if (adminDateEndFilter) {
  adminDateEndFilter.addEventListener("change", renderAppointments);
}

if (adminBarberFilter) {
  adminBarberFilter.addEventListener("change", renderAppointments);
}

if (adminSearchFilter) {
  adminSearchFilter.addEventListener("input", renderAppointments);
}

if (adminFiltersForm) {
  adminFiltersForm.addEventListener("submit", (event) => {
    event.preventDefault();
    renderAppointments();
  });
}

if (adminFilterTodayButton) {
  adminFilterTodayButton.addEventListener("click", () => {
    const todayValue = getTodayDateValue();

    if (adminDateStartFilter) {
      adminDateStartFilter.value = todayValue;
    }

    if (adminDateEndFilter) {
      adminDateEndFilter.value = todayValue;
    }

    renderAppointments();
  });
}

if (adminClearFiltersButton) {
  adminClearFiltersButton.addEventListener("click", () => {
    if (adminStatusFilter) {
      adminStatusFilter.value = "all";
    }

    if (adminDateStartFilter) {
      adminDateStartFilter.value = "";
    }

    if (adminDateEndFilter) {
      adminDateEndFilter.value = "";
    }

    if (adminBarberFilter) {
      adminBarberFilter.value = "all";
    }

    if (adminSearchFilter) {
      adminSearchFilter.value = "";
    }

    renderAppointments();
  });
}

const handleAdminActionClick = async (event) => {
  const actionButton = event.target.closest("[data-admin-action]");

  if (!actionButton) {
    return;
  }

  const action = actionButton.getAttribute("data-admin-action");
  const appointmentId = String(
    actionButton.getAttribute("data-admin-id") || ""
  ).trim();
  const appointment = appointmentsState.find(
    (savedAppointment) => savedAppointment.id === appointmentId
  );

  if (!appointment) {
    return;
  }

  if (action === "whatsapp") {
    const whatsappUrl = buildAdminWhatsappUrl(appointment.telefone);

    if (!whatsappUrl) {
      return;
    }

    window.open(whatsappUrl, "_blank", "noopener");
    return;
  }

  try {
    if (action === "delete") {
      await deleteAppointment(appointmentId);
    } else if (action === "complete") {
      await updateAppointmentStatus(appointmentId, "concluído");
    } else if (action === "cancel") {
      await updateAppointmentStatus(appointmentId, "cancelado");
    }
  } catch (error) {
    setFeedbackMessage(
      adminFeedback,
      getFirebaseErrorMessage(
        "Não foi possível atualizar este agendamento agora. Tente novamente."
      )
    );
  }
};

if (adminList) {
  adminList.addEventListener("click", handleAdminActionClick);
}

if (adminTableBody) {
  adminTableBody.addEventListener("click", handleAdminActionClick);
}

if (adminBarbersList) {
  adminBarbersList.addEventListener("click", async (event) => {
    const deleteButton = event.target.closest("[data-admin-barber-action]");

    if (!deleteButton) {
      return;
    }

    const action = deleteButton.getAttribute("data-admin-barber-action");
    const barberId = String(deleteButton.getAttribute("data-admin-barber-id") || "").trim();

    if (action !== "delete" || !barberId) {
      return;
    }

    try {
      await deleteBarber(barberId);
    } catch (error) {
      setFeedbackMessage(
        adminBarberFeedback,
        "Não foi possível excluir o barbeiro agora. Tente novamente."
      );
    }
  });
}

updateAdminVisibility();
renderBarbers();
setActiveAdminTab(activeAdminTab);

adminTabTriggers.forEach((trigger) => {
  trigger.addEventListener("click", () => {
    setActiveAdminTab(trigger.getAttribute("data-admin-tab-trigger") || "dashboard");
  });
});

if (isAdminLoggedIn()) {
  subscribeBarbers();
  subscribeAppointments();
}

