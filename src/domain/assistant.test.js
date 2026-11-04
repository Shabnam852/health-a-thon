import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { initialFacilities, initialSeedReferrals } from "../data/seedData.js";
import {
  AUTO_LANGUAGE,
  buildCaseBrief,
  findEmergencySign,
  getScreenSummary,
  isSpokenLanguage,
  looksLikeEmergency,
  profileLanguageCode,
  resolveReplyLanguage,
} from "./assistant.js";

describe("profileLanguageCode", () => {
  it("takes the first language on the record", () => {
    assert.equal(profileLanguageCode("Telugu / English"), "te-IN");
    assert.equal(profileLanguageCode("Hindi / English"), "hi-IN");
    assert.equal(profileLanguageCode("Tamil"), "ta-IN");
  });

  it("speaks Hindi for languages Sarvam can't voice", () => {
    assert.equal(profileLanguageCode("Urdu"), "hi-IN");
    assert.equal(profileLanguageCode("Bhojpuri"), "hi-IN");
  });

  it("falls back to English for an empty or unknown record", () => {
    assert.equal(profileLanguageCode(""), "en-IN");
    assert.equal(profileLanguageCode(undefined), "en-IN");
    assert.equal(profileLanguageCode("Klingon"), "en-IN");
  });
});

describe("resolveReplyLanguage", () => {
  it("keeps the language the patient chose, whatever was spoken", () => {
    assert.equal(resolveReplyLanguage({ preference: "ta-IN", detected: "hi-IN", profileLanguage: "Telugu" }), "ta-IN");
  });

  it("follows the spoken language on auto", () => {
    assert.equal(
      resolveReplyLanguage({ preference: AUTO_LANGUAGE, detected: "kn-IN", profileLanguage: "Tamil" }),
      "kn-IN",
    );
  });

  it("answers heard Urdu in Hindi", () => {
    assert.equal(
      resolveReplyLanguage({ preference: AUTO_LANGUAGE, detected: "ur-IN", profileLanguage: "English" }),
      "hi-IN",
    );
  });

  it("uses the record when nothing usable was detected", () => {
    assert.equal(
      resolveReplyLanguage({ preference: AUTO_LANGUAGE, detected: "as-IN", profileLanguage: "Tamil" }),
      "ta-IN",
    );
    assert.equal(resolveReplyLanguage({ preference: "xx-XX", detected: null, profileLanguage: "Tamil" }), "ta-IN");
  });

  it("only offers languages Sarvam can speak", () => {
    assert.equal(isSpokenLanguage("od-IN"), true);
    assert.equal(isSpokenLanguage("ur-IN"), false);
  });
});

