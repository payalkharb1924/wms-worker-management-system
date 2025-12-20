import Shepherd from "shepherd.js";

let advanceTour = null;

export const createAdvanceTour = () => {
  advanceTour = new Shepherd.Tour({
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
            advanceTour.complete();
            localStorage.setItem("tour.advance.completed", "true");
          },
        },
      ],
    },
  });

  /* STEP 1 — DAILY ADVANCE */
  advanceTour.addStep({
    id: "advance-daily",
    text: "Here you can add advance money given to workers by filling these details.",
    attachTo: { element: ".advance-daily-card", on: "top" },
    buttons: [
      {
        text: "Next",
        classes: "shepherd-button shepherd-button-primary",
        action: advanceTour.next,
      },
    ],
  });

  /* STEP 2 — HIGHLIGHT HISTORY TAB (WAIT FOR CLICK) */
  advanceTour.addStep({
    id: "advance-history-tab",
    text: "Tap History to view past advances.",
    attachTo: { element: ".advance-history-tab", on: "bottom" },
    buttons: [],
    when: {
      show: () => {
        const handler = () => {
          // wait for history DOM
          const wait = setInterval(() => {
            const historyEl = document.querySelector(
              ".advance-history-filters"
            );
            if (historyEl) {
              clearInterval(wait);
              advanceTour.next(); // 👈 move to STEP 3
            }
          }, 100);
        };

        window.addEventListener("demo:advance-history-clicked", handler, {
          once: true,
        });
      },
    },
  });

  advanceTour.addStep({
    id: "advance-finish",
    text: "Great! You can review past advances here. Next, let’s look at Extras.",
    attachTo: { element: ".advance-history-filters", on: "top" },
    buttons: [
      {
        text: "Go to Extras",
        classes: "shepherd-button shepherd-button-primary",
        action: () => {
          advanceTour.complete();
          localStorage.setItem("tour.advance.completed", "true");

          setTimeout(() => {
            window.dispatchEvent(new Event("demo:advance-tour-finished"));
          }, 300);
        },
      },
    ],
  });

  return advanceTour;
};
