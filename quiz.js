(() => {
  const STORAGE_KEY = "design_quiz_state_v1";
  const TOTAL_STEPS = 6;

  const form = document.getElementById("quizForm");
  const steps = [...document.querySelectorAll(".step")];
  const stepText = document.getElementById("stepText");
  const progressBar = document.getElementById("progressBar");
  const successScreen = document.getElementById("successScreen");
  const areaInput = document.getElementById("area");
  const areaValue = document.getElementById("areaValue");
  const submitBtn = document.getElementById("submitBtn");

  let currentStep = 1;

  const state = {
    room_type: "",
    zones: [],
    area: 60,
    style: "",
    budget: "",
    name: "",
    phone: "",
    email: "",
    comment: "",
    agree: false
  };

  function trackEvent(eventName, payload = {}) {
    console.log("[analytics]", eventName, payload);

    if (window.dataLayer && Array.isArray(window.dataLayer)) {
      window.dataLayer.push({
        event: eventName,
        ...payload
      });
    }
  }

  function getUTMParams() {
    const params = new URLSearchParams(window.location.search);
    const utmKeys = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content"
    ];

    const result = {};

    utmKeys.forEach((key) => {
      const value = params.get(key);
      if (value) {
        result[key] = value;
      }
    });

    return result;
  }

  function saveState() {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        currentStep,
        state
      })
    );
  }

  function loadState() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);

      if (parsed.state) {
        Object.assign(state, parsed.state);
      }

      if (
        parsed.currentStep &&
        parsed.currentStep >= 1 &&
        parsed.currentStep <= TOTAL_STEPS
      ) {
        currentStep = parsed.currentStep;
      }
    } catch (error) {
      console.warn("Не удалось восстановить состояние квиза", error);
    }
  }

  function cssEscapeValue(value) {
    if (window.CSS && typeof window.CSS.escape === "function") {
      return window.CSS.escape(value);
    }

    return value.replace(/"/g, '\\"');
  }

  function updateAreaLabel() {
    areaValue.textContent = `Площадь: ${areaInput.value} м²`;
  }

  function setSelectedClasses() {
    document.querySelectorAll(".option-card").forEach((card) => {
      const input = card.querySelector("input");
      if (!input) return;
      card.classList.toggle("selected", input.checked);
    });
  }

  function hydrateFormFromState() {
    if (state.room_type) {
      const room = form.querySelector(
        `input[name="room_type"][value="${cssEscapeValue(state.room_type)}"]`
      );
      if (room) room.checked = true;
    }

    if (Array.isArray(state.zones)) {
      state.zones.forEach((zone) => {
        const input = form.querySelector(
          `input[name="zones"][value="${cssEscapeValue(zone)}"]`
        );
        if (input) input.checked = true;
      });
    }

    areaInput.value = state.area || 60;
    updateAreaLabel();

    if (state.style) {
      const style = form.querySelector(
        `input[name="style"][value="${cssEscapeValue(state.style)}"]`
      );
      if (style) style.checked = true;
    }

    if (state.budget) {
      const budget = form.querySelector(
        `input[name="budget"][value="${cssEscapeValue(state.budget)}"]`
      );
      if (budget) budget.checked = true;
    }

    form.name.value = state.name || "";
    form.phone.value = state.phone || "";
    form.email.value = state.email || "";
    form.comment.value = state.comment || "";
    form.agree.checked = !!state.agree;

    setSelectedClasses();
  }

  function clearError(step) {
    const errorEl = document.getElementById(`error-${step}`);
    if (errorEl) {
      errorEl.textContent = "";
    }
  }

  function setError(step, message) {
    const errorEl = document.getElementById(`error-${step}`);
    if (errorEl) {
      errorEl.textContent = message;
    }
  }

  function updateUI() {
    steps.forEach((step) => {
      step.classList.toggle("active", Number(step.dataset.step) === currentStep);
    });

    stepText.textContent = `Шаг ${currentStep} из ${TOTAL_STEPS}`;
    progressBar.style.width = `${(currentStep / TOTAL_STEPS) * 100}%`;

    if (currentStep === 6) {
      trackEvent("quiz_form_view");
    } else {
      trackEvent(`quiz_step_${currentStep}`);
    }

    saveState();
  }

  function isValidPhone(phone) {
    const digits = phone.replace(/\D/g, "");
    return digits.length >= 10;
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function validateStep(step) {
    clearError(step);

    if (step === 1) {
      const checked = form.querySelector('input[name="room_type"]:checked');

      if (!checked) {
        setError(1, "Пожалуйста, выберите тип помещения.");
        return false;
      }

      state.room_type = checked.value;
      return true;
    }

    if (step === 2) {
      const checked = [...form.querySelectorAll('input[name="zones"]:checked')];

      if (checked.length === 0) {
        setError(2, "Выберите хотя бы одну зону.");
        return false;
      }

      state.zones = checked.map((item) => item.value);
      return true;
    }

    if (step === 3) {
      state.area = Number(areaInput.value);
      return true;
    }

    if (step === 4) {
      const checked = form.querySelector('input[name="style"]:checked');

      if (!checked) {
        setError(4, "Пожалуйста, выберите стиль интерьера.");
        return false;
      }

      state.style = checked.value;
      return true;
    }

    if (step === 5) {
      const checked = form.querySelector('input[name="budget"]:checked');

      if (!checked) {
        setError(5, "Пожалуйста, выберите бюджет.");
        return false;
      }

      state.budget = checked.value;
      return true;
    }

    if (step === 6) {
      state.name = form.name.value.trim();
      state.phone = form.phone.value.trim();
      state.email = form.email.value.trim();
      state.comment = form.comment.value.trim();
      state.agree = form.agree.checked;

      if (!state.phone) {
        setError(6, "Пожалуйста, укажите телефон.");
        return false;
      }

      if (!isValidPhone(state.phone)) {
        setError(6, "Пожалуйста, укажите корректный телефон.");
        return false;
      }

      if (state.email && !isValidEmail(state.email)) {
        setError(6, "Пожалуйста, укажите корректный e-mail.");
        return false;
      }

      if (!state.agree) {
        setError(6, "Необходимо согласие на обработку персональных данных.");
        return false;
      }

      return true;
    }

    return true;
  }

  function goNext() {
    if (!validateStep(currentStep)) return;

    if (currentStep < TOTAL_STEPS) {
      currentStep += 1;
      updateUI();
    }
  }

  function goBack() {
    if (currentStep > 1) {
      clearError(currentStep);
      currentStep -= 1;
      updateUI();
    }
  }

  function collectPayload() {
    return {
      room_type: state.room_type,
      zones: state.zones,
      area: state.area,
      style: state.style,
      budget: state.budget,
      name: state.name,
      phone: state.phone,
      email: state.email,
      comment: state.comment,
      submitted_at: new Date().toISOString(),
      page_url: window.location.href,
      ...getUTMParams()
    };
  }

  async function submitQuiz() {
    if (!validateStep(6)) return;

    const payload = collectPayload();

    submitBtn.disabled = true;
    submitBtn.textContent = "Отправка...";
    clearError(6);

    trackEvent("quiz_submit", { step: 6 });

    try {
      // Замените URL на ваш реальный обработчик
      const response = await fetch("/api/quiz-submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      console.log("Отправленные данные:", payload);

      sessionStorage.removeItem(STORAGE_KEY);
      form.style.display = "none";
      successScreen.classList.add("active");

      trackEvent("quiz_success", { step: 6 });
    } catch (error) {
      console.error("Ошибка отправки:", error);
      setError(6, "Не удалось отправить заявку. Пожалуйста, попробуйте ещё раз.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Получить консультацию";
    }
  }

  function bindChoiceCards() {
    document.querySelectorAll(".option-card").forEach((card) => {
      card.addEventListener("click", () => {
        const input = card.querySelector("input");
        if (!input) return;

        if (input.type === "radio") {
          input.checked = true;
        } else if (input.type === "checkbox") {
          input.checked = !input.checked;
        }

        setSelectedClasses();

        if (input.name === "room_type") {
          state.room_type = input.value;
          clearError(1);
          saveState();
        }

        if (input.name === "style") {
          state.style = input.value;
          clearError(4);
          saveState();
        }

        if (input.name === "budget") {
          state.budget = input.value;
          clearError(5);
          saveState();
        }

        if (input.name === "zones") {
          state.zones = [...form.querySelectorAll('input[name="zones"]:checked')].map(
            (el) => el.value
          );
          clearError(2);
          saveState();
        }
      });
    });
  }

  function bindNavigation() {
    const nextBtn1 = document.getElementById("nextBtn1");

    nextBtn1.addEventListener("click", goNext);

    document.querySelectorAll("[data-next]").forEach((btn) => {
      btn.addEventListener("click", goNext);
    });

    document.querySelectorAll("[data-back]").forEach((btn) => {
      btn.addEventListener("click", goBack);
    });
  }

  function bindInputs() {
    areaInput.addEventListener("input", () => {
      state.area = Number(areaInput.value);
      updateAreaLabel();
      saveState();
    });

    form.name.addEventListener("input", () => {
      state.name = form.name.value.trim();
      saveState();
    });

    form.phone.addEventListener("input", () => {
      state.phone = form.phone.value.trim();
      clearError(6);
      saveState();
    });

    form.email.addEventListener("input", () => {
      state.email = form.email.value.trim();
      clearError(6);
      saveState();
    });

    form.comment.addEventListener("input", () => {
      state.comment = form.comment.value.trim();
      saveState();
    });

    form.agree.addEventListener("change", () => {
      state.agree = form.agree.checked;
      clearError(6);
      saveState();
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      await submitQuiz();
    });
  }

  function init() {
    loadState();
    hydrateFormFromState();
    bindChoiceCards();
    bindNavigation();
    bindInputs();
    updateUI();
    trackEvent("quiz_start");
  }

  init();
})();




  
function petr() {
    window.location.href = 'quiz1.html'}





function kk() {
    window.location.href = 'quiz.html'
}
function hello() {
    window.location.href ='quiz2.html'
}

function hello1() {
    window.location.href ='quiz3.html'
}

 function kk1() {
    window.location.href='quiz1.html'
 }
 function kk2() {
    window.location.href='quiz2.html'

 }
function hello2() {
    window.location.href='quiz4.html'
 }
 function hello3() {
    window.location.href='quiz5.html'

 }
 function kk3() {
    window.location.href='quiz3.html'
 }
 function hello4() {
    window.location.href='quiz4.html'
 }
 function kk4() {

 
 document.getElementById('message').innerHTML = 'Спасибо! Ваша заявка отправлена. Мы свяжемся с вами в ближайшее время)'
 }