describe("looksLikeEmergency: danger signs", () => {
  // sign -> texts that must raise it. Native script and romanised, plain family phrasing,
  // and code-mixed sentences. Spellings are checked for shape, not by a native speaker.
  const DANGER = {
    bleeding: [
      "There is a lot of bleeding",
      "she is bleeding heavily",
      "the bleeding won't stop",
      "bleeding after delivery and it is not stopping",
      "I am bleeding",
      "she has soaked three pads in one hour",
      "my pad is full of blood already",
      "passing big clots of blood",
      "vaginal bleeding since morning",
      "blood is coming from the baby's nose",
      "the cord is bleeding",
      "she is vomiting blood",
      "postpartum haemorrhage",
      "बहुत खून आ रहा है",
      "खून बह रहा है",
      "ख़ून निकल रहा है",
      "पैड भीग गया",
      "खून के थक्के आ रहे हैं",
      "bahut khoon aa raha hai",
      "didi ko bahut zyada khoon ja raha hai",
      "khoon ruk nahi raha",
      "bleeding ho rahi hai bahut",
      "অনেক রক্ত পড়ছে",
      "রক্তপাত হচ্ছে",
      "onek rokto porche",
      "ઘણું લોહી નીકળે છે",
      "ghanu lohi nikle chhe",
      "ತುಂಬಾ ರಕ್ತ ಹೋಗುತ್ತಿದೆ",
      "tumba rakta hogta ide",
      "ഒരുപാട് ചോര പോകുന്നു",
      "orupadu chora pokunnu",
      "खूप रक्तस्त्राव होतोय",
      "khup rakta jatay",
      "ବହୁତ ରକ୍ତ ବାହାରୁଛି",
      "bahut rakta bahar hauchi",
      "ਬਹੁਤ ਖੂਨ ਵਗ ਰਿਹਾ ਹੈ",
      "bahut khoon vag reha hai",
      "చాలా రక్తం పోతోంది",
      "chala raktham vastondi",
      "அதிக ரத்தம் போகிறது",
      "romba ratham varuthu",
    ],
    seizure: [
      "she had a fit",
      "she is having fits",
      "the baby is having a seizure",
      "convulsions started",
      "fits started again",
      "her whole body is shaking and she is foaming at the mouth",
      "baby went stiff and his eyes rolled back",
      "eclampsia",
      "उसे दौरा पड़ गया",
      "मिर्गी का दौरा",
      "बच्चे के हाथ पैर अकड़ गए",
      "muh se jhag aa raha hai",
      "fit aa gaya baby ko",
      "daura pad gaya",
      "খিঁচুনি হচ্ছে",
      "khichuni hocche",
      "આંચકી આવે છે",
      "ફીટ આવી",
      "ಫಿಟ್ಸ್ ಬಂದಿದೆ",
      "ഫിറ്റ്സ് വന്നു",
      "അപസ്മാരം",
      "फिट्स येत आहेत",
      "आकडी आली",
      "ଫିଟ୍ସ ହେଉଛି",
      "ਦੌਰਾ ਪੈ ਗਿਆ",
      "ఫిట్స్ వచ్చాయి",
      "வலிப்பு வந்தது",
      "valippu vandhuchu",
    ],
    unconscious: [
      "she is unconscious",
      "she fainted",
      "he passed out in the van",
      "baby won't wake up",
      "she is not waking",
      "the baby is unresponsive",
      "she collapsed",
      "she has lost consciousness",
      "wo behosh ho gayi",
      "बेहोश हो गई है",
      "होश नहीं है",
      "बच्चा उठ नहीं रहा",
      "behosh ho gayi didi",
      "অজ্ঞান হয়ে গেছে",
      "ogyan hoye geche",
      "બેભાન થઈ ગઈ",
      "ಪ್ರಜ್ಞೆ ತಪ್ಪಿದೆ",
      "ബോധം പോയി",
      "बेशुद्ध पडली आहे",
      "ଅଚେତ ହୋଇଗଲା",
      "ਬੇਹੋਸ਼ ਹੋ ਗਈ",
      "స్పృహ తప్పింది",
      "மயங்கி விழுந்துட்டாங்க",
      "mayangi vizhundhutaanga",
    ],
    breathing: [
      "my baby is not breathing properly",
      "she can't breathe",
      "the baby stopped breathing",
      "difficulty breathing",
      "baby is breathing very fast",
      "the baby's chest is pulling in",
      "baby is grunting",
      "she is very breathless",
      "suddenly short of breath",
      "सांस नहीं ले पा रही",
      "साँस लेने में तकलीफ़ है",
      "सांस फूल रही है",
      "बच्चा तेज तेज सांस ले रहा है",
      "saans nahi aa rahi",
      "sans lene mein dikkat hai",
      "bachche ki saans tez chal rahi hai",
      "শ্বাসকষ্ট হচ্ছে",
      "shash nite kosto hocche",
      "શ્વાસ લેવામાં તકલીફ છે",
      "ಉಸಿರಾಟದ ತೊಂದರೆ",
      "ശ്വാസം മുട്ടുന്നു",
      "श्वास घेता येत नाही",
      "dam lagtoy",
      "ଶ୍ୱାସକଷ୍ଟ ହେଉଛି",
      "ਸਾਹ ਨਹੀਂ ਆ ਰਿਹਾ",
      "ఊపిరి ఆడటం లేదు",
      "மூச்சு விட முடியவில்லை",
      "moochu vida mudiyala",
    ],
    chest_pain: [
      "she has chest pain",
      "heart attack",
      "सीने में दर्द है",
      "seene mein dard ho raha hai",
      "বুকে ব্যথা",
      "છાતીમાં દુખાવો",
      "ಎದೆ ನೋವು",
      "നെഞ്ചുവേദന",
      "ఛాతీ నొప్పి",
      "நெஞ்சு வலி",
    ],
    headache_vision: [
      "severe headache and blurred vision",
      "she sees spots in front of her eyes",
      "headache that won't go away",
      "vision is blurry",
      "बहुत तेज सिरदर्द",
      "आंखों के आगे अंधेरा छा गया",
      "dhundhla dikh raha hai",
      "খুব মাথা ব্যথা",
      "ઝાંખું દેખાય છે",
      "ತುಂಬಾ ತಲೆನೋವು",
      "చాలా తలనొప్పి",
      "கடுமையான தலைவலி",
    ],
    fever: [
      "very high fever",
      "she has high fever with chills",
      "fever 103",
      "baby feels cold to the touch",
      "the baby's body is burning hot",
      "तेज बुखार है",
      "tez bukhar hai",
      "बच्चे का शरीर ठंडा पड़ गया",
      "bachche ka badan bahut garam hai",
      "খুব জ্বর",
      "ખૂબ તાવ છે",
      "ತುಂಬಾ ಜ್ವರ",
      "ਬਹੁਤ ਬੁਖਾਰ ਹੈ",
    ],
    belly_or_labour_pain: [
      "severe pain in my stomach",
      "unbearable abdominal pain",
      "the belly is rock hard",
      "labour pains have started",
      "contractions every 5 minutes",
      "labour started too early",
      "पेट में बहुत तेज दर्द है",
      "दर्द बर्दाश्त नहीं हो रहा",
      "समय से पहले दर्द शुरू हो गया",
      "labour pain shuru ho gaya",
      "bahut dard ho raha hai",
      "প্রসব বেদনা শুরু হয়েছে",
      "ಹೆರಿಗೆ ನೋವು ಶುರುವಾಗಿದೆ",
      "പ്രസവ വേദന തുടങ്ങി",
      "பிரசவ வலி வந்துடுச்சு",
    ],
    waters_or_discharge: [
      "her water broke",
      "my waters have broken early",
      "fluid is leaking from the vagina",
      "foul smelling discharge",
      "green discharge",
      "पानी की थैली फट गई",
      "पानी फट गया",
      "pani phat gaya",
      "জল ভেঙে গেছে",
      "પાણીની થેલી ફાટી ગઈ",
      "ನೀರು ಒಡೆದಿದೆ",
      "വെള്ളം പൊട്ടി",
      "पाणी फुटले",
      "ଦୁର୍ଗନ୍ଧ ସ୍ରାବ",
      "ਪਾਣੀ ਫਟ ਗਿਆ",
      "ఉమ్మనీరు పోతోంది",
      "பனிக்குடம் உடைந்தது",
    ],
    face_hand_swelling: [
      "her face and hands are swollen",
      "sudden swelling of the face",
      "puffy eyes and face since morning",
      "चेहरे पर सूजन आ गई है",
      "haath aur chehra sooj gaya hai",
      "মুখ ফুলে গেছে",
      "ચહેરા પર સોજો",
      "ಮುಖ ಊತ",
      "മുഖത്ത് നീര്",
      "चेहऱ्यावर सूज आली",
      "ମୁହଁ ଫୁଲି ଗଲା",
      "ਚਿਹਰੇ ਤੇ ਸੋਜ",
      "ముఖం ఉబ్బింది",
      "முகம் வீங்கி இருக்கு",
    ],
    calf_clot: [
      "one leg is swollen and red",
      "painful swollen calf",
      "possible DVT",
      "पिंडली में सूजन और लाल",
      "ek pair mein sujan hai",
    ],
    baby_movement: [
      "the baby stopped moving",
      "baby is not kicking",
      "I haven't felt the baby move since morning",
      "reduced movements",
      "reduced baby movements today",
      "no fetal movement",
      "baby is moving much less",
      "बच्चा हिल नहीं रहा",
      "पेट में बच्चा हिल नहीं रहा",
      "बच्चे की हलचल कम हो गई",
      "baby hil nahi raha",
      "pet ka bachcha hilna band ho gaya",
      "বাচ্চা নড়ছে না",
      "બાળક હલતું નથી",
      "ಮಗು ಅಲುಗಾಡುತ್ತಿಲ್ಲ",
      "കുഞ്ഞ് അനങ്ങുന്നില്ല",
      "बाळ हलत नाही",
      "ପିଲା ନଡୁ ନାହିଁ",
      "ਬੱਚਾ ਹਿੱਲ ਨਹੀਂ ਰਿਹਾ",
      "బిడ్డ కదలడం లేదు",
      "குழந்தை அசையவில்லை",
      "kuzhandhai asaiyala",
    ],
    cord_or_part_showing: [
      "the cord is coming out first",
      "the baby's hand is coming out",
      "baby's head is crowning",
      "नाल बाहर आ गई है",
      "bachche ka haath bahar dikh raha hai",
    ],
    self_harm: [
      "I want to die",
      "she wants to kill herself",
      "I don't want to live anymore",
      "I feel like harming my baby",
      "thinking of ending my life",
      "I hear voices telling me to hurt the baby",
      "आत्महत्या करना चाहती हूँ",
      "मैं मरना चाहती हूं",
      "jeena nahi chahti",
      "mar jaun toh accha hai",
      "আত্মহত্যা করতে চাই",
      "মরতে চাই",
      "આત્મહત્યા",
      "ಸಾಯಬೇಕು ಅನಿಸ್ತಿದೆ",
      "ആത്മഹത്യ",
      "आत्महत्या",
      "ଆତ୍ମହତ୍ୟା",
      "ਖੁਦਕੁਸ਼ੀ",
      "ఆత్మహత్య",
      "தற்கொலை",
    ],
    newborn_not_feeding: [
      "baby is not feeding",
      "the baby is not drinking milk properly",
      "newborn can't suck",
      "baby refuses the breast",
      "baby doodh nahi pee raha",
      "bachcha doodh nahi pi raha hai",
      "बच्चा दूध नहीं पी रहा",
      "बच्चा चूस नहीं रहा",
      "baby weak cry",
      "the baby is not crying",
      "দুধ খাচ্ছে না",
      "dudh khacche na",
      "દૂધ પીતું નથી",
      "dudh pitu nathi",
      "ಹಾಲು ಕುಡಿಯುತ್ತಿಲ್ಲ",
      "halu kudiyuttilla",
      "പാൽ കുടിക്കുന്നില്ല",
      "paal kudikkunnilla",
      "बाळ दूध पित नाही",
      "dudh pit nahi",
      "ଦୁଧ ପିଉ ନାହିଁ",
      "ਦੁੱਧ ਨਹੀਂ ਪੀ ਰਿਹਾ",
      "dudh nahi pee reha",
      "పాలు తాగడం లేదు",
      "palu tagadam ledu",
      "பால் குடிக்கவில்லை",
      "paal kudikkala",
    ],
    newborn_limp_sleepy: [
      "the baby is very sleepy and floppy",
      "baby is limp",
      "newborn is lethargic",
      "baby sleeps all day and is too sleepy to feed",
      "बच्चा बहुत सुस्त है",
      "बच्चा हर वक्त सोता रहता है",
      "baby bahut sust hai",
      "নেতিয়ে পড়েছে",
      "બાળક સુસ્ત છે",
      "ಮಗು ಸುಸ್ತು",
      "बाळ निपचित पडले आहे",
      "ਬੱਚਾ ਸੁਸਤ ਹੈ",
      "பாப்பா சோர்வாக இருக்கு",
    ],
    blue_or_pale: [
      "her lips are blue",
      "the baby turned blue",
      "baby's tongue is bluish",
      "she is very pale and sweaty",
      "होंठ नीले पड़ गए हैं",
      "बच्चा नीला पड़ गया",
      "honth neele ho gaye",
      "ঠোঁট নীল হয়ে গেছে",
      "હોઠ ભૂરા થઈ ગયા",
      "ತುಟಿ ನೀಲಿ",
      "ചുണ്ട് നീല",
      "ओठ निळे पडले",
      "ଓଠ ନୀଳ",
      "ਬੁੱਲ੍ਹ ਨੀਲੇ ਹੋ ਗਏ",
      "పెదవులు నీలం",
      "உதடு நீலமா இருக்கு",
    ],
    newborn_jaundice: [
      "baby's palms and soles are yellow",
      "the baby was born yellow",
      "yellow in the first day",
      "बच्चे की हथेली और तलवे पीले हैं",
      "janm se hi peela hai",
    ],
    infection_pus: [
      "the cord is red and swollen",
      "pus from the navel",
      "the stitches are infected",
      "नाभि से पस आ रहा है",
      "naal laal ho gayi hai",
    ],
    vomiting_diarrhoea: [
      "baby vomits everything",
      "vomiting again and again",
      "green vomit",
      "baby has watery loose motions again and again",
      "बार बार उल्टी हो रही है",
      "खूनी दस्त",
      "baar baar ulti",
    ],
    fontanelle: ["the soft spot is bulging", "बच्चे का तालू उभर आया है"],
  };

  for (const [sign, texts] of Object.entries(DANGER)) {
    it(`catches ${sign}`, () => {
      for (const text of texts) {
        assert.equal(findEmergencySign(text), sign, text);
        assert.equal(looksLikeEmergency(text), true, text);
      }
    });
  }

  it("catches danger signs inside longer, code-mixed sentences", () => {
    for (const text of [
      "Hello didi, meri behan ko subah se bahut khoon aa raha hai, please help",
      "my wife is 8 months pregnant and the baby has not moved since last night",
      "Namaste, baby doodh nahi pee raha aur bahut sust hai",
      "I am scared. She had a fit in the van and now she is not waking up",
      "ammaku fits vachayi, please send ambulance",
      "ഇന്നലെ മുതൽ baby അനങ്ങുന്നില്ല",
    ]) {
      assert.equal(looksLikeEmergency(text), true, text);
    }
  });

  it("ignores case, curly quotes, extra spaces and the nukta dot", () => {
    for (const text of [
      "SHE   IS   BLEEDING   HEAVILY",
      "the bleeding won’t stop",
      "बहुत   खून   आ रहा है",
      "बहुत ख़ून आ रहा है",
      "साँस नहीं ले पा रही",
      "बे‍होश हो गई",
    ]) {
      assert.equal(looksLikeEmergency(text), true, text);
    }
  });
});

