import React, { useEffect, useState } from "react";
import Joyride, { STATUS } from "react-joyride";
import { speak } from "../utils/speak";

/**
 * Premium, controlled onboarding tour
 * - waits for user actions
 * - glassmorphic tooltip
 * - progress indicator
 * - voice guidance
 * - no auto-scroll bugs
 */

const DemoTour = ({ run, steps, onFinish, onStepChange }) => {
  const [stepIndex, setStepIndex] = useState(0);

  // 🔊 Voice guidance
  useEffect(() => {
    if (!run) return;
    const step = steps[stepIndex];
    if (step?.voice) {
      speak(step.voice);
    }
  }, [stepIndex, run, steps]);

  // 🎯 Listen for real user actions
  useEffect(() => {
    const advance = () => {
      setStepIndex((i) => i + 1);
    };

    window.addEventListener("demo:next", advance);

    return () => {
      window.removeEventListener("demo:next", advance);
    };
  }, []);

  const handleJoyride = (data) => {
    const { index, status, type } = data;

    if (index !== undefined && onStepChange) {
      onStepChange(index);
    }

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      onFinish();
    }
  };

  useEffect(() => {
    if (run) {
      setStepIndex(0);
    }
  }, [run]);

  return (
    <>
      <Joyride
        run={run}
        steps={steps}
        stepIndex={stepIndex}
        continuous={false}
        showSkipButton
        disableOverlayClose
        spotlightClicks={steps[stepIndex]?.allowClicks}
        callback={handleJoyride}
        tooltipComponent={CustomTooltip}
        scrollToFirstStep={false}
        styles={{
          options: {
            zIndex: 10000,
            overlayColor: "rgba(0,0,0,0.45)",
          },
        }}
        floaterProps={{
          boundary: "viewport",
          offset: 8,
          disableFlip: false,
          placement: "bottom", // 👈 prefer bottom
        }}
      />

      {/* 👈 Swipe animation helper */}
      {run && steps[stepIndex]?.showSwipeHint && (
        <div className="fixed inset-0 z-[9999] pointer-events-none">
          <div className="absolute bottom-40 left-1/2 -translate-x-1/2">
            <div className="px-6 py-3 rounded-2xl bg-white/70 backdrop-blur-xl shadow-xl animate-swipe">
              👈 Swipe left to delete
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DemoTour;

/* ---------------- Tooltip ---------------- */

const CustomTooltip = ({ step, index, size, skipProps }) => {
  const isActionStep = !!step.waitFor;

  return (
    <div
      className="bg-white rounded-xl shadow-xl p-3"
      style={{
        maxWidth: "260px", // 👈 HARD LIMIT
        width: "260px",
        boxSizing: "border-box",
      }}
    >
      <div className="text-[11px] text-gray-500 mb-1">
        Step {index + 1} of {size}
      </div>

      <div className="text-sm font-medium text-gray-800 mb-3">
        {step.content}
      </div>

      <div className="flex justify-between items-center">
        <button {...skipProps} className="text-xs text-gray-500">
          Skip
        </button>

        {!isActionStep && (
          <button
            onClick={() => window.dispatchEvent(new Event("demo:next"))}
            className="px-3 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-semibold"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
};
