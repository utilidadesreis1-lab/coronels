import {
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  getAppointmentsCollection,
  hasFirebaseConfig,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
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
const adminStatusFilter = document.querySelector("[data-admin-status-filter]");
const adminDateFilter = document.querySelector("[data-admin-date-filter]");
const adminClearFiltersButton = document.querySelector("[data-admin-clear-filters]");
const adminList = document.querySelector("[data-admin-list]");
const adminEmpty = document.querySelector("[data-admin-empty]");
const adminLogoutButton = document.querySelector("[data-admin-logout]");

const barbersStorageKey = "coronelsBarbeariaBarbers";
const adminAuthStorageKey = "coronelsBarbeariaAdminLoggedIn";
const adminCredentials = {
  email: "admin@coronels.com",
  password: "Coronels@2026",
};
const adminWhatsappMessage =
  "Olá, aqui é da Coronel's Barbearia. Estamos entrando em contato sobre seu agendamento.";
const defaultBarbers = [
  { nome: "Profissional 1", especialidade: "Atendimento geral" },
  { nome: "Profissional 2", especialidade: "Atendimento geral" },
  { nome: "Profissional 3", especialidade: "Atendimento geral" },
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
let lastAppointmentConflict = false;

const normalizeBarber = (barber) => {
  if (typeof barber === "string") {
    const barberName = barber.trim();

    return barberName
      ? { nome: barberName, especialidade: "Atendimento geral" }
      : null;
  }

  if (!barber || typeof barber !== "object") {
    return null;
  }

  const nome = String(barber.nome || "").trim();
  const especialidade = String(
    barber.especialidade || "Atendimento geral"
  ).trim();

  if (!nome) {
    return null;
  }

  return {
    nome,
    especialidade: especialidade || "Atendimento geral",
  };
};

const loadBarbers = () => {
  try {
    const savedBarbers = JSON.parse(localStorage.getItem(barbersStorageKey) || "[]");

    return Array.isArray(savedBarbers)
      ? savedBarbers.map(normalizeBarber).filter(Boolean)
      : [];
  } catch (error) {
    return [];
  }
};

const updateBarbers = (barbers) => {
  localStorage.setItem(barbersStorageKey, JSON.stringify(barbers));
};

const getAvailableBarbers = () => {
  const savedBarbers = loadBarbers();

  if (savedBarbers.length) {
    return savedBarbers;
  }

  return defaultBarbers.map((barber) => ({ ...barber }));
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
  especialidade: String(formData.get("especialidade") || "").trim(),
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

const renderBarbers = () => {
  const availableBarbers = getAvailableBarbers();
  const savedBarbers = loadBarbers();
  populateBarberSelect(
    adminManualBarberSelect,
    availableBarbers,
    "Selecione um barbeiro"
  );

  if (!adminBarbersList) {
    return;
  }

  if (!savedBarbers.length) {
    adminBarbersList.innerHTML =
      '<p class="admin-empty-copy">Nenhum barbeiro cadastrado ainda. Os profissionais padrão aparecem apenas como fallback no agendamento.</p>';
    return;
  }

  adminBarbersList.innerHTML = savedBarbers
    .map(
      (barber, index) => `
        <article class="admin-barber-card">
          <div class="admin-barber-card-head">
            <div>
              <h4>${escapeHtml(barber.nome)}</h4>
              <p>${escapeHtml(barber.especialidade)}</p>
            </div>
            <button
              class="admin-action action-delete"
              type="button"
              data-admin-barber-action="delete"
              data-admin-barber-index="${index}"
            >
              Excluir
            </button>
          </div>
        </article>
      `
    )
    .join("");
};

const updateAdminVisibility = () => {
  const isLoggedIn = isAdminLoggedIn();

  if (adminLoginForm) {
    adminLoginForm.hidden = isLoggedIn;
  }

  if (adminContent) {
    adminContent.hidden = !isLoggedIn;
  }
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

const getFilteredAppointments = (appointments) => {
  const selectedStatus = adminStatusFilter?.value || "all";
  const selectedDate = adminDateFilter?.value || "";

  return appointments.filter((appointment) => {
    const matchesStatus =
      selectedStatus === "all" ||
      normalizeStatusClass(appointment.status || "") === selectedStatus;
    const matchesDate = !selectedDate || appointment.data === selectedDate;

    return matchesStatus && matchesDate;
  });
};

const updateAdminEmptyState = (message = defaultAdminEmptyMessage) => {
  if (!adminEmpty) {
    return;
  }

  adminEmpty.textContent = message;
};

const renderAppointments = () => {
  if (!adminList || !adminEmpty) {
    return;
  }

  renderAdminSummary(appointmentsState);
  const filteredAppointments = getFilteredAppointments(appointmentsState);

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
    renderBarbers();
    subscribeAppointments();
  });
}

if (adminLogoutButton) {
  adminLogoutButton.addEventListener("click", () => {
    setAdminLoggedIn(false);
    stopAppointmentsSubscription();
    appointmentsState = [];
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
  const barberRequiredFields = [...adminBarberForm.querySelectorAll("[required]")];

  attachRequiredFieldValidation(barberRequiredFields);

  adminBarberForm.addEventListener("submit", (event) => {
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
        "Preencha nome e especialidade para continuar."
      );
      return;
    }

    const barber = getBarberPayload(new FormData(adminBarberForm));
    const barbers = loadBarbers();
    const barberAlreadyExists = barbers.some(
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

    barbers.push(barber);
    updateBarbers(barbers);
    renderBarbers();
    adminBarberForm.reset();
    clearFormErrors(adminBarberForm);
    setFeedbackMessage(
      adminBarberFeedback,
      "Barbeiro salvo com sucesso.",
      true
    );
  });
}

if (adminStatusFilter) {
  adminStatusFilter.addEventListener("change", renderAppointments);
}

if (adminDateFilter) {
  adminDateFilter.addEventListener("change", renderAppointments);
}

if (adminClearFiltersButton) {
  adminClearFiltersButton.addEventListener("click", () => {
    if (adminStatusFilter) {
      adminStatusFilter.value = "all";
    }

    if (adminDateFilter) {
      adminDateFilter.value = "";
    }

    renderAppointments();
  });
}

if (adminList) {
  adminList.addEventListener("click", async (event) => {
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
  });
}

if (adminBarbersList) {
  adminBarbersList.addEventListener("click", (event) => {
    const deleteButton = event.target.closest("[data-admin-barber-action]");

    if (!deleteButton) {
      return;
    }

    const action = deleteButton.getAttribute("data-admin-barber-action");
    const barberIndex = Number(deleteButton.getAttribute("data-admin-barber-index"));
    const barbers = loadBarbers();

    if (
      action !== "delete" ||
      Number.isNaN(barberIndex) ||
      barberIndex < 0 ||
      barberIndex >= barbers.length
    ) {
      return;
    }

    barbers.splice(barberIndex, 1);
    updateBarbers(barbers);
    renderBarbers();
  });
}

updateAdminVisibility();
renderBarbers();

if (isAdminLoggedIn()) {
  subscribeAppointments();
}
