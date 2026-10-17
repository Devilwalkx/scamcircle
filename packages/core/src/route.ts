import type { Assessment, ClaimType } from "./indicators.js";

export interface RouteSuggestion {
  claim: ClaimType | "none";
  /** The first thing to show. Always says not to use contact details from the message. */
  headline: string;
  steps: string[];
  avoid: string[];
}

const STEPS: Record<ClaimType | "none", string[]> = {
  family: ["Call them on the number you already have saved for them, from before this message.", "Or ask another family member or friend to reach them their usual way.", "Ask something only the real person would know."],
  bank: ["Use your bank's official app, or call the number on the back of your card.", "Do not read out codes, PINs or passwords to anyone who contacted you."],
  government: ["Type the official website address yourself (for example gov.uk) and look for the same notice there.", "Or use a phone number from an old official letter."],
  courier: ["Open the courier's official app, or type their website address yourself.", "Check whether you were expecting a parcel."],
  tech_support: ["Do not install anything. Hang up or ignore it.", "If you worry, contact the company using the number on its own official website that you type in yourself."],
  workplace: ["Check with the person in the way your workplace normally uses, such as a known phone line or in person.", "Ask a colleague you already know."],
  supplier: ["Phone the company on details you already had, such as an earlier invoice or contract.", "Do not pay into new account details until you have done this."],
  unknown_contact: ["Do not reply. If you do know them, contact them by a route you already had.", "Ask a friend or family member what they think."],
  none: ["Contact the person or organisation using details you already had, from before this message.", "Ask someone you trust to look at it too."]
};

const WITH_MESSAGE_SUPPLIED = "Do not use the phone number or link in the message.";

export function suggestRoute(a: Assessment): RouteSuggestion {
  const claim: ClaimType | "none" = a.claims[0] ?? "none";
  const steps = [...STEPS[claim]];
  const avoid = ["Any phone number in the message.", "Any link in the message.", "Replying in the same chat.", "Details that the message asks you to use to pay."];
  return { claim, headline: `${WITH_MESSAGE_SUPPLIED} Check it another way.`, steps, avoid };
}
