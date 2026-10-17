/**
 * Verification methods. "Independent" means the channel was NOT supplied by the message under
 * suspicion. A callback number, link or reply thread that came from the message is never independent evidence.
 */
export type VerificationMethodId =
  | "call_saved_contact"
  | "in_person"
  | "official_app_or_card"
  | "official_site_typed"
  | "asked_other_known_person"
  | "called_number_in_message"
  | "replied_in_same_chat"
  | "clicked_link_in_message"
  | "just_looked_at_message"
  | "thumbs_up_only";

export interface VerificationMethod {
  id: VerificationMethodId;
  label: string;
  independent: boolean;
  why: string;
}

export const VERIFICATION_METHODS: readonly VerificationMethod[] = [
  { id: "call_saved_contact", label: "Called a number I already had saved before this message", independent: true, why: "The number did not come from the message." },
  { id: "in_person", label: "Asked the person face to face", independent: true, why: "No message channel is involved." },
  { id: "official_app_or_card", label: "Used the official app, or the number on the back of my card or on an old bill", independent: true, why: "The route came from a source the message does not control." },
  { id: "official_site_typed", label: "Typed the official website address myself", independent: true, why: "Not a link from the message." },
  { id: "asked_other_known_person", label: "Asked another person I know who can reach them by their own route", independent: true, why: "A separate channel that the message did not supply." },
  { id: "called_number_in_message", label: "Called the number given in the message", independent: false, why: "The sender chose that number, so it proves nothing about who they are." },
  { id: "replied_in_same_chat", label: "Replied in the same chat or thread", independent: false, why: "The same sender answers, whoever they are." },
  { id: "clicked_link_in_message", label: "Used a link from the message", independent: false, why: "The sender chose where that link goes." },
  { id: "just_looked_at_message", label: "Only looked at the message (no check made)", independent: false, why: "An opinion is not a verification step." },
  { id: "thumbs_up_only", label: "Just a thumbs-up or 'looks fine'", independent: false, why: "A thumbs-up is not verification." }
];

export function methodById(id: string): VerificationMethod | undefined {
  return VERIFICATION_METHODS.find((m) => m.id === id);
}

export function isIndependentMethod(id: string): boolean {
  return methodById(id)?.independent === true;
}

export type StepOutcome = "confirmed_by_real_person" | "denied_by_real_person" | "could_not_reach" | "inconclusive";

export const STEP_OUTCOMES: ReadonlyArray<{ id: StepOutcome; label: string }> = [
  { id: "confirmed_by_real_person", label: "The real person confirmed they sent or asked for this" },
  { id: "denied_by_real_person", label: "The real person said they did NOT send or ask for this" },
  { id: "could_not_reach", label: "I could not reach them" },
  { id: "inconclusive", label: "Unclear or inconclusive" }
];

/** A step counts as a completed verification step only if the route was independent AND the result was conclusive. */
export function stepCompletes(method: string, outcome: string): boolean {
  return isIndependentMethod(method) && (outcome === "confirmed_by_real_person" || outcome === "denied_by_real_person");
}
