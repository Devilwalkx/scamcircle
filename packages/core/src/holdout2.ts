import type { Sample } from "./dataset.js";

/**
 * SET C, "holdout-2". Written AFTER the rule changes that fixed set B (commit da9ec81), as a fresh set of
 * made-up messages. Method: the author listed common scam types and ordinary look-alike messages from general
 * knowledge (not from the rule list), wrote each message once, assigned the label while writing, ran the engine
 * ONCE, and recorded the results in docs/EVALUATION.md. The rules were NOT changed after seeing the results, so
 * the misses and false alarms below are real limits of this version. Same author as sets A and B (an AI model
 * and its operator), so this is NOT independent, it is small, and it is English-heavy. It supports no accuracy
 * claim and no claim of protection. If the rules are ever changed in response to this set, it stops being a holdout.
 */
const c = (id: string, label: "scam" | "legit", scenario: string, text: string, language: Sample["language"] = "en"): Sample => ({ id, text, label, scenario, language, heldOut: true });

export const HOLDOUT2: Sample[] = [
  c("N01", "scam", "family_new_number", "Hi Dad, I've lost my bank card and my phone is dead so I'm using my mate's. Can you transfer £300 into his account so I can get home? He'll send you the details."),
  c("N02", "scam", "family_new_number", "Mum, it's Josh. Got a new number. Can you save it? Also can you do me a favour, I can't log into my banking app and need to pay a deposit today."),
  c("N03", "scam", "bank_call_us", "Hello, this is Amazon. We detected a suspicious purchase of £799.99 on your account. Press 1 to speak to our fraud team or call 0333 700 1234 now."),
  c("N04", "scam", "subscription", "Your Netflix subscription could not be renewed. Update your payment method within 24 hours to avoid losing access: netflix-billing-update.com/account"),
  c("N05", "scam", "lottery", "You have won £25,000 in the UK National Lottery draw! To claim your prize, send a processing fee of £75 and your bank details to claims@uk-lottery-winners.org"),
  c("N06", "scam", "government", "DVLA: your vehicle tax payment failed. Pay £42.80 now to avoid a fine: dvla-vehicle-tax.help/pay"),
  c("N07", "scam", "marketplace_code", "Hi, I'm interested in the sofa you listed. I'll pay by bank transfer, but my bank says I need to verify you first. Please send the 6-digit code that was texted to you."),
  c("N08", "scam", "sextortion", "I have been watching you through your webcam. Send $1,500 in Bitcoin to this wallet within 48 hours or I will share the video with all your contacts."),
  c("N09", "scam", "advance_fee", "Dear Beneficiary, I am Barrister James Okoro. A deceased client left $8.5 million and you share his surname. Reply with your full name and bank account to claim your inheritance."),
  c("N10", "scam", "courier", "Your parcel is held at customs. A fee of £2.99 is required before delivery. Pay securely: royalmail-customs-fee.com/pay"),
  c("N11", "scam", "workplace", "Hey, this is Sarah from HR. I'm in a conference and need a favour, can you buy some Google Play cards for the client? I'll reimburse you. Keep it confidential."),
  c("N12", "scam", "job_offer", "Congratulations! You've been selected for a remote data entry job, £300 per day. No experience required. Message us on Telegram @jobsnow_uk to start."),
  c("N13", "scam", "government", "Final reminder: your TV licence has expired. Update your direct debit today or you will face prosecution. tvlicensing-renewal.info"),
  c("N14", "scam", "family_vague_opener", "Hi it's Mum, I'm texting from my new number as I dropped my phone in the bath. Can you let me know when you're free?"),
  c("N15", "scam", "deposit", "I'm texting about the apartment deposit. Please transfer £1,200 to my solicitor's account: sort code 04-00-04, account 12345678. The viewing is tomorrow so I need it today."),
  c("N16", "scam", "tech_support", "Microsoft Security Alert: 3 viruses found. Call 0800 011 7788 immediately, do not switch off your computer."),
  c("N17", "scam", "friend_money", "Hi mate, quick one, I'm stuck at the airport and my card is declined. Can you send me £200 on PayPal? Will pay you back tonight, please don't tell my wife."),
  c("N18", "scam", "safe_account", "Your account has been compromised. To secure your funds, move your money to a safe account. We will guide you. Do not tell the branch staff, they may be involved."),
  c("N19", "scam", "investment", "Earn passive income with our AI trading bot. Members made 400% this month, guaranteed. Deposit £250 in USDT to start."),
  c("N20", "scam", "account_code", "WhatsApp: your account will be deactivated. Send us the 6 digit verification code to keep it active."),
  c("N21", "scam", "police", "This is Detective Inspector Morris, National Crime Agency. Your identity has been used in a crime. You must keep this conversation private and withdraw £5,000 for safekeeping."),
  c("N22", "scam", "family_emergency", "Hello grandma, I'm in jail and need bail money. A lawyer will call you. Please do not tell mum and dad."),
  c("N23", "scam", "bank_code", "Hi, I'm Tom from HSBC fraud prevention. We've blocked a payment, I just need you to confirm your card number and the code on the back to cancel it."),
  c("N24", "scam", "government", "You are owed a council tax refund of £189. Submit your bank details at gov-refund-portal.uk to receive it."),
  c("N25", "scam", "courier", "Dear customer, we are unable to deliver parcel #DX882. Reschedule with the link: https://bit.ly/3kD9aaa"),
  c("N26", "scam", "overpayment", "I'd like to buy your bike. I'll send a cheque for £950, which is more than you asked, you can send the difference to my courier by Western Union."),
  c("N27", "scam", "loan_fee", "Congratulations, you qualify for a £5,000 loan with no credit check. Pay the £99 insurance fee first to release the funds."),
  c("N28", "scam", "job_offer", "Hi, I saw your CV online. We have a role paying £4,000 a month. To start we need you to buy equipment from our supplier and we'll refund you."),
  c("N29", "scam", "payment_detail_change", "Please be advised our supplier banking details are now different. Remit all outstanding invoices to the attached account. Contact me only by email, my phone is broken."),
  c("N30", "scam", "lookalike_domain", "Your Apple ID has been locked for security reasons. Verify now: appleid-verify-support.com"),
  c("N31", "scam", "family_emergency", "ur son has had an accident pls call this number asap +44 7700 900456 hes in hospital"),
  c("N32", "scam", "family_money_request", "Hi love, can you do me a big favour? I'm at the shop and my card isn't working. Could you pay £60 to this account and I'll explain later?"),
  c("NX01", "scam", "non_english", "Su paquete está retenido. Pague 2,99 € en https://correos-envio-pago.top para recibirlo.", "es"),
  c("NX03", "scam", "non_english", "Ihr Konto wurde gesperrt. Bestätigen Sie Ihre Daten sofort unter sparkasse-login-sicher.com", "de"),
  c("NX05", "scam", "non_english", "Olá mãe, mudei de número. Preciso que faça uma transferência urgente de 300 euros.", "pt"),
  c("NX06", "scam", "unreadable", "H1 M��, n��w ph��ne, send £��� t�da�"),

  c("NL01", "legit", "family_no_request", "Hey Mum, are you free Saturday? Can you babysit at 7? We'd love a date night."),
  c("NL02", "legit", "family_no_request", "Hi Dad, I'm at the garage, they say the car will be £340. Is that normal? I'll pay on my card, just checking."),
  c("NL03", "legit", "delivery_notice", "Your Tesco order will be delivered tomorrow between 4pm and 5pm. You can track it in the app."),
  c("NL04", "legit", "bank_notification", "Barclays: you've received a payment of £120.00 from A Jones. Open the Barclays app to see more."),
  c("NL05", "legit", "reminder", "Reminder: your car's MOT is due on 14 March. Book at your garage."),
  c("NL06", "legit", "club_fee", "Hi, it's Ben from the football team. Can you pay the £5 match fee to Dave on Sunday? He'll have the cash tin."),
  c("NL07", "legit", "appointment", "Please call us on 0161 496 0000 to rearrange your appointment, or use the number on your appointment letter."),
  c("NL08", "legit", "appointment", "Hello, this is Dr Evans' surgery. Please phone 01632 960123 before 5pm today to book your flu jab."),
  c("NL09", "legit", "invoice", "Thanks for your order #44821. Your invoice is attached. Payment is due within 30 days to the account on your agreement."),
  c("NL10", "legit", "family_no_request", "Mum I'm going to be late, train is delayed. Don't wait up!"),
  c("NL11", "legit", "legit_new_number", "Hi gran, new phone who dis? Kidding, it's Mia. My old one died so I got this number, ring me tonight and I'll tell you all about the trip."),
  c("NL12", "legit", "delivery_notice", "Your Royal Mail parcel has been delivered to your safe place."),
  c("NL13", "legit", "benign_secret", "Don't tell Mum about the surprise party, it's for her birthday on Saturday!"),
  c("NL14", "legit", "government_info", "The HMRC self assessment deadline is 31 January. File online at gov.uk/self-assessment-tax-returns."),
  c("NL15", "legit", "family_money_request", "Can you lend me £30 for the bus fare home, I'll Revolut you back when I'm home?"),
  c("NL16", "legit", "marketplace", "Hi, I'm interested in your sofa. Is it still available and can I collect on Friday? I'll bring cash."),
  c("NL17", "legit", "bank_notification", "Your bank statement for March is now available. Sign in to the Nationwide app to view it."),
  c("NL18", "legit", "legit_urgent", "Urgent: please call me back, Nana fell and we are at A&E now."),
  c("NL19", "legit", "subscription", "Final reminder: your Netflix payment method expires next month. You can update it in Account settings in the app."),
  c("NL20", "legit", "invoice", "Meeting moved to 3pm. Pay the invoice by Friday please, thanks."),
  c("NL21", "legit", "family_money_request", "The plumber says he needs £250 cash today for the parts. Could you transfer it to my account and I'll hand it over?"),
  c("NL22", "legit", "one_time_code", "Your verification code is 552901. Never share this code with anyone, including Amazon staff."),
  c("NL23", "legit", "family_no_request", "Congratulations on the new job! Dinner on me on Friday."),
  c("NX02", "legit", "non_english", "Maman, je rentre samedi, tu peux venir me chercher à la gare ?", "fr"),
  c("NX04", "legit", "non_english", "Ciao nonna, ci vediamo domenica a pranzo, porto io il dolce!", "it"),
  c("NX07", "legit", "short", "ok see you at 6")
];
