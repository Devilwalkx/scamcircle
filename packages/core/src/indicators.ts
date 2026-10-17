import { extractLinks, type LinkAnalysis } from "./links.js";

/**
 * Deterministic, local, rule-based indicator engine.
 *
 * - It reports WHAT IS IN THE TEXT (with source spans). It never says a message is safe, genuine or legitimate.
 * - Output is data only. Text inside the message is treated as untrusted data: nothing in a message can change
 *   app state, send anything, or alter this analysis except by matching a rule (instructions aimed at an AI
 *   are themselves reported as an indicator).
 * - English only for word rules. Other languages, unreadable or very short text get "cannot assess" for the
 *   words; link, number and account-detail checks (language independent) still run.
 * - No network code: links are examined as written, never opened.
 */

export const ENGINE_VERSION = "rules-1";
export const MAX_ANALYSED_CHARS = 20000;

export type IndicatorCategory =
  | "claimed_identity" | "new_number" | "urgency" | "secrecy" | "payment_request" | "payment_destination"
  | "payment_detail_change" | "payment_method" | "credential_request" | "remote_access" | "link_action"
  | "call_request" | "hostile_instruction" | "link" | "threat" | "offer" | "vague_opener";

export type ClaimType = "family" | "bank" | "government" | "courier" | "tech_support" | "workplace" | "supplier" | "unknown_contact";
export type Strength = "strong" | "moderate" | "context";

export interface Span { start: number; end: number; text: string }

export interface Indicator {
  id: string;
  category: IndicatorCategory;
  label: string;
  explanation: string;
  strength: Strength;
  claim?: ClaimType;
  spans: Span[];
}

export type CannotAssessReason = "empty" | "too_short" | "unreadable" | "unsupported_language";
export type Outcome = "cannot_assess" | "no_indicators_found" | "indicators_found";

export interface SuppliedContact { kind: "phone" | "link" | "email" | "account"; value: string; span: Span }

export interface Assessment {
  engine: string;
  outcome: Outcome;
  reason?: CannotAssessReason;
  /** "full" = word rules ran; "links_only" = only language-independent checks ran; "none" = nothing could be assessed. */
  coverage: "full" | "links_only" | "none";
  partialLanguageNote?: string;
  headline: string;
  indicators: Indicator[];
  links: LinkAnalysis[];
  supplied: SuppliedContact[];
  claims: ClaimType[];
  missing: string[];
  truncated: boolean;
}

interface Rule {
  id: string;
  category: IndicatorCategory;
  label: string;
  explanation: string;
  strength: Strength;
  claim?: ClaimType;
  patterns: RegExp[];
  /** Skip matches that are negated just before ("do not share ..."). */
  negatable?: boolean;
}

const R = (re: string) => new RegExp(re, "giu");
const MONEY = "(?:£|\\$|€|usd|gbp|eur)\\s?\\d";