describe("looksLikeEmergency: no false alarms", () => {
  it("leaves ordinary questions alone", () => {
    for (const text of [
      "Where is my van?",
      "What should I bring?",
      "When is my ride?",
      "Who can I call for help?",
      "What happens next?",
      "Will my bag fit in the van?",
      "The ride is not moving",
      "the van is not moving in traffic",
      "there is no movement on the road, we are stuck",
      "When is my blood test?",
      "my blood test is tomorrow",
      "do I need a blood pressure check",
      "what is my blood group",
      "I can't see my ride on the map",
      "I can't see the map properly",
      "What is the emergency number?",
      "is she fit to travel?",
      "how do I get fit after the delivery",
      "I can finally breathe a sigh of relief",
      "I can't breathe a sigh of relief until we arrive",
      "I am dying to know when the van arrives",
      "the ambulance is not responding to my calls",
      "my phone is not responding",
      "the alarm didn't wake me",
      "call 104 for health advice",
      "it is 40 degrees outside and the van has no AC",
      "the blue van is here",
      "I lost my blue card",
      "water is leaking from the van",
      "the water bottle broke",
      "I have a headache",
      "I have fever since yesterday",
      "I have some pain in my back",
      "my legs are swollen at night",
      "I get leg cramps at night",
      "calf pain after walking",
      "I have morning sickness and vomiting",
      "baby has a cold and a runny nose",
      "baby is still asleep",
      "the baby is hot in the van, can we open the window",
      "the baby is cold, should I use a blanket",
      "the baby is sleeping peacefully",
      "baby drank milk well today",
      "she is not eating much today",
      "the baby looks a bit yellow",
      "I feel tired and sleepy",
      "my baby was born premature",
      "",
      "   ",
    ]) {
      assert.equal(looksLikeEmergency(text), false, text);
    }
  });

  it("leaves ordinary Indian-language sentences alone", () => {
    for (const text of [
      "मेरी गाड़ी कब आएगी?",
      "मुझे क्या ले जाना है?",
      "मेरा ब्लड टेस्ट कल है",
      "खून की जांच कब है",
      "डॉक्टर का दौरा आज है",
      "मंत्री का दौरा है",
      "सिर में हल्का दर्द है",
      "बुखार है",
      "बच्चा सो रहा है",
      "बच्चे को दूध पिलाया",
      "मां का दूध नहीं आ रहा है",
      "गाड़ी चल नहीं रही",
      "meri gaadi kab aayegi",
      "khoon ki jaanch kal hai",
      "khoon dena hai kya",
      "mujhe bukhar hai",
      "baby so raha hai",
      "baby ko doodh pilaya",
      "aaj ka appointment kab hai",
      "எனது வண்டி எப்போது வரும்",
      "నా వాహనం ఎప్పుడు వస్తుంది",
      "എന്റെ വണ്ടി എപ്പോൾ വരും",
      "ನನ್ನ ವಾಹನ ಯಾವಾಗ ಬರುತ್ತದೆ",
      "મારી ગાડી ક્યારે આવશે",
      "माझी गाडी कधी येणार",
      "আমার গাড়ি কখন আসবে",
      "ମୋ ଗାଡି କେବେ ଆସିବ",
      "ਮੇਰੀ ਗੱਡੀ ਕਦੋਂ ਆਵੇਗੀ",
      "ਮੇਰਾ ਖੂਨ ਦਾ ਟੈਸਟ ਕੱਲ੍ਹ ਹੈ",
      "எனக்கு ரத்த பரிசோதனை நாளை",
      "రక్త పరీక్ష రేపు ఉంది",
    ]) {
      assert.equal(looksLikeEmergency(text), false, text);
    }
  });

  it("respects a plain English negation of bleeding, fits and unconsciousness", () => {
    for (const text of [
      "there is no heavy bleeding",
      "no bleeding at all, I just want to know the time",
      "she is not unconscious",
      "she is not bleeding heavily now",
      "she stopped bleeding",
      "the heavy bleeding has stopped",
      "bleeding has stopped now",
      "she has no fits",
      "no high fever",
      "no severe headache",
    ]) {
      assert.equal(looksLikeEmergency(text), false, text);
    }
  });

  it("still alerts when a negation is far away, a different clause, or inside the sign", () => {
    for (const text of [
      "no, she is bleeding heavily",
      "no one is here and she is bleeding heavily",
      "I don't know what to do, she fainted",
      "she is not well, she is unconscious",
      "not sure but she had a fit",
      "bleeding won't stop",
      "she is not breathing",
      "baby is not moving",
      "unconscious and not moving",
      "bleeding stopped but now she fainted",
    ]) {
      assert.equal(looksLikeEmergency(text), true, text);
    }
  });
});

