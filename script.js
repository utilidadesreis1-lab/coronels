import {
  addDoc,
  doc,
  getBarbersCollection,
  getDocs,
  getAppointmentsCollection,
  hasFirebaseConfig,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
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
const publicServiceSelect = document.querySelector("[data-public-service-select]");
const publicBarberSelect = document.querySelector("[data-public-barber-select]");
const bookingTimeSelect = document.querySelector("[data-booking-time-select]");
const scheduleHelper = document.querySelector("[data-schedule-helper]");
const scheduleGrid = document.querySelector("[data-schedule-grid]");
const bookingDateChips = document.querySelector("[data-booking-date-chips]");
const bookingServiceGrid = document.querySelector("[data-booking-service-grid]");
const bookingBarberGrid = document.querySelector("[data-booking-barber-grid]");
const bookingServiceToggle = document.querySelector("[data-booking-service-toggle]");
const bookingServicePanel = document.querySelector("[data-booking-service-panel]");
const bookingServiceSummary = document.querySelector("[data-booking-service-summary]");
const serviceCardSelectButtons = document.querySelectorAll("[data-service-card-select]");

let serviceSelectionToastTimeoutId = 0;

const defaultBarbers = [
  { id: "guerra", nome: "Guerra", fotoUrl: "assets/barbeiros/guerra.jfif", ativo: true },
  { id: "caio", nome: "Caio", fotoUrl: "assets/barbeiros/caio.png", ativo: true },
  { id: "felipe", nome: "Felipe", fotoUrl: "", ativo: true },
  { id: "olivan", nome: "Olivan", fotoUrl: "", ativo: true },
];
const defaultScheduleHelperMessage =
  "Escolha o profissional e a data para ver os horários.";
const serviceMeta = {
  Corte: {
    price: "R$ 40",
    description: "Acabamento masculino alinhado para o dia a dia.",
  },
  Barba: {
    price: "R$ 40",
    description: "Desenho preciso com acabamento limpo e marcante.",
  },
  Sobrancelha: {
    price: "R$ 20",
    description: "Detalhe sutil para reforçar presença e expressão.",
  },
  Selagem: {
    price: "R$ 100",
    description: "Disciplina os fios com brilho e controle.",
  },
  Botox: {
    price: "R$ 100",
    description: "Redução de volume com toque mais polido.",
  },
  Progressiva: {
    price: "R$ 100",
    description: "Mais praticidade com alinhamento e menos frizz.",
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
let barbersUnsubscribe = null;
let occupiedScheduleSlots = new Set();
let publicBarbersState = defaultBarbers.map((barber) => ({ ...barber }));
let isSeedingDefaultBarbers = false;
const shortWeekdayFormatter = new Intl.DateTimeFormat("pt-BR", { weekday: "short" });
const shortMonthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "short" });

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

const parseDateValue = (dateValue) => {
  const [year, month, day] = String(dateValue || "").split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
};

const toDateValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

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
  publicBarbersState.length
    ? sortBarbers(publicBarbersState)
    : defaultBarbers.map((barber) => ({ ...barber }));

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
  if (typeof barbersUnsubscribe === "function") {
    barbersUnsubscribe();
    barbersUnsubscribe = null;
  }
};

const syncPublicBarbers = () => {
  const bookingDateField = bookingForm?.querySelector('input[name="data"]');
  const previousBarber = String(publicBarberSelect?.value || "").trim();

  populateBarberSelect(
    publicBarberSelect,
    getAvailableBarbers(),
    "Escolha o profissional"
  );
  renderBarberCards();

  const currentBarber = String(publicBarberSelect?.value || "").trim();

  if (previousBarber !== currentBarber) {
    clearSelectedScheduleTime();
  }

  subscribeScheduleAvailability(
    currentBarber,
    String(bookingDateField?.value || "").trim()
  );
};

const subscribePublicBarbers = () => {
  stopBarbersSubscription();

  if (!hasFirebaseConfig) {
    publicBarbersState = defaultBarbers.map((barber) => ({ ...barber }));
    syncPublicBarbers();
    return;
  }

  barbersUnsubscribe = onSnapshot(
    getBarbersCollection(),
    (snapshot) => {
      if (snapshot.empty) {
        publicBarbersState = defaultBarbers.map((barber) => ({ ...barber }));
        syncPublicBarbers();
        seedDefaultBarbers();
        return;
      }

      publicBarbersState = snapshot.docs
        .map((snapshotDoc) =>
          normalizeBarber({
            id: snapshotDoc.id,
            ...snapshotDoc.data(),
          })
        )
        .filter((barber) => barber && barber.ativo);

      syncPublicBarbers();
    },
    () => {
      publicBarbersState = defaultBarbers.map((barber) => ({ ...barber }));
      syncPublicBarbers();
    }
  );
};

const getBarberVisual = (barber) => {
  const safeName = String(barber?.nome || "").trim();
  const fallbackInitial = safeName ? safeName.charAt(0).toUpperCase() : "?";

  return {
    image: String(barber?.fotoUrl || "").trim(),
    initial: fallbackInitial,
  };
};

const renderServiceCards = () => {
  if (!bookingServiceGrid || !publicServiceSelect) {
    return;
  }

  const currentValue = String(publicServiceSelect.value || "").trim();

  bookingServiceGrid.innerHTML = [...publicServiceSelect.options]
    .filter((option) => option.value)
    .map((option) => {
      const serviceName = option.value;
      const isSelected = currentValue === serviceName;
      const details = serviceMeta[serviceName] || {
        price: "",
        description: "Atendimento premium da Coronel's Barbearia.",
      };

      return `
        <button
          class="booking-service-card ${isSelected ? "is-selected" : ""}"
          type="button"
          data-booking-service="${serviceName}"
          aria-pressed="${isSelected ? "true" : "false"}"
        >
          <div class="booking-service-card-top">
            <strong>${serviceName}</strong>
            <span>${details.price}</span>
          </div>
          <p>${details.description}</p>
        </button>
      `;
    })
    .join("");
};

const setServiceAccordionState = (isOpen) => {
  if (!bookingServiceToggle || !bookingServicePanel) {
    return;
  }

  bookingServiceToggle.setAttribute("aria-expanded", String(isOpen));
  bookingServicePanel.hidden = !isOpen;
};

const updateServiceSummary = () => {
  if (!bookingServiceSummary || !publicServiceSelect) {
    return;
  }

  const selectedService = String(publicServiceSelect.value || "").trim();

  if (!selectedService) {
    bookingServiceSummary.textContent = "Toque para abrir a lista de serviços.";
    return;
  }

  const details = serviceMeta[selectedService];
  const priceLabel = details?.price ? ` — ${details.price}` : "";
  bookingServiceSummary.textContent = `Serviço escolhido: ${selectedService}${priceLabel}`;
};

