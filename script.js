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

      publicServiceSelect.value = selectedService;
      toggleFieldError(publicServiceSelect, false);
      renderServiceCards();
      updateServiceSummary();
      setServiceAccordionState(false);
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

const heroAdjustMode = new URLSearchParams(window.location.search).get("ajusteHero") === "1";

const createHeroAdjustmentPanel = () => {
  if (!heroAdjustMode) {
    return;
  }

  const heroBrandBlock = document.querySelector(".hero-brand-block");
  const heroSymbol = document.querySelector(".hero-brand-symbol-wrap");
  const heroAccent = document.querySelector(".hero-title-accent");
  const heroBase = document.querySelector(".hero-title-base");

  if (!heroBrandBlock || !heroSymbol || !heroAccent || !heroBase) {
    return;
  }

  const storageKey = "coronelsHeroAdjustments";
  const defaultSettings = {
    symbolSize: 112,
    symbolGap: 22,
    accentSize: 110,
    baseSize: 69,
    blockOffsetY: 0,
    blockOffsetX: 0,
    baseOffsetX: 0,
    baseOffsetY: 0,
    titleGap: 0,
  };

  const controls = [
    { key: "symbolSize", label: "Tamanho do símbolo", min: 56, max: 180, step: 1 },
    { key: "symbolGap", label: "Distância símbolo/texto", min: 0, max: 72, step: 1 },
    { key: "accentSize", label: "Tamanho de Coronel's", min: 52, max: 160, step: 1 },
    { key: "baseSize", label: "Tamanho de BARBEARIA", min: 28, max: 96, step: 1 },
    { key: "blockOffsetY", label: "Posição vertical do bloco", min: -180, max: 180, step: 1 },
    { key: "blockOffsetX", label: "Posição horizontal do bloco", min: -220, max: 220, step: 1 },
    { key: "baseOffsetX", label: "Posição horizontal de BARBEARIA", min: -160, max: 160, step: 1 },
    { key: "baseOffsetY", label: "Posição vertical de BARBEARIA", min: -120, max: 120, step: 1 },
    { key: "titleGap", label: "Espaço entre Coronel's e BARBEARIA", min: -16, max: 48, step: 1 },
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
    <p>Ajuste visual temporário do bloco da marca. Só aparece com <code>?ajusteHero=1</code>.</p>
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

  const cssSnippet = () => `:root {
  --hero-brand-symbol-size: ${settings.symbolSize}px;
  --hero-brand-symbol-gap: ${settings.symbolGap}px;
  --hero-brand-accent-size: ${settings.accentSize}px;
  --hero-brand-base-size: ${settings.baseSize}px;
  --hero-brand-offset-y: ${settings.blockOffsetY}px;
  --hero-brand-offset-x: ${settings.blockOffsetX}px;
  --hero-brand-base-offset-x: ${settings.baseOffsetX}px;
  --hero-brand-base-offset-y: ${settings.baseOffsetY}px;
  --hero-brand-title-gap: ${settings.titleGap}px;
}`;

  const updateToast = (message) => {
    if (toast) {
      toast.textContent = message;
    }
  };

  const applyHeroSettings = () => {
    document.documentElement.style.setProperty("--hero-brand-symbol-size", `${settings.symbolSize}px`);
    document.documentElement.style.setProperty("--hero-brand-symbol-gap", `${settings.symbolGap}px`);
    document.documentElement.style.setProperty("--hero-brand-accent-size", `${settings.accentSize}px`);
    document.documentElement.style.setProperty("--hero-brand-base-size", `${settings.baseSize}px`);
    document.documentElement.style.setProperty("--hero-brand-offset-y", `${settings.blockOffsetY}px`);
    document.documentElement.style.setProperty("--hero-brand-offset-x", `${settings.blockOffsetX}px`);
    document.documentElement.style.setProperty("--hero-brand-base-offset-x", `${settings.baseOffsetX}px`);
    document.documentElement.style.setProperty("--hero-brand-base-offset-y", `${settings.baseOffsetY}px`);
    document.documentElement.style.setProperty("--hero-brand-title-gap", `${settings.titleGap}px`);

    controls.forEach(({ key }) => {
      const input = inputs.get(key);
      const output = valueOutputs.get(key);

      if (input) {
        input.value = String(settings[key]);
      }

      if (output) {
        output.textContent = `${settings[key]}px`;
      }
    });
  };

  controls.forEach(({ key, label, min, max, step }) => {
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
  updateToast("Modo de ajuste ativo.");
};

createHeroAdjustmentPanel();

