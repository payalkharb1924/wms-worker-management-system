import Shepherd from "shepherd.js";

let gesturesTour = null;

export const createAttendanceHistoryGesturesTour = () => {
  gesturesTour = new Shepherd.Tour({
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
            gesturesTour.complete();
            localStorage.setItem(
              "tour.attendance.history.gestures.completed",
              "true"
            );
          },
        },
      ],
    },
  });

  /* STEP — Edit & Delete gestures */
  gesturesTour.addStep({
    id: "history-gestures",
    text: `
• Long-press an entry to edit it  
• Swipe left to delete an entry  

⚠️ These actions work only for unsettled entries
    `,
    attachTo: {
      element: ".history-attendance-card",
      on: "top",
    },
    buttons: [
      {
        text: "Finish",
        classes: "shepherd-button shepherd-button-primary",
        action: () => {
          gesturesTour.complete();
          localStorage.setItem(
            "tour.attendance.history.gestures.completed",
            "true"
          );
        },
      },
    ],
  });

  return gesturesTour;
};