const updateServiceCardSelectionState = () => {
  if (!serviceCardSelectButtons.length || !publicServiceSelect) {
    return;
  }

  const selectedService = String(publicServiceSelect.value || "").trim();

  serviceCardSelectButtons.forEach((button) => {
    const serviceName = String(button.getAttribute("data-service-card-select") || "").trim();
    const serviceCard = button.closest(".service-card");
    const isSelected = Boolean(selectedService) && serviceName === selectedService;

    button.textContent = isSelected ? "Selecionado" : "Selecionar";
    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));

    if (serviceCard) {
      serviceCard.classList.toggle("service-card--selected", isSelected);
    }
  });
};

const ensureServiceSelectionToast = () => {
  const existingToast = document.querySelector("[data-service-selection-toast]");

  if (existingToast) {
    return existingToast;
  }

  const toast = document.createElement("div");
  toast.className = "service-selection-toast";
  toast.setAttribute("data-service-selection-toast", "");
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  document.body.appendChild(toast);
  return toast;
};

const showServiceSelectionToast = (serviceName) => {
  const toast = ensureServiceSelectionToast();
  toast.textContent = `Serviço selecionado com sucesso: ${serviceName}. Finalize escolhendo barbeiro, data e horário.`;
  toast.classList.add("is-visible");

  window.clearTimeout(serviceSelectionToastTimeoutId);
  serviceSelectionToastTimeoutId = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 3200);
};

const selectBookingService = (
  serviceName,
  { closeAccordion = false, showToast = false } = {}
) => {
  if (!publicServiceSelect) {
    return false;
  }

  const normalizedService = String(serviceName || "").trim();

  if (!normalizedService) {
    return false;
  }

  const hasOption = [...publicServiceSelect.options].some(
    (option) => option.value === normalizedService
  );

  if (!hasOption) {
    return false;
  }

  publicServiceSelect.value = normalizedService;
  toggleFieldError(publicServiceSelect, false);
  publicServiceSelect.dispatchEvent(new Event("change", { bubbles: true }));

  if (closeAccordion) {
    setServiceAccordionState(false);
  }

  if (showToast) {
    showServiceSelectionToast(normalizedService);
  }

  return true;
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
    renderBarberCards();
    return;
  }

  select.value = "";
  renderBarberCards();
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

