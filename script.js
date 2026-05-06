import {
  addDoc,
  getDocs,
  getAppointmentsCollection,
  hasFirebaseConfig,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from "./firebase-config.js";

const whatsappNumber = "5563991240071";
const whatsappMessage =
  "Olá! Gostaria de agendar um horário na Coronel's Barbearia.";

const header = document.querySelector(".site-header");
const menuToggle = document.querySelector(".menu-toggle");
const nav = document.querySelector(".site-nav");
const navLinks = document.querySelectorAll(".site-nav a");
const whatsappLinks = document.querySelectorAll("[data-whatsapp-link]");
const revealItems = document.querySelectorAll(".reveal");
const bookingForm = document.querySelector("[data-booking-form]");
const formFeedback = document.querySelector("[data-form-feedback]");
const publicBarberSelect = document.querySelector("[data-public-barber-select]");
const bookingTimeSelect = document.querySelector("[data-booking-time-select]");
const scheduleHelper = document.querySelector("[data-schedule-helper]");
const scheduleGrid = document.querySelector("[data-schedule-grid]");

const barbersStorageKey = "coronelsBarbeariaBarbers";
const defaultBarbers = [
  { nome: "Profissional 1", especialidade: "Atendimento geral" },
  { nome: "Profissional 2", especialidade: "Atendimento geral" },
  { nome: "Profissional 3", especialidade: "Atendimento geral" },
];
const defaultScheduleHelperMessage =
  "Escolha o profissional e a data para ver os horÃ¡rios.";

const sanitizePhoneDigits = (value) => String(value || "").replace(/\D/g, "");

const getLocalPhoneDigits = (value) => {
  const digits = sanitizePhoneDigits(value);

  if (digits.startsWith("55") && digits.length === 13) {
    return digits.slice(2);
  }

  return digits.slice(0, 11);
};

const formatPhone = (value) => {
  const digits = getLocalPhoneDigits(value);

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

let scheduleUnsubscribe = null;
let occupiedScheduleSlots = new Set();

const buildWhatsAppUrl = (message) =>
  `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

const whatsappUrl = buildWhatsAppUrl(whatsappMessage);

whatsappLinks.forEach((link) => {
  link.setAttribute("href", whatsappUrl);
  link.setAttribute("target", "_blank");
  link.setAttribute("rel", "noreferrer");
});

const setHeaderState = () => {
  if (!header) {
    return;
  }

  header.classList.toggle("scrolled", window.scrollY > 24);
};

const closeMenu = () => {
  if (!menuToggle || !nav) {
    return;
  }

  menuToggle.classList.remove("is-active");
  menuToggle.setAttribute("aria-expanded", "false");
  nav.classList.remove("is-open");
  document.body.classList.remove("menu-open");
};

if (menuToggle && nav) {
  menuToggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    menuToggle.classList.toggle("is-active", isOpen);
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    document.body.classList.toggle("menu-open", isOpen);
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", closeMenu);
  });
}

setHeaderState();
window.addEventListener("scroll", setHeaderState, { passive: true });

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries, currentObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("is-visible");
        currentObserver.unobserve(entry.target);
      });
    },
    {
      threshold: 0.2,
      rootMargin: "0px 0px -40px 0px",
    }
  );

  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

const toggleFieldError = (field, isInvalid) => {
  const wrapper = field.closest(".field");

  if (!wrapper) {
    return;
  }

  wrapper.classList.toggle("is-invalid", isInvalid);
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

const getAvailableBarbers = () => {
  const savedBarbers = loadBarbers();

  if (savedBarbers.length) {
    return savedBarbers;
  }

  return defaultBarbers.map((barber) => ({ ...barber }));
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

const getScheduleSlots = () =>
  bookingTimeSelect
    ? [...bookingTimeSelect.options]
        .map((option) => option.value)
        .filter(Boolean)
    : [];

const setScheduleHelperMessage = (message) => {
  if (!scheduleHelper) {
    return;
  }

  scheduleHelper.textContent = message;
};

const renderScheduleGrid = () => {
  if (!scheduleGrid || !bookingTimeSelect) {
    return;
  }

  const selectedTime = bookingTimeSelect.value;
  const slots = getScheduleSlots();
  const hasContext =
    Boolean(publicBarberSelect?.value.trim()) && Boolean(bookingForm?.querySelector('input[name="data"]')?.value.trim());

  if (!hasContext) {
    scheduleGrid.innerHTML = "";
    setScheduleHelperMessage(defaultScheduleHelperMessage);
    return;
  }

  scheduleGrid.innerHTML = slots
    .map((time) => {
      const isOccupied = occupiedScheduleSlots.has(time);
      const isSelected = selectedTime === time && !isOccupied;
      const statusLabel = isOccupied
        ? "Ocupado"
        : isSelected
          ? "Selecionado"
          : "Livre";

      return `
        <button
          class="schedule-slot ${isOccupied ? "is-occupied" : "is-available"} ${isSelected ? "is-selected" : ""}"
          type="button"
          data-schedule-time="${time}"
          ${isOccupied ? "disabled" : ""}
          aria-pressed="${isSelected ? "true" : "false"}"
        >
          <strong>${time}</strong>
          <span>${statusLabel}</span>
        </button>
      `;
    })
    .join("");

  setScheduleHelperMessage(
    occupiedScheduleSlots.size
      ? "Horários livres e ocupados atualizados em tempo real."
      : "Todos os horários mostrados abaixo estão livres no momento."
  );
};

const stopScheduleSubscription = () => {
  if (typeof scheduleUnsubscribe === "function") {
    scheduleUnsubscribe();
    scheduleUnsubscribe = null;
  }
};

const clearSelectedScheduleTime = () => {
  if (!bookingTimeSelect) {
    return;
  }

  bookingTimeSelect.value = "";
  toggleFieldError(bookingTimeSelect, false);
};

const subscribeScheduleAvailability = (barbeiro, data) => {
  stopScheduleSubscription();
  occupiedScheduleSlots = new Set();

  if (!barbeiro || !data) {
    renderScheduleGrid();
    return;
  }

  if (!hasFirebaseConfig) {
    renderScheduleGrid();
    setScheduleHelperMessage("Os horários online não estão disponíveis agora.");
    return;
  }

  const scheduleQuery = query(
    getAppointmentsCollection(),
    where("barbeiro", "==", barbeiro),
    where("data", "==", data)
  );

  scheduleUnsubscribe = onSnapshot(
    scheduleQuery,
    (snapshot) => {
      occupiedScheduleSlots = new Set(
        snapshot.docs
          .map((appointmentDoc) => appointmentDoc.data())
          .filter(
            (appointment) =>
              String(appointment.status || "pendente").trim().toLowerCase() !==
              "cancelado"
          )
          .map((appointment) => String(appointment.horario || "").trim())
          .filter(Boolean)
      );

      if (bookingTimeSelect?.value && occupiedScheduleSlots.has(bookingTimeSelect.value)) {
        clearSelectedScheduleTime();
        formFeedback.textContent =
          "O horário selecionado ficou indisponível. Escolha outro horário.";
        formFeedback.classList.remove("is-success");
      }

      renderScheduleGrid();
    },
    () => {
      occupiedScheduleSlots = new Set();
      renderScheduleGrid();
      setScheduleHelperMessage("Não foi possível atualizar os horários agora.");
    }
  );
};

const getAppointmentPayload = (formData) => ({
  nome: String(formData.get("nome") || "").trim(),
  telefone: formatPhone(formData.get("telefone")),
  servico: String(formData.get("servico") || "").trim(),
  barbeiro: String(formData.get("barbeiro") || "").trim(),
  data: String(formData.get("data") || "").trim(),
  horario: String(formData.get("horario") || "").trim(),
  status: "pendente",
  origem: "site",
});

const getFirebaseErrorMessage = () => {
  if (!hasFirebaseConfig) {
    return "O agendamento online ainda não está configurado. Preencha o firebase-config.js e tente novamente.";
  }

  return "Não foi possível salvar seu agendamento agora. Tente novamente em instantes.";
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

  if (await findAppointmentConflict(appointment)) {
    throw new Error("slot-conflict");
  }

  await addDoc(getAppointmentsCollection(), {
    ...appointment,
    criadoEm: serverTimestamp(),
  });
};

populateBarberSelect(
  publicBarberSelect,
  getAvailableBarbers(),
  "Escolha o profissional"
);

if (bookingForm && formFeedback) {
  const requiredFields = [...bookingForm.querySelectorAll("[required]")];
  const bookingDateField = bookingForm.querySelector('input[name="data"]');
  const bookingPhoneField = bookingForm.querySelector('input[name="telefone"]');
  const handleScheduleContextChange = () => {
    clearSelectedScheduleTime();
    subscribeScheduleAvailability(
      String(publicBarberSelect?.value || "").trim(),
      String(bookingDateField?.value || "").trim()
    );
  };

  if (bookingDateField) {
    bookingDateField.min = getTodayDateValue();
    bookingDateField.addEventListener("change", handleScheduleContextChange);
  }

  if (bookingPhoneField) {
    bookingPhoneField.setAttribute("inputmode", "numeric");
    bookingPhoneField.setAttribute("autocomplete", "tel");
    bookingPhoneField.setAttribute("maxlength", "15");
    bookingPhoneField.addEventListener("input", () => {
      bookingPhoneField.value = formatPhone(bookingPhoneField.value);
    });
  }

  if (publicBarberSelect) {
    publicBarberSelect.addEventListener("change", handleScheduleContextChange);
  }

  if (scheduleGrid && bookingTimeSelect) {
    renderScheduleGrid();
    scheduleGrid.addEventListener("click", (event) => {
      const slotButton = event.target.closest("[data-schedule-time]");

      if (!slotButton || slotButton.disabled) {
        return;
      }

      const selectedTime = String(
        slotButton.getAttribute("data-schedule-time") || ""
      ).trim();

      if (!selectedTime) {
        return;
      }

      bookingTimeSelect.value = selectedTime;
      toggleFieldError(bookingTimeSelect, false);
      formFeedback.textContent = "";
      formFeedback.classList.remove("is-success");
      renderScheduleGrid();
    });
  }

  requiredFields.forEach((field) => {
    field.addEventListener("input", () => {
      if (field.value.trim()) {
        toggleFieldError(field, false);
      }
    });

    field.addEventListener("change", () => {
      if (field.value.trim()) {
        toggleFieldError(field, false);
      }
    });
  });

  bookingForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    let hasError = false;

    requiredFields.forEach((field) => {
      const value = field.value.trim();
      const isInvalid = value === "";

      toggleFieldError(field, isInvalid);

      if (isInvalid) {
        hasError = true;
      }
    });

    if (hasError) {
      formFeedback.textContent = "Preencha todos os campos para continuar.";
      formFeedback.classList.remove("is-success");
      return;
    }

    if (bookingDateField && bookingDateField.value < getTodayDateValue()) {
      toggleFieldError(bookingDateField, true);
      formFeedback.textContent = "Escolha uma data igual ou posterior ao dia de hoje.";
      formFeedback.classList.remove("is-success");
      return;
    }

    if (bookingPhoneField && !hasValidPhoneDigits(bookingPhoneField.value)) {
      toggleFieldError(bookingPhoneField, true);
      formFeedback.textContent = "Informe um telefone válido com DDD.";
      formFeedback.classList.remove("is-success");
      return;
    }

    const submitButton = bookingForm.querySelector('button[type="submit"]');
    const formData = new FormData(bookingForm);
    const appointment = getAppointmentPayload(formData);

    if (submitButton) {
      submitButton.disabled = true;
    }

    formFeedback.textContent = "Salvando seu agendamento...";
    formFeedback.classList.remove("is-success");

    try {
      await saveAppointment(appointment);

      const appointmentMessage = [
        "Olá! Gostaria de agendar um horário na Coronel's Barbearia.",
        "",
        `Nome: ${appointment.nome}`,
        `Telefone: ${appointment.telefone}`,
        `Serviço: ${appointment.servico}`,
        `Barbeiro: ${appointment.barbeiro}`,
        `Data: ${formatDate(appointment.data)}`,
        `Horário: ${appointment.horario}`,
      ].join("\n");

      formFeedback.textContent = "Abrindo WhatsApp com sua mensagem pronta...";
      formFeedback.classList.add("is-success");

      window.open(buildWhatsAppUrl(appointmentMessage), "_blank", "noopener");
      bookingForm.reset();
      populateBarberSelect(
        publicBarberSelect,
        getAvailableBarbers(),
        "Escolha o profissional"
      );
      clearSelectedScheduleTime();
      stopScheduleSubscription();
      occupiedScheduleSlots = new Set();
      renderScheduleGrid();
    } catch (error) {
      formFeedback.textContent =
        error instanceof Error && error.message === "slot-conflict"
          ? "Esse hor\u00e1rio j\u00e1 est\u00e1 ocupado para este profissional. Escolha outro hor\u00e1rio."
          : getFirebaseErrorMessage();
      formFeedback.classList.remove("is-success");
    } finally {
      if (bookingDateField) {
        bookingDateField.min = getTodayDateValue();
      }

      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  });
}
