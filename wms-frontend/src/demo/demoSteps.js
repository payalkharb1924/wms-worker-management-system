export const demoSteps = [
  {
    target: '[data-tour="nav-workers"]',
    content: "This is where you manage all your workers.",
    tab: "Workers",
  },

  {
    target: ".add-worker-btn",
    content: "Tap here to add your first worker.",
    allowClicks: true,
    waitFor: "manual",
    placement: "bottom-start",
  },
  {
    target: ".worker-name-input",
    content: "Enter worker name here.",
    allowClicks: true,
  },

  {
    target: ".worker-remarks-input",
    content: "Optional remarks about the worker.",
    allowClicks: true,
  },

  {
    target: ".save-worker-btn",
    content: "Save the worker to continue.",
    allowClicks: true,
    waitFor: "manual",
  },
];
