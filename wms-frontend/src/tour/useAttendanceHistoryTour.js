import Shepherd from "shepherd.js";
import { attendanceEvents } from "./attendanceEvents";

let historyTour = null;

export const createAttendanceHistoryTour = () => {
  historyTour = new Shepherd.Tour({
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
            historyTour.complete();
            localStorage.setItem(
              "tour.attendance.history.basic.completed",
              "true"
            );
          },
        },
      ],
    },
  });

  /* STEP 1 — History tab */
  historyTour.addStep({
    id: "history-tab",
    text: "See all past attendance records here in History.",
    attachTo: { element: ".attendance-toggle", on: "top" },
    buttons: [],
  });

  window.addEventListener(
    "demo:attendance-history-opened",
    () => {
      const waitForFilters = setInterval(() => {
        const el = document.querySelector(".history-filters-card");
        if (el) {
          clearInterval(waitForFilters);
          historyTour.next();
        }
      }, 100);
    },
    { once: true }
  );

  /* STEP 2 — Filters overview (NO dynamic attach) */
  historyTour.addStep({
    id: "history-filters",
    text: `
You can filter attendance in multiple ways:
• Date range  
• Single day  
• Worker-wise
  `,
    attachTo: {
      element: ".history-filters-card",
      on: "top",
    },
    buttons: [
      {
        text: "Finish",
        classes: "shepherd-button shepherd-button-primary",
        action: () => {
          historyTour.complete();
          localStorage.setItem("tour.attendance.completed", "true");

          setTimeout(() => {
            window.dispatchEvent(new Event("demo:start-advance-intro"));
          }, 300);
        },
      },
    ],
  });

  return historyTour;
};
