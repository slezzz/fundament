import { useState } from "react";
import { send } from "../lib/messaging";
import { t } from "../lib/i18n";
import { BrandMark } from "../components/BrandMark";
import "../styles/global.css";
import "./onboarding.css";

export function OnboardingApp() {
  const [step, setStep] = useState(0);
  const steps = [
    { title: t("onboard_1_title"), body: t("onboard_1_body") },
    { title: t("onboard_2_title"), body: t("onboard_2_body") },
    { title: t("onboard_3_title"), body: t("onboard_3_body") },
    { title: t("onboard_4_title"), body: t("onboard_4_body") },
  ];
  const current = steps[step];
  if (!current) return null;

  async function finish() {
    await send({ type: "COMPLETE_ONBOARDING" });
    window.close();
  }

  return (
    <div className="onboard">
      <p className="brand">
        <BrandMark size={28} />
        Fundament
      </p>
      <div className="dots" aria-hidden="true">
        {steps.map((_, i) => (
          <span key={i} className={i === step ? "on" : ""} />
        ))}
      </div>
      <h1>{current.title}</h1>
      <p>{current.body}</p>
      <div className="onboard-actions">
        {step > 0 ? (
          <button type="button" className="ghost" onClick={() => setStep(step - 1)}>
            {t("onboard_back")}
          </button>
        ) : null}
        <button
          type="button"
          className="primary"
          onClick={() => {
            if (step >= steps.length - 1) {
              void finish();
            } else {
              setStep(step + 1);
            }
          }}
        >
          {step >= steps.length - 1 ? t("onboard_done") : t("onboard_continue")}
        </button>
      </div>
    </div>
  );
}
