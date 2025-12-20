import Shepherd from "shepherd.js";
import { attendanceEvents } from "./attendanceEvents";

let attendanceTour = null;

export const createAttendanceTour = () => {
  attendanceTour = new Shepherd.Tour({
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
            attendanceTour.complete();
            localStorage.setItem("tour.attendance.completed", "true");
          },
        },
      ],
    },
  });

  /* ---------------- STEP 1: Attendance tab (EVENT ONLY) ---------------- */

  attendanceTour.addStep({
    id: "attendance-tab",
    text: "Tap Attendance to start marking daily work.",
    attachTo: { element: ".tab-attendance", on: "bottom" },
    buttons: [], // ⛔ no Next
  });

  window.addEventListener(
    attendanceEvents.opened,
    () => attendanceTour.next(),
    { once: true }
  );

  /* ---------------- STEP 2: Daily vs History ---------------- */

  attendanceTour.addStep({
    id: "attendance-toggle",
    text: "Daily is for today. History is for past records.",
    attachTo: { element: ".attendance-toggle", on: "top" },
    buttons: [
      {
        text: "Next",
        classes: "shepherd-button shepherd-button-primary",
        action: attendanceTour.next,
      },
    ],
  });

  /* ---------------- STEP 3: Date (manual always) ---------------- */

  attendanceTour.addStep({
    id: "attendance-date",
    text: "Select the date for which attendance is marked.",
    attachTo: { element: ".attendance-date", on: "top" },
    buttons: [
      {
        text: "Back",
        classes: "shepherd-button shepherd-button-secondary",
        action: attendanceTour.back,
      },
      {
        text: "Next",
        classes: "shepherd-button shepherd-button-primary",
        action: attendanceTour.next,
      },
    ],
  });

  /* ---------------- STEP 4: Worker card (EVENT + FALLBACK) ---------------- */

  attendanceTour.addStep({
    id: "attendance-card",
    text: "Tap a worker card to expand details.",
    attachTo: { element: ".attendance-card-first", on: "top" },
    buttons: [
      {
        text: "Back",
        classes: "shepherd-button shepherd-button-secondary",
        action: attendanceTour.back,
      },
      {
        text: "Next",
        classes: "shepherd-button shepherd-button-primary",
        action: attendanceTour.next,
      },
    ],
  });

  window.addEventListener(
    attendanceEvents.expanded,
    () => attendanceTour.next(),
    { once: true }
  );

  /* ---------------- STEP 5: Present toggle ---------------- */

  attendanceTour.addStep({
    id: "attendance-present",
    text: "Mark the worker present if they worked today.",
    attachTo: { element: ".attendance-present-toggle", on: "right" },
    buttons: [
      {
        text: "Back",
        classes: "shepherd-button shepherd-button-secondary",
        action: attendanceTour.back,
      },
      {
        text: "Next",
        classes: "shepherd-button shepherd-button-primary",
        action: attendanceTour.next,
      },
    ],
  });

  window.addEventListener(
    attendanceEvents.present,
    () => attendanceTour.next(),
    { once: true }
  );

  /* ---------------- STEP 6: Apply to all ---------------- */

  attendanceTour.addStep({
    id: "attendance-apply-all",
    text: "Apply the same details to all workers at once.",
    attachTo: { element: ".attendance-apply-all", on: "right" },
    buttons: [
      {
        text: "Back",
        classes: "shepherd-button shepherd-button-secondary",
        action: attendanceTour.back,
      },
      {
        text: "Next",
        classes: "shepherd-button shepherd-button-primary",
        action: attendanceTour.next,
      },
    ],
  });

  window.addEventListener(
    attendanceEvents.applyAll,
    () => attendanceTour.next(),
    { once: true }
  );

  /* ---------------- STEP 7: Save ---------------- */

  attendanceTour.addStep({
    id: "attendance-save",
    text: "Save attendance once everything looks correct.",
    attachTo: { element: ".attendance-save-btn", on: "top" },
    buttons: [
      {
        text: "Finish",
        classes: "shepherd-button shepherd-button-primary",
        action: () => {
          attendanceTour.complete();
          localStorage.setItem("tour.attendance.completed", "true");

          // 👇 START HISTORY TOUR AFTER A SHORT DELAY
          setTimeout(() => {
            const historyCompleted = localStorage.getItem(
              "tour.attendance.history.completed"
            );

            if (!historyCompleted) {
              import("./useAttendanceHistoryTour").then(
                ({ createAttendanceHistoryTour }) => {
                  createAttendanceHistoryTour().start();
                }
              );
            }
          }, 400); // small delay = DOM settles
        },
      },
    ],
  });

  /* ---------------- SAFETY: prevent duplicate tooltips ---------------- */

  attendanceTour.on("show", () => {
    const els = document.querySelectorAll(".shepherd-element");
    els.forEach((el, i) => {
      if (i < els.length - 1) el.remove();
    });
  });

  return attendanceTour;
};