const getDateChipValues = (selectedDate = "") => {
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

const renderDateChips = () => {
  if (!bookingDateChips || !bookingForm) {
    return;
  }

  const bookingDateField = bookingForm.querySelector('input[name="data"]');

  if (!bookingDateField) {
    return;
  }

  const selectedDate = String(bookingDateField.value || "").trim();
  const todayValue = getTodayDateValue();

  bookingDateChips.innerHTML = getDateChipValues(selectedDate)
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
          class="booking-date-chip ${isSelected ? "is-selected" : ""}"
          type="button"
          data-booking-date="${dateValue}"
          aria-pressed="${isSelected ? "true" : "false"}"
        >
          <span class="booking-date-chip-day">${weekdayLabel}</span>
          <strong class="booking-date-chip-date">${String(parsedDate.getDate()).padStart(2, "0")}</strong>
          <span class="booking-date-chip-month">${monthLabel}</span>
        </button>
      `;
    })
    .join("");
};

const renderBarberCards = () => {
  if (!bookingBarberGrid || !publicBarberSelect) {
    return;
  }

  const currentValue = String(publicBarberSelect.value || "").trim();
  const barbersByName = new Map(
    getAvailableBarbers().map((barber) => [barber.nome, barber])
  );

  bookingBarberGrid.innerHTML = [...publicBarberSelect.options]
    .filter((option) => option.value)
    .map((option) => {
      const isSelected = currentValue === option.value;
      const barber = barbersByName.get(option.value) || { nome: option.value, fotoUrl: "" };
      const visual = getBarberVisual(barber);
      const hasImage = Boolean(visual.image);

      return `
        <button
          class="booking-barber-card ${isSelected ? "is-selected" : ""}"
          type="button"
          data-booking-barber="${option.value}"
          aria-pressed="${isSelected ? "true" : "false"}"
        >
          <div class="booking-barber-card-media">
            <div class="booking-barber-avatar" data-booking-barber-avatar>
              ${
                hasImage
                  ? `<img
                      src="${visual.image}"
                      alt="${option.value}"
                      loading="lazy"
                      data-booking-barber-image
                    >`
                  : ""
              }
              <span>${visual.initial}</span>
            </div>
          </div>
          <strong>${option.value}</strong>
          <span>Barbeiro profissional</span>
        </button>
      `;
    })
    .join("");

  bookingBarberGrid
    .querySelectorAll("[data-booking-barber-image]")
    .forEach((imageElement) => {
      const avatar = imageElement.closest("[data-booking-barber-avatar]");

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
renderServiceCards();
subscribePublicBarbers();
updateServiceSummary();
updateServiceCardSelectionState();
setServiceAccordionState(false);

if (bookingForm && formFeedback) {
  const requiredFields = [...bookingForm.querySelectorAll("[required]")];
  const bookingDateField = bookingForm.querySelector('input[name="data"]');
  const bookingPhoneField = bookingForm.querySelector('input[name="telefone"]');
  const handleScheduleContextChange = () => {
    clearSelectedScheduleTime();
    renderDateChips();
    renderBarberCards();
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

  if (publicServiceSelect) {
    publicServiceSelect.addEventListener("change", () => {
      toggleFieldError(publicServiceSelect, false);
      renderServiceCards();
      updateServiceSummary();
      updateServiceCardSelectionState();
    });
  }

  if (bookingServiceToggle) {
    bookingServiceToggle.addEventListener("click", () => {
      const isExpanded = bookingServiceToggle.getAttribute("aria-expanded") === "true";
      setServiceAccordionState(!isExpanded);
    });
  }

  if (bookingDateChips && bookingDateField) {
    renderDateChips();
    bookingDateChips.addEventListener("click", (event) => {
      const dateButton = event.target.closest("[data-booking-date]");

      if (!dateButton) {
        return;
      }

      const selectedDate = String(
        dateButton.getAttribute("data-booking-date") || ""
      ).trim();

      if (!selectedDate) {
        return;
      }

      bookingDateField.value = selectedDate;
      toggleFieldError(bookingDateField, false);
      handleScheduleContextChange();
    });
  }

  if (bookingBarberGrid && publicBarberSelect) {
    renderBarberCards();
    bookingBarberGrid.addEventListener("click", (event) => {
      const barberButton = event.target.closest("[data-booking-barber]");

      if (!barberButton) {
        return;
      }

      const selectedBarber = String(
        barberButton.getAttribute("data-booking-barber") || ""
      ).trim();

      if (!selectedBarber) {
        return;
      }

      publicBarberSelect.value = selectedBarber;
      toggleFieldError(publicBarberSelect, false);
      handleScheduleContextChange();
    });
  }

  if (bookingServiceGrid && publicServiceSelect) {
    renderServiceCards();
    bookingServiceGrid.addEventListener("click", (event) => {
      const serviceButton = event.target.closest("[data-booking-service]");

      if (!serviceButton) {
        return;
      }

      const selectedService = String(
        serviceButton.getAttribute("data-booking-service") || ""
      ).trim();

      if (!selectedService) {
        return;
      }

      selectBookingService(selectedService, { closeAccordion: true });
    });
  }

  if (serviceCardSelectButtons.length) {
    serviceCardSelectButtons.forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();

        const selectedService = String(
          button.getAttribute("data-service-card-select") || ""
        ).trim();

        if (!selectedService) {
          return;
        }

        const previousScrollX = window.scrollX;
        const previousScrollY = window.scrollY;
        const previousHash = window.location.hash;

        selectBookingService(selectedService, { showToast: true });

        window.requestAnimationFrame(() => {
          if (window.location.hash !== previousHash) {
            const baseUrl = `${window.location.pathname}${window.location.search}`;
            const nextUrl = previousHash ? `${baseUrl}${previousHash}` : baseUrl;
            window.history.replaceState(null, "", nextUrl);
          }

          if (window.scrollX !== previousScrollX || window.scrollY !== previousScrollY) {
            window.scrollTo(previousScrollX, previousScrollY);
          }
        });
      });
    });
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
      if (publicServiceSelect) {
        publicServiceSelect.value = "";
        renderServiceCards();
        updateServiceSummary();
      }
      renderDateChips();
      renderBarberCards();
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

const pageParams = new URLSearchParams(window.location.search);
const heroAdjustMode = pageParams.get("ajusteHero") === "1";
const headerAdjustMode = pageParams.get("ajusteHeader") === "1" || pageParams.get("ajusteCabecalho") === "1";
const experienceAdjustMode = pageParams.get("ajusteExperiencia") === "1";

const createHeroAdjustmentPanel = () => {
  if (!heroAdjustMode) {
    return;
  }

  const heroContent = document.querySelector(".hero-content");
  const heroBrandBlock = document.querySelector(".hero-brand-block");
  const heroSymbol = document.querySelector(".hero-brand-symbol-wrap");
  const heroAccent = document.querySelector(".hero-title-accent");
  const heroBase = document.querySelector(".hero-title-base");
  const heroCopy = document.querySelector(".hero-copy");
  const heroActions = document.querySelector(".hero-actions");
  const heroMedia = document.querySelector(".hero-media");

  if (!heroContent || !heroBrandBlock || !heroSymbol || !heroAccent || !heroBase || !heroCopy || !heroActions || !heroMedia) {
    return;
  }

  document.body.classList.add("hero-adjust-active");

  const storageKey = "coronelsHeroAdjustments";
  const rootStyles = window.getComputedStyle(document.documentElement);
  const readRootNumber = (name, fallback) => {
    const raw = rootStyles.getPropertyValue(name).trim();
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const defaultSettings = {
    heroMinHeight: readRootNumber("--hero-adjust-min-height", 820),
    contentWidth: readRootNumber("--hero-adjust-content-width", 1088),
    contentOffsetX: readRootNumber("--hero-adjust-content-offset-x", -140),
    contentOffsetY: readRootNumber("--hero-adjust-content-offset-y", 0),
    contentScale: readRootNumber("--hero-adjust-content-scale", 1),
    logoScale: readRootNumber("--hero-adjust-logo-scale", 1),
    logoOffsetX: readRootNumber("--hero-adjust-logo-offset-x", 0),
    logoOffsetY: readRootNumber("--hero-adjust-logo-offset-y", 0),
    copyWidth: readRootNumber("--hero-adjust-copy-width", 576),
    copyOffsetX: readRootNumber("--hero-adjust-copy-offset-x", 0),
    copyOffsetY: readRootNumber("--hero-adjust-copy-offset-y", 0),
    buttonsOffsetX: readRootNumber("--hero-adjust-buttons-offset-x", 0),
    buttonsOffsetY: readRootNumber("--hero-adjust-buttons-offset-y", 0),
    buttonsGap: readRootNumber("--hero-adjust-buttons-gap", 16),
    bgPositionX: readRootNumber("--hero-adjust-bg-position-x", 50),
    bgPositionY: readRootNumber("--hero-adjust-bg-position-y", 50),
    brandScale: readRootNumber("--hero-brand-scale", 0.4),
    brandOffsetX: readRootNumber("--hero-brand-offset-x", 0),
    brandOffsetY: readRootNumber("--hero-brand-offset-y", -64),
    symbolSize: readRootNumber("--hero-brand-symbol-size", 204),
    symbolOffsetX: readRootNumber("--hero-brand-symbol-offset-x", -249),
    symbolOffsetY: readRootNumber("--hero-brand-symbol-offset-y", -22),
    accentSize: readRootNumber("--hero-brand-accent-size", 138),
    accentOffsetX: readRootNumber("--hero-brand-accent-offset-x", 59),
    accentOffsetY: readRootNumber("--hero-brand-accent-offset-y", -32),
    accentLetterSpacing: readRootNumber("--hero-brand-accent-letter-spacing", 0.022),
    baseSize: readRootNumber("--hero-brand-base-size", 35),
    baseOffsetX: readRootNumber("--hero-brand-base-offset-x", 177),
    baseOffsetY: readRootNumber("--hero-brand-base-offset-y", 54),
    baseLetterSpacing: readRootNumber("--hero-brand-base-letter-spacing", 0.074),
  };

  const controls = [
    { type: "group", label: "Bloco principal do hero" },
    { key: "heroMinHeight", label: "Altura mínima do hero", min: 640, max: 1100, step: 1, unit: "px", cssVar: "--hero-adjust-min-height" },
    { key: "contentWidth", label: "Largura do bloco", min: 560, max: 1400, step: 1, unit: "px", cssVar: "--hero-adjust-content-width" },
    { key: "contentOffsetX", label: "Posição X do bloco", min: -320, max: 320, step: 1, unit: "px", cssVar: "--hero-adjust-content-offset-x" },
    { key: "contentOffsetY", label: "Posição Y do bloco", min: -220, max: 220, step: 1, unit: "px", cssVar: "--hero-adjust-content-offset-y" },
    { key: "contentScale", label: "Escala geral do bloco", min: 0.6, max: 1.4, step: 0.01, unit: "", cssVar: "--hero-adjust-content-scale" },
    { type: "group", label: "Logo do hero" },
    { key: "logoScale", label: "Escala da logo", min: 0.5, max: 2.4, step: 0.01, unit: "", cssVar: "--hero-adjust-logo-scale" },
    { key: "logoOffsetX", label: "Posição X da logo", min: -220, max: 220, step: 1, unit: "px", cssVar: "--hero-adjust-logo-offset-x" },
    { key: "logoOffsetY", label: "Posição Y da logo", min: -220, max: 220, step: 1, unit: "px", cssVar: "--hero-adjust-logo-offset-y" },
    { type: "group", label: "Frase do hero" },
    { key: "copyWidth", label: "Largura da frase", min: 260, max: 900, step: 1, unit: "px", cssVar: "--hero-adjust-copy-width" },
    { key: "copyOffsetX", label: "Posição X da frase", min: -220, max: 220, step: 1, unit: "px", cssVar: "--hero-adjust-copy-offset-x" },
    { key: "copyOffsetY", label: "Posição Y da frase", min: -220, max: 220, step: 1, unit: "px", cssVar: "--hero-adjust-copy-offset-y" },
    { type: "group", label: "Botões do hero" },
    { key: "buttonsOffsetX", label: "Posição X dos botões", min: -220, max: 220, step: 1, unit: "px", cssVar: "--hero-adjust-buttons-offset-x" },
    { key: "buttonsOffsetY", label: "Posição Y dos botões", min: -220, max: 220, step: 1, unit: "px", cssVar: "--hero-adjust-buttons-offset-y" },
    { key: "buttonsGap", label: "Espaço entre botões", min: 0, max: 48, step: 1, unit: "px", cssVar: "--hero-adjust-buttons-gap" },
    { type: "group", label: "Fundo do hero" },
    { key: "bgPositionX", label: "Posição X do fundo", min: 0, max: 100, step: 1, unit: "%", cssVar: "--hero-adjust-bg-position-x" },
    { key: "bgPositionY", label: "Posição Y do fundo", min: 0, max: 100, step: 1, unit: "%", cssVar: "--hero-adjust-bg-position-y" },
    { type: "group", label: "Marca interna (avançado)" },
    { key: "brandScale", label: "Escala base da marca", min: 0.2, max: 1.4, step: 0.01, unit: "", cssVar: "--hero-brand-scale" },
    { key: "brandOffsetX", label: "Posição X base da marca", min: -320, max: 320, step: 1, unit: "px", cssVar: "--hero-brand-offset-x" },
    { key: "brandOffsetY", label: "Posição Y base da marca", min: -220, max: 220, step: 1, unit: "px", cssVar: "--hero-brand-offset-y" },
    { key: "symbolSize", label: "Tamanho do símbolo", min: 40, max: 420, step: 1, unit: "px", cssVar: "--hero-brand-symbol-size" },
    { key: "symbolOffsetX", label: "Posição X do símbolo", min: -320, max: 320, step: 1, unit: "px", cssVar: "--hero-brand-symbol-offset-x" },
    { key: "symbolOffsetY", label: "Posição Y do símbolo", min: -220, max: 220, step: 1, unit: "px", cssVar: "--hero-brand-symbol-offset-y" },
    { key: "accentSize", label: "Tamanho de Coronel's", min: 36, max: 180, step: 1, unit: "px", cssVar: "--hero-brand-accent-size" },
    { key: "accentOffsetX", label: "Posição X de Coronel's", min: -320, max: 320, step: 1, unit: "px", cssVar: "--hero-brand-accent-offset-x" },
    { key: "accentOffsetY", label: "Posição Y de Coronel's", min: -220, max: 220, step: 1, unit: "px", cssVar: "--hero-brand-accent-offset-y" },
    { key: "accentLetterSpacing", label: "Entre letras de Coronel's", min: -0.08, max: 0.2, step: 0.001, unit: "em", cssVar: "--hero-brand-accent-letter-spacing" },
    { key: "baseSize", label: "Tamanho de BARBEARIA", min: 20, max: 120, step: 1, unit: "px", cssVar: "--hero-brand-base-size" },
    { key: "baseOffsetX", label: "Posição X de BARBEARIA", min: -320, max: 320, step: 1, unit: "px", cssVar: "--hero-brand-base-offset-x" },
    { key: "baseOffsetY", label: "Posição Y de BARBEARIA", min: -220, max: 220, step: 1, unit: "px", cssVar: "--hero-brand-base-offset-y" },
    { key: "baseLetterSpacing", label: "Entre letras de BARBEARIA", min: 0, max: 0.3, step: 0.001, unit: "em", cssVar: "--hero-brand-base-letter-spacing" },
  ];

  const readStoredSettings = () => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        return { ...defaultSettings };
      }

      const parsed = JSON.parse(raw);

      return {
        ...defaultSettings,
        ...Object.fromEntries(
          Object.entries(parsed).map(([key, value]) => [key, Number(value)])
        ),
      };
    } catch {
      return { ...defaultSettings };
    }
  };

  let settings = readStoredSettings();

  const panel = document.createElement("aside");
  panel.className = "hero-adjust-panel";
  panel.setAttribute("aria-label", "Ajuste Hero");

  panel.innerHTML = `
    <h3>Ajuste Hero</h3>
    <p>Ajuste visual temporário do hero. Só aparece com <code>?ajusteHero=1</code>.</p>
    <div class="hero-adjust-grid" data-hero-adjust-grid></div>
    <div class="hero-adjust-actions">
      <button class="button button-gold" type="button" data-hero-copy-css>Copiar CSS</button>
      <button class="button button-ghost" type="button" data-hero-reset>Resetar ajustes</button>
    </div>
    <div class="hero-adjust-toast" data-hero-adjust-toast></div>
  `;

  document.body.append(panel);

  const grid = panel.querySelector("[data-hero-adjust-grid]");
  const toast = panel.querySelector("[data-hero-adjust-toast]");
  const copyButton = panel.querySelector("[data-hero-copy-css]");
  const resetButton = panel.querySelector("[data-hero-reset]");

  const valueOutputs = new Map();
  const inputs = new Map();

  const persistSettings = () => {
    window.localStorage.setItem(storageKey, JSON.stringify(settings));
  };

  const formatControlValue = (key, value) => {
    const control = controls.find((item) => item.key === key);

    if (!control) {
      return String(value);
    }

    if (control.unit === "em" || control.unit === "" || control.unit === "%") {
      const decimals = String(control.step).includes(".")
        ? String(control.step).split(".")[1].length
        : 0;

      return Number(value).toFixed(decimals);
    }

    return `${Math.round(Number(value))}`;
  };

  const cssSnippet = () => {
    const lines = controls
      .filter((control) => control.key && control.cssVar)
      .map((control) => {
        const suffix = control.unit === "" ? "" : control.unit;
        return `  ${control.cssVar}: ${formatControlValue(control.key, settings[control.key])}${suffix};`;
      });

    return `:root {\n${lines.join("\n")}\n}`;
  };

  const updateToast = (message) => {
    if (toast) {
      toast.textContent = message;
    }
  };

  const applyHeroSettings = () => {
    controls.forEach((control) => {
      if (!control.key || !control.cssVar) {
        return;
      }

      const suffix = control.unit === "" ? "" : control.unit;
      document.documentElement.style.setProperty(control.cssVar, `${settings[control.key]}${suffix}`);
    });

    controls.forEach((control) => {
      if (!control.key) {
        return;
      }

      const input = inputs.get(control.key);
      const output = valueOutputs.get(control.key);

      if (input) {
        input.value = String(settings[control.key]);
      }

      if (output) {
        output.textContent =
          control.unit === ""
            ? formatControlValue(control.key, settings[control.key])
            : `${formatControlValue(control.key, settings[control.key])}${control.unit}`;
      }
    });
  };

  controls.forEach((controlConfig) => {
    if (controlConfig.type === "group") {
      const title = document.createElement("div");
      title.className = "hero-adjust-group-title";
      title.textContent = controlConfig.label;
      grid?.append(title);
      return;
    }

    const { key, label, min, max, step } = controlConfig;
    const control = document.createElement("div");
    control.className = "hero-adjust-control";
    control.innerHTML = `
      <div class="hero-adjust-control-head">
        <label for="hero-adjust-${key}">${label}</label>
        <span class="hero-adjust-control-output" data-output-for="${key}">0px</span>
      </div>
      <input
        id="hero-adjust-${key}"
        type="range"
        min="${min}"
        max="${max}"
        step="${step}"
        value="${settings[key]}"
      >
    `;

    const input = control.querySelector("input");
    const output = control.querySelector("[data-output-for]");

    input.addEventListener("input", () => {
      settings = {
        ...settings,
        [key]: Number(input.value),
      };
      applyHeroSettings();
      persistSettings();
      updateToast("Ajuste salvo localmente para teste.");
    });

    inputs.set(key, input);
    valueOutputs.set(key, output);
    grid?.append(control);
  });

  copyButton?.addEventListener("click", async () => {
    const content = cssSnippet();

    try {
      await navigator.clipboard.writeText(content);
      updateToast("CSS copiado.");
    } catch {
      updateToast("Não foi possível copiar automaticamente. Tente novamente.");
    }
  });

  resetButton?.addEventListener("click", () => {
    settings = { ...defaultSettings };
    window.localStorage.removeItem(storageKey);
    applyHeroSettings();
    updateToast("Ajustes resetados.");
  });

  applyHeroSettings();
  updateToast("Modo de ajuste do hero ativo.");
};

createHeroAdjustmentPanel();

const createHeaderAdjustmentPanel = () => {
  if (!headerAdjustMode) {
    return;
  }

  const headerInner = document.querySelector(".header-inner");
  const brand = document.querySelector(".brand");
  const brandMark = document.querySelector(".brand-mark");
  const brandText = document.querySelector(".brand-text");
  const siteNav = document.querySelector(".site-nav");
  const headerCta = document.querySelector(".header-cta");

  if (!headerInner || !brand || !brandMark || !brandText || !siteNav || !headerCta) {
    return;
  }

  const storageKey = "coronelsHeaderAdjustments";
  const rootStyles = window.getComputedStyle(document.documentElement);
  const readRootNumber = (name, fallback) => {
    const raw = rootStyles.getPropertyValue(name).trim();
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const defaultSettings = {
    headerHeight: readRootNumber("--header-adjust-height", 63),
    headerMaxWidth: readRootNumber("--header-adjust-max-width", 1250),
    headerContentOffsetX: readRootNumber("--header-adjust-content-offset-x", 0),
    headerContentOffsetY: readRootNumber("--header-adjust-content-offset-y", 0),
    headerSidePadding: readRootNumber("--header-adjust-side-padding", 4),
    headerBgOpacity: readRootNumber("--header-bg-opacity", 0.84),
    logoSize: readRootNumber("--header-brand-logo-size", 51),
    logoOffsetX: readRootNumber("--header-brand-logo-offset-x", 0),
    logoOffsetY: readRootNumber("--header-brand-logo-offset-y", 0),
    brandTextSize: readRootNumber("--header-brand-text-size-adjust", 16),
    brandTextOffsetX: readRootNumber("--header-brand-text-offset-x-adjust", 0),
    brandTextOffsetY: readRootNumber("--header-brand-text-offset-y-adjust", 0),
    brandGap: readRootNumber("--header-brand-gap-adjust", 8),
    menuOffsetX: readRootNumber("--header-menu-offset-x", 0),
    menuOffsetY: readRootNumber("--header-menu-offset-y", 0),
    menuGap: readRootNumber("--header-menu-gap", 32),
    menuFontSize: readRootNumber("--header-menu-font-size", 14),
    buttonOffsetX: readRootNumber("--header-button-offset-x", -17),
    buttonOffsetY: readRootNumber("--header-button-offset-y", 0),
    buttonWidth: readRootNumber("--header-button-width", 176),
    buttonHeight: readRootNumber("--header-button-height", 54),
    buttonFontSize: readRootNumber("--header-button-font-size", 15),
    buttonRadius: readRootNumber("--header-button-radius", 999),
  };

  const controls = [
    { type: "group", label: "Header geral" },
    { key: "headerHeight", label: "Altura do cabeçalho", min: 56, max: 140, step: 1, unit: "px", cssVar: "--header-adjust-height" },
    { key: "headerMaxWidth", label: "Largura máxima do conteúdo", min: 900, max: 1600, step: 1, unit: "px", cssVar: "--header-adjust-max-width" },
    { key: "headerContentOffsetX", label: "Posição X do conteúdo", min: -240, max: 240, step: 1, unit: "px", cssVar: "--header-adjust-content-offset-x" },
    { key: "headerContentOffsetY", label: "Posição Y do conteúdo", min: -120, max: 120, step: 1, unit: "px", cssVar: "--header-adjust-content-offset-y" },
    { key: "headerSidePadding", label: "Padding lateral", min: 0, max: 96, step: 1, unit: "px", cssVar: "--header-adjust-side-padding" },
    { key: "headerBgOpacity", label: "Opacidade do fundo", min: 0, max: 1, step: 0.01, unit: "", cssVar: "--header-bg-opacity" },
    { type: "group", label: "Logo e marca" },
    { key: "logoSize", label: "Tamanho do símbolo", min: 18, max: 96, step: 1, unit: "px", cssVar: "--header-brand-logo-size" },
    { key: "logoOffsetX", label: "Posição X da logo", min: -120, max: 120, step: 1, unit: "px", cssVar: "--header-brand-logo-offset-x" },
    { key: "logoOffsetY", label: "Posição Y da logo", min: -120, max: 120, step: 1, unit: "px", cssVar: "--header-brand-logo-offset-y" },
    { key: "brandTextSize", label: "Tamanho do texto da marca", min: 10, max: 32, step: 1, unit: "px", cssVar: "--header-brand-text-size-adjust" },
    { key: "brandTextOffsetX", label: "Posição X do texto", min: -160, max: 220, step: 1, unit: "px", cssVar: "--header-brand-text-offset-x-adjust" },
    { key: "brandTextOffsetY", label: "Posição Y do texto", min: -120, max: 120, step: 1, unit: "px", cssVar: "--header-brand-text-offset-y-adjust" },
    { key: "brandGap", label: "Espaço entre símbolo e texto", min: 0, max: 40, step: 1, unit: "px", cssVar: "--header-brand-gap-adjust" },
    { type: "group", label: "Menu de navegação" },
    { key: "menuOffsetX", label: "Posição X do menu", min: -240, max: 240, step: 1, unit: "px", cssVar: "--header-menu-offset-x" },
    { key: "menuOffsetY", label: "Posição Y do menu", min: -120, max: 120, step: 1, unit: "px", cssVar: "--header-menu-offset-y" },
    { key: "menuGap", label: "Espaçamento entre links", min: 4, max: 72, step: 1, unit: "px", cssVar: "--header-menu-gap" },
    { key: "menuFontSize", label: "Tamanho da fonte do menu", min: 10, max: 24, step: 1, unit: "px", cssVar: "--header-menu-font-size" },
    { type: "group", label: "Botão Agendar horário" },
    { key: "buttonOffsetX", label: "Posição X do botão", min: -240, max: 240, step: 1, unit: "px", cssVar: "--header-button-offset-x" },
    { key: "buttonOffsetY", label: "Posição Y do botão", min: -120, max: 120, step: 1, unit: "px", cssVar: "--header-button-offset-y" },
    { key: "buttonWidth", label: "Largura do botão", min: 120, max: 280, step: 1, unit: "px", cssVar: "--header-button-width" },
    { key: "buttonHeight", label: "Altura do botão", min: 36, max: 72, step: 1, unit: "px", cssVar: "--header-button-height" },
    { key: "buttonFontSize", label: "Tamanho da fonte do botão", min: 10, max: 24, step: 1, unit: "px", cssVar: "--header-button-font-size" },
    { key: "buttonRadius", label: "Arredondamento do botão", min: 0, max: 999, step: 1, unit: "px", cssVar: "--header-button-radius" },
  ];

  const readStoredSettings = () => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        return { ...defaultSettings };
      }

      const parsed = JSON.parse(raw);
      return {
        ...defaultSettings,
        ...Object.fromEntries(
          Object.entries(parsed).map(([key, value]) => [key, Number(value)])
        ),
      };
    } catch {
      return { ...defaultSettings };
    }
  };

  let settings = readStoredSettings();

  const panel = document.createElement("aside");
  panel.className = "header-adjust-panel";
  panel.setAttribute("aria-label", "Ajuste Cabeçalho");

  panel.innerHTML = `
    <h3>Ajuste Cabeçalho</h3>
    <p>Ajuste visual temporário do topo. Só aparece com <code>?ajusteCabecalho=1</code> ou <code>?ajusteHeader=1</code>.</p>
    <div class="hero-adjust-grid" data-header-adjust-grid></div>
    <div class="hero-adjust-actions">
      <button class="button button-gold" type="button" data-header-copy-css>Copiar CSS</button>
      <button class="button button-ghost" type="button" data-header-reset>Resetar ajustes</button>
    </div>
    <div class="hero-adjust-toast" data-header-adjust-toast></div>
  `;

  document.body.append(panel);

  const grid = panel.querySelector("[data-header-adjust-grid]");
  const toast = panel.querySelector("[data-header-adjust-toast]");
  const copyButton = panel.querySelector("[data-header-copy-css]");
  const resetButton = panel.querySelector("[data-header-reset]");
  const valueOutputs = new Map();
  const inputs = new Map();

  const persistSettings = () => {
    window.localStorage.setItem(storageKey, JSON.stringify(settings));
  };

  const formatControlValue = (key, value) => {
    const control = controls.find((item) => item.key === key);
    if (!control) {
      return String(value);
    }

    if (control.unit === "") {
      const decimals = String(control.step).includes(".")
        ? String(control.step).split(".")[1].length
        : 0;
      return Number(value).toFixed(decimals);
    }

    return `${Math.round(Number(value))}`;
  };

  const cssSnippet = () => {
    const lines = controls
      .filter((control) => control.key && control.cssVar)
      .map((control) => {
        const suffix = control.unit === "" ? "" : control.unit;
        return `  ${control.cssVar}: ${formatControlValue(control.key, settings[control.key])}${suffix};`;
      });

    return `:root {\n${lines.join("\n")}\n}`;
  };

  const updateToast = (message) => {
    if (toast) {
      toast.textContent = message;
    }
  };

  const applyHeaderSettings = () => {
    controls.forEach((control) => {
      if (!control.key || !control.cssVar) {
        return;
      }

      const suffix = control.unit === "" ? "" : control.unit;
      document.documentElement.style.setProperty(control.cssVar, `${settings[control.key]}${suffix}`);
    });

    controls.forEach((control) => {
      if (!control.key) {
        return;
      }

      const input = inputs.get(control.key);
      const output = valueOutputs.get(control.key);

      if (input) {
        input.value = String(settings[control.key]);
      }

      if (output) {
        output.textContent =
          control.unit === ""
            ? formatControlValue(control.key, settings[control.key])
            : `${formatControlValue(control.key, settings[control.key])}${control.unit}`;
      }
    });
  };

  controls.forEach((controlConfig) => {
    if (controlConfig.type === "group") {
      const title = document.createElement("div");
      title.className = "hero-adjust-group-title";
      title.textContent = controlConfig.label;
      grid?.append(title);
      return;
    }

    const { key, label, min, max, step } = controlConfig;
    const control = document.createElement("div");
    control.className = "hero-adjust-control";
    control.innerHTML = `
      <div class="hero-adjust-control-head">
        <label for="header-adjust-${key}">${label}</label>
        <span class="hero-adjust-control-output" data-output-for="${key}">0</span>
      </div>
      <input
        id="header-adjust-${key}"
        type="range"
        min="${min}"
        max="${max}"
        step="${step}"
        value="${settings[key]}"
      >
    `;

    const input = control.querySelector("input");
    const output = control.querySelector("[data-output-for]");

    input.addEventListener("input", () => {
      settings = {
        ...settings,
        [key]: Number(input.value),
      };
      applyHeaderSettings();
      persistSettings();
      updateToast("Ajuste salvo localmente para teste.");
    });

    inputs.set(key, input);
    valueOutputs.set(key, output);
    grid?.append(control);
  });

  copyButton?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(cssSnippet());
      updateToast("CSS copiado.");
    } catch {
      updateToast("Não foi possível copiar automaticamente. Tente novamente.");
    }
  });

  resetButton?.addEventListener("click", () => {
    settings = { ...defaultSettings };
    window.localStorage.removeItem(storageKey);
    applyHeaderSettings();
    updateToast("Ajustes resetados.");
  });

  applyHeaderSettings();
  updateToast("Modo de ajuste do cabeçalho ativo.");
};

createHeaderAdjustmentPanel();

const createExperienceAdjustmentPanel = () => {
  if (!experienceAdjustMode) {
    return;
  }

  const aboutSection = document.querySelector(".about");
  const aboutGrid = document.querySelector(".about-grid");
  const aboutCopy = document.querySelector(".about-copy");
  const aboutMedia = document.querySelector(".about-media");
  const aboutGallery = document.querySelector(".about-gallery");

  if (!aboutSection || !aboutGrid || !aboutCopy || !aboutMedia || !aboutGallery) {
    return;
  }

  document.body.classList.add("experience-adjust-active");

  const storageKey = "coronelsExperienceAdjustments";
  const defaultSettings = {
    copyOffsetX: 0,
    copyOffsetY: 0,
    copyWidth: 560,
    copyHeight: 420,
    copyScale: 1,
    videoOffsetX: 670,
    videoOffsetY: 8,
    videoWidth: 620,
    videoHeight: 520,
    galleryOffsetX: 0,
    galleryOffsetY: 590,
    galleryCardWidth: 320,
    galleryCardHeight: 240,
    galleryGap: 20,
    containerMaxWidth: 1320,
    containerMinHeight: 980,
    containerPaddingTop: 112,
    containerPaddingBottom: 112,
  };

  const controls = [
    { type: "group", label: "Bloco de texto" },
    { key: "copyOffsetX", label: "Posição X do texto", min: -400, max: 800, step: 1, unit: "px" },
    { key: "copyOffsetY", label: "Posição Y do texto", min: -240, max: 900, step: 1, unit: "px" },
    { key: "copyWidth", label: "Largura do texto", min: 260, max: 900, step: 1, unit: "px" },
    { key: "copyHeight", label: "Altura do quadro do texto", min: 220, max: 900, step: 1, unit: "px" },
    { key: "copyScale", label: "Escala do texto", min: 0.7, max: 1.4, step: 0.01, unit: "" },
    { type: "group", label: "Vídeo principal" },
    { key: "videoOffsetX", label: "Posição X do vídeo", min: -400, max: 1200, step: 1, unit: "px" },
    { key: "videoOffsetY", label: "Posição Y do vídeo", min: -240, max: 900, step: 1, unit: "px" },
    { key: "videoWidth", label: "Largura do vídeo", min: 240, max: 900, step: 1, unit: "px" },
    { key: "videoHeight", label: "Altura do vídeo", min: 220, max: 820, step: 1, unit: "px" },
    { type: "group", label: "Cards inferiores" },
    { key: "galleryOffsetX", label: "Posição X dos cards", min: -400, max: 1000, step: 1, unit: "px" },
    { key: "galleryOffsetY", label: "Posição Y dos cards", min: -240, max: 1300, step: 1, unit: "px" },
    { key: "galleryCardWidth", label: "Largura dos cards", min: 140, max: 420, step: 1, unit: "px" },
    { key: "galleryCardHeight", label: "Altura das imagens", min: 140, max: 420, step: 1, unit: "px" },
    { key: "galleryGap", label: "Espaço entre os cards", min: 0, max: 48, step: 1, unit: "px" },
    { type: "group", label: "Container geral" },
    { key: "containerMaxWidth", label: "Largura máxima da seção", min: 900, max: 1800, step: 1, unit: "px" },
    { key: "containerMinHeight", label: "Altura mínima da seção", min: 700, max: 1800, step: 1, unit: "px" },
    { key: "containerPaddingTop", label: "Espaçamento superior", min: 0, max: 240, step: 1, unit: "px" },
    { key: "containerPaddingBottom", label: "Espaçamento inferior", min: 0, max: 260, step: 1, unit: "px" },
  ];

  const readStoredSettings = () => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        return { ...defaultSettings };
      }

      const parsed = JSON.parse(raw);
      return {
        ...defaultSettings,
        ...Object.fromEntries(
          Object.entries(parsed).map(([key, value]) => [key, Number(value)])
        ),
      };
    } catch {
      return { ...defaultSettings };
    }
  };

  let settings = readStoredSettings();

  const panel = document.createElement("aside");
  panel.className = "experience-adjust-panel";
  panel.setAttribute("aria-label", "Ajuste Experiência");
  panel.innerHTML = `
    <h3>Ajuste Experiência</h3>
    <p>Ajuste visual temporário da seção “Sobre a experiência”. Só aparece com <code>?ajusteExperiencia=1</code>.</p>
    <div class="hero-adjust-grid" data-experience-adjust-grid></div>
    <div class="hero-adjust-actions">
      <button class="button button-gold" type="button" data-experience-copy-css>Copiar CSS</button>
      <button class="button button-ghost" type="button" data-experience-reset>Resetar ajustes</button>
    </div>
    <div class="hero-adjust-toast" data-experience-adjust-toast></div>
  `;

  document.body.append(panel);

  const grid = panel.querySelector("[data-experience-adjust-grid]");
  const toast = panel.querySelector("[data-experience-adjust-toast]");
  const copyButton = panel.querySelector("[data-experience-copy-css]");
  const resetButton = panel.querySelector("[data-experience-reset]");
  const valueOutputs = new Map();
  const inputs = new Map();

  const persistSettings = () => {
    window.localStorage.setItem(storageKey, JSON.stringify(settings));
  };

  const formatControlValue = (key, value) => {
    const control = controls.find((item) => item.key === key);
    if (!control) {
      return String(value);
    }

    if (control.unit === "") {
      const decimals = String(control.step).includes(".")
        ? String(control.step).split(".")[1].length
        : 0;
      return Number(value).toFixed(decimals);
    }

    return `${Math.round(Number(value))}`;
  };

  const cssSnippet = () => `:root {
  --about-adjust-max-width: ${formatControlValue("containerMaxWidth", settings.containerMaxWidth)}px;
  --about-adjust-min-height: ${formatControlValue("containerMinHeight", settings.containerMinHeight)}px;
  --about-adjust-padding-top: ${formatControlValue("containerPaddingTop", settings.containerPaddingTop)}px;
  --about-adjust-padding-bottom: ${formatControlValue("containerPaddingBottom", settings.containerPaddingBottom)}px;
  --about-adjust-copy-width: ${formatControlValue("copyWidth", settings.copyWidth)}px;
  --about-adjust-copy-height: ${formatControlValue("copyHeight", settings.copyHeight)}px;
  --about-adjust-copy-offset-x: ${formatControlValue("copyOffsetX", settings.copyOffsetX)}px;
  --about-adjust-copy-offset-y: ${formatControlValue("copyOffsetY", settings.copyOffsetY)}px;
  --about-adjust-copy-scale: ${formatControlValue("copyScale", settings.copyScale)};
  --about-adjust-video-width: ${formatControlValue("videoWidth", settings.videoWidth)}px;
  --about-adjust-video-height: ${formatControlValue("videoHeight", settings.videoHeight)}px;
  --about-adjust-video-offset-x: ${formatControlValue("videoOffsetX", settings.videoOffsetX)}px;
  --about-adjust-video-offset-y: ${formatControlValue("videoOffsetY", settings.videoOffsetY)}px;
  --about-adjust-gallery-offset-x: ${formatControlValue("galleryOffsetX", settings.galleryOffsetX)}px;
  --about-adjust-gallery-offset-y: ${formatControlValue("galleryOffsetY", settings.galleryOffsetY)}px;
  --about-adjust-gallery-card-width: ${formatControlValue("galleryCardWidth", settings.galleryCardWidth)}px;
  --about-adjust-gallery-card-height: ${formatControlValue("galleryCardHeight", settings.galleryCardHeight)}px;
  --about-adjust-gallery-gap: ${formatControlValue("galleryGap", settings.galleryGap)}px;
}`;

  const updateToast = (message) => {
    if (toast) {
      toast.textContent = message;
    }
  };

  const applyExperienceSettings = () => {
    document.documentElement.style.setProperty("--about-adjust-max-width", `${settings.containerMaxWidth}px`);
    document.documentElement.style.setProperty("--about-adjust-min-height", `${settings.containerMinHeight}px`);
    document.documentElement.style.setProperty("--about-adjust-padding-top", `${settings.containerPaddingTop}px`);
    document.documentElement.style.setProperty("--about-adjust-padding-bottom", `${settings.containerPaddingBottom}px`);
    document.documentElement.style.setProperty("--about-adjust-copy-width", `${settings.copyWidth}px`);
    document.documentElement.style.setProperty("--about-adjust-copy-height", `${settings.copyHeight}px`);
    document.documentElement.style.setProperty("--about-adjust-copy-offset-x", `${settings.copyOffsetX}px`);
    document.documentElement.style.setProperty("--about-adjust-copy-offset-y", `${settings.copyOffsetY}px`);
    document.documentElement.style.setProperty("--about-adjust-copy-scale", `${settings.copyScale}`);
    document.documentElement.style.setProperty("--about-adjust-video-width", `${settings.videoWidth}px`);
    document.documentElement.style.setProperty("--about-adjust-video-height", `${settings.videoHeight}px`);
    document.documentElement.style.setProperty("--about-adjust-video-offset-x", `${settings.videoOffsetX}px`);
    document.documentElement.style.setProperty("--about-adjust-video-offset-y", `${settings.videoOffsetY}px`);
    document.documentElement.style.setProperty("--about-adjust-gallery-offset-x", `${settings.galleryOffsetX}px`);
    document.documentElement.style.setProperty("--about-adjust-gallery-offset-y", `${settings.galleryOffsetY}px`);
    document.documentElement.style.setProperty("--about-adjust-gallery-card-width", `${settings.galleryCardWidth}px`);
    document.documentElement.style.setProperty("--about-adjust-gallery-card-height", `${settings.galleryCardHeight}px`);
    document.documentElement.style.setProperty("--about-adjust-gallery-gap", `${settings.galleryGap}px`);

    controls.forEach((control) => {
      if (!control.key) {
        return;
      }

      const input = inputs.get(control.key);
      const output = valueOutputs.get(control.key);

      if (input) {
        input.value = String(settings[control.key]);
      }

      if (output) {
        output.textContent =
          control.unit === ""
            ? formatControlValue(control.key, settings[control.key])
            : `${formatControlValue(control.key, settings[control.key])}${control.unit}`;
      }
    });
  };

  controls.forEach((control) => {
    if (control.type === "group") {
      const title = document.createElement("div");
      title.className = "hero-adjust-group-title";
      title.textContent = control.label;
      grid?.append(title);
      return;
    }

    const { key, label, min, max, step } = control;
    const item = document.createElement("div");
    item.className = "hero-adjust-control";
    item.innerHTML = `
      <div class="hero-adjust-control-head">
        <label for="experience-adjust-${key}">${label}</label>
        <span class="hero-adjust-control-output" data-output-for="${key}">0</span>
      </div>
      <input
        id="experience-adjust-${key}"
        type="range"
        min="${min}"
        max="${max}"
        step="${step}"
        value="${settings[key]}"
      >
    `;

    const input = item.querySelector("input");
    const output = item.querySelector("[data-output-for]");

    input.addEventListener("input", () => {
      settings = {
        ...settings,
        [key]: Number(input.value),
      };
      applyExperienceSettings();
      persistSettings();
      updateToast("Ajuste salvo localmente para teste.");
    });

    inputs.set(key, input);
    valueOutputs.set(key, output);
    grid?.append(item);
  });

  copyButton?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(cssSnippet());
      updateToast("CSS copiado.");
    } catch {
      updateToast("Não foi possível copiar automaticamente. Tente novamente.");
    }
  });

  resetButton?.addEventListener("click", () => {
    settings = { ...defaultSettings };
    window.localStorage.removeItem(storageKey);
    applyExperienceSettings();
    updateToast("Ajustes resetados.");
  });

  applyExperienceSettings();
  updateToast("Modo de ajuste da experiência ativo.");
};

createExperienceAdjustmentPanel();

