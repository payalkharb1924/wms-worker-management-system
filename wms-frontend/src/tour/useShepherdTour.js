// src/tour/useShepherdTour.js
import Shepherd from "shepherd.js";
import { createAttendanceTour } from "./useAttendanceTour";

let dashboardTour = null;

export const createDashboardTour = ({ setActiveTab }) => {
  dashboardTour = new Shepherd.Tour({
    useModalOverlay: true,
    defaultStepOptions: {
      cancelIcon: { enabled: true },
      scrollTo: false,
      modalOverlayOpeningRadius: 16,
      highlightClass: "shepherd-highlight",
    },
  });

  // STEP 1 — Workers tab
  dashboardTour.addStep({
    id: "workers-tab",
    text: "This is where you manage all your workers.",
    attachTo: { element: ".tab-workers", on: "bottom" },
    buttons: [
      {
        text: "Next",
        classes: "shepherd-button shepherd-button-primary",
        action: () => {
          setActiveTab("Workers");
          dashboardTour.next();
        },
      },
    ],
  });

  // STEP 2 — Add worker
  dashboardTour.addStep({
    id: "add-worker",
    text: "Tap here to add your first worker.",
    attachTo: { element: ".add-worker-btn", on: "bottom" },
    buttons: [
      {
        text: "Add worker",
        classes: "shepherd-button shepherd-button-primary",
        action: () => {
          const btn = document.querySelector(".add-worker-btn");
          if (btn) btn.click(); // open modal

          dashboardTour.hide(); // 👈 THIS IS THE KEY
        },
      },
    ],
  });

  // STEP 3 — Worker card
  dashboardTour.addStep({
    id: "worker-card",
    text: "This is your worker. Tap here to view attendance, advances, and settlement details.",
    attachTo: { element: ".worker-card", on: "top" },
    buttons: [
      {
        text: "Finish",
        classes: "shepherd-button shepherd-button-primary",
        action: () => {
          dashboardTour.complete();
          localStorage.setItem("tour.dashboard.completed", "true");

          // ✅ 1️⃣ Switch tab FIRST
          setActiveTab("Attendance");

          // ✅ 2️⃣ Wait for Attendance DOM, THEN start tour
          const wait = setInterval(() => {
            const toggle = document.querySelector(".attendance-toggle");
            if (toggle) {
              clearInterval(wait);
              createAttendanceTour().start();
            }
          }, 100);
        },
      },
    ],
  });

  return dashboardTour;
};

// Called manually AFTER worker is created
export const goToNextTourStep = () => {
  if (dashboardTour) {
    dashboardTour.next();
  }
};
