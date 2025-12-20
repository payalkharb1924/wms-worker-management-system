import Shepherd from "shepherd.js";

let summaryTour = null;

export const createSummaryTour = ({ setViewMode }) => {
  summaryTour = new Shepherd.Tour({
    useModalOverlay: true,
    defaultStepOptions: {
      scrollTo: true,
      cancelIcon: { enabled: true },
      classes: "shepherd-theme-custom", // optional future-proofing
    },
  });

  /* STEP 1 — Settlement History */
  summaryTour.addStep({
    id: "summary-history",
    text: "Your settlement history will appear here. Tap any entry to see full details.",
    attachTo: { element: ".summary-history-tab", on: "bottom" },
    buttons: [
      {
        text: "Next",
        classes: "shepherd-button shepherd-button-primary",
        action: summaryTour.next,
      },
    ],
  });

  /* STEP 2 — Insights tab */
  summaryTour.addStep({
    id: "summary-insights-tab",
    text: "Click here to view insights about workers, payments, and trends.",
    attachTo: { element: ".summary-insights-tab", on: "bottom" },
    buttons: [
      {
        text: "Next",
        classes: "shepherd-button shepherd-button-primary",
        action: () => {}, // handled via click listener
      },
    ],
    when: {
      show: () => {
        const handler = () => {
          setViewMode("insights");

          const wait = setInterval(() => {
            const el = document.querySelector(".summary-insights");
            if (el) {
              clearInterval(wait);
              summaryTour.next();
            }
          }, 100);
        };

        window.addEventListener("click", handler, { once: true });
      },
    },
  });

  /* STEP 3 — Graph area */
  summaryTour.addStep({
    id: "summary-graphs",
    text: "These charts help you understand spending, pending payments, and worker performance.",
    attachTo: { element: ".summary-insights", on: "top" },
    buttons: [
      {
        text: "Finish",
        classes: "shepherd-button shepherd-button-primary",
        action: () => {
          summaryTour.complete();
          localStorage.setItem("tour.summary.completed", "true");
        },
      },
    ],
  });

  return summaryTour;
};