describe("looksLikeEmergency: speed", () => {
  const timed = (text) => {
    const start = Date.now();
    const result = looksLikeEmergency(text);
    return { result, ms: Date.now() - start };
  };

  it("stays fast on very long and repetitive input", () => {
    for (const text of [
      "the van is on its way to the hospital. ".repeat(3000),
      "baby ".repeat(20000),
      "a ".repeat(50000),
      "not ".repeat(30000),
      "बहुत ".repeat(20000),
      "बच्चा ".repeat(20000),
      "baby is not ".repeat(10000),
      "bleeding ".repeat(15000),
      `${"x".repeat(100000)} help`,
    ]) {
      const { ms } = timed(text);
      assert.ok(ms < 1500, `took ${ms}ms on ${text.slice(0, 20)}`);
    }
  });

  it("still finds a sign at the very end of a long message", () => {
    const text = `${"the van is on its way to the hospital. ".repeat(2000)}she is bleeding heavily`;
    const { result, ms } = timed(text);
    assert.equal(result, true);
    assert.ok(ms < 1500, `took ${ms}ms`);
  });

  it("copes with odd input types", () => {
    assert.equal(looksLikeEmergency(undefined), false);
    assert.equal(looksLikeEmergency(null), false);
    assert.equal(looksLikeEmergency(42), false);
    assert.equal(findEmergencySign("everything is fine"), null);
  });
});