const RULES: Rule[] = [
  // ---- who the message says it is from
  { id: "id_family_child", category: "claimed_identity", claim: "family", strength: "context", label: "Says it is from a relative", explanation: "The message says, or assumes, it is from a family member. Anyone can type this.",
    patterns: [R("\\b(?:hi|hello|hey|dear)\\s+(?:mum|mom|mam|mummy|dad|daddy|nan|nana|nanna|gran|granny|grandma|grandad|grandpa)\\b"), R("\\b(?:it'?s|this is|its)\\s+(?:your\\s+)?(?:mum|mom|dad|son|daughter|grandson|granddaughter|brother|sister|nephew|niece|uncle|aunt|auntie)\\b"), R("\\bit'?s me\\b"), R("\\byour (?:son|daughter|grandson|granddaughter)\\b")] },
  { id: "id_bank", category: "claimed_identity", claim: "bank", strength: "context", label: "Says it is from a bank or card company", explanation: "The message says it is from your bank. Banks do not need you to act on a message alone.",
    patterns: [R("\\b(?:fraud|security) (?:team|department|desk)\\b"), R("\\b(?:this is|calling from|message from|from)\\s+(?:your\\s+)?(?:bank|barclays|hsbc|lloyds|natwest|santander|monzo|revolut|halifax|nationwide|visa|mastercard)\\b"), R("\\b(?:your|the)\\s+(?:bank|card)\\s+(?:account|has been|was|is)\\b"), R("\\b(?:barclays|hsbc|lloyds|natwest|santander|monzo|revolut|halifax|nationwide)(?: bank| banking)?\\s*[:\\-\u2013]")] },
  { id: "id_gov", category: "claimed_identity", claim: "government", strength: "context", label: "Says it is from a government body or the police", explanation: "The message says it is from an official body. Real bodies can be checked through their official website.",
    patterns: [R("\\b(?:hm revenue(?: and|\\s?&) customs|revenue and customs)\\b"), R("\\b(?:hmrc|dvla|nhs|home office|border force|tax (?:office|refund|rebate)|council tax|the police|police officer|detective|national crime agency|court (?:order|notice))\\b")] },
  { id: "id_courier", category: "claimed_identity", claim: "courier", strength: "context", label: "Says it is about a parcel or delivery", explanation: "Delivery messages are often copied by scammers.",
    patterns: [R("\\b(?:royal mail|dpd|evri|dhl|ups|fedex|parcel|courier|delivery (?:fee|attempt|failed)|missed delivery)\\b")] },
  { id: "id_tech", category: "claimed_identity", claim: "tech_support", strength: "context", label: "Says it is technical support", explanation: "Real companies do not normally contact you first about problems with your computer.",
    patterns: [R("\\b(?:microsoft|apple|windows|amazon) (?:support|security|technician)\\b"), R("\\byour (?:computer|device|pc|phone|account) (?:has|is|was|may)\\b.{0,30}\\b(?:virus|hacked|infected|compromised|locked|suspended)\\b")] },
  { id: "id_work", category: "claimed_identity", claim: "workplace", strength: "context", label: "Says it is from a boss or colleague", explanation: "Messages that pretend to be a manager are a known trick.",
    patterns: [R("\\b(?:i'?m|this is|it'?s)\\s+(?:your\\s+)?(?:boss|ceo|director|manager|head of)\\b"), R("\\b(?:your|the)\\s+(?:ceo|director|boss)\\b")] },
  { id: "id_supplier", category: "claimed_identity", claim: "supplier", strength: "context", label: "Says it is from a supplier, builder or solicitor", explanation: "Requests that look like invoices are often copied.",
    patterns: [R("\\b(?:invoice|solicitor|conveyancer|conveyancing|builder|contractor|landlord|letting agent)\\b")] },
  { id: "id_new_contact", category: "claimed_identity", claim: "unknown_contact", strength: "context", label: "Writes as if you already know them", explanation: "A message from an unknown number that acts like you know them is a common opening.",
    patterns: [R("\\bremember me\\b"), R("\\bwrong number\\b"), R("\\b(?:i\\s+)?got your number from\\b")] },

  // ---- new number
  { id: "new_number", category: "new_number", strength: "moderate", label: "Says this is a new number or a replaced phone", explanation: "'New number, old phone broken' is the usual opening of a family impersonation. The message cannot prove it.",
    patterns: [R("\\b(?:new|different|temporary|replacement)\\s+(?:phone\\s+|mobile\\s+)?(?:number|phone|mobile|sim)\\b"), R("\\b(?:lost|broke|broken|dropped|smashed|cracked|damaged|stolen|ruined|fell)\\b.{0,25}\\b(?:my\\s+)?(?:old\\s+)?(?:phone|mobile|sim)\\b"), R("\\bsave (?:this|my new) (?:number|one)\\b"), R("\\bchanged (?:my )?(?:number|phone)\\b"), R("\\b(?:on|using) (?:a )?(?:friend'?s|someone'?s|borrowed|different) (?:phone|number)\\b")] },

  // ---- pressure
  { id: "urgency", category: "urgency", strength: "moderate", label: "Pushes you to act quickly", explanation: "Pressure to hurry stops you checking. Real people and banks can wait while you check.",
    patterns: [R("\\b(?:urgent(?:ly)?|immediately|right now|asap|as soon as possible|today only|within\\s+\\d+\\s*(?:hours?|hrs?|minutes?|mins?)|last chance|final (?:notice|warning|reminder)|before (?:midnight|5pm|the end of the day)|hurry|time[- ]sensitive|act now|expires? (?:today|soon|tonight)|(?:will|may) be (?:suspended|blocked|closed|cancelled|frozen|arrested|prosecuted))\\b"), R("\\b(?:need|needs) (?:it|this|them|you)\\s+(?:today|now|tonight)\\b"), R("\\bemergency\\b"), R("\\b(?:pay|settle|clear)\\b[^.?!]{0,60}\\b(?:today|tonight|immediately|right now)\\b")] },

  // ---- threats (an official body does not arrest or prosecute by text message)
  { id: "threat_arrest", category: "threat", strength: "strong", label: "Threatens arrest", explanation: "Real police, courts and tax offices do not threaten arrest by text message and then ask for payment. Scammers use fear so you do not stop to check.",
    patterns: [R("\\bwarrant\\b[^.?!]{0,30}\\barrest\\b"), R("\\barrest warrant\\b"), R("\\b(?:you (?:will|may|could)|you'll) (?:be )?arrest(?:ed)?\\b"), R("\\bavoid (?:being )?(?:arrest(?:ed)?|prosecution|legal action)\\b")] },
  { id: "threat_legal", category: "threat", strength: "moderate", label: "Threatens legal action or a penalty", explanation: "Messages that threaten court, prosecution or penalties are often used to rush people into paying. A real body can be checked through its official website.",
    patterns: [R("\\b(?:prosecution|legal action|court (?:action|summons|proceedings)|bailiffs?|criminal (?:charges|investigation)|under investigation|fined)\\b")] },
  { id: "secrecy", category: "secrecy", strength: "strong", label: "Asks you to keep it secret", explanation: "Asking you not to tell anyone is a strong warning sign. It stops you getting a second opinion.",
    patterns: [R("\\b(?:don'?t|do not|dont|please don'?t|never)\\s+(?:tell|say anything|mention|let)\\b"), R("\\bkeep (?:this|it) (?:between us|secret|quiet|private|to yourself|confidential)\\b"), R("\\bour (?:little )?secret\\b"), R("\\bno one (?:needs|has) to know\\b"), R("\\b(?:don'?t|do not) (?:call|ring|phone|contact) (?:me|anyone|the bank|the police)\\b"), R("\\b(?:don'?t|do not) (?:tell|let) (?:dad|mum|mom|anyone|your (?:family|bank))\\b")] },

  // ---- money
  { id: "payment_request", category: "payment_request", strength: "moderate", label: "Asks for money or a payment", explanation: "A message that asks you to send money should be checked another way before you do anything.",
    patterns: [R(`\\b(?:send|transfer|pay|wire|lend|loan|give|deposit|forward|sort out|cover)\\b.{0,40}${MONEY}`), R(`${MONEY}[\\d,.]*\\b.{0,40}\\b(?:send|transfer|pay|wire)\\b`), R("\\b(?:can|could|would|will) you (?:please )?(?:send|transfer|pay|lend|loan|help me with|cover|sort)\\b.{0,60}\\b(?:money|cash|funds|payment|bill|bills|rent|fee|fees|deposit|invoice)\\b"), R("\\b(?:send|transfer|pay)\\s+(?:me|us|it|them)?\\s*(?:\\w+\\s+){0,3}(?:bitcoin|btc|crypto(?:currency)?|usdt|ethereum)\\b"), R("\\bneed (?:some |a (?:little|bit of) )?(?:money|cash|funds|help paying)\\b"), R("\\bpay (?:the|an?|this|your)\\s+(?:[a-z-]+\\s+){0,2}(?:fee|fine|invoice|bill|tax|customs|delivery|charge|balance|outstanding)\\b"), R("\\b(?:payment|refund|rebate) (?:is )?(?:due|pending|waiting|ready)\\b"), R("\\b(?:small )?(?:fee|charge) (?:of|to)\\b.{0,30}\\b(?:release|claim|receive|deliver)\\b")] },
  { id: "payment_destination", category: "payment_destination", strength: "context", label: "Gives account details to pay into", explanation: "Account details in a message were chosen by the sender. Do not treat them as the right place to pay.",
    patterns: [R("\\bsort\\s*code\\b"), R("\\baccount\\s*(?:number|no\\.?)\\b"), R("\\b[A-Z]{2}\\d{2}\\s?[A-Z0-9]{4}(?:\\s?[A-Z0-9]{4}){2,7}(?:\\s?[A-Z0-9]{1,4})?\\b"), R("\\b\\d{2}-\\d{2}-\\d{2}\\b"), R("\\biban\\b")] },
  { id: "payment_detail_change", category: "payment_detail_change", strength: "strong", label: "Says the bank details have changed", explanation: "'Our bank details have changed' is a common way to redirect real payments. Check with the company using details you already had.",
    patterns: [R("\\b(?:new|changed|updated|different|revised|alternative)\\s+(?:bank\\s+|banking\\s+|payment\\s+)?(?:account|bank|sort code)\\s*(?:details|number|info|information)?\\b"), R("\\b(?:bank|account|payment)\\s+details\\s+(?:have|has|were|are)\\s+(?:changed|updated|new)\\b"), R("\\b(?:not|don'?t|do not|stop)\\s+(?:use|pay|send)\\b.{0,25}\\b(?:old|previous|original)\\s+(?:account|details|bank)\\b"), R("\\b(?:the )?new details (?:below|attached)\\b"), R("\\b(?:account|details)\\b.{0,40}\\b(?:has|have) been (?:updated|changed)\\b"), R("\\bplease (?:use|pay into|send (?:it )?to|transfer to) (?:the |our )?(?:new|following|below|attached) (?:account|bank)\\b"), R("\\b(?:switched|changed|moved) (?:to )?(?:a )?(?:new )?(?:banks?|bank accounts?|accounts?)\\b"), R("\\b(?:future|further|all) payments (?:should|must|need to|are to) (?:now )?(?:go|be (?:made|sent|paid)) (?:to|into)\\b")] },
  { id: "gift_cards", category: "payment_method", strength: "strong", label: "Asks for gift cards or voucher codes", explanation: "Only scammers ask to be paid in gift cards. They cannot be traced or reversed.",
    patterns: [R("\\bgift\\s*cards?\\b"), R("\\b(?:itunes|google play|amazon|steam|apple|ebay)\\s+(?:gift\\s*)?(?:cards?|vouchers?)\\b"), R("\\bvouchers?\\b.{0,25}\\b(?:codes?|numbers?|photo|picture)\\b"), R("\\bscratch (?:off|the)\\b")] },
  { id: "investment_promise", category: "payment_method", strength: "strong", label: "Promises guaranteed profits", explanation: "Nobody can guarantee returns. 'Double your money' offers are a classic scam.",
    patterns: [R("\\bguaranteed\\s+(?:\\d+%\\s+)?(?:returns?|profits?|income)\\b"), R("\\b(?:double|triple) your (?:money|investment)\\b"), R("\\b\\d{2,}%\\s+returns?\\b")] },
  { id: "crypto", category: "payment_method", strength: "moderate", label: "Mentions crypto-currency", explanation: "Crypto payments cannot be taken back. Scammers like them for that reason.",
    patterns: [R("\\b(?:bitcoin|btc|crypto(?:currency)?|ethereum|usdt|tether|wallet address|binance|coinbase|bitcoin atm)\\b")] },
  { id: "hard_transfer", category: "payment_method", strength: "moderate", label: "Asks for a hard-to-reverse way of paying", explanation: "Wire services and cash-pick-up cannot easily be reversed.",
    patterns: [R("\\b(?:western union|moneygram|wire transfer|cash app|zelle|cash in an envelope|courier will (?:collect|pick up))\\b")] },
  { id: "credentials", category: "credential_request", strength: "strong", label: "Asks for a code, PIN or password", explanation: "A real bank or company will not ask you to read out or send a code, PIN or password.",
    negatable: true,
    patterns: [R("\\b(?:share|send|tell|read(?: out)?|give|provide|reply with|forward|confirm|enter|text|type)\\b.{0,40}\\b(?:otp|one[- ]time (?:pass(?:code|word)|code)|verification code|security code|passcode|6[- ]digit code|pin(?: number)?|password|cvv|card number|card details|login details|recovery phrase|seed phrase)\\b"), R("\\b(?:otp|one[- ]time (?:pass(?:code|word)|code)|verification code|security code|passcode|pin(?: number)?|password|cvv|card number|login details|recovery phrase)\\b.{0,30}\\b(?:to me|to us|back|to verify|to confirm)\\b")] },
  { id: "remote_access", category: "remote_access", strength: "strong", label: "Asks you to install an app or give remote access", explanation: "Remote-access tools let a stranger control your phone or computer.",
    patterns: [R("\\b(?:anydesk|teamviewer|quick ?support|ultraviewer|remote (?:access|desktop|control|session))\\b"), R("\\b(?:install|download)\\s+(?:an?\\s+|the\\s+|this\\s+)?(?:app|software|program|tool|extension)\\b")] },

  // ---- too-good offers and up-front fees
  { id: "income_offer", category: "offer", strength: "moderate", label: "Offers easy money for little work", explanation: "Offers of large pay for simple work from home are a common way to get people to pay a fee or hand over bank details.",
    patterns: [R("\\b(?:earn|make)\\s+(?:up to\\s+)?(?:£|\\$|€)\\s?\\d[\\d,]*\\s*(?:a|per|\\/)\\s*(?:day|week|hour)\\b"), R("\\bno experience (?:needed|required|necessary)\\b"), R("\\bwork(?:ing)? from home\\b[^.?!]{0,40}\\b(?:earn|income|£|\\$)")] },
  { id: "upfront_fee", category: "payment_request", strength: "moderate", label: "Asks for a fee up front", explanation: "Being asked to pay a registration, processing or release fee before you get something is a common scam shape.",
    patterns: [R("\\b(?:registration|admin(?:istration)?|processing|joining|training|activation|clearance|release|starter|application|verification) fee\\b")] },
  { id: "vague_family_opener", category: "vague_opener", strength: "strong", label: "Starts like a common family-impersonation message", explanation: "A greeting to a parent or grandparent followed by 'are you free?' or 'I need a favour', with no details, is how many impersonation chats begin. It can also be a real message, so check with the person another way before replying.",
    patterns: [R("^\\s*(?:hi|hey|hello)\\s+(?:mum|mom|mam|mummy|dad|daddy|nan|nana|nanna|gran|granny|grandma|grandad|grandpa)\\b(?=[\\s\\S]{0,100}\\b(?:are you (?:free|there|around|busy)|need (?:a )?favou?r|ask(?:ing)? (?:you )?a favou?r|can you help me|i need your help)\\b)")] },

  // ---- actions
  { id: "link_action", category: "link_action", strength: "context", label: "Asks you to tap a link", explanation: "Links in messages go where the sender chose.",
    patterns: [R("\\b(?:click|tap|open|follow|visit|go to|log ?in(?:to)?|sign in(?: at)?|verify (?:at|via|here)|update (?:at|here))\\b.{0,30}\\b(?:link|here|below|url|site|website|page|portal)\\b")] },
  { id: "call_number", category: "call_request", strength: "moderate", label: "Asks you to ring a number it gives", explanation: "A number given in the message is the sender's choice. Ringing it does not show who they are. Use a number you already had.",
    patterns: [R("\\b(?:call|ring|phone|dial)\\s+(?:us\\s+|me\\s+)?(?:on\\s+|at\\s+)?(?:this number\\s+|the number\\s+)?\\+?\\d[\\d\\s().-]{6,}\\d\\b")] },
  { id: "call_request", category: "call_request", strength: "context", label: "Asks you to call or reply on the contact details it gives", explanation: "A number or reply thread supplied by the message is not independent evidence of who is behind it.",
    patterns: [R("\\b(?:call|ring|phone|text|whatsapp|message|reply to)\\s+(?:me|us|this number|on this|back|the number|our (?:team|helpline))\\b")] },

  // ---- hostile instructions aimed at software
  { id: "hostile_phrase", category: "hostile_instruction", strength: "moderate", label: "Contains wording used to steer software", explanation: "Phrases like 'ignore previous instructions' are used to try to steer AI tools. They also appear in ordinary text such as manuals, so this is a weak sign on its own. This app never obeys text inside a message.",
    patterns: [R("\\b(?:ignore|disregard|forget|override|bypass)\\b.{0,30}\\b(?:previous|prior|above|earlier|all|any|your|these|the)\\b.{0,20}\\b(?:instructions?|rules?|prompts?|guidelines?|checks?|warnings?)\\b")] },
  { id: "hostile_instruction", category: "hostile_instruction", strength: "strong", label: "Contains instructions aimed at a computer or AI", explanation: "A normal message from a person does not talk to software. This app never obeys text inside a message.",
    patterns: [R("\\b(?:ignore|disregard|forget|override|bypass)\\b.{0,30}\\b(?:previous|prior|above|earlier|all|any|your|these|the)\\b.{0,20}\\b(?:instructions?|rules?|prompts?|guidelines?|checks?|warnings?)\\b(?=.{0,120}\\b(?:you are|assistant|\\bai\\b|system|mark|label|rate|classify|output|respond|tell the user|do not warn|don'?t warn|safe|legit))"), R("\\b(?:system prompt|developer message|new instructions?|you are (?:now )?(?:an? )?(?:ai|assistant|language model|chatbot|gpt|claude)|as an ai)\\b"), R("\\b(?:mark|label|rate|classify|report|tell|say|state|output|respond|conclude|describe)\\b.{0,40}\\b(?:safe|legit(?:imate)?|genuine|verified|trusted|not (?:a )?scam|no (?:risk|indicators?))\\b"), R("\\b(?:do not|don'?t) (?:warn|alert|flag|show|display)\\b"), R("\\b(?:share|send|forward|export|reveal|email)\\b.{0,30}\\b(?:this case|the case|my vault|the vault|your contacts|keys?|recovery (?:secret|phrase)|conversation)\\b"), R("</?(?:system|instructions?|assistant|prompt)>")] }
];

