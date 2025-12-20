import Shepherd from "shepherd.js";

let extraTour = null;

export const createExtraTour = () => {
  extraTour = new Shepherd.Tour({
    useModalOverlay: true,
    defaultStepOptions: {
      cancelIcon: { enabled: true },
      scrollTo: true,
      modalOverlayOpeningRadius: 16,
      highlightClass: "shepherd-highlight",
      buttons: [
        {
          text: "Skip",
          classes: "shepherd-button shepherd-button-secondary",
          action: () => {
            extraTour.complete();
            localStorage.setItem("tour.extra.completed", "true");
          },
        },
      ],
    },
  });

  /* STEP 1 — DAILY EXTRA */
  extraTour.addStep({
    id: "extra-daily",
    text: "Here you can add extra items or expenses given to workers by filling these details.",
    attachTo: { element: ".extra-daily-card", on: "top" },
    buttons: [
      {
        text: "Next",
        classes: "shepherd-button shepherd-button-primary",
        action: extraTour.next,
      },
    ],
  });

  /* STEP 2 — HISTORY FILTERS */
  extraTour.addStep({
    id: "extra-history-tab",
    text: "Tap History to view past extras.",
    attachTo: { element: ".extra-history-tab", on: "bottom" },
    buttons: [],
    when: {
      show: () => {
        const handler = () => {
          const wait = setInterval(() => {
            const el = document.querySelector(".extra-history-filters");
            if (el) {
              clearInterval(wait);
              extraTour.next(); // move to STEP 3
            }
          }, 100);
        };

        window.addEventListener("click", handler, { once: true });
      },
    },
  });

  extraTour.addStep({
    id: "extra-history-filters",
    text: `
You can view past extras using:
• Date range  
• Single day  
• Worker-wise filters
  `,
    attachTo: { element: ".extra-history-filters", on: "top" },
    buttons: [
      {
        text: "Finish",
        classes: "shepherd-button shepherd-button-primary",
        action: () => {
          extraTour.complete();
          localStorage.setItem("tour.extra.completed", "true");

          setTimeout(() => {
            window.dispatchEvent(new Event("demo:extra-tour-finished"));
          }, 300);
        },
      },
    ],
  });

  return extraTour;
};
