import Shepherd from "shepherd.js";

export const createAdvanceTabIntroTour = ({ setActiveTab }) => {
  const tour = new Shepherd.Tour({
    useModalOverlay: true,
    defaultStepOptions: {
      scrollTo: true,
      modalOverlayOpeningRadius: 16,
      highlightClass: "shepherd-highlight",
    },
  });

  tour.addStep({
    id: "go-to-advances",
    text: "Next, let’s manage advances given to workers.",
    attachTo: { element: ".tab-advances", on: "bottom" },
    buttons: [
      {
        text: "Go to Advances",
        classes: "shepherd-button shepherd-button-primary",
        action: () => {
          tour.complete();
          localStorage.setItem("tour.advance.intro.completed", "true");

          setActiveTab("Advances");

          setTimeout(() => {
            window.dispatchEvent(new Event("demo:start-advance-tour"));
          }, 400);
        },
      },
    ],
  });

  return tour;
};
