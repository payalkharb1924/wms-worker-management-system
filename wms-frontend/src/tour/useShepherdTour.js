import Shepherd from "shepherd.js";

export const createDashboardTour = ({ setActiveTab }) => {
  const tour = new Shepherd.Tour({
    useModalOverlay: true,
    defaultStepOptions: {
      cancelIcon: { enabled: true },
      scrollTo: false,
      modalOverlayOpeningRadius: 16,
      highlightClass: "shepherd-highlight",

      popperOptions: {
        modifiers: [
          {
            name: "offset",
            options: {
              offset: [0, 12],
            },
          },
          {
            name: "preventOverflow",
            options: {
              boundary: "viewport",
              padding: 12,
            },
          },
        ],
      },
    },
  });

  tour.addStep({
    id: "workers-tab",
    text: "This is where you manage all your workers.",
    attachTo: { element: ".tab-workers", on: "bottom" },
    buttons: [
      {
        text: "Next",
        classes: "shepherd-button shepherd-button-primary",
        action: tour.next,
      },
    ],
  });

  tour.addStep({
    id: "add-worker",
    text: "Tap here to add your first worker.",
    attachTo: { element: ".add-worker-btn", on: "bottom" },
    buttons: [
      {
        text: "Got it",
        classes: "shepherd-button shepherd-button-primary",
        action: tour.next,
      },
    ],
  });

  return tour;
};