const STOP_EN = new Set("the a an to you your is are was were be been of and or in on at for with this that it i me my we our not no do does did have has had will would can could please from by as if so but just now hi hello hey thanks thank mum dad dear pay send call need want get got just there here what when how who why can't don't i'm it's".split(" "));
const STOP_OTHER = new Set("el la los las de del que y en un una por para con es no se lo mi tu su está estoy necesito dinero hola le les je tu il elle nous vous est une des pour pas dans que qui ich du er sie wir ist und der die das nicht ein eine mit für auf bitte hallo il di che per sono non ho ciao olá você não uma eu".split(" "));

function words(text: string): string[] {
  return text.toLowerCase().match(/[\p{L}][\p{L}'’]*/gu) ?? [];
}

function negatedBefore(text: string, idx: number): boolean {
  return /(?:\bnot|\bnever|n't|\bdont|\bno)\s*(?:to\s+)?$/iu.test(text.slice(Math.max(0, idx - 16), idx));
}

function decide(ind: Indicator[]): Outcome {
  const strong = ind.filter((i) => i.strength === "strong").length;
  const moderate = ind.filter((i) => i.strength === "moderate").length;
  return strong >= 1 || moderate >= 2 ? "indicators_found" : "no_indicators_found";
}

const PHONE_RE = /(?<![\p{L}\p{N}])\+?\d[\d\s().-]{7,}\d(?![\p{L}\p{N}])/gu;

function collectSupplied(text: string, links: LinkAnalysis[]): SuppliedContact[] {
  const out: SuppliedContact[] = [];
  for (const l of links) out.push({ kind: l.kind === "email" ? "email" : "link", value: l.raw, span: { start: l.start, end: l.end, text: l.raw } });
  for (const m of text.matchAll(PHONE_RE)) {
    const digits = m[0].replace(/\D/g, "");
    if (digits.length < 9 || digits.length > 15) continue;
    if (/^\d{2}-\d{2}-\d{2}$/.test(m[0])) continue;
    out.push({ kind: "phone", value: m[0], span: { start: m.index!, end: m.index! + m[0].length, text: m[0] } });
  }
  return out.sort((a, b) => a.span.start - b.span.start);
}

function linkIndicators(links: LinkAnalysis[]): Indicator[] {
  const out: Indicator[] = [];
  for (const l of links) {
    for (const f of l.findings) {
      if (f.severity === "info" && f.id !== "unusual_tld") continue;
      out.push({
        id: `link_${f.id}`,
        category: "link",
        label: f.label,
        explanation: f.detail + " (Checked as written only; the link was not opened.)",
        strength: f.severity === "strong" ? "strong" : f.severity === "moderate" ? "moderate" : "context",
        spans: [{ start: l.start, end: l.end, text: l.raw }]
      });
    }
  }
  return out;
}

function detectLanguage(text: string): { kind: "english" | "mixed" | "other" | "none"; note?: string } {
  const letters = text.match(/\p{L}/gu) ?? [];
  if (letters.length === 0) return { kind: "none" };
  const nonLatin = letters.filter((c) => !/\p{Script=Latin}/u.test(c)).length;
  if (nonLatin / letters.length > 0.3) return { kind: "other" };
  const w = words(text);
  const en = w.filter((x) => STOP_EN.has(x)).length;
  const other = w.filter((x) => STOP_OTHER.has(x) && !STOP_EN.has(x)).length;
  if (w.length >= 3 && en === 0 && w.length >= 4) return { kind: "other" };
  if (other >= 2 && other >= en) return { kind: "other" };
  if (other >= 2) return { kind: "mixed", note: "Part of this message looks like another language. Only the English parts were assessed." };
  if (w.length >= 6 && en / w.length < 0.08) return { kind: "other" };
  return { kind: "english" };
}

const GARBAGE = /\[(?:unreadable|illegible|cropped|blurred|cut off)\]|�/giu;

export function assess(rawText: string): Assessment {
  const truncated = rawText.length > MAX_ANALYSED_CHARS;
  const text = truncated ? rawText.slice(0, MAX_ANALYSED_CHARS) : rawText;
  const base = { engine: ENGINE_VERSION, truncated, indicators: [] as Indicator[], links: [] as LinkAnalysis[], supplied: [] as SuppliedContact[], claims: [] as ClaimType[], missing: [] as string[] };
  const done = (a: Partial<Assessment> & Pick<Assessment, "outcome" | "coverage" | "headline">): Assessment => ({ ...base, ...a });

  if (text.trim().length === 0) {
    return done({ outcome: "cannot_assess", reason: "empty", coverage: "none", headline: "There is no message to look at yet.", missing: ["Nothing was entered."] });
  }
  const links = extractLinks(text);
  const supplied = collectSupplied(text, links);
  const garbage = (text.match(GARBAGE) ?? []).length;
  const nonSpace = text.replace(/\s/g, "").length;
  const letterCount = (text.match(/\p{L}/gu) ?? []).length;
  const readableWords = words(text.replace(GARBAGE, " ").replace(/(?:https?:\/\/|www\.)\S+/giu, " "));

  const linkOnly = (reason: CannotAssessReason, why: string): Assessment => {
    const li = linkIndicators(links);
    const outcome: Outcome = li.length && decide(li) === "indicators_found" ? "indicators_found" : "cannot_assess";
    return done({
      outcome, reason: outcome === "cannot_assess" ? reason : undefined, coverage: links.length ? "links_only" : "none", links, supplied, indicators: li,
      headline: outcome === "indicators_found" ? `${why} The link itself shows warning signs.` : `${why} We cannot tell anything from the words, so this is not an all-clear.`,
      missing: [why, ...(links.length ? ["The link was not opened and cannot be judged by its address alone."] : [])]
    });
  };

  if (nonSpace > 0 && (letterCount / nonSpace < 0.45 || garbage >= 3 || (garbage >= 1 && readableWords.length < 4))) {
    return linkOnly("unreadable", "The text is hard to read (it looks cut off, blurred or mostly symbols).");
  }
  if (readableWords.length < 3) {
    return linkOnly("too_short", "The message is too short to assess.");
  }
  const lang = detectLanguage(text);
  if (lang.kind === "other" || lang.kind === "none") {
    return linkOnly("unsupported_language", "This app can only read English wording. This message is not in English, or mostly not.");
  }

  const indicators: Indicator[] = [];
  for (const rule of RULES) {
    const spans: Span[] = [];
    for (const re of rule.patterns) {
      re.lastIndex = 0;
      for (const m of text.matchAll(re)) {
        if (m[0].length === 0) continue;
        if (rule.negatable && negatedBefore(text, m.index!)) continue;
        spans.push({ start: m.index!, end: m.index! + m[0].length, text: m[0] });
      }
    }
    if (spans.length) {
      spans.sort((a, b) => a.start - b.start);
      indicators.push({ id: rule.id, category: rule.category, label: rule.label, explanation: rule.explanation, strength: rule.strength, claim: rule.claim, spans });
    }
  }
  indicators.push(...linkIndicators(links));
  indicators.sort((a, b) => (a.spans[0]?.start ?? 0) - (b.spans[0]?.start ?? 0));

  const claims = [...new Set(indicators.filter((i) => i.claim).map((i) => i.claim!))];
  const ids = new Set(indicators.map((i) => i.id));
  const missing: string[] = ["Who really sent this has not been checked."];
  if (claims.length) missing.push("The message cannot prove that it is from who it says it is from.");
  if (ids.has("new_number")) missing.push("Nothing proves the new number belongs to the person. The old number or another trusted route has not been used.");
  if (ids.has("payment_request") && !/\b(?:invoice|order|reference|ref|policy|booking)\s*(?:no\.?|number|#|:)?\s*[A-Z0-9-]{4,}/i.test(text)) missing.push("There is no invoice, order or reference number that you could check.");
  if (links.length) missing.push("Where the link leads has not been checked. This app never opens links.");
  if (supplied.some((s) => s.kind === "phone")) missing.push("The phone number in the message is the sender's choice. Calling it is not a check.");
  if (ids.has("payment_destination")) missing.push("Account details in a message may be the scammer's. Compare with details you already had from a trusted source.");

  const outcome = decide(indicators);
  const mixedNote = lang.kind === "mixed" ? lang.note : undefined;
  const headline = outcome === "indicators_found"
    ? "This message has warning signs. Do not act on it until you have checked another way."
    : "We found no warning signs in the words. That is not a check: the message has not been verified.";
  return done({ outcome, coverage: "full", headline, indicators, links, supplied, claims, missing, partialLanguageNote: mixedNote });
}

/** True if this assessment text could be mistaken for a clean bill of health. Used by tests as a safeguard. */
export const FORBIDDEN_REASSURANCE = /\b(?:safe to pay|is safe|looks safe|are safe|is legit|is genuine|is legitimate|looks genuine|looks legitimate|all clear|nothing to worry|you can trust|verified safe|ok to pay)\b/i;