describe("buildCaseBrief", () => {
  const referral = initialSeedReferrals.find((r) => r.transit?.driver);
  const brief = buildCaseBrief(referral, initialFacilities);
  const text = JSON.stringify(brief);

  it("tells the assistant what the patient screens show", () => {
    assert.equal(brief.caseId, referral.id);
    assert.equal(brief.journey.length, 5);
    assert.ok(brief.nextStep);
    assert.equal(brief.emergencyNumber, "108");
    assert.ok(brief.bring.length > 0);
  });

  it("leaves out names, addresses, family phones and clinical details", () => {
    for (const secret of [
      referral.patientName,
      referral.caregiverName,
      referral.patientAddress,
      referral.patientPhone,
      referral.condition,
      referral.reason,
      referral.transit.driverPhone,
    ].filter(Boolean)) {
      assert.equal(text.includes(secret), false, `brief leaks ${secret}`);
    }
  });

  it("never names a hospital that declined", () => {
    const declined = initialSeedReferrals.find((r) => r.status === "REJECTED");
    if (!declined) return;
    const b = buildCaseBrief(declined, initialFacilities);
    assert.equal(b.hospital, null);
    assert.equal(b.mustChooseHospital, true);
  });
});

describe("getScreenSummary", () => {
  it("gives every patient screen something to read aloud", () => {
    const referral = initialSeedReferrals[0];
    for (const view of ["overview", "transit", "checklist", "support"]) {
      const text = getScreenSummary(view, referral, initialFacilities);
      assert.ok(text.length > 10 && text.length <= 1000, view);
    }
  });
});
