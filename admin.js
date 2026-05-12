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
const adminManualBarberSelect = document.querySelector(
  "[data-admin-manual-barber-select]"
);
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
const adminToday = document.querySelector("[data-admin-today]");
const adminUpcomingCount = document.querySelector("[data-admin-upcoming-count]");
const adminBusySlots = document.querySelector("[data-admin-busy-slots]");
const adminActiveBarbers = document.querySelector("[data-admin-active-barbers]");
const adminTableBody = document.querySelector("[data-admin-table-body]");

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

const getTodayDateValue = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
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

const setFeedbackMessage = (element, message, isSuccess = false) => {
  if (!element) {
    return;
  }

  element.textContent = message;
  element.classList.toggle("is-success", isSuccess);
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

  adminManualForm.hidden = true;
  adminManualForm.reset();
  clearFormErrors(adminManualForm);
  populateBarberSelect(
    adminManualBarberSelect,
    getAvailableBarbers(),
    "Selecione um barbeiro"
  );
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

  const manualDateField = adminManualForm.querySelector('input[name="data"]');

  if (manualDateField) {
    manualDateField.min = getTodayDateValue();
  }
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

  if (!adminUpcomingList) {
    return;
  }

  const nextAppointments = sortedUpcomingAppointments.slice(0, 4);

  if (!nextAppointments.length) {
    adminUpcomingList.innerHTML =
      '<p class="admin-empty-copy">Nenhum atendimento ativo para exibir agora.</p>';
    return;
  }

  adminUpcomingList.innerHTML = nextAppointments
    .map(
      (appointment) => `
        <article class="admin-upcoming-item">
          <div>
            <strong>${escapeHtml(appointment.nome || "Cliente")}</strong>
            <span>${escapeHtml(appointment.servico || "-")} com ${escapeHtml(
              appointment.barbeiro || "-"
            )}</span>
          </div>
          <small>${escapeHtml(formatDate(appointment.data || "-"))} • ${escapeHtml(
            appointment.horario || "-"
          )}</small>
        </article>
      `
    )
    .join("");
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

if (adminManualForm && adminManualFeedback) {
  const manualRequiredFields = [...adminManualForm.querySelectorAll("[required]")];
  const manualDateField = adminManualForm.querySelector('input[name="data"]');
  const manualPhoneField = adminManualForm.querySelector('input[name="telefone"]');

  if (manualDateField) {
    manualDateField.min = getTodayDateValue();
  }

  if (manualPhoneField) {
    manualPhoneField.setAttribute("inputmode", "numeric");
    manualPhoneField.setAttribute("autocomplete", "tel");
    manualPhoneField.setAttribute("maxlength", "15");
    manualPhoneField.addEventListener("input", () => {
      manualPhoneField.value = formatPhone(manualPhoneField.value);
    });
  }

  attachRequiredFieldValidation(manualRequiredFields);

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

