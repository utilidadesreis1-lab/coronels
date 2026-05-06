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

const appointmentsStorageKey = "coronelsBarbeariaAppointments";
const barbersStorageKey = "coronelsBarbeariaBarbers";
const adminAuthStorageKey = "coronelsBarbeariaAdminLoggedIn";
const adminCredentials = {
  email: "admin@coronels.com",
  password: "123456",
};
const adminWhatsappMessage =
  "Ola, aqui e da Coronel's Barbearia. Estamos entrando em contato sobre seu agendamento.";
const defaultBarbers = [
  { nome: "Profissional 1", especialidade: "Atendimento geral" },
  { nome: "Profissional 2", especialidade: "Atendimento geral" },
  { nome: "Profissional 3", especialidade: "Atendimento geral" },
];

const loadAppointments = () => {
  try {
    const savedAppointments = JSON.parse(
      localStorage.getItem(appointmentsStorageKey) || "[]"
    );

    return Array.isArray(savedAppointments) ? savedAppointments : [];
  } catch (error) {
    return [];
  }
};

const updateAppointments = (appointments) => {
  localStorage.setItem(
    appointmentsStorageKey,
    JSON.stringify(appointments)
  );
};

const saveAppointment = (appointment) => {
  const appointments = loadAppointments();
  appointments.push(appointment);
  updateAppointments(appointments);
};

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

const ensureBarbers = () => {
  const savedBarbers = loadBarbers();

  if (savedBarbers.length) {
    updateBarbers(savedBarbers);
    return savedBarbers;
  }

  const fallbackBarbers = defaultBarbers.map((barber) => ({ ...barber }));
  updateBarbers(fallbackBarbers);

  return fallbackBarbers;
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
  const sanitizedPhone = String(phone || "").replace(/\D/g, "");

  if (!sanitizedPhone) {
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

const getAppointmentPayload = (formData) => ({
  nome: String(formData.get("nome") || "").trim(),
  telefone: String(formData.get("telefone") || "").trim(),
  servico: String(formData.get("servico") || "").trim(),
  barbeiro: String(formData.get("barbeiro") || "").trim(),
  data: String(formData.get("data") || "").trim(),
  horario: String(formData.get("horario") || "").trim(),
  status: "pendente",
  dataCriacao: new Date().toISOString(),
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
  const barbers = ensureBarbers();
  populateBarberSelect(
    adminManualBarberSelect,
    barbers,
    "Selecione um barbeiro"
  );

  if (!adminBarbersList) {
    return;
  }

  adminBarbersList.innerHTML = barbers
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
    ensureBarbers(),
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
    ensureBarbers(),
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

const renderAppointments = () => {
  if (!adminList || !adminEmpty) {
    return;
  }

  const appointments = loadAppointments();
  renderAdminSummary(appointments);
  const filteredAppointments = getFilteredAppointments(appointments);

  adminEmpty.hidden = filteredAppointments.length > 0;
  adminList.innerHTML = filteredAppointments
    .map((appointment) => {
      const appointmentIndex = appointments.indexOf(appointment);

      return `
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
              data-admin-index="${appointmentIndex}"
            >
              Chamar no WhatsApp
            </button>
            <button
              class="admin-action action-complete"
              type="button"
              data-admin-action="complete"
              data-admin-index="${appointmentIndex}"
            >
              Concluir
            </button>
            <button
              class="admin-action action-cancel"
              type="button"
              data-admin-action="cancel"
              data-admin-index="${appointmentIndex}"
            >
              Cancelar
            </button>
            <button
              class="admin-action action-delete"
              type="button"
              data-admin-action="delete"
              data-admin-index="${appointmentIndex}"
            >
              Excluir
            </button>
          </div>
        </article>
      `;
    })
    .join("");
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
    renderAppointments();
  });
}

if (adminLogoutButton) {
  adminLogoutButton.addEventListener("click", () => {
    setAdminLoggedIn(false);
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

  if (manualDateField) {
    manualDateField.min = getTodayDateValue();
  }

  attachRequiredFieldValidation(manualRequiredFields);

  adminManualForm.addEventListener("submit", (event) => {
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

    const appointment = getAppointmentPayload(new FormData(adminManualForm));
    saveAppointment(appointment);
    renderAppointments();
    setFeedbackMessage(
      adminManualFeedback,
      "Agendamento manual salvo com sucesso.",
      true
    );

    setTimeout(() => {
      closeManualForm();
    }, 500);
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
        "Ja existe um barbeiro cadastrado com esse nome."
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
  adminList.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-admin-action]");

    if (!actionButton) {
      return;
    }

    const action = actionButton.getAttribute("data-admin-action");
    const appointmentIndex = Number(
      actionButton.getAttribute("data-admin-index")
    );
    const appointments = loadAppointments();

    if (
      Number.isNaN(appointmentIndex) ||
      appointmentIndex < 0 ||
      appointmentIndex >= appointments.length
    ) {
      return;
    }

    if (action === "whatsapp") {
      const whatsappUrl = buildAdminWhatsappUrl(
        appointments[appointmentIndex].telefone
      );

      if (!whatsappUrl) {
        return;
      }

      window.open(whatsappUrl, "_blank", "noopener");
      return;
    }

    if (action === "delete") {
      appointments.splice(appointmentIndex, 1);
    } else if (action === "complete") {
      appointments[appointmentIndex].status = "concluído";
    } else if (action === "cancel") {
      appointments[appointmentIndex].status = "cancelado";
    } else {
      return;
    }

    updateAppointments(appointments);
    renderAppointments();
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
  renderAppointments();
}
