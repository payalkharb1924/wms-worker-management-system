export const speak = (text, lang = "en-IN") => {
  if (!window.speechSynthesis) return;

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang;
  utter.rate = 0.95;
  utter.pitch = 1;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
};
