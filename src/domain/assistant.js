/**
 * The family's assistant: which language it answers in, what it is told about the
 * case, and when a question is an emergency. Pure, so the browser and the server
 * share it and it can be tested without either.
 */

import { BarrierStatus, FollowUpStatus, PatientType, UrgencyLevel } from "./enums.js";
import { getHospitalOptions } from "./hospitalChoice.js";
import { getPatientJourney } from "./patientJourney.js";

// Every request that reaches Sarvam counts: a question or a Listen press.
export const ASSISTANT_LIMIT = 20;
export const MAX_RECORDING_SECONDS = 30;
export const MAX_QUESTION_CHARS = 500;
export const MAX_HISTORY = 6;

export const AUTO_LANGUAGE = "auto";
export const EMERGENCY_NUMBER = "108";

// The languages Sarvam can both understand and speak.
export const LANGUAGES = [
  { code: "en-IN", name: "English", native: "English" },
  { code: "hi-IN", name: "Hindi", native: "हिन्दी" },
  { code: "bn-IN", name: "Bengali", native: "বাংলা" },
  { code: "gu-IN", name: "Gujarati", native: "ગુજરાતી" },
  { code: "kn-IN", name: "Kannada", native: "ಕನ್ನಡ" },
  { code: "ml-IN", name: "Malayalam", native: "മലയാളം" },
  { code: "mr-IN", name: "Marathi", native: "मराठी" },
  { code: "od-IN", name: "Odia", native: "ଓଡ଼ିଆ" },
  { code: "pa-IN", name: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { code: "ta-IN", name: "Tamil", native: "தமிழ்" },
  { code: "te-IN", name: "Telugu", native: "తెలుగు" },
];

const CODES = new Set(LANGUAGES.map((l) => l.code));
export const isSpokenLanguage = (code) => CODES.has(code);
export const getLanguage = (code) => LANGUAGES.find((l) => l.code === code);

// Sarvam can't speak these, and their speakers generally understand Hindi.
const SPOKEN_FALLBACK = { urdu: "hi-IN", bhojpuri: "hi-IN", maithili: "hi-IN", awadhi: "hi-IN" };

/** The language on the patient's record, as a code Sarvam can speak. "Telugu / English" → te-IN. */
export const profileLanguageCode = (profileLanguage) => {
  const first = String(profileLanguage || "")
    .split(/[/,]/)[0]
    .trim()
    .toLowerCase();
  if (!first) return "en-IN";
  return LANGUAGES.find((l) => l.name.toLowerCase() === first)?.code || SPOKEN_FALLBACK[first] || "en-IN";
};

/**
 * The language to answer in. A language the patient chose always wins. On "auto" the
 * reply follows the question when Sarvam can speak it, and falls back to the record.
 */
export const resolveReplyLanguage = ({ preference, detected, profileLanguage }) => {
  if (preference && preference !== AUTO_LANGUAGE && isSpokenLanguage(preference)) return preference;
  if (isSpokenLanguage(detected)) return detected;
  // Sarvam hears Urdu but can't speak it.
  if (detected === "ur-IN") return "hi-IN";
  return profileLanguageCode(profileLanguage);
};

/*
 * Emergency backstop. looksLikeEmergency() is OR-ed with the model's own judgement, so
 * it exists to catch the signs the model must never miss. A hit shows "Call 108 now"
 * and alerts the family's care coordinator, so a false alarm costs something too.
 *
 * Source: the danger signs on the MoHFW Mother and Child Protection (MCP) card and the
 * WHO IMNCI list, in the 11 languages the assistant speaks, in native script and in
 * romanised form, often code-mixed ("baby doodh nahi pee raha").
 *
 * How matching works
 *  - Input is normalised first (see normalise): NFC, lower case, no ZWJ/ZWNJ, no nukta,
 *    candrabindu folded to anusvara, curly quotes straightened, spaces collapsed. Write
 *    native-script patterns WITHOUT the nukta dot (write ड, not the dotted ड़).
 *  - Latin patterns use lookarounds, never \b. Native-script patterns are plain
 *    substrings, because \b does not work next to Indic letters and stems take suffixes.
 *  - One entry per sign, so the table reads sign by sign and a hit can say which sign it was.
 *  - Patterns are fixed alternations with bounded word gaps. No quantifier is nested
 *    inside another, so there is no catastrophic backtracking.
 *
 * Precision rules (each one is a decision, not an accident)
 *  - Words that are everyday on their own never trigger alone: "fit", "blood", "blood test",
 *    "blood pressure", "pain", "fever", "cold" (a runny nose), "not moving" (a van), "104"
 *    (also a helpline number). A sign needs its danger word: heavy bleeding, had a fit,
 *    high fever, baby not moving, severe pain.
 *  - Hindi "khoon" also means murder, so it needs a bleeding verb or "bahut".
 *
 * Negation (the only guard is English, and it is narrow)
 *  - Bleeding, fits and unconscious ignore a hit that is directly negated in English:
 *    "no heavy bleeding", "not unconscious", "stopped bleeding"; bleeding also ignores
 *    "bleeding has stopped". Everything else always triggers.
 *  - Why so narrow: in the Indic languages negation follows the verb and is also how
 *    "won't stop" and "not feeding" are said ("khoon ruk nahi raha"), so a native-script
 *    guard would silence real alerts. A missed alert is worse than an extra one. Signs
 *    that already contain their own negation ("not feeding", "not moving", "can't breathe")
 *    are never guarded. Questions and "what if" sentences still trigger.
 */

// Lower case, NFC, no zero-width joiners, no nukta dots, candrabindu folded to anusvara,
// straight quotes, single spaces. Patterns go through this too, so both sides always agree.
const normalise = (text) =>
  String(text || "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/[\u200b-\u200d\u2060\u00ad\ufeff]/g, "")
    .replace(/[\u093c\u09bc\u0a3c\u0abc\u0b3c]/g, "")
    .replace(/\u0901/g, "\u0902")
    .replace(/[\u2018\u2019\u02bc`\u00b4]/g, "'")
    .replace(/\s+/g, " ")
    .trim();

const compile = (src, before, after) => new RegExp(`${before}(?:${normalise(src)})${after}`, "gu");
const word = (src) => compile(src, "(?<![a-z])", "(?![a-z])"); // a whole Latin word or phrase
const stem = (src) => compile(src, "(?<![a-z])", ""); // a Latin word start, any ending
const indic = (src) => compile(src, "", ""); // a substring of native script

const NOT = "(?:nahi|nahin|nhi|nahee|nai|illa|ille|illai|ledu|nathi)"; // "not" in the romanised languages
// "baby" and "child" as families say them, so "baby doodh nahi pee raha" and "magu halu kudiyuttilla" both parse.
const BABY =
  "(?:baby|babies|newborn|infant|child|bachcha|bachha|bacha|bachche|bacche|bachchi|bachhi|navjaat|navjat|shishu|balak|baalak|baal|bachchu|dikro|dikri|magu|kunju|kuzhandhai|kulandhai|kuzhanthai|pilla|bidda|pila|chhua|baccha|khoka|khuki)";
// What a baby does at the breast, for "baby is not <feeding>".
const FEED =
  "(?:feed|feeding|feeds|fed|suck|sucking|suckle|suckling|latch|latching|drink|drinking|breastfeed|breastfeeding|eat|eating|(?:take|taking|takes|accept|accepting) (?:any |the |her |his )?(?:milk|feed|feeds|feeding|breast|bottle|breastmilk|anything))";
const RATHAM = "ra(?:t|th|tt|tth|thth)h?a?m"; // Tamil/Telugu/Malayalam "blood", romanised

// The narrow English negation guard described above.
const NEG_BEFORE =
  /(?:^|[^a-z'])(?:no|not|never|without|neither|nor|stopped|isn't|wasn't|haven't|hasn't|don't|doesn't|didn't) (?:[a-z]+ )?$/;
const STOPPED_AFTER =
  /^(?: has| have| had| is| was| now| already| just| almost| fully)* (?:stopped|gone|over|ended|settled)/;

const SIGNS = [];
const sign = (name, guard, ...patterns) => SIGNS.push({ name, guard, patterns });

// --- Heavy bleeding: pregnancy, labour, after birth, or the baby (cord, nose, anywhere) ---
sign(
  "bleeding",
  "both",
  // English
  word(
    "(?:heavy|severe|profuse|excessive|continuous|uncontrolled|lots? of|too much|so much|a lot of) (?:vaginal )?(?:bleeding|blood)(?! ?(?:test|tests|pressure|sugar|report|group|donation|donor|count|work))",
  ),
  word(
    "bleeding (?:heavily|a lot|badly|profusely|non.?stop|continuously|won't stop|will not stop|not stopping|is not stopping|doesn't stop)",
  ),
  word(
    "vaginal bleeding|bleeding from (?:the )?(?:vagina|private|below)|bleeding (?:in|during|after) (?:pregnancy|labou?r|delivery|birth|childbirth)",
  ),
  word(
    "(?:she|i|mother|mom|wife|didi|sister|baby|he|cord|navel|umbilical|stump) (?:is |am |has been |have been |started |began |keeps? )?bleeding",
  ),
  word("bleeding (?:from|through) (?:the )?(?:nose|ears?|mouth|cord|navel|umbilical|stump|gums|eyes)"),
  word("(?:postpartum|post.?partum|antepartum) (?:haemorrhage|hemorrhage|bleeding)|(?:haemorrhage|hemorrhage|pph)"),
  word(
    "(?:soak(?:ed|ing)|drench(?:ed|ing)) (?:through )?(?:a |one |two |three |the |my |her )?(?:pads?|cloths?|sheets?|napkins?|mattress)|(?:filled|filling) (?:a |one |two |three |the |my |her )?(?:pads?|napkins?)",
  ),
  word("(?:pads?|cloths?|sheets?) (?:is |are |got |were )?(?:soaked|drenched|full|wet with blood)"),
  word("(?:blood )?clots?|passing clots|clots of blood"),
  word("blood (?:is |was |keeps? )?(?:coming|flowing|dripping|pouring|gushing|running|streaming)(?: out)?"),
  word(
    "(?:vomit(?:ing|ed)?|coughing up|passing) blood|blood in (?:the |her |his )?(?:vomit|stool|poo|urine|nappy|diaper)",
  ),
  // Hindi / Marathi / Devanagari (Hindi "khoon" alone can mean murder: it needs a verb or "बहुत")
  indic("बहुत (?:ज्यादा |अधिक )?(?:खून|रक्त)|खून (?:आ (?:रहा|रही|गया|गई|या|ने|ता|ती)|आने|बह|निकल|गिर|जा (?:रहा|रही)|टपक)"),
  indic(
    "रक्त (?:बह|निकल|गिर|आ (?:रहा|रही|गया|गई)|जा (?:रहा|रही)|जात|येत|वाह|पडत|गळत)|रक्तस्राव|रक्तस्त्राव|रक्त स्त्राव|रक्त स्राव|ब्लीडिंग|ब्लिडिंग|खून के थक्के|रक्ताच्या गुठळ्या|खूप (?:जास्त )?(?:रक्त|खून)(?! ?(?:तपास|चाचणी))|खून की उल्टी|पैड (?:भीग|भिग)|कपडा भीग|कपडा भीग|पॅड भिजल",
  ),
  // Hindi / Marathi / Punjabi romanised
  stem(
    `(?:bahut|bohot|bahot|bhot|zyada|jyada|jada|khup|khupach) (?:khoon|khun|rakt|rakta|bleeding)|(?:khoon|khun) (?:aa ?(?:rah|ra|ya|gay|ne|t)|beh|bah|vag|nikal|nikl|gir|tapak|pai|jaa? ra)|(?:khoon|khun|bleeding) (?:ruk|band|stop|thum)[a-z]* ${NOT}`,
  ),
  stem(
    "bleeding (?:ho |hone |ho rahi|ho raha|bahut|zyada|jyada|jaari)|(?:khoon|khun) ke (?:thakke|clot)|rakt[a]? (?:beh|bah|nikal|gir|jat|yet|pad|gal|vah)|raktasrav|raktsrav|pad (?:bheeg|bheg|bhig)",
  ),
  // Bengali
  indic("রক্তপাত|রক্তক্ষরণ|(?:অনেক|বেশি|প্রচুর|বেশী) রক্ত(?! ?পরীক্ষ)|রক্ত (?:পড|যাচ্ছ|ঝর|বের|বেরো|বেরু)|ব্লিডিং"),
  stem(
    "(?:onek|beshi|besi|prochur|procur) (?:rokto|rakto|rakta|rokt)(?! ?(?:porik|test))|(?:rokto|rakto|rakta) (?:por|jach|jaach|ber|jhor)|rokto ?khoron|rokto ?paat|blidin",
  ),
  // Gujarati
  indic("(?:ઘણું|ઘણુ|ખૂબ|ખુબ|વધારે|વધુ|બહુ) લોહી|લોહી (?:પડ|નીકળ|વહ|આવ|ઝર|ટપક)|રક્તસ્ત્રાવ|રક્તસ્રાવ|બ્લીડિંગ|બ્લિડિંગ"),
  stem("(?:ghanu|ghana|khub|khoob|vadhare|vadhu|bahu) (?:lohi|lohee)|lohi (?:nik|pad|vah|aav|ave|jhar)"),
  // Kannada
  indic("ರಕ್ತಸ್ರಾವ|ರಕ್ತಸ್ತ್ರಾವ|ಬ್ಲೀಡಿಂಗ್|ಬ್ಲೀಡಿಗ್|(?:ತುಂಬಾ|ಹೆಚ್ಚು|ಜಾಸ್ತಿ|ಬಹಳ|ಅತಿಯಾ[ದ]) ರಕ್ತ(?! ?ಪರೀಕ್ಷೆ)|ರಕ್ತ (?:ಬರ|ಹೋಗ|ಸುರಿ|ಹರಿ|ಸೋರ|ಒಸರ)"),
  stem(
    "(?:tumba|thumba|jasti|hechchu|hechu|bahala) (?:rakta|raktha)|(?:rakta|raktha) (?:baru|bar|hogu|hogt|suri|hari|sora)|raktasrava",
  ),
  // Malayalam
  indic(
    "രക്തസ്രാവ|ബ്ലീഡിംഗ്|ബ്ലീഡിങ്|(?:ഒരുപാട്|ധാരാളം|കൂടുതൽ|വളരെ|നല്ല|ഒത്തിരി) (?:രക്തം|ചോര)(?! ?പരിശോധ)|(?:രക്തം|ചോര) (?:വരു|പോക|ഒഴുക|ഒലി|നിൽക്കു[ന്ന]*ില്ല)",
  ),
  stem(
    `(?:orupadu?|oruppad|dharalam|kooduthal|nalla|othiri|valare) (?:chora|raktham|rakthan|${RATHAM})|(?:chora|raktham|rakthan) (?:var|pok|ozhuk|poyi)|raktha ?sravam|bleeding (?:aanu|aan|und)`,
  ),
  // Odia
  indic("ରକ୍ତସ୍ରାବ|ବ୍ଲିଡିଂ|(?:ବହୁତ|ଅନେକ|ବେଶୀ|ବେଶି|ଅଧିକ) ରକ୍ତ(?! ?ପରୀକ୍ଷା)|ରକ୍ତ (?:ବାହାର|ପଡ|ବହ|ଝର)"),
  stem("(?:anek|besi|adhika|adhik) (?:rakt|rakta)|rakt[a]? (?:padu|pad|bahar|bahu|jhar)"),
  // Punjabi (Gurmukhi)
  indic(
    "ਬਲੀਡਿੰਗ|ਬਲੀਡਿਗ|ਰਕਤਸਰਾਵ|ਰਕਤ ਸਰਾਵ|ਬਹੁਤ (?:ਜਿਆਦਾ |ਵੱਧ |ਬਹੁਤ )?ਖੂਨ|ਖੂਨ (?:ਵਗ|ਆ (?:ਰਿਹਾ|ਰਹੀ|ਗਿਆ|ਗਈ)|ਆਉਣ|ਨਿਕਲ|ਡਿੱਗ|ਡਿਗ|ਵਹ)",
  ),
  // Telugu
  indic(
    "రక్తస్రావ|రక్తస్త్రావ|బ్లీడింగ్|(?:చాలా|ఎక్కువ|బాగా|విపరీతంగా) రక్తం(?! ?పరీక్ష)|రక్తం (?:పడ|వస్త|వచ్చ|కార|పోత|పోయ)|రక్తం ఆగడం లేదు|రక్తం ఆగట్లేదు",
  ),
  stem(
    `(?:chala|chaala|ekkuva|baga) (?:raktham|rakthan|raktam|${RATHAM})|rakt(?:ha)?m (?:vast|vach|padut|kar|pot|poy)|bleeding (?:avtundi|avuthundi|avutundi)`,
  ),
  // Tamil
  indic(
    "இரத்தப்போக்கு|ரத்தப்போக்கு|ரத்தபோக்கு|பிளீடிங்|ப்ளீடிங்|(?:அதிகம்|அதிகமாக|அதிக|நிறைய|ரொம்ப|மிகவும்) (?:இ)?ரத்தம்|ரத்தம் (?:வரு|வர|போக|கொட்ட|ஒழுக|வடி)|ரத்தம் நிற்கவில்லை|ரத்தம் நிற்காமல்",
  ),
  stem(
    `(?:romba|rompa|nerya|niraya|athiga?m|athikam|adhigam) (?:${RATHAM})|(?:${RATHAM}) (?:var|pok|kotta|ozhuk|nirk)|bleeding (?:aaguthu|aagudhu|aaguthu)`,
  ),
);

// --- Fits / convulsions: mother (eclampsia) or newborn. "fit" alone is "fit to travel", so
// it needs "had a fit", "fits started" and the like. ---
sign(
  "seizure",
  "before",
  // English
  word("seizures?|convuls[a-z]*|eclampsia|epilep[a-z]*"),
  word(
    "(?:having|had|has|got|get|getting|gets|started|starts|starting) (?:(?:a|an|one|two|many|some|repeated|another) (?:epileptic )?fits?|fits|fitting)",
  ),
  word(
    "fits? (?:started|are coming|came|is coming|again)|fits? (?:aa|aaya|aayi|aane|aata|aati|aa gaya|aa gayi|aa raha|aa rahi|aa rahe|pada|padi|pad gaya)",
  ),
  word(
    "(?:body|baby|limbs) (?:is |are |was |keeps? )?(?:shaking|jerking|twitching|thrashing)|(?:baby|newborn|infant) (?:is |went |gone |has gone )?(?:stiff|rigid)",
  ),
  word(
    "(?:shaking|jerking|twitching) (?:all over|uncontrollably|badly)|foaming (?:at|from) (?:the )?mouth|froth(?:ing)? (?:at|from|in) (?:the )?mouth|eyes? (?:rolled|rolling|turned|turning|are rolled) (?:up|back)|rolling (?:her |his )?eyes",
  ),
  // Hindi / Marathi (Devanagari); "दौरा" alone is a tour or a visit, so it needs पड़ or आ
  indic(
    "दौरा पड|दौरे पड|दौरा आ(?:या|ई|ए|ने)|दौरे आ(?:ते|ने|या|ए)|मिर्गी|मिरगी|झटके (?:आ|लग|मार|ले|येत)|(?:शरीर|बदन|बच्चा|हाथ पैर|हाथ-पैर) (?:अकड|ऐंठ|कांप)|मुंह से झाग|तोंडातून फेस|फेस येत|आकडी|आकड्या|फिट्स|फिट (?:आ(?:या|ई|ली|ने)|येत|पड)|फीट (?:आ(?:या|ई|ली|ने)|येत)|अपस्मार|फिट आली",
  ),
  stem(
    "daura (?:pad|aa)|daure (?:pad|aa)|mirgi|mirgee|jhatke (?:aa|lag|mar|le)|(?:muh|munh|moonh|mooh) se jhag|jhag (?:aa|nikal)|(?:badan|body|shareer|sharir|haath pair|hath pair) (?:akad|ainth|kaamp|kanp)|aakdi|akdi|phits|fits (?:yet|aali|aala|ale)|apasmar",
  ),
  // Bengali
  indic("খিঁচুনি|খিচুনি|ঝিঁচুনি|খিঁচুনী|মৃগী|আক্ষেপ|মুখ দিয়ে ফেনা|মুখ থেকে ফেনা|ফিট হ(?:চ্ছে|চ্ছ|য়েছে)|ফিটের"),
  stem("khichuni|khinchuni|khichni|jhinchuni|mrigi|fit (?:hocche|hochhe|hoyeche)|mukh diye fena"),
  // Gujarati
  indic("આંચકી|આંચકા|ખેંચ આવ|ફીટ આવ|ફિટ આવ|વાઈ આવ|મોંમાંથી ફીણ|મોઢામાંથી ફીણ|મોં માંથી ફીણ"),
  stem("aanchki|anchki|aanchaki|khench aav|fit aav|fit aavi|vai aav"),
  // Kannada
  indic("ಫಿಟ್ಸ್|ಸೆಳವು|ಅಪಸ್ಮಾರ|ಬಾಯಲ್ಲಿ ನೊರೆ|ಬಾಯಿಂದ ನೊರೆ"),
  stem("fits (?:bandi|bant|barut|baru|agi|ayt)|selavu|sellavu|apasmara"),
  // Malayalam
  indic("ഫിറ്റ്സ്|അപസ്മാര|ചുഴലി|കോച്ചിവലി|വായിൽ നുര|വായിൽ നിന്ന് നുര"),
  stem("fits (?:vann|vara|und|ayi)|apasmaram|chuzhali|kochivali|vayil nura"),
  // Odia (spellings not verified by a native speaker)
  indic("ଫିଟ୍ସ|ଫିଟ୍ (?:ହେ|ଆସ|ଧର)|ଅପସ୍ମାର|ମୃଗୀ|ମୁହଁରୁ ଫେଣ"),
  stem("fits? (?:hau|heu|asu|dhar)|apasmara|mrugi"),
  // Punjabi
  indic("ਦੌਰਾ ਪ|ਦੌਰੇ ਪ|ਮਿਰਗੀ|ਮੂੰਹ ਵਿੱਚੋਂ ਝੱਗ|ਮੂੰਹ ਚੋਂ ਝੱਗ|ਝਟਕੇ (?:ਲੱਗ|ਆ|ਪੈ)|ਫਿੱਟ ਪ"),
  stem("daura (?:pai|pe|paya)|daure (?:pai|pe)|fit (?:pai|pe|paya)|mirgi"),
  // Telugu
  indic(
    "ఫిట్స్|మూర్ఛ|మూర్చ|తీతలు|నోటి నుంచి నురగ|నోట్లోంచి నురగ|నోటి నుండి నురగ|కాళ్లు చేతులు (?:కొట్టు|బిగుసు|ఊగ)|కాళ్ళు చేతులు (?:కొట్టు|బిగుసు|ఊగ)",
  ),
  stem("fits (?:vach|vast|vacc)|moorcha|murcha|moorchha|murchha|nuraga"),
  // Tamil
  indic("வலிப்பு|ஃபிட்ஸ்|பிட்ஸ்|வாயில் நுரை|நுரை தள்ள|கை கால் இழுத்"),
  stem("valippu|fits (?:vandh|vanth|varudh|vandu)|vaayil nurai|vayil nurai"),
);

// --- Fainted, unconscious, cannot be woken. (Newborn "very sleepy" has its own entry.) ---
sign(
  "unconscious",
  "before",
  // English
  word(
    "unconscious|unresponsive|non.?responsive|comatose|senseless|in a coma|lost (?:her |his |the )?(?:consciousness|senses)|lose(?:s)? consciousness|losing consciousness|not conscious|faint(?:ed|ing)|passed out|passing out|blacked out",
  ),
  word(
    "(?:she|he|baby|mother|mom|wife|didi|sister|patient|child|i) (?:just |suddenly )?collapsed|(?:fell|falling|fallen) (?:down )?(?:unconscious|senseless)",
  ),
  word(
    "(?:won't|will not|wouldn't|doesn't|does not|can't|cannot|couldn't|not|isn't|is not|unable to) (?:wake|waking|woken|be woken|be awakened|open (?:her |his |the )?eyes)(?: up)?",
  ),
  word(
    "(?:she|he|baby|mother|mom|wife|patient|child|didi) (?:is |was |does |did |has )?(?:not|never|no longer|isn't|wasn't|doesn't|didn't|hasn't|stopped) (?:respond|responding|responded|reacting|reacts)",
  ),
  word("(?:hard|difficult|impossible) to wake(?: up)?|not waking(?: up)?"),
  // Hindi (and Marathi where it shares the word)
  indic(
    "बेहोश|बेसुध|अचेत|मूर्छा|मूर्च्छा|मूर्च्छित|कोमा|होश (?:नहीं|नही|खो)|होश में नहीं|होश में नही|सुध नहीं|चक्कर (?:खाकर|आकर) गिर|जाग नहीं|नहीं जाग|आंखें नहीं खोल|आंख नहीं खोल|(?:उठ नहीं|नहीं उठ) (?:रहा|रही)|बेशुद्ध|शुद्ध हरपली|शुद्धीवर नाही|जागी होत नाही|डोळे उघडत नाही|भोवळ येऊन",
  ),
  stem(
    "behosh|bebosh|behoshi|besudh|bejaan|murc?chh?a|moorchha|hosh (?:nahi|nahin|nhi|kho)|hosh (?:mein|me) nahi|sudh nahi|(?:uth|jag|jaag) nahi rah|nahi (?:uth|jag|jaag) rah|(?:aankh|aankhen|ankhen|ankh) nahi khol|beshudd?h|shuddh harpal|shuddhivar nahi|jagi hot nahi|bholav",
  ),
  // Bengali
  indic("অজ্ঞান|অচেতন|জ্ঞান (?:নেই|হারিয়ে|ফিরছে না)|হুঁশ নেই|হুশ নেই|মূর্ছা|মুর্ছা|ঘুম থেকে উঠছে না|চোখ খুলছে না"),
  stem("ogyan|ojnan|ogyaan|(?:gyan|jnan) (?:nei|nai|hariye)|(?:hush|hosh) nei|achetan|chokh khulche na"),
  // Gujarati
  indic("બેભાન|બેશુદ્ધ|ભાન (?:નથી|ગુમાવ)|ભાનમાં નથી|મૂર્છા|(?:ઊઠતો|ઉઠતો|ઊઠતી|ઉઠતી|જાગતો|જાગતી) નથી|આંખ ખોલ(?:તો|તી) નથી"),
  stem(
    "bebhan|bebhaan|beshudd?h|bh(?:aa?)n nathi|bhan ma nathi|bhaanma nathi|(?:jagto|jagti|uthto|uthti) nathi|aankh khol(?:to|ti) nathi",
  ),
  // Kannada
  indic("ಪ್ರಜ್ಞೆ (?:ತಪ್ಪ|ಇಲ್ಲ)|ಪ್ರಜ್ಞಾಹೀನ|ಮೂರ್ಛೆ|ಬೇಹೋಶ್|ಎಚ್ಚರವಿಲ್ಲ|ಎಚ್ಚರ ಇಲ್ಲ|ಎಚ್ಚರ ಆಗುತ್ತಿಲ್ಲ|ಎಚ್ಚರವಾಗುತ್ತಿಲ್ಲ|ಕಣ್ಣು (?:ಬಿಡುತ್ತಿಲ್ಲ|ತೆರೆಯುತ್ತಿಲ್ಲ)"),
  stem(
    "prajne (?:thapp|tapp|illa)|prajnehina|murche|echcharavilla|echara illa|echcharike illa|kannu (?:bidtilla|bittilla|bidutilla)",
  ),
  // Malayalam
  indic("ബോധം (?:പോയ|ഇല്ല)|ബോധമില്ല|ബോധക്ഷയ|ബോധരഹിത|അബോധ|മയങ്ങി വീണ|ഉണരുന്നില്ല|കണ്ണ് തുറക്കുന്നില്ല|കണ്ണു തുറക്കുന്നില്ല"),
  stem("bodham (?:poyi|illa)|bodhamilla|bodhakshayam|abodha|unarunnilla|kannu thurakkunnilla"),
  // Odia (spellings not verified by a native speaker)
  indic("ଅଚେତ|ବେହୋସ|ବେହୋଶ|ଚେତା (?:ନାହିଁ|ହରା)|ହୋସ ନାହିଁ|ମୂର୍ଚ୍ଛା|(?:ଉଠୁ ନାହିଁ|ଉଠୁନାହିଁ)|ଆଖି ଖୋଲୁ ନାହିଁ"),
  stem("achet|behos|cheta nahi|hosh nahi|muruchha"),
  // Punjabi (nukta stripped: ਬੇਹੋਸ਼ is ਬੇਹੋਸ)
  indic("ਬੇਹੋਸ|ਹੋਸ ਨਹੀਂ|ਹੋਸ ਗੁਆ|ਬੇਸੁਧ|ਅਚੇਤ|ਉੱਠ ਨਹੀਂ (?:ਰਿਹਾ|ਰਹੀ)|ਜਾਗ ਨਹੀਂ|ਅੱਖਾਂ ਨਹੀਂ ਖੋਲ"),
  stem("behosh|hosh nahi|uth nahi reha|jaag nahi"),
  // Telugu
  indic(
    "స్పృహ (?:తప్పి|లేదు|కోల్పో)|స్పృహలో లేదు|అపస్మారక|మూర్ఛపోయ|మెలకువ (?:రావడం లేదు|లేదు)|కళ్ళు తెరవ(?:ట్లేదు|డం లేదు)|కళ్లు తెరవ(?:ట్లేదు|డం లేదు)",
  ),
  stem("spruha (?:tappi|ledu|kolpo)|sprutha|melakuva (?:ravadam )?ledu|kallu teravadam ledu|kallu teravatledu"),
  // Tamil
  indic(
    "மயங்கி|மயக்கம் போட|மயக்கமடை|மயக்கமாகி|சுயநினைவு|நினைவிழ|நினைவு இல்லை|நினைவில்லை|கண் திறக்கவில்லை|கண்ணை திறக்கவில்லை|எழுந்திருக்கவில்லை|விழிக்கவில்லை|எழுப்ப முடியவில்லை",
  ),
  stem(
    "mayangi|mayakkam (?:pottu|aay|aag)|mayakkama(?:g|i)|suya ?ninaivu|ninaivu illa|kan(?:n|nu)? thirakka(?:v|l)|ezhuppa mudiyala|eluppa mudiyala|ezhundhirikkala",
  ),
);

// --- Breathing: not breathing, hard or fast breathing, chest indrawing, grunting. Mother or
// baby. Plain "breathless" is common in pregnancy, so it needs "very", "suddenly", "at rest".
// "can't breathe a sigh of relief" is excluded. ---
sign(
  "breathing",
  null,
  // English
  word(
    "(?:not|isn't|stopped|stops|can't|cannot|couldn't|unable to|not able to|barely|hardly|struggling to|gasping for|trouble|difficulty|hard to|difficult to) breath(?:e|ing)?(?! ?(?:a sigh|easy|easier|in the|out the))",
  ),
  word(
    "(?:breathing|breath) (?:is |has )?(?:stopped|fast|very fast|too fast|rapid|laboured|labored|heavy|heavily|hard|noisy|difficult|shallow|irregular)|(?:fast|rapid|laboured|labored|noisy|difficult|shallow|heavy|hard) breathing",
  ),
  word(
    "(?:very|extremely|severely|suddenly|so|too|really) (?:breathless|short of breath|out of breath)|breathless(?:ness)? (?:at rest|while resting|even when|all the time|suddenly)|sudden(?:ly)? (?:short|shortness) of breath|short of breath (?:at rest|suddenly)",
  ),
  word(
    "wheez(?:e|es|ing)|grunting|gasping|nostrils flaring|flaring nostrils|chest (?:is )?(?:pulling|sucking|going|drawing|caving) in|chest indrawing|indrawing of (?:the )?chest|ribs (?:pulling|sucking|showing) in|suffocat[a-z]*|choking",
  ),
  // Hindi (साँस is folded to सांस)
  indic(
    "सांस (?:नहीं|नही|फूल|तेज|बहुत तेज|रुक|अटक|उखड|बंद)|सांस लेने (?:में|मे) (?:दिक्कत|तकलीफ|परेशानी|कठिनाई|मुश्किल)|सांस (?:की|कि) (?:तकलीफ|दिक्कत)|तेज(?: तेज)? सांस|जोर(?: जोर)? से सांस|दम (?:घुट|फूल)|हांफ|छाती धंस|पसलियां धंस|पसलियाँ धंस|पेट धंस|घरघराहट",
  ),
  stem(
    "saa?ns (?:nahi|nahin|nhi|phool|phul|fool|tez|ruk|ukhad|lene|bandh|le ?rah)|saa?ns ki (?:taklif|dikkat)|dam (?:ghut|phool|fool)|hamph|haanf|hanf|(?:jor jor|tez tez) se saa?ns|chhati (?:dhans|andar)|pasliyan dhans",
  ),
  // Bengali
  indic(
    "শ্বাসকষ্ট|শ্বাস নিতে (?:কষ্ট|পার|সমস্যা|অসুবিধা)|শ্বাস (?:বন্ধ|নেই|নিচ্ছে না|নিচ্ছেনা)|নিঃশ্বাস (?:নিতে|বন্ধ|নেই)|দম (?:বন্ধ|আটকে)|হাঁপাচ্ছে|হাঁপাতে|জোরে জোরে শ্বাস|দ্রুত শ্বাস",
  ),
  stem("shash ?kosto|shas(?:h)? nite|shash (?:bondho|nei)|nishash|dom (?:bondho|atke)|hapacche|hapache|hapate"),
  // Gujarati
  indic("શ્વાસ (?:લેવામાં|નથી|ચડ|ચઢ|ફૂલ|રૂંધ)|શ્વાસની તકલીફ|દમ (?:ઘૂંટ|ઘુંટ|નથી)|હાંફ"),
  stem("(?:shwas|swas|shvas) (?:levama|nathi|chad|phul|ni takl)|dam ghut|hamph|haanf"),
  // Kannada
  indic("ಉಸಿರು (?:ಆಡ|ಬಿಡ|ತೆಗೆದುಕೊ|ಕಟ್ಟ|ನಿಂತ|ಇಲ್ಲ)|ಉಸಿರಾಟದ ತೊಂದರೆ|ಉಸಿರಾಡಲು (?:ಕಷ್ಟ|ಆಗ)|ಉಸಿರಾಡುತ್ತಿಲ್ಲ|ಏದುಸಿರು"),
  stem("usiraad(?:alu)? (?:kashta|agtilla|aagtilla)|usirata ?tondare|usiru (?:kattu|nint|illa)|edusiru|usiradutilla"),
  // Malayalam
  indic("ശ്വാസം (?:മുട്ട|കിട്ട|എടുക്കാൻ|നിന്ന|ഇല്ല|വലി)|ശ്വാസംമുട്ട|ശ്വാസതടസ|ശ്വാസമില്ല|കിതപ്പ്|വലിവ്"),
  stem("(?:shwasam|swasam) (?:muttu|kittu|edukk|nin|illa)|shwasamuttu|swasa ?thadasam|kithappu|valivu"),
  // Marathi
  indic("श्वास (?:घेता|घ्यायला|लागतो|लागत|फुल|अडक|थांब)|दम (?:लागत|कोंड|अडक)|धाप|श्वासाचा त्रास|श्वास घेण्यास"),
  stem("shwas (?:ghet|ghya|lag|phul|adak|thamb)|dam lag|dhap lag|shwasacha tras"),
  // Odia (spellings not verified by a native speaker)
  indic("(?:ଶ୍ୱାସ|ଶ୍ବାସ|ନିଶ୍ୱାସ|ନିଶ୍ବାସ|ନିଃଶ୍ୱାସ|ନିଃଶ୍ବାସ)(?:କଷ୍ଟ| କଷ୍ଟ| ନେ| ନିଅ| ବନ୍ଦ| ନାହିଁ| ଫୁଲ)|ହାଁସଫାସ"),
  stem("shwasa (?:kasta|kashta|bandha|nahi|phula|nebaku)|nisbas|nishwas|hansaphasa|hansa ?phasa|dama bandha"),
  // Punjabi
  indic("ਸਾਹ (?:ਨਹੀਂ|ਨਹੀ|ਲੈਣ|ਫੁੱਲ|ਚੜ੍ਹ|ਰੁਕ|ਤੇਜ)|ਸਾਹ ਦੀ ਤਕਲੀਫ|ਦਮ ਘੁੱਟ|ਹੌਂਕ"),
  stem("s(?:aa?)h (?:nahi|nahin|lain|ful|chad|ruk|tez)|saah di takleef|dam ghutt|houka|haunka"),
  // Telugu
  indic(
    "ఊపిరి ఆడ(?:ట్లేదు|డం లేదు|డంలేదు|టం లేదు|టంలేదు|క)|ఊపిరాడ|ఊపిరి తీసుకో(?:వడ|లేక|లేన)|శ్వాస తీసుకో(?:వడ|లేక|లేన)|శ్వాస (?:ఆడ|కష్ట)|ఆయాసం|రొప్ప",
  ),
  stem("(?:oopiri|upiri) (?:aada|adatla|adatledu|tiskoleka|teesukoleka|teesukovadam)|ayaa?sam|shwasa teesu"),
  // Tamil
  indic(
    "மூச்சு (?:விட|வாங்க|இறை|நின்ற|இல்லை)|மூச்சில்லை|மூச்சுத் ?திணறல்|மூச்சிரைப்பு|சுவாசிக்க (?:முடிய|கஷ்டம்|சிரம)|சுவாசிப்பதில் (?:சிரம|கஷ்ட|சிக்கல்)|சுவாசம் (?:நின்ற|இல்லை)",
  ),
  stem("moochu (?:vida|vanga|thinaral|illa|nindru|varala)|moochu ?thinaral|moochirappu|swasikka"),
);

// --- Chest pain, heart attack (a mother's danger sign; a baby's chest "pulling in" is under breathing) ---
sign(
  "chest_pain",
  null,
  word(
    "chest (?:pain|pains|tightness|pressure)|pain in (?:the |my |her )?chest|chest (?:is |feels )?(?:tight|hurting|paining)|tightness in (?:the |my |her )?chest|heart attack",
  ),
  indic(
    "सीने (?:में|मे) (?:दर्द|जकड|भारीपन|तेज)|छाती (?:में|मे) (?:दर्द|जकड|भारीपन|तेज)|सीने का दर्द|छाती का दर्द|छातीत (?:दुखत|दुखणे|कळ|दुखा)|दिल का दौरा|हार्ट अटैक|हार्ट अटॅक|हृदयविकाराचा झटका",
  ),
  stem(
    "seene (?:mein|me) (?:dard|jakad)|(?:chh?aa?ti|chest) (?:mein|me) (?:dard|jakad)|seene ka dard|chhatit (?:dukh|kal)|heart attack",
  ),
  indic("বুকে (?:ব্যথা|ব্যাথা|চাপ)|বুক ব্যথা|হার্ট অ্যাটাক"),
  stem("buke (?:byatha|betha|bethha|chap)"),
  indic("છાતીમાં (?:દુખાવો|દુઃખાવો|દર્દ|ભાર)|હાર્ટ એટેક"),
  stem("chh?atima (?:dukh|dard)|chh?ati ma (?:dukh|dard)"),
  indic("ಎದೆ ನೋವು|ಎದೆಯಲ್ಲಿ ನೋವು|ಎದೆ ಬಿಗಿ|ಹೃದಯಾಘಾತ|ಹಾರ್ಟ್ ಅಟ್ಯಾಕ್"),
  stem("ede nov|edeyalli nov"),
  indic("നെഞ്ചുവേദന|നെഞ്ച് വേദന|നെഞ്ചിൽ (?:വേദന|ഭാരം)|ഹൃദയാഘാത"),
  stem("nenj(?:u|il) ?vedana|nenjil bharam"),
  indic("ଛାତିରେ ଯନ୍ତ୍ରଣା|ଛାତି ଯନ୍ତ୍ରଣା|ଛାତି ବିନ୍ଧ"),
  stem("chhati(?:re)? jantrana|chhati bindha"),
  indic("ਛਾਤੀ (?:ਵਿੱਚ|ਚ|ਚੋਂ) ਦਰਦ|ਸੀਨੇ (?:ਵਿੱਚ|ਚ) ਦਰਦ|ਦਿਲ ਦਾ ਦੌਰਾ"),
  stem("chh?ati (?:vich|ch|wich) dard|seene (?:vich|ch) dard"),
  indic("ఛాతీ నొప్పి|ఛాతీలో నొప్పి|ఛాతిలో నొప్పి|ఛాతీలో బిగుతు|గుండె నొప్పి|గుండెపోటు"),
  stem("chati(?:lo)? noppi|gunde noppi|gundepotu"),
  indic("நெஞ்சு வலி|நெஞ்சில் வலி|நெஞ்சுவலி|மார்பு வலி|மார்பில் வலி|இதய வலி|மாரடைப்பு"),
  stem("nenju ?vali|nenjil vali|marbu vali|maaradaippu"),
);

// --- Severe headache, blurred vision, spots before the eyes (pre-eclampsia). "headache" alone
// is not enough. ---
sign(
  "headache_vision",
  "before",
  word(
    "(?:severe|terrible|worst|splitting|unbearable|very bad|really bad|intense|violent|excruciating|persistent|constant|continuous|sudden) head ?ache|head ?ache (?:is |that is )?(?:severe|very bad|terrible|unbearable|getting worse|not going|won't go|will not go|that won't)",
  ),
  word(
    "(?:blurred|blurry|blurring|double|hazy|dim|cloudy) vision|vision (?:is |has |became |got )?(?:blurred|blurry|blurring|double|hazy|dim|gone|lost)|(?:see|sees|seeing|saw) (?:double|spots|stars|flashes|flashing lights|black spots|floaters|dark spots|bright spots)|(?:can't|cannot|couldn't|unable to) see (?:properly|clearly|well)|lost (?:her |his |my )?(?:vision|sight)|eyes (?:went|go|going|gone) dark",
  ),
  indic(
    "(?:सिर|सर) ?(?:में )?दर्द (?:बहुत |बहोत )?(?:तेज|ज्यादा|भयंकर|असहनीय)|(?:तेज|भयंकर|असहनीय|बहुत तेज|बहुत ज्यादा|जोर का) (?:सिर|सर) ?(?:में )?दर्द|सिरदर्द (?:बहुत|तेज)|धुंधला (?:दिख|दिखाई)|धुंधली (?:नजर|दिख)|नजर धुंधली|आंखों (?:के )?(?:आगे|सामने) (?:अंधेरा|धब्बे|तारे|काले)|दो दो दिख|दोहरा दिख|डोकेदुखी|डोके (?:खूप )?दुखत|धूसर दिसत|अंधुक दिसत|डोळ्यांसमोर अंधार|डोळ्यापुढे अंधार|डोळ्यासमोर अंधारी",
  ),
  stem(
    "(?:bahut|bohot|bahot|tez|tej|zyada|jyada) (?:sir|sar|head) ?(?:me |mein )?(?:dard|pain|ache)|(?:sir|sar)(?: ?me| ?mein)? ?(?:dard|ache|pain) (?:bahut|bohot|tez|tej|zyada|jyada|bardasht)|dhundhla|dhundhli|dhundla|aankhon (?:ke )?(?:aage|samne) (?:andhera|dhabbe|tare)|nazar dhundhli|khup dokedukhi|dokedukhi khup|andhuk dis|dolyasamor andhar|dolyapudhe andhar",
  ),
  indic(
    "(?:প্রচণ্ড|প্রচন্ড|খুব|ভীষণ|অসহ্য) মাথা ?ব্যা?থা|মাথা ?ব্যা?থা (?:খুব|প্রচণ্ড|প্রচন্ড|ভীষণ|অসহ্য)|ঝাপসা (?:দেখ|লাগ)|চোখে ঝাপসা|চোখে অন্ধকার|চোখের সামনে (?:অন্ধকার|কালো)",
  ),
  stem("khub matha ?byatha|prochondo matha|matha ?byatha khub|jhapsha dekh|chokhe jhapsha|chokhe andhokar"),
  indic(
    "(?:ખૂબ|ભયંકર|અસહ્ય) માથાનો દુખાવો|માથાનો (?:ખૂબ|ભયંકર|અસહ્ય) દુખાવો|માથું (?:ખૂબ|બહુ) દુખ|ખૂબ માથું દુખ|ઝાંખું દેખ|ઝાંખુ દેખ|આંખે અંધારા|આંખ સામે અંધારા",
  ),
  stem("(?:khub|bahu|ghano|bhayankar) mathano dukhavo|mathu (?:khub|bahu) dukh|jhankhu dekh|ankhe andhara"),
  indic("(?:ತೀವ್ರ|ತುಂಬಾ|ವಿಪರೀತ) ತಲೆ ?ನೋವು|ತಲೆ ?ನೋವು ತುಂಬಾ|ಕಣ್ಣು ಮಂಜ|ಕಣ್ಣಿಗೆ ಮಬ್ಬು|ಕಣ್ಣು ಕತ್ತಲೆ|ಕಣ್ಣಲ್ಲಿ ಕತ್ತಲೆ"),
  stem("(?:tumba|vipareeta|theevra) tale ?novu|kannu manju|kannu kattale"),
  indic("(?:കഠിനമായ|ഒരുപാട്|അസഹ്യമായ) ത(?:ല ?വേദന)|തലവേദന (?:കൂടുതൽ|കഠിന)|കാഴ്ച്?ച മങ്ങ|കണ്ണിൽ ഇരുട്ട്"),
  stem("(?:kathinamaya|orupad|asahyamaya) thala ?vedana|kazhcha mangu|kannil irutt"),
  indic("(?:तीव्र|खूप|असह्य) डोकेदुखी"),
  indic("(?:ਬਹੁਤ|ਬਹੁਤ ਤੇਜ|ਤੇਜ) ਸਿਰ (?:ਵਿੱਚ )?ਦਰਦ|ਸਿਰ ਦਰਦ ਬਹੁਤ|ਧੁੰਦਲਾ ਦਿਖ|ਅੱਖਾਂ (?:ਅੱਗੇ|ਸਾਹਮਣੇ) ਹਨੇਰਾ"),
  stem("bahut (?:tez )?sir (?:vich )?dard|sir dard bahut|dhundhla dikh|akhan agge hanera"),
  indic("(?:తీవ్రమైన|విపరీతమైన|చాలా) తల ?నొప్పి|తల ?నొప్పి (?:చాలా|ఎక్కువ|తీవ్ర)|కళ్ళు మసక|కళ్లు మసక|కళ్ళ ముందు చీకటి|కళ్లముందు చీకటి|మసకగా కనిప"),
  stem("chala tala ?noppi|tala ?noppi chala|vipareetamaina|kallu masaka|kallu mundu cheekati"),
  indic(
    "(?:கடுமையான|அதிக|தாங்க முடியாத|மிகவும்) தலைவலி|ரொம்ப தலைவலி|தலைவலி (?:அதிக|கடும்|தாங்க)|பார்வை மங்க|கண் பார்வை மங்க|பார்வை தெரியவில்லை|கண் இருட்டு|கண்கள் இருட்ட|கண் முன் இருட்டு",
  ),
  stem("(?:romba|kadumaiyana|athiga?m) thalaivali|paarvai mangal|parvai mangu|kan irutt|kann irutt"),
);

// --- Fever. "fever" alone is not an alarm; "high", a thermometer reading from 102 F / 39 C, or
// a baby that is burning hot or cold to touch is. ("104" alone is also a helpline number.) ---
sign(
  "fever",
  "before",
  word(
    "(?:very high|high|severe|bad|strong|raging|burning|extreme|sudden) (?:fever|temperature|grade fever)|fever (?:with|and) (?:chills|shivering|rigors?|shaking)|(?:shivering|chills) (?:with|and) (?:fever|high temperature)|burning up|burning hot",
  ),
  word(
    "(?:fever|temperature|temp|thermometer|bukhar|bukhaar)(?: [a-z]+){0,3} (?:10[2-9]|39|4[0-2])(?:[.][0-9])?(?![0-9])",
  ),
  word(
    `${BABY}(?:'s)? (?:body|skin|hands|feet|head|forehead) (?:is |feels |felt |became |has become |turned )?(?:very |so |too |really )?(?:cold|icy|hot|burning)|${BABY}(?:'s)? (?:is |feels |felt |became |has become |turned )(?:(?:very|so|too|really|extremely) (?:cold|icy|hot|burning)|icy|burning)|(?:cold|icy|hot|burning) to (?:the )?touch`,
  ),
  indic(
    "तेज(?: तेज)? बुखार|बहुत (?:तेज )?बुखार|बुखार (?:बहुत )?(?:तेज|ज्यादा)|तेज(?: तेज)? ज्वर|बच्चे का (?:शरीर|बदन|हाथ पैर|पैर) (?:ठंडा|गर्म|तप|जल)|बच्चा (?:ठंडा पड|गर्म हो|तप रहा|बहुत गर्म|बहुत ठंडा)|(?:शरीर|बदन) (?:तप|जल) रहा|बदन (?:ठंडा पड|बहुत ठंडा)|ठंड के साथ बुखार",
  ),
  stem(
    "(?:tez|tej|bahut tez|bahut|bohot|zyada|jyada) (?:bukhar|bukhaar|fever|jwar)|(?:bukhar|bukhaar|fever) (?:bahut |bohot )?(?:tez|tej|zyada|jyada)|(?:bachcha|bachha|bacha|bachche|bacche|baby)(?: ka| ki)? (?:badan|body|sharir|shareer)(?: bahut)? (?:thanda|garam|tap|jal)|(?:badan|body|sharir|shareer) tap|baby (?:bahut )?(?:thanda|garam|tap)|khub jor|bhishon jor|jor khub",
  ),
  indic("(?:প্রচণ্ড|প্রচন্ড|খুব|বেশি|ভীষণ) জ্বর|জ্বর (?:খুব|বেশি|প্রচণ্ড)|বাচ্চার গা (?:ঠান্ডা|গরম|পুড়ে)|গা পুড়ে যাচ্ছে|গা ঠান্ডা হয়ে"),
  indic("(?:ખૂબ|વધારે|તેજ|બહુ) તાવ|તાવ (?:ખૂબ|વધારે|તેજ)|બાળકનું શરીર (?:ઠંડુ|ગરમ)|બાળક (?:ઠંડુ|ગરમ) પડ"),
  indic("(?:ತುಂಬಾ|ಹೆಚ್ಚು|ಜಾಸ್ತಿ|ತೀವ್ರ) ಜ್ವರ|ಜ್ವರ (?:ತುಂಬಾ|ಜಾಸ್ತಿ)|ಮಗುವಿನ ದೇಹ (?:ತಣ್ಣ|ಬಿಸಿ)|ಮೈ ಸುಡ"),
  indic("(?:കടുത്ത|ഒരുപാട്|ശക്തമായ) പനി|പനി (?:കൂടി|കൂടുതൽ|കടുത്ത)|കുഞ്ഞിന്റെ (?:ശരീരം|ദേഹം) (?:തണുത്ത|ചൂട്)"),
  indic("(?:खूप|जास्त|तीव्र) ताप|ताप खूप|फणफण|बाळाचे (?:अंग|शरीर) (?:थंड|गरम)|अंग (?:थंड|गरम) पड"),
  indic("(?:ବହୁତ|ଅଧିକ|ଜୋର) ଜ୍ୱର|ଜ୍ୱର ବହୁତ|ପିଲାର ଦେହ (?:ଥଣ୍ଡା|ଗରମ)"),
  indic("(?:ਬਹੁਤ|ਬਹੁਤ ਤੇਜ|ਤੇਜ) ਬੁਖਾਰ|ਬੁਖਾਰ ਬਹੁਤ|ਬੱਚੇ ਦਾ ਸਰੀਰ (?:ਠੰਡਾ|ਗਰਮ)"),
  indic(
    "(?:చాలా|ఎక్కువ|తీవ్రమైన) జ్వరం|జ్వరం (?:చాలా|ఎక్కువ)|ఒళ్ళు (?:కాలిపోతోంది|చల్లబడ)|ఒళ్లు (?:కాలిపోతోంది|చల్లబడ)|బిడ్డ ఒళ్ళు (?:చల్ల|వేడ)|బిడ్డ ఒళ్లు (?:చల్ల|వేడ)",
  ),
  indic(
    "(?:அதிக|கடுமையான|ரொம்ப) காய்ச்சல்|காய்ச்சல் (?:அதிக|ரொம்ப|கடும்)|குழந்தையின் (?:உடல்|உடம்பு) (?:குளிர்|சூடு)|உடம்பு (?:கொதி|குளிர்ந்து)",
  ),
  stem(
    "(?:chala|ekkuva) jvaram|jvaram (?:chala|ekkuva)|(?:romba|athiga?m|adhigam) kaichal|kaichal (?:romba|athiga?m)|(?:tumba|jasti) jvara|jvara (?:tumba|jasti)|(?:kadutha|orupad) pani|pani (?:koodi|kooduthal)|khup taap|taap khup|jast taap",
  ),
);

// --- Severe belly pain; labour starting early or at all; belly like a board ---
sign(
  "belly_or_labour_pain",
  null,
  word(
    "(?:severe|terrible|unbearable|excruciating|intense|extreme|sharp|worst|very bad|really bad|cramping) (?:abdominal |stomach |belly |tummy |lower abdominal |lower belly |pelvic )?(?:pain|cramps?)|(?:stomach|abdominal|belly|tummy|pelvic) (?:pain|ache) (?:is |that is )?(?:severe|very bad|unbearable|terrible|constant|continuous|sharp|getting worse|won't stop)|pain in (?:the |my |her )?(?:stomach|abdomen|belly|tummy) (?:is )?(?:severe|very bad|unbearable|terrible|constant|sharp)|(?:belly|stomach|abdomen|tummy) (?:is |feels |became )?(?:rock hard|hard as a (?:board|rock)|like a (?:board|rock))",
  ),
  word(
    "(?:labou?r|contractions?) (?:pains? )?(?:has |have )?(?:started|begun|begins|starting|is starting|are starting|are coming|came)|in labou?r|labou?r pains?(?! (?:what|how|is it|are they|feel like))|(?:contractions?|pains?) (?:every|at) (?:[0-9]+ |one |two |three |five |ten )?(?:minutes?|mins?)|(?:premature|preterm|pre.?term|early) (?:labou?r|contractions?|delivery|birth)|(?:labou?r|contractions?|pains?|delivery) (?:before (?:time|due date|the due date|term|8 months|eight months|7 months|seven months)|too early|not yet due)|going into labou?r too early",
  ),
  indic(
    "(?:तेज|भयंकर|असहनीय|बहुत तेज|जोर का|बहुत ज्यादा) (?:पेट )?(?:में )?दर्द|पेट (?:में )?(?:बहुत )?(?:तेज|ज्यादा|भयंकर|असहनीय|जोर का) दर्द|पेट दर्द (?:बहुत )?(?:तेज|ज्यादा|नहीं रुक)|दर्द (?:बर्दाश्त|सहन) नहीं|पेट (?:पत्थर|सख्त|कड़ा|कड़क)|(?:प्रसव|लेबर) (?:पीड|पेन|दर्द)|लेबर (?:शुरू|हो)|समय से पहले (?:दर्द|प्रसव|पानी|डिलीवरी)|दर्द शुरू हो गया|दर्द उठ",
  ),
  stem(
    "(?:bahut|bohot|tez|tej|zyada|jyada|bhayankar|asahniya) (?:pet )?dard|pet (?:me |mein )?(?:bahut |bohot )?(?:tez |tej )?dard (?:bahut|tez|tej|zyada|jyada)|dard (?:bahut )?(?:tez|tej|zyada|jyada|bardasht|sahan)|(?:pet|dard) (?:bardasht|sehen|sahan) nahi|labou?r pain|labour (?:shuru|start)|pain (?:shuru|start) ho gay|dard (?:shuru|start) ho gay|dard uth|pravas ?(?:peeda|pida)|(?:time|samay|waqt) se pehle (?:dard|pain|delivery|pani|paani|labour)",
  ),
  indic("প্রসব (?:বেদনা|ব্যথা)|লেবার পেইন|সময়ের আগে (?:ব্যথা|প্রসব|পানি|জল)"),
  indic("પ્રસૂતિ (?:પીડા|દર્દ)|સમય પહેલા (?:દુખાવો|દર્દ|પ્રસૂતિ)"),
  indic("ಹೆರಿಗೆ ನೋವು|ಸಮಯಕ್ಕೆ ಮುನ್ನ ಹೆರಿಗೆ|ಹೆರಿಗೆ ನೋವು ಶುರು"),
  indic("പ്രസവ വേദന|പ്രസവവേദന|സമയത്തിന് മുമ്പ് പ്രസവ"),
  indic("प्रसूती(?:च्या)? वेदना|कळा सुरू|कळा येत|वेळेआधी (?:कळा|प्रसूती|पाणी)"),
  indic("ପ୍ରସବ ବେଦନା|ପ୍ରସବ ଯନ୍ତ୍ରଣା"),
  indic("ਜਣੇਪੇ ਦਾ ਦਰਦ|ਜਣੇਪਾ ਦਰਦ|ਸਮੇਂ ਤੋਂ ਪਹਿਲਾਂ (?:ਦਰਦ|ਜਣੇਪਾ)"),
  indic("ప్రసవ నొప్పి|పురిటి నొప్పి|నెలలు నిండకముందే నొప్పి"),
  indic("பிரசவ வலி|பிரசவ வலி வந்த|பிரசவ வலி ஆரம்ப"),
  stem(
    "prasava vedane|prasava vedana|prasav vedana|prasuti vedna|kala yet|kala suru|purithi noppi|prasava noppi|piravasa vali|pirasava vali|prasab bedona|prasab betha|prasuti pida|janape da dard",
  ),
);

// --- Water breaking (especially early) and foul, green or pus-like discharge. "water" alone
// is far too common ("water leaking from the van"), so it needs "broke", "burst" or the vagina. ---
sign(
  "waters_or_discharge",
  null,
  word(
    "(?:my |her |the |our )?waters? (?:has |have |had |just )?(?:broke|broken|burst|ruptured|gushed)|(?:bag of waters|membranes) (?:has |have |had )?(?:ruptured|burst|broken|leaking)|ruptured membranes|premature rupture|(?:amniotic fluid|liquor|fluid|liquid|water) (?:is |was |has been |keeps? )?(?:leaking|trickling|gushing|dripping|coming out|came out) (?:from |out of |through )?(?:the |her |my )?(?:vagina|below|down there|private)|leaking (?:amniotic )?(?:fluid|liquor)",
  ),
  word(
    "(?:foul|bad|smelly|stinking|offensive|green|greenish|yellow.?green|pus.?like|pus) (?:smelling )?(?:vaginal )?(?:discharge|fluid|liquid)|discharge (?:that )?(?:is |has |with )?(?:a )?(?:foul|smelly|stinking|bad|green|pus)|(?:foul|bad|stinking|offensive|terrible) (?:smell|odou?r)(?: from| in| of| coming from)? (?:the )?(?:discharge|vagina|wound|stitch|stitches|cord|navel|bleeding|lochia|blood)|foul.?smelling",
  ),
  indic(
    "पानी (?:की |का )?(?:थैली|थैला) (?:फट|फूट|टूट)|पानी (?:फट|फूट|टूट|छूट) (?:गया|गई|गयी|रहा|रही)|(?:नीचे से|योनि से) (?:पानी|तरल)|(?:बदबूदार|बदबू वाला|बदबू वाली|गंदी बदबू वाला) (?:स्राव|पानी|डिस्चार्ज|सफेद पानी|पस)|पाणी (?:फुटल|फुटले)|पाणी गळत|पाण्याची पिशवी",
  ),
  stem(
    "p(?:aa?)ni (?:ki )?(?:thaili )?(?:phat|fat|toot|chhoot|choot|futl|phutl)|p(?:aa?)ni (?:ki|ka) (?:thaili|thaila)|(?:neeche|niche) se (?:paani|pani)|water (?:toot|phat|fat) gay|badbudar|badboo ?(?:wala|wali|dar)|panyachi pishvi",
  ),
  indic("(?:জল|পানি) (?:ভেঙে|ভেঙ্গে|ভাঙ)|জরায়ুর জল|দুর্গন্ধ(?:যুক্ত)? (?:স্রাব|পানি|জল|রস)|পুঁজ"),
  stem("(?:jol|pani) bhenge|durgondho(?:jukto)? srab"),
  indic("પાણીની થેલી|પાણી (?:ફાટી|તૂટી|ફૂટી|છૂટી) ગ|દુર્ગંધવાળ[ાીુ]? (?:સ્ત્રાવ|પાણી|પ્રવાહી)"),
  stem("pani (?:fati|tuti|futi|chhuti) gay|panini theli|durgandh ?vala"),
  indic("ನೀರು ಒಡೆ|ನೀರಿನ ಚೀಲ|ದುರ್ವಾಸನೆ(?:ಯ)? (?:ಸ್ರಾವ|ನೀರು|ದ್ರವ)|ಕೀವು"),
  stem("neeru ode|neeru odedu|durvasane|keevu"),
  indic("വെള്ളം പൊട്ടി|ദുർഗന്ധ(?:മുള്ള)? (?:സ്രാവ|വെള്ളം|ദ്രാവക)"),
  stem("vellam potti|durgandham"),
  indic("ପାଣି (?:ଫାଟି|ଭାଙ୍ଗି)|ଦୁର୍ଗନ୍ଧ(?:ଯୁକ୍ତ)? (?:ସ୍ରାବ|ପାଣି)"),
  indic("ਪਾਣੀ (?:ਫਟ|ਟੁੱਟ|ਫੁੱਟ)|ਪਾਣੀ ਦੀ ਥੈਲੀ|ਬਦਬੂਦਾਰ"),
  indic("ఉమ్మ ?నీరు (?:పోయ|పోత|కార|వచ్చ|లీక్)|నీటి సంచి|దుర్వాసన(?:తో)? (?:స్రావం|నీళ్లు|ద్రవం)|చీము"),
  stem("ummaneeru|umma neeru|chimu"),
  indic("பனிக்குடம் (?:உடை|உடைந்)|பனிக்குட நீர்|துர்நாற்றம் (?:வீசும்|உள்ள) (?:வெள்ளைப்படுதல்|திரவம்|நீர்)|சீழ்"),
  stem("panikkudam (?:udai|udaindh)|seezh"),
);

// --- Sudden swelling of face, hands or eyes (pre-eclampsia). Swollen feet alone are normal in
// pregnancy and are left out; so is "swollen gums". ---
sign(
  "face_hand_swelling",
  "before",
  word(
    "(?:face|hands?|eyelids?|eyes) (?:are |is |have |has |got |became |become |looks?|feel)? ?(?:swollen|puffy|swelling|swelled|puffed up)|swell(?:ing|en) (?:of |in |on )?(?:the |her |my )?(?:face|hands?|eyes|eyelids)|puffy (?:face|eyes|hands?)|swollen (?:face|hands?)",
  ),
  indic(
    "चेहरे (?:पर|में|का) सूजन|चेहरा सूज|हाथ(?:ों)? (?:पर |में )?(?:सूजन|सूज)|आंखों (?:पर|में|के नीचे) सूजन|मुंह सूज|चेहऱ्यावर सूज|चेहरा सुजल|हातावर सूज|हात सुजल",
  ),
  stem(
    "chehra (?:suj|sooj)|chehre (?:par|pe|me) (?:sujan|soojan)|haath(?:on)? (?:me |par |pe )?(?:suj|sooj|sujan)|face (?:suj|sooj|puff)|aankhon (?:me|par|pe) (?:sujan|soojan)|munh (?:suj|sooj)|chehryavar suj|hatavar suj",
  ),
  indic("মুখ(?:ে)? ফুলে|মুখ ফোলা|হাত ফোলা|চোখ ফোলা"),
  stem("mukh (?:phule|fola)|ha(?:a)?t fola"),
  indic("ચહેરા(?: પર)? સોજો|ચહેરો સૂજ|હાથ(?: પર|માં)? સોજો|મોં સૂજ"),
  stem("chehra (?:par )?sojo|hath (?:par |ma )?sojo"),
  indic("ಮುಖ(?:ದಲ್ಲಿ)? ಊತ|ಕೈ ಊತ|ಮುಖ ಬಾತ|ಮುಖ ಊದಿ|ಕೈಗಳು ಊದಿ"),
  stem("mukha (?:uta|udi|baatu)|kai uta"),
  indic("മുഖത്ത് നീര്|മുഖം നീര്|കൈകളിൽ നീര്|മുഖം വീർ|കൈ വീർ"),
  stem("mukhath(?:u)? neer|mukham veer|kai neer"),
  indic("ମୁହଁ (?:ଫୁଲି|ଫୁଲା)|ହାତ ଫୁଲି|ମୁହଁରେ ଫୁଲା"),
  indic("ਚਿਹਰੇ (?:ਤੇ|ਉੱਤੇ) ਸੋਜ|ਚਿਹਰਾ ਸੁੱਜ|ਹੱਥਾਂ (?:ਤੇ|ਉੱਤੇ) ਸੋਜ|ਹੱਥ ਸੁੱਜ|ਮੂੰਹ ਸੁੱਜ"),
  indic("ముఖం ఉబ్బ|ముఖంలో వాపు|ముఖం వాపు|చేతులు వాపు|చేతుల్లో వాపు|కళ్ళు ఉబ్బ|కళ్లు ఉబ్బ"),
  stem("mukham (?:ubb|vapu)|chetulu vapu|kallu ubb"),
  indic("முகம் (?:வீங்க|வீக்கம்)|முகத்தில் வீக்கம்|கை வீங்க|கைகளில் வீக்கம்|கண் வீங்க"),
  stem("mugam veeng|mugathil veekkam|kai (?:veeng|veekkam)"),
);

// --- Painful, swollen, red or hot calf or one leg (a clot). Calf cramps and both legs swollen
// are normal in pregnancy, so "calf pain" or "swollen legs" alone are not enough. ---
sign(
  "calf_clot",
  null,
  word(
    "(?:one|single|left|right) (?:leg|calf|thigh) (?:is |has |became |got )?(?:swollen|swelling|red|hot|painful|tender)|(?:swollen|red|hot|tender|painful and swollen) (?:and (?:painful|swollen|red|hot) )?calf|calf (?:is |has |became )?(?:swollen|red|hot|very painful|tender)|dvt|deep vein thrombosis|blood clot in (?:the |my |her )?(?:leg|calf)",
  ),
  indic("पिंडली (?:में )?(?:सूज|लाल)|पिंडली(?: में)? दर्द और सूज|एक (?:पैर|टांग) (?:में )?(?:सूज|लाल|दर्द और सूज)"),
  stem(
    "pindli (?:me |mein )?(?:suj|sujan|laal|lal)|ek (?:pair|paer|taang|tang|per) (?:me |mein )?(?:suj|sujan|laal|lal)",
  ),
);

// --- The baby in the womb not moving or moving less; also a newborn that is not moving. "no
// movement" about a van or traffic is NOT matched: it needs the baby, the belly or "fetal". ---
sign(
  "baby_movement",
  null,
  word(
    "(?:baby|babies|fetus|foetus|child)(?:'s)? (?:is |has |was |have |had )?(?:not|isn't|hasn't|stopped|no longer|barely|hardly)(?: [a-z]+)? (?:moving|kicking|moved|kicked|move|kick|active|movements?)",
  ),
  word(
    "(?:baby|fetal|foetal|fetus) movements? (?:has |have |had )?(?:stopped|reduced|decreased|lessened|gone|less|slowed|absent)|(?:reduced|decreased|absent|lack of|loss of) (?:baby |fetal |foetal )?(?:movements?|kicks?|kicking)|(?:less|lesser|fewer|little|no) (?:baby |fetal |foetal )(?:movements?|kicks?|kicking)|(?:no|less|fewer|little) (?:movements?|kicks?) (?:of the baby|in (?:the |my |her )?(?:belly|tummy|womb|stomach))",
  ),
  word(
    "(?:not|haven't|hasn't|don't|doesn't|can't|cannot|couldn't|didn't|unable to) (?:feel|felt|feeling) (?:the |any |my |her )?(?:baby|movements?|kicks?)(?: move| moving| kick| kicking)?|(?:baby|she|it) (?:is )?(?:moving|kicking|moves|kicks) (?:much )?less|(?:in the |my |her )?(?:belly|tummy|womb|stomach) (?:is |has gone |went )?(?:still|quiet|silent)",
  ),
  // A Latin "baby" with a native-script verb, the way code-mixed messages are typed
  indic(
    `${BABY}(?: [^ ]+){0,2} (?:അനങ്ങുന്നില്ല|ഇളകുന്നില്ല|அசையவில்லை|కదలడం లేదు|కదలట్లేదు|ಅಲುಗಾಡುತ್ತಿಲ್ಲ|ಚಲಿಸುತ್ತಿಲ್ಲ|নড়ছে না|હલતું નથી|हलत नाही|हिल नहीं|ਹਿੱਲ ਨਹੀਂ)`,
  ),
  indic(
    "हिल (?:नहीं|नही) (?:रहा|रही)|(?:बच्चा|बच्चे|बेबी|शिशु|बच्ची|पेट)(?: [^ ]+){0,3} (?:हिल|हरकत|हलचल|लात|मूव)[^ ]* (?:नहीं|नही|बंद|कम)|(?:बच्चा|बच्चे|बेबी|शिशु|बच्ची)(?: [^ ]+){0,3} (?:नहीं|नही) (?:हिल|हरकत|हलचल|लात|मूव)|हलचल (?:नहीं|नही|बंद|कम)|हरकत (?:नहीं|नही|बंद|कम)|लात (?:नहीं|नही) मार",
  ),
  stem(
    "(?:baby|bachcha|bachha|bacha|bachchi|pet ka bachcha|pet me bachcha)(?: [a-z]+){0,3} (?:hil|hal|harkat|lat|move|kick|hilna|halchal)[a-z]* (?:nahi|nahin|nhi|band|kam)|(?:baby|bachcha|bachha|bacha)(?: [a-z]+){0,2} (?:nahi|nahin|nhi) (?:hil|hal|move|kick|harkat)|hil nahi rah|halchal (?:nahi|nahin|nhi|band|kam)|harkat (?:nahi|nahin|nhi|band|kam)|lat (?:nahi|nahin|nhi) mar|hilna band",
  ),
  indic(
    "(?:বাচ্চা|বাচ্চাটা|শিশু|শিশুটি)(?: [^ ]+){0,2} (?:নড়ছে না|নড়ছেনা|নড়ে না|নড়াচড়া (?:করছে )?না|নড়াচড়া কম|নড়াচড়া নেই|লাথি মারছে না)|নড়াচড়া (?:কমে|কম|নেই|বন্ধ)",
  ),
  stem(
    "(?:baccha|bachcha|baby|shishu)(?: [a-z]+){0,2} (?:nor|nar)[a-z]* (?:na|nei|ni|kom|bondho)|(?:norachora|narachara|norachoda) (?:kom|nei|bondho|kome)",
  ),
  indic(
    "બાળક(?: [^ ]+){0,2} (?:હલતું નથી|હલતો નથી|હલતી નથી|હલન ?ચલન (?:નથી|ઓછ|બંધ)|ફરતું નથી|લાત મારતું નથી)|હલન ?ચલન (?:ઓછ|બંધ|નથી)",
  ),
  stem(
    "(?:balak|bachchu|baby)(?: [a-z]+){0,2} (?:halatu|halto|halti|farat|lat)[a-z]* nathi|halan ?chalan (?:nathi|ochu|bandh)",
  ),
  indic(
    "ಮಗು(?: [^ ]+){0,2} (?:ಅಲುಗಾಡುತ್ತಿಲ್ಲ|ಅಲುಗಾಡ್ತಿಲ್ಲ|ಅಲುಗಾಡುವುದಿಲ್ಲ|ಚಲಿಸುತ್ತಿಲ್ಲ|ಒದೆಯುತ್ತಿಲ್ಲ|ಅಲ್ಲಾಡುತ್ತಿಲ್ಲ|ಅಲ್ಲಾಡ್ತಿಲ್ಲ)|(?:ಮಗುವಿನ )?ಚಲನೆ (?:ಕಡಿಮೆ|ಇಲ್ಲ)",
  ),
  stem("magu(?: [a-z]+){0,2} (?:alugad|allad|chalis|odey)[a-z]* (?:illa|alla)|chalane (?:kadime|illa)"),
  indic(
    "കുഞ്ഞ്(?: [^ ]+){0,2} (?:അനങ്ങുന്നില്ല|ഇളകുന്നില്ല|ചവിട്ടുന്നില്ല|അനക്കമില്ല)|അനക്കം (?:കുറവ്|കുറഞ്ഞ|ഇല്ല)|അനക്കമില്ല|ഇളക്കം (?:കുറ|ഇല്ല)",
  ),
  stem(
    "kunju(?: [a-z]+){0,2} (?:anangunnilla|anangunilla|ilakkunnilla|chavittunnilla)|anakkam (?:illa|kurav|kuranj)|anakkamilla",
  ),
  indic(
    "बाळ(?: [^ ]+){0,2} (?:हलत नाही|हालचाल (?:करत )?नाही|हालचाल कमी|लाथ मारत नाही)|बाळाची हालचाल (?:कमी|बंद|नाही)|हालचाल (?:कमी|बंद|जाणवत नाही)",
  ),
  stem(
    "(?:baal|baby)(?: [a-z]+){0,2} (?:halat|halchal|lath) (?:nahi|karat nahi)|balachi halchal (?:kami|band|nahi)|halchal (?:kami|band)",
  ),
  indic("(?:ପିଲା|ଶିଶୁ|ଛୁଆ)(?: [^ ]+){0,2} (?:ଘୁଞ୍ଚୁ|ହଲୁ|ଚଳୁ|ନଡୁ|ଲାତ ମାରୁ) ?ନାହିଁ|ଗତି କମ|ଚଳପ୍ରଚଳ କମ"),
  stem("(?:pila|sishu|chhua|baby)(?: [a-z]+){0,2} (?:ghunchu|halu|nadu|chalu|lat maru)[a-z]* nahi"),
  indic(
    "(?:ਬੱਚਾ|ਬੱਚੇ)(?: [^ ]+){0,2} (?:ਹਿੱਲ|ਹਿਲ|ਹਰਕਤ|ਲੱਤ|ਹਿਲਜੁਲ)[^ ]*(?: ਨਹੀਂ| ਨਹੀ)|ਬੱਚਾ ਨਹੀਂ ਹਿੱਲ|ਹਰਕਤ (?:ਨਹੀਂ|ਘੱਟ|ਬੰਦ)|ਹਿਲਜੁਲ (?:ਨਹੀਂ|ਘੱਟ|ਬੰਦ)",
  ),
  stem(
    "(?:bacha|baccha|bachha|baby)(?: [a-z]+){0,2} (?:hill|hil|harkat|lat|hiljul)[a-z]* nahi|harkat (?:nahi|ghat|band)|hiljul (?:nahi|ghat|band)",
  ),
  indic(
    "(?:బిడ్డ|పాప|బాబు|పిల్లవాడు|పసిబిడ్డ)(?: [^ ]+){0,2} (?:కదలడం లేదు|కదలట్లేదు|కదలడంలేదు|తన్నడం లేదు|తన్నట్లేదు|కదలటం లేదు)|కదలికలు (?:తగ్గ|లేవు|లేదు|ఆగ)|కదలిక (?:తగ్గ|లేదు|ఆగ)",
  ),
  stem(
    "(?:bidda|pilla|baby)(?: [a-z]+){0,2} (?:kadalatla|kadalatledu|kadaladam ledu|kadalatam ledu|tannatledu|tannadam ledu)|kadalikalu (?:taggayi|levu|ledu)|kadalika (?:taggindi|ledu)",
  ),
  indic(
    "(?:குழந்தை|குழந்தையின்|பாப்பா|பாப்பாவின்)(?: [^ ]+){0,2} (?:அசையவில்லை|அசைவதில்லை|அசையல|உதைக்கவில்லை|உதைக்கல|அசைவு (?:இல்லை|குறைவு|குறைந்து))|அசைவு (?:இல்லை|குறைவ|குறைந்)|அசைவில்லை",
  ),
  stem(
    "(?:kuzhandhai|kulandhai|kuzhanthai|baby)(?: [a-z]+){0,2} (?:asaiyala|asaiyavillai|asaiyalai|udhaikkala)|asaivu (?:illa|kurai)|asaivillai",
  ),
);

// --- Cord or a baby's body part showing, baby crowning or stuck: an obstetric emergency ---
sign(
  "cord_or_part_showing",
  null,
  word(
    "(?:umbilical )?cord (?:is |has |was )?(?:coming|came|hanging|slipped|dropped) (?:out|down)(?: first)?|cord prolapse[d]?|prolapsed cord|(?:umbilical )?cord (?:is )?(?:outside|visible outside)",
  ),
  word(
    "(?:baby'?s |the )(?:hand|arm|leg|foot|feet|bottom|buttocks|shoulder) (?:is |are |has |have )?(?:coming|came|showing|visible|out|protruding)|(?:hand|arm|leg|foot|feet|bottom|buttocks) first|baby'?s? (?:head|body) (?:is |has )?(?:stuck|visible|crowning|coming out)|baby is (?:crowning|coming out|being born)|baby (?:is )?coming (?:now|out|right now|immediately)|head (?:is )?(?:stuck|visible|crowning)|baby (?:is )?stuck",
  ),
  indic(
    "(?:नाल|गर्भनाल) (?:बाहर|निकल|दिख)|हाथ बाहर (?:आ|निकल)|पैर बाहर (?:आ|निकल)|बच्चे का (?:हाथ|पैर|सिर) (?:बाहर|दिख|निकल)|सिर दिख|बच्चा बाहर (?:आ रहा|आने)|बच्चा (?:फंस|अटक)",
  ),
  stem(
    "(?:naal|nabhi nal|garbhnaal|garbhnal) (?:bahar|nikal|dikh)|bachche ka (?:haath|hath|pair|sar|sir) (?:bahar|dikh|nikal)|sir (?:dikh|bahar)|bachcha (?:bahar aa raha|phans|atak)",
  ),
);

// --- Thoughts of harming herself or the baby (postnatal depression, psychosis). Never guarded:
// "I want to die" is taken at face value, and idioms ("I'll kill myself if I miss the van")
// still alert, because the cost of a wrong guess is one phone call. ---
sign(
  "self_harm",
  null,
  word(
    "suicid[a-z]*|self.?harm|want(?:s|ed)? to die|wish(?:es|ed)? (?:i|she|he) (?:was|were|could|would) (?:dead|die)|wish i (?:was|were) dead|(?:don't|do not|doesn't|does not|no longer) want to (?:live|be alive|go on living)|no (?:reason|point) (?:in |to )?(?:live|living|going on)|not worth living|life (?:is )?(?:not|no longer) worth|better off dead|better off without (?:me|her)|end it all|end(?:ing)? (?:my|her) (?:own )?life|take (?:my|her) own life|kill(?:ing)? (?:myself|herself)|harm(?:ing)? (?:myself|herself)|cut(?:ting)? (?:myself|herself) (?:on purpose|deliberately)|jump (?:off|in front of)|hang (?:myself|herself)|poison (?:myself|herself)|drown (?:myself|herself)",
  ),
  word(
    "(?:kill|killing|harm|harming|smother|smothering|drown|drowning) (?:my |the |her |our )(?:baby|newborn|infant|child)|(?:thoughts?|urge|urges|feel(?:ing)? like|want(?:s|ed)? to|going to|thinking (?:of|about)|plan(?:ning)? to) (?:to )?(?:kill|harm|hurt|smother|drown|throw|abandon) (?:my |the |her |our )?(?:baby|newborn|infant|child)|(?:hearing|hear|hears) voices|voices (?:telling|tell|are telling|told) (?:me|her) to",
  ),
  // Hindi / Marathi
  indic(
    "आत्महत्या|खुदकुशी|खुद को (?:मार|खत्म|नुकसान|चोट)|जान (?:दे|देना) (?:दू|दे|चाह)|जान दे दू|मर जाना चाहती|मर जाना चाहता|मरना चाहती|मरना चाहता|मर जाऊं|मर जाऊंगी|जीना नहीं चाहती|जीना नहीं चाहता|जीने का मन नहीं|जीने की इच्छा नहीं|जीने का कोई मतलब नहीं|बच्चे को (?:मार|नुकसान|फेंक)|बच्ची को (?:मार|नुकसान|फेंक)|जहर (?:खा|पी)|फांसी (?:लग|ले)|कुएं में कूद|नदी में कूद|खुद को आग|जीव द्यावा|जीव देणार|मरावंसं वाटत|मरावेसे वाटत|जगावंसं वाटत नाही|जगावेसे वाटत नाही|जगायचं नाही|विष (?:प्या|खा)|बाळाला (?:मारून|मारायच|इजा)",
  ),
  stem(
    "aatm ?hatya|atmhatya|atmahatya|khudkushi|khudkhushi|khud ko (?:maar|khatam|nuksan|chot)|jaan de (?:dun|du|doon)|jaan dene|marna chah(?:ti|ta|unga|ungi)|mar jana chah|mar ja(?:un|oon|ungi|unga|aun)|jeena nahi chah|jeene ka (?:mann?|mood|iccha|ichha) nahi|jeene ka koi matlab|bachche ko (?:maar|nuksan)|bachchi ko (?:maar|nuksan)|zeher kha|jahar kha|zehar kha|fansi (?:laga|le)|(?:kuen|kue|nadi) (?:mein|me) kood|jeev dyava|marawasa vatat|maravese vatate|jagavasa vatat nahi|jagaych nahi|vish pya|balala mar",
  ),
  indic("আত্মহত্যা|আত্মঘাতী|নিজেকে (?:মেরে|শেষ|ক্ষতি)|মরে যেতে চাই|মরতে চাই|বাঁচতে চাই না|বাঁচার ইচ্ছা নেই|বাচ্চাকে (?:মেরে|ক্ষতি)|বিষ খ"),
  stem(
    "atmohotya|atmahatya|nijeke (?:mere|shesh)|more jete chai|morte chai|bachte chai na|bachte ichchha nei|bish kha",
  ),
  indic("આત્મહત્યા|આપઘાત|મરી જવું છે|મરવું છે|મરી જવા માંગ|જીવવું નથી|જીવવાની ઈચ્છા નથી|બાળકને મારી|ઝેર (?:પી|ખા)"),
  stem("aatmahatya|apghat|marvu chhe|mari javu chhe|jivavu nathi|jivvu nathi|jher pi|zer pi"),
  indic("ಆತ್ಮಹತ್ಯೆ|ಸಾಯಬೇಕು|ಸಾಯಲು ಬಯಸ|ಸತ್ತು ಹೋಗ|ಬದುಕಲು ಇಷ್ಟವಿಲ್ಲ|ವಿಷ ಕುಡಿ|ಮಗುವನ್ನು ಕೊಲ್ಲ"),
  stem("atmahatye|sayabeku|saayabeku|badukalu ishta illa|visha kudi|maguvannu kolla"),
  indic("ആത്മഹത്യ|മരിക്കണം|മരിക്കാൻ തോന്നുന്നു|ജീവിക്കാൻ വയ്യ|ജീവിക്കാൻ ആഗ്രഹമില്ല|ജീവിക്കാൻ താൽപര്യമില്ല|വിഷം കഴി|കുഞ്ഞിനെ കൊല്ല"),
  stem("aathmahathya|marikkanam|marikkan thonnunnu|jeevikkan vayya|jeevikkan agraham illa|visham kazhi|kunjine kolla"),
  indic("ଆତ୍ମହତ୍ୟା|ମରିଯିବାକୁ ଚାହୁଁ|ମରିବାକୁ ଚାହୁଁ|ବଞ୍ଚିବାକୁ ଇଚ୍ଛା ନାହିଁ|ବଞ୍ଚିବାକୁ ଚାହୁଁନାହିଁ|ବିଷ ଖା|ପିଲାକୁ ମାରି"),
  stem("maribaku chahun|marijibaku chahun|banchibaku ichha nahi|bisha kha|pilaku mari"),
  indic("ਖੁਦਕੁਸੀ|ਆਤਮ ਹੱਤਿਆ|ਆਤਮਹੱਤਿਆ|ਮਰਨਾ ਚਾਹੁੰਦੀ|ਮਰਨਾ ਚਾਹੁੰਦਾ|ਮਰ ਜਾਵਾਂ|ਜੀਣਾ ਨਹੀਂ ਚਾਹੁੰਦੀ|ਜੀਣਾ ਨਹੀਂ ਚਾਹੁੰਦਾ|ਜਹਿਰ ਖਾ|ਬੱਚੇ ਨੂੰ ਮਾਰ"),
  stem("khudkushi|marna chahundi|marna chahunda|mar jawan|jeena nahi chahundi|jeena nahi chahunda|bacche nu maar"),
  indic("ఆత్మహత్య|చనిపోవాలని|చచ్చిపోవాలని|చనిపోవాలి|బతకాలని లేదు|బ్రతకాలని లేదు|బతకాలని అనిపించడం లేదు|విషం తాగ|పిల్లను చంపు|బిడ్డను చంపు"),
  stem("chanipovalani|chachipovalani|batakalani ledu|bratakalani ledu|visham taag|biddanu champ"),
  indic("தற்கொலை|சாக வேண்டும்|சாகணும்|சாகவேண்டும்|சாகலாம்னு|வாழ பிடிக்கவில்லை|வாழ விருப்பம் இல்லை|விஷம் குடி|குழந்தையை கொல்ல"),
  stem(
    "tharkolai|sagaporen|saganum|saga vendum|vazha pidikkala|vazha viruppam illa|vizham kudi|visham kudi|kuzhandhaiyai kolla",
  ),
);

// --- Newborn not feeding or unable to suck: the single most important IMNCI sign. "doodh nahi
// aa raha" (the mother's milk is not coming) is NOT this: the verb has to be the baby's. ---
sign(
  "newborn_not_feeding",
  null,
  word(
    `${BABY}(?:'s)?(?: [a-z']+){0,3} (?:not|isn't|hasn't|doesn't|didn't|won't|refuses?|refusing|stopped|unable to|can't|cannot|couldn't|never|barely|hardly|nahi|nahin|nhi)(?: [a-z']+)? ${FEED}`,
  ),
  word(
    `(?:not|won't|doesn't|stopped|unable to|can't|cannot|not able to) (?:feed|feeding|suck|sucking|suckle|suckling|latch|latching|take (?:the )?(?:breast|milk|feed|feeds|bottle)|drink(?:ing)? (?:milk|breast ?milk))|(?:refuses|refusing|rejects|rejecting) (?:the )?(?:breast|milk|feed|feeding|bottle)|poor (?:feeding|suck(?:ing)?)|feeding poorly|weak suck|feeds? (?:has |have )?stopped`,
  ),
  word(
    `${BABY}(?:'s)?(?: [a-z']+){0,2} (?:is |was |has |did )?(?:not|never|hasn't|didn't|isn't|doesn't) (?:cry|crying|cried)|(?:weak|feeble|faint|high.?pitched) cry|cry (?:is |has become |became )?(?:very )?(?:weak|feeble|faint)|no cry|inconsolable`,
  ),
  indic(
    "दूध (?:नहीं|नही) (?:पी|पिय|चूस|ले)|चूस (?:नहीं|नही)|स्तनपान (?:नहीं|नही)|दूध पीना (?:बंद|छोड़|छोड)|दूध पी (?:नहीं|नही)|पी (?:नहीं|नही) (?:रहा|रही|पा)|कुछ (?:नहीं|नही) (?:पी|खा) (?:रहा|रही)|दूध उगल|रो (?:नहीं|नही) (?:रहा|रही)|कमजोर रोना|रोना (?:बंद|कमजोर)|दूध पित नाही|दूध पीत नाही|दूध ओढत नाही|दूध घेत नाही|चोखत नाही|दूध पिणे बंद",
  ),
  stem(
    "(?:doodh|dudh|dood|duudh|milk) (?:nahi|nahin|nhi|nai) (?:pee|pi|piya|pita|piti|pe|lete|leta|leti|chus|chusta|chusti|le)|(?:doodh|dudh|milk|dood) (?:peena|pina) (?:band|chhod|chod)|(?:pee|pi|chus|chuus) (?:nahi|nahin|nhi) (?:raha|rahi|pa)|chus (?:nahi|nahin|nhi)|stanpan (?:nahi|nahin)|breast (?:nahi|nahin|nhi) (?:le|pakad|pi)|(?:doodh|dudh|milk) (?:ugal|palat)|kuch (?:nahi|nahin|nhi) (?:pee|pi|kha) rah|feed (?:nahi|nahin|nhi) (?:le|kar|ho)|ro nahi rah|rona band|kamzor rona|rota nahi|dudh (?:pit|odhat|ghet|chokhat) nahi|dudh pine band",
  ),
  indic(
    "দুধ (?:খাচ্ছে না|খাচ্ছেনা|খায় না|খেতে চাইছে না|খেতে পারছে না|টানছে না|টানতে পারছে না)|বুকের দুধ (?:খাচ্ছে না|খায় না|টানছে না)|দুধ খাওয়া বন্ধ|মাই (?:খাচ্ছে না|টানছে না|ধরছে না)",
  ),
  stem(
    "dudh (?:khacch?h?e?|khay|khete par[a-z]*|tanch?h?e?|chuso?) ?na|mai (?:khacche|tanche|dhorche) na|dudh khawa bondho",
  ),
  indic("દૂધ (?:પીતું|પીતો|પીતી|ધાવતું|ધાવે|લેતું|લેતો|લેતી) નથી|ધાવતું નથી|ધાવતો નથી|દૂધ પીવાનું બંધ|ધાવણ (?:લેતું|લેતો) નથી"),
  stem("dudh (?:pitu|pito|piti|dhavtu|dhavto|letu|leto) nathi|dhavtu nathi|dhavto nathi|dudh pivanu bandh"),
  indic("ಹಾಲು (?:ಕುಡಿಯುತ್ತಿಲ್ಲ|ಕುಡೀತಿಲ್ಲ|ಕುಡಿಯುವುದಿಲ್ಲ|ಕುಡಿಯಲ್ಲ|ಕುಡಿಯೋದಿಲ್ಲ|ಹೀರುತ್ತಿಲ್ಲ|ಹೀರುವುದಿಲ್ಲ|ತೆಗೆದುಕೊಳ್ಳುತ್ತಿಲ್ಲ)|ಎದೆ ಹಾಲು ಕುಡಿಯುತ್ತಿಲ್ಲ"),
  stem("halu (?:kudiyuttilla|kudiyalla|kudiyodilla|kudithilla|hirtilla|hiruttilla|tegolluttilla)"),
  indic(
    "പാൽ (?:കുടിക്കുന്നില്ല|കുടിക്കില്ല|കുടിക്കാൻ കൂട്ടാക്കുന്നില്ല|വലിച്ചു കുടിക്കുന്നില്ല|വലിക്കുന്നില്ല|കുടിക്കാൻ പറ്റുന്നില്ല)|മുലപ്പാൽ കുടിക്കുന്നില്ല|പാൽ കുടിക്കുന്നത് നിർത്തി|മുല കുടിക്കുന്നില്ല",
  ),
  stem(
    "paal (?:kudikkunnilla|kudikkilla|valikkunnilla|kudikkan pattunnilla|kudikkan koottakkunnilla)|mulappal kudikkunnilla|mula kudikkunnilla",
  ),
  indic("(?:କ୍ଷୀର|ଦୁଧ|ଦୁଗ୍ଧ) ?(?:ପିଉ|ପିଉଛି|ଖାଉ|ଚୁଷୁ|ଚୁସୁ) ?ନାହିଁ|ଦୁଧ ପିଇବା ବନ୍ଦ|ସ୍ତନ ଧରୁ ?ନାହିଁ"),
  stem("dudha (?:piu|khau|chusu|piuchi|piuni)[a-z]* nahi|dudha piba bandha|dudha khauni|dudha piuni|stana dharu nahi"),
  indic("ਦੁੱਧ (?:ਨਹੀਂ|ਨਹੀ) (?:ਪੀ|ਚੁੰਘ|ਲੈ)|ਦੁੱਧ ਪੀਣਾ ਬੰਦ|ਚੁੰਘ ਨਹੀਂ"),
  stem("dudh nahi (?:pee|pi|chung|lai|painda|painde|pindi)|dudh pina band|chung nahi"),
  indic(
    "పాలు (?:తాగడం లేదు|తాగటం లేదు|తాగట్లేదు|తాగడంలేదు|తాగటంలేదు|తాగదు|తాగడు|పీల్చడం లేదు|పీల్చట్లేదు|పీల్చదు|పీల్చడు|పట్టడం లేదు|తీసుకోవడం లేదు|తీసుకోట్లేదు)|పాలు తాగడం మానేస|రొమ్ము (?:పట్టడం లేదు|పీల్చడం లేదు)",
  ),
  stem(
    "palu (?:tagatla|tagadam ledu|tagatam ledu|tagadu|tagadhu|pilchadam ledu|pilchatla|pattadam ledu|tiskovadam ledu)|palu tagatledu|palu tagadam manesindi",
  ),
  indic(
    "(?:தாய்ப்)?பால் (?:குடிக்கவில்லை|குடிக்கல|குடிக்க ?மாட்டேங்குது|குடிக்க ?மாட்டிங்கிது|குடிக்க மறுக்கிற|குடிப்பதில்லை|உறிஞ்சவில்லை|உறிஞ்ச முடியவில்லை|குடிக்க மாட்டேன்)|பால் குடிப்பதை நிறுத்தி",
  ),
  stem(
    "paal (?:kudikkala|kudikkavillai|kudikka mattenguthu|kudikka mattengudhu|kudikka maatenguthu|kudikka marukkuthu|kudippadhillai|urinjala|urinja mudiyala)|thaaipaal kudikkala",
  ),
);

// --- Newborn very sleepy, limp, floppy, will not wake, not responding ---
sign(
  "newborn_limp_sleepy",
  null,
  word(
    `(?:very|too|extremely|unusually|abnormally) (?:sleepy|drowsy|lethargic|floppy|limp|dull)|(?:lethargic|lethargy|limp|floppy|listless|lifeless|motionless)|${BABY}(?:'s)?(?: [a-z']+){0,2} (?:is |has gone |went |has become |became |looks? |seems? )?(?:limp|floppy|lethargic|drowsy|listless|lifeless|motionless|very weak|too weak|extremely weak)|${BABY}(?:'s)?(?: [a-z']+){0,2} (?:is |keeps? )?(?:sleeping|sleeps|sleepy)(?: [a-z']+){0,2} (?:all the time|too much|all day|too long|more than usual|a lot more|and (?:will not|won't|can't|cannot|not) wake)|body (?:is )?(?:limp|floppy)`,
  ),
  indic(
    "(?:बच्चा|बच्ची|बच्चे|शिशु|बेबी)(?: [^ ]+){0,2} (?:सुस्त|निढाल|ढीला|बेजान|लटक|नींद में)|(?:बच्चा|बच्ची|बच्चे|शिशु|बेबी)(?: [^ ]+){0,2} (?:बहुत|ज्यादा|हर वक्त|हर समय|दिन भर|सारा दिन) (?:सो|सुस्त)|(?:बच्चा|बच्ची|बच्चे|शिशु|बेबी)(?: [^ ]+){0,3} (?:उठ|जाग|आंख खोल)(?:ता|ती|ते)? ?(?:नहीं|नही)|शरीर ढीला|ढीला पड|सुस्त पड|बाळ(?: [^ ]+){0,2} (?:सुस्त|निपचित|लुळे|लुळं|मलूल|खूप झोपत|सतत झोपत|उठत नाही|जागं होत नाही|जागे होत नाही)|निपचित पडल|मलूल झाल",
  ),
  stem(
    `${BABY}(?: [a-z']+){0,2} (?:bahut|bohot|zyada|jyada|din bhar|har waqt|hamesha|sara din) (?:sota|soti|so raha|so rahi|sust)|${BABY}(?: [a-z']+){0,2} (?:sust|nidhal|dhila|dheela|bejaan|bejan|latak|nipchit|malul)|${BABY}(?: [a-z']+){0,3} (?:uth|jag|jaag|aankh khol)[a-z]* (?:nahi|nahin|nhi)|(?:uthta|uthti|jagta|jagti|jaagta|jaagti) nahi|sust pad|dhila pad|nipchit`,
  ),
  indic("নেতিয়ে|নিস্তেজ|ঝিমিয়ে|ঝিমুচ্ছে|জাগছে না|জাগানো যাচ্ছে না|সাড়া দিচ্ছে না|সাড়া নেই"),
  stem("netiye|nistej|jhimiye|jhimuche|jagche na|jagano jachhe na|shara dicche na"),
  indic("બાળક(?: [^ ]+){0,2} (?:સુસ્ત|ઢીલું|ઢીલો|ખૂબ ઊંઘે|સતત ઊંઘે|જાગતું નથી|જાગતો નથી)|જગાડી શકાતું નથી|ઢીલું પડી ગ"),
  stem("(?:baalak|balak)(?: [a-z]+){0,2} (?:sust|dhilu|jagtu nathi|jagto nathi)|dhilu padi"),
  indic("ಮಗು(?: [^ ]+){0,2} (?:ತುಂಬಾ ನಿದ್ದೆ|ಸುಸ್ತು|ಜೋಲು|ನಿಸ್ತೇಜ|ಏಳುತ್ತಿಲ್ಲ|ಎಚ್ಚರವಾಗುತ್ತಿಲ್ಲ)|ಎಬ್ಬಿಸಿದರೂ ಏಳ|ಎಬ್ಬಿಸಲು ಆಗುತ್ತಿಲ್ಲ"),
  stem("magu(?: [a-z]+){0,2} (?:tumba nidde|sustu|jolu|nistheja|elutilla|echcharavagutilla)|ebbisidaru ela"),
  indic("കുഞ്ഞ്(?: [^ ]+){0,2} (?:ക്ഷീണം|തളർന്ന|ഉറക്കം കൂടുതൽ|എപ്പോഴും ഉറങ്ങ|ഉണരുന്നില്ല|അനങ്ങാതെ)|വിളിച്ചാൽ ഉണരു|ഉണർത്താൻ പറ്റുന്നില്ല"),
  stem(
    "kunju(?: [a-z]+){0,2} (?:ksheenam|thalarnn|eppozhum urang|unarunnilla)|vilichal unarunnilla|unartan pattunnilla",
  ),
  indic("ପିଲା(?: [^ ]+){0,2} (?:ଅଳସୁଆ|ନିସ୍ତେଜ|ଢିଲା|ଅଧିକ ଶୁଏ|ଉଠୁ ନାହିଁ|ଉଠୁନାହିଁ|ଜାଗୁ ନାହିଁ)|ନିସ୍ତେଜ"),
  stem("pila(?: [a-z]+){0,2} (?:nistej|dhila|adhika shue|uthu nahi|jagu nahi)"),
  indic("ਬੱਚਾ(?: [^ ]+){0,2} (?:ਸੁਸਤ|ਢਿੱਲਾ|ਬਹੁਤ ਸੌਂ|ਉੱਠ ਨਹੀਂ|ਜਾਗ ਨਹੀਂ|ਨਿਢਾਲ)|ਸੁਸਤ ਪੈ|ਢਿੱਲਾ ਪੈ"),
  stem("(?:bacha|baccha|bachha)(?: [a-z]+){0,2} (?:sust|dhilla|nidhal|bahut sonda|uth nahi|jaag nahi)"),
  indic(
    "(?:బిడ్డ|పాప|బాబు|పిల్లవాడు|పసిబిడ్డ)(?: [^ ]+){0,2} (?:నీరసం|నీరసంగా|మత్తుగా|కదలకుండా|చాలా నిద్ర|లేవడం లేదు|లేవట్లేదు|స్పందించడం లేదు)|స్పందించడం లేదు|స్పందన లేదు",
  ),
  stem(
    "(?:bidda|babu|pilla)(?: [a-z]+){0,2} (?:neerasam|neerasanga|mattuga|kadalakunda|chala nidra|levadam ledu|spandinchadam ledu)|spandana ledu",
  ),
  indic(
    "(?:குழந்தை|பாப்பா)(?: [^ ]+){0,2} (?:சோர்வாக|சோர்ந்து|அசையாமல்|மயக்கமாக|தூங்கிக்கொண்டே இருக்கிறது|எழும்பவில்லை|எழுந்திருக்கவில்லை|விழிக்கவில்லை|துவண்டு)|துவண்டு",
  ),
  stem(
    "(?:kuzhandhai|kulandhai|kuzhanthai)(?: [a-z]+){0,2} (?:sorvaga|sornthu|asaiyamal|mayakkama|thoongikitte|ezhumbala|ezhundhirikkala|vizhikkala|thuvandu)",
  ),
);

// --- Blue or grey lips, tongue, face, skin; or very pale. A bare colour word ("blue van") never
// matches: it needs a body part or a turn of colour on a person. ---
sign(
  "blue_or_pale",
  null,
  word(
    "(?:turning|turned|gone|going|became|become) (?:blue|bluish|purple|dusky|grey|gray)|cyano[a-z]*|blue baby|(?:blue|bluish|purple|purplish|grey|gray|dusky)(?: and (?:cold|pale))? (?:lips?|tongue|face|skin|body|fingers|nails|hands|feet|around (?:the |her |his )?mouth)|(?:lips?|tongue|face|skin|body|fingers|nails|hands|feet) (?:is |are |has |have |turned |turning |going |gone |became |become |look(?:s|ed)? )?(?:blue|bluish|purple|dusky|grey|gray)|(?:baby|she|he|newborn|mother|child) (?:looks?|looked|is|was) (?:blue|bluish|dusky)",
  ),
  word(
    "(?:very|extremely|totally|completely|so) pale|(?:turned|turning|going|gone|became) pale|white as (?:a )?(?:sheet|paper|chalk)|pale and (?:cold|weak|sweaty|clammy)|looks? pale and",
  ),
  indic(
    "होंठ(?: [^ ]+)? (?:नीले|नीला|नीली|काले|बैंगनी)|नीले होंठ|नीला पड|नीली पड|नीले पड|नीला हो गया|नीली हो गई|नीले हो गए|शरीर (?:का रंग )?नीला|जीभ (?:नीली|नीला)|उंगलियां नीली|चेहरा (?:सफेद|पीला)|सफेद पड|ओठ(?: [^ ]+)? (?:निळे|निळा|निळी|काळे)|निळे पड|निळा पड|निळी पड|निळसर|शरीर निळ|जीभ निळ|फिकट पड|पांढरे फटक",
  ),
  stem(
    "(?:honth|hont|lips?|jeebh|jibh|jeeb|badan|body|sharir|shareer|chehra|nakhun|ungli|anguli)(?: [a-z]+){0,2} (?:neela|neele|neeli|nila|nile|nili|blue|kaala|kaale|jamuni|baingani)|(?:neela|neele|neeli|nila) (?:pad|ho)|blue (?:ho|pad)|chehra (?:safed|peela|pila)|safed pad|oth(?: [a-z]+)? (?:nile|nila|nili|kale)|fikat pad|pandhare fatak|nilasar",
  ),
  indic("ঠোঁট(?: [^ ]+)? (?:নীল|কালো)|নীল হয়ে|গা নীল|শরীর নীল|জিভ নীল|আঙুল নীল|মুখ নীল|ফ্যাকাশে"),
  stem("thot (?:nil|neel)|(?:nil|neel) hoye|ga (?:nil|neel)|shorir (?:nil|neel)|mukh (?:nil|neel)|fyakashe|fakashe"),
  indic(
    "હોઠ(?: [^ ]+)? (?:ભૂરા|ભૂરો|વાદળી|નીલા|કાળા|ભૂરી)|(?:ભૂરું|ભૂરો|ભૂરા|વાદળી|નીલો|નીલું) (?:પડી|થઈ|પડ)|શરીર (?:ભૂરું|વાદળી)|જીભ (?:ભૂરી|વાદળી)|ફિક્કો પડી|ફિક્કી પડી",
  ),
  stem("hoth (?:bhura|bhuro|vadali|nila|kala)|(?:bhuru|bhuro|bhura|vadali) pad|fikk[oui] pad"),
  indic("ತುಟಿ(?: [^ ]+)? (?:ನೀಲಿ|ನೀಲ|ಕಪ್ಪ)|ನೀಲಿಯಾಗ|ನೀಲಿಗಟ್ಟ|ನೀಲಿ ಆಗ|ದೇಹ ನೀಲಿ|ನಾಲಿಗೆ ನೀಲಿ|ಬಿಳಿಚಿ"),
  stem("tuti(?: [a-z]+)? (?:neeli|neela|kappu)|neeliyag|neeligatt|neeli aag|deha neeli|bilichi"),
  indic("ചുണ്ട്(?: [^ ]+)? (?:നീല|നീലിച്ച)|നീലിച്ച|ശരീരം നീല|നാവ് നീല|വിളറി"),
  stem("chundu(?: [a-z]+)? (?:neela|neelich)|neelich|sareeram neela|naavu neela|vilari"),
  indic("ଓଠ(?: [^ ]+)? (?:ନୀଳ|ନୀଳା|କଳା)|ନୀଳ ପଡ|ନୀଳ ହୋଇ|ଦେହ ନୀଳ|ଜିଭ ନୀଳ|ଫିକା ପଡ"),
  stem("otha(?: [a-z]+)? (?:nila|nili|kala)|nila padi|nila hoi|deha nila|jibha nila|phika padi"),
  indic("ਬੁੱਲ੍ਹ(?: [^ ]+)? (?:ਨੀਲੇ|ਨੀਲਾ|ਨੀਲੀ|ਕਾਲੇ)|ਨੀਲਾ ਪੈ|ਨੀਲੇ ਪੈ|ਨੀਲਾ ਹੋ|ਸਰੀਰ ਨੀਲਾ|ਜੀਭ ਨੀਲੀ|ਫਿੱਕਾ ਪੈ"),
  stem(
    "bull(?:h|han)?(?: [a-z]+)? (?:neele|neela|neeli|kale)|neela pai|neele pai|neela ho|sareer neela|jibh neeli|fikka pai",
  ),
  indic("పెదవులు(?: [^ ]+)? (?:నీలం|నీలి|నల్ల)|నీలంగా|నీలిరంగులోకి|నీలం రంగులోకి|ఒళ్ళు నీలం|ఒళ్లు నీలం|నాలుక నీలం|పాలిపోయ|తెల్లబడ"),
  stem(
    "pedavulu(?: [a-z]+)? (?:neelam|neeli|nalla)|neelanga|neelam rangu|olluu? neelam|naluka neelam|palipoy|tellabad",
  ),
  indic("உதடு(?: [^ ]+)? (?:நீல|கருப்பு)|நீல நிற|நீலமாக|நீலம் பாரி|உடம்பு நீல|உடல் நீல|நாக்கு நீல|வெளுத்து|வெளிறி"),
  stem(
    "udhadu(?: [a-z]+)? (?:neela|karuppu)|neela ?niram|neelamaga|neelam pari|udambu neela|naakku neela|veluthu|velluthu|velari",
  ),
);

// --- Newborn yellow on palms and soles, from birth, or very deep yellow. Ordinary "baby looks a
// bit yellow" is left to the model: it is common and usually harmless after day 3. ---
sign(
  "newborn_jaundice",
  null,
  word(
    "(?:yellow|yellowish|jaundiced?) (?:palms|soles|hands|feet)|(?:palms|soles)(?: and (?:palms|soles|feet|eyes))? (?:are |is |have turned |turned )?(?:yellow|yellowish)|(?:very|deep|bright|dark|intense|extremely) (?:yellow|jaundice)|(?:yellow|jaundice[d]?) (?:on|in|within|from|since|at) (?:the )?(?:first|1st|day 1|day one|birth|24 hours|a day|one day|few hours|hours)|(?:yellow|jaundice[d]?) (?:right )?(?:after|since) birth|born yellow|yellow (?:from|since) (?:the )?(?:day )?(?:birth|born)",
  ),
  indic(
    "हथेली(?:यां| और तलवे| और पैर)?(?: [^ ]+)? पीली|तलवे पीले|हथेलियां और तलवे|जन्म से (?:ही )?पीला|पहले दिन (?:से )?(?:ही )?पीला|बहुत पीला|गहरा पीला|पीलिया (?:बहुत|ज्यादा)|तळहात पिवळ|तळपाय पिवळ|जन्मापासून पिवळ",
  ),
  stem(
    "hatheli(?:yan| aur talve| aur talwe)?(?: [a-z]+){0,2} (?:peeli|pili|pila|peela)|talve (?:peele|pile)|talwe (?:peele|pile)|janm se (?:hi )?(?:peela|pila)|pehle din (?:se )?(?:hi )?(?:peela|pila)|bahut (?:peela|pila|peeliya|piliya)|peeliya bahut",
  ),
  indic("হাতের তালু(?: ও পায়ের তলা)? হলুদ|পায়ের তলা হলুদ|জন্ম থেকে হলুদ"),
  indic("હથેળી પીળી|તળિયા પીળા|જન્મથી પીળ"),
  indic("ಅಂಗೈ ಹಳದಿ|ಅಂಗಾಲು ಹಳದಿ|ಹುಟ್ಟಿದಾಗಿನಿಂದ ಹಳದಿ"),
  indic("ഉള്ളംകൈ മഞ്ഞ|കാൽപ്പാദം മഞ്ഞ|ജനിച്ച ഉടനെ മഞ്ഞ"),
  indic("ହାତର ପାପୁଲି ହଳଦିଆ|ପାଦତଳ ହଳଦିଆ|ଜନ୍ମରୁ ହଳଦିଆ"),
  indic("ਤਲੀਆਂ ਪੀਲੀਆਂ|ਤਲੇ ਪੀਲੇ|ਜਨਮ ਤੋਂ ਪੀਲਾ"),
  indic("అరచేతులు పసుపు|అరికాళ్ళు పసుపు|అరికాళ్లు పసుపు|పుట్టగానే పచ్చ"),
  indic("உள்ளங்கை(?:யும்)? மஞ்சள்|உள்ளங்கால் மஞ்சள்|மஞ்சள் காமாலை (?:அதிக|பிறந்த)"),
);

// --- Newborn cord or wound infection: red, swollen, pus, smell; skin pustules; infected stitches ---
sign(
  "infection_pus",
  null,
  word(
    "(?:cord|navel|umbilical|umbilicus|stump|belly button)(?: [a-z]+){0,3} (?:red|swollen|pus|oozing|discharg[a-z]*|smell[a-z]*|foul|infected|infection|bleeding|puffy)|(?:red|swollen|infected|pus|oozing|smelly|foul)(?: [a-z]+){0,2} (?:cord|navel|umbilical|belly button)|pus (?:from|in|around|at|coming) (?:the )?(?:cord|navel|umbilical|stitch(?:es)?|wound|cut|eyes?|skin)|pus.?filled|pustules?|boils? (?:with|full of) pus|(?:wound|stitch(?:es)?|cut|c.?section|episiotomy) (?:is |are |has |have )?(?:infected|red|swollen|oozing|pus|smelly|foul|opened|open|burst|bleeding)|(?:red|swollen) (?:wound|stitch(?:es)?)",
  ),
  indic(
    "नाल(?:ी)? (?:लाल|सूज|पस|पीप|से पस|से बदबू|पक|से खून)|नाभि (?:लाल|सूज|पक|से पस|से पानी|से बदबू|से खून)|नाभी (?:लाल|सूज|पक)|टांके (?:पक|लाल|सूज|खुल|से पस)|घाव (?:पक|लाल|से पस|से बदबू|सूज)|पस आ|पीप|मवाद",
  ),
  stem(
    "naal (?:laal|lal|sooj|suj|pak|se pus|se badbu)|nabhi (?:laal|lal|sooj|suj|pak|se pus|se pani|se khoon)|ta(?:a)?nke (?:pak|laal|lal|khul|se pus)|ghaa?v (?:pak|lal|laal|se pus|suj)|pus (?:aa|nikal)|peep|mawad|mavad",
  ),
);

// --- Vomiting everything, severe or bloody diarrhoea, signs of dehydration. "vomiting" or
// "loose motions" alone are everyday (morning sickness); they need "everything", "again and
// again", blood, or dehydration. ---
sign(
  "vomiting_diarrhoea",
  null,
  word(
    "(?:vomit(?:s|ing|ed)?|throw(?:s|ing)? up|puk(?:es|ing|ed)) (?:everything|all|each time|every time|after every|after each|repeatedly|again and again|continuously|non.?stop|green|yellow.?green|bile|blood)|vomiting (?:a lot|constantly|all the time)|can'?t (?:keep|hold) (?:anything|milk|food|water|fluids?) down|brings? up (?:everything|all)|green vomit|bilious",
  ),
  word(
    "(?:diarrh?o?ea|loose (?:motions?|stools?)|watery (?:motions?|stools?)|dast)(?: [a-z]+){0,2} (?:with blood|and blood|and vomiting|again and again|many times|all the time|non.?stop|continuous(?:ly)?|since (?:yesterday|morning|last night|2|two|3|three) days?|severe)|(?:severe|bloody|continuous|too many) (?:diarrh?o?ea|loose (?:motions?|stools?)|dast)|sunken eyes|(?:baby|she|he|child|newborn) (?:is |looks |seems |was )?(?:badly |severely )?dehydrated|signs of dehydration|not passing urine|hasn'?t (?:passed|peed)|no (?:urine|wet nappies|wet diapers?)",
  ),
  indic(
    "बार[ -]?बार उल्टी|उल्टी बार[ -]?बार|हर बार (?:कुछ )?(?:खाने|पीने|दूध) (?:के बाद )?उल्टी|जो भी (?:खाता|पीता|खाती|पीती)(?: है)? (?:उल्टी|निकाल)|सब (?:कुछ )?उल्टी|उल्टी (?:रुक|बंद) नहीं|हरी उल्टी|हरे रंग की उल्टी|पीली उल्टी|दस्त (?:बहुत|खूनी|में खून|रुक नहीं|बंद नहीं|पानी जैसे|बार[ -]?बार)|खूनी दस्त|खून वाले दस्त|बहुत दस्त|पेशाब नहीं (?:आ|कर)|पेशाब नहीं किया|आंखें (?:अंदर )?धंस",
  ),
  stem(
    "(?:baar|bar)[ -]?(?:baar|bar) (?:ulti|ulti)|ulti (?:ruk|band) nahi|jo bhi (?:khata|pita|khati|piti)(?: hai)? ulti|sab (?:kuch )?ulti|har baar (?:doodh|dudh|khane|kuch)? ?ulti|hari ulti|khooni ulti|dast (?:bahut|khooni|ruk nahi|band nahi|bar bar|baar baar)|khooni dast|khoon wale dast|bahut dast|(?:pesab|peshab|susu) nahi (?:kiya|aa|kar|hua)|aankhen (?:andar )?dhans",
  ),
);

// --- Bulging (or sunken) soft spot on a baby's head ---
sign(
  "fontanelle",
  null,
  word(
    "(?:soft spot|fontanel(?:le)?)(?: [a-z]+){0,2} (?:bulging|swollen|raised|puffed|protruding|sticking out|swelling|sunken|sunk|dipped|depressed|going in)|(?:bulging|swollen|raised|sunken) (?:soft spot|fontanel(?:le)?)",
  ),
  indic("तालू (?:उभर|फूल|धंस|उठा|ऊपर)|तालु (?:उभर|फूल|धंस)|मुलायम जगह (?:उभर|फूल|धंस)"),
  stem("taalu (?:ubhar|phool|fool|dhans)|talu (?:ubhar|phool|dhans)"),
);

// Is this hit directly negated in English? See "Negation" above.
const isNegated = (guard, text, start, end) => {
  if (!guard) return false;
  if (NEG_BEFORE.test(text.slice(Math.max(0, start - 40), start))) return true;
  return guard === "both" && STOPPED_AFTER.test(text.slice(end, end + 40));
};

/** The first danger sign found in the text, as a short id such as "bleeding", or null. */
export const findEmergencySign = (text) => {
  const norm = normalise(text);
  if (!norm) return null;
  for (const { name, guard, patterns } of SIGNS) {
    for (const re of patterns) {
      for (const m of norm.matchAll(re)) {
        if (!isNegated(guard, norm, m.index, m.index + m[0].length)) return name;
      }
    }
  }
  return null;
};

export const looksLikeEmergency = (text) => findEmergencySign(text) !== null;

const PATIENT_LABEL = {
  [PatientType.MATERNAL]: "the mother",
  [PatientType.CHILD]: "a newborn baby (the family is asking for the baby)",
  [PatientType.DYAD]: "a mother and her newborn baby",
};

const OPEN_FOLLOW_UP = new Set([
  FollowUpStatus.PLANNED,
  FollowUpStatus.SCHEDULED,
  FollowUpStatus.DUE,
  FollowUpStatus.MISSED,
  FollowUpStatus.ESCALATED,
]);

export const BRING_LIST = [
  "Photo ID (Aadhaar, Voter ID or Passport)",
  "Health card (Ayushman Bharat or ABHA), if you have one",
  "Mother and baby (MCP) card, and any medicines",
  "Slippers and a phone charger",
];

/**
 * What the assistant may know about this case: what the patient screens already show.
 * No names, addresses, family phone numbers, diagnosis, vitals or clinical notes.
 */
export const buildCaseBrief = (referral, facilities = []) => {
  const j = getPatientJourney(referral, facilities);
  const facility = facilities.find((f) => f.name === j.hospital);
  const openBarrier = (referral.barriers || []).find((b) => b.status !== BarrierStatus.RESOLVED);
  const nextVisits = (referral.followUpPlan?.tasks || [])
    .filter((t) => OPEN_FOLLOW_UP.has(t.status))
    .slice(0, 2)
    .map((t) => ({ visit: t.title, due: t.dueDate, status: t.status.toLowerCase() }));

  return {
    caseId: referral.id,
    patient: PATIENT_LABEL[referral.referralType] || PATIENT_LABEL[PatientType.MATERNAL],
    journey: j.steps.map((s) => ({ step: s.label, done: s.done })),
    nextStep: j.nextStep.next,
    hospital: j.hospital
      ? {
          name: j.hospital,
          phone: j.hospitalPhone || null,
          distanceKm: facility?.distanceKm ?? null,
          area: facility?.location?.split("•")[0].trim() || null,
        }
      : null,
    mustChooseHospital: j.floating,
    ride: {
      summary: j.rideSummary,
      eta: j.showEta ? j.tr.eta : null,
      vehicle: j.tr?.vehicle?.split(" (")[0] || null,
      driverAssigned: Boolean(j.tr?.driver),
      free: Boolean(j.tr),
      problem: j.isRideFailed ? "The ride failed. The care navigator is arranging another one." : null,
    },
    careNavigator: j.nav ? { name: j.nav.name?.split(",")[0], phone: j.nav.phone || null } : null,
    interpreterRequested: Boolean(referral.interpreterNeeded),
    openProblem: openBarrier ? openBarrier.category.toLowerCase() : null,
    nextFollowUpVisits: nextVisits,
    bring: BRING_LIST,
    emergencyNumber: EMERGENCY_NUMBER,
  };
};

export const SUGGESTED_QUESTIONS = [
  "What happens next?",
  "Where is my ride?",
  "What should I bring?",
  "Who can I call for help?",
  "Something is stopping me from going",
];

// The warning every patient screen shows, read aloud on every screen too.
export const EMERGENCY_LINE = `Severe bleeding, vision changes, intense constant pain, or reduced baby movement? Do not wait. Call ${EMERGENCY_NUMBER} now.`;

// Most hospitals a Listen reads out by name: enough to choose from, short enough to follow.
const SPOKEN_OPTIONS = 3;

/** What a family who must choose a hospital hears: who can take them, how far, and who chooses. */
const hospitalChoiceLine = (referral, facilities) => {
  const options = getHospitalOptions(referral, facilities).slice(0, SPOKEN_OPTIONS);
  if (options.length === 0)
    return "The hospital could not take you. You choose where to go next. Call your care navigator to hear your options.";
  const named = options
    .map((h) => (typeof h.distanceKm === "number" ? `${h.name}, ${h.distanceKm} kilometres away` : h.name))
    .join("; ");
  return `The first hospital could not take you. You choose where to go next. Hospitals with a bed for you: ${named}. Tap Choose this hospital under the one you want.`;
};

/** Text the Listen button reads for a patient screen. Always ends with what to do in an emergency. */
export const getScreenSummary = (view, referral, facilities = []) => {
  const j = getPatientJourney(referral, facilities);
  const eta = j.showEta ? ` It arrives in ${j.tr.eta}.` : "";
  const emergency =
    j.floating && referral.priority === UrgencyLevel.STAT
      ? `This is an emergency. Call ${EMERGENCY_NUMBER} now, and choose a hospital after.`
      : EMERGENCY_LINE;
  const choice = j.floating ? ` ${hospitalChoiceLine(referral, facilities)}` : "";
  let body;
  switch (view) {
    case "transit":
      body = `${j.rideSummary}.${eta} Going to ${j.hospital || "a hospital you have not chosen yet"}.${j.tr ? " This ride is free." : ""}${choice}`;
      break;
    case "checklist":
      body = `Please bring: ${BRING_LIST.join(". ")}. At the hospital, give case ID ${referral.id} at the reception desk.`;
      break;
    case "support":
      body = `${j.nav ? `Your care navigator is ${j.nav.name.split(",")[0]}. They help with rides, childcare and language.` : ""} Your hospital is ${j.hospital || "not chosen yet"}.${choice}`;
      break;
    default:
      body = `${j.floating ? hospitalChoiceLine(referral, facilities) : `${j.rideSummary}.${eta}`} Next: ${j.nextStep.next}`;
  }
  return `${emergency} ${body.trim()}`;
};
