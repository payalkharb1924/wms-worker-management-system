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

  // 🔒 Lock body scroll during demo (fixes tab-scroll bug)
  useEffect(() => {
    if (run) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => (document.body.style.overflow = "");
  }, [run]);

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
        disableScrolling
        spotlightClicks={steps[stepIndex]?.allowClicks}
        callback={handleJoyride}
        tooltipComponent={CustomTooltip}
        styles={{
          options: {
            zIndex: 10000,
            overlayColor: "rgba(0,0,0,0.45)",
          },
        }}
        floaterProps={{
          boundary: "viewport", // 🔥 VERY IMPORTANT
          offset: 12,
          disableFlip: false,
          placement: "auto",
          styles: {
            floater: {
              maxWidth: "92vw",
            },
          },
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
      style={{
        maxWidth: "92vw",
        marginInline: "auto",
      }}
      className="rounded-2xl bg-white backdrop-blur-xl shadow-2xl p-4"
    >
      <div className="text-xs text-gray-500 mb-1">
        Step {index + 1} of {size}
      </div>

      <div className="text-sm font-medium text-gray-800 mb-4">
        {step.content}
      </div>

      <div className="flex justify-between items-center">
        <button {...skipProps} className="text-xs text-gray-500">
          Skip
        </button>

        {!isActionStep && (
          <button
            onClick={() => window.dispatchEvent(new Event("demo:next"))}
            className="px-4 py-2 rounded-xl bg-orange-500 text-white text-sm font-semibold"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
};
