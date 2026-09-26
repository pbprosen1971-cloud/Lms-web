/**
 * Intelligent Bengali and English Question Subject Classifier
 * Accurately detects subject category for job exams (BCS, Bank, Primary, Ministry)
 */

export function detectQuestionSubject(
  text?: string,
  options?: string[],
  explanation?: string
): string {
  const content = `${text || ''} ${(options || []).join(' ')} ${explanation || ''}`.trim();
  if (!content) return 'বাংলা';

  const lowerContent = content.toLowerCase();

  // 1. ENGLISH (Check first: high ratio of Latin characters or common English exam terms)
  const latinChars = (content.match(/[a-zA-Z]/g) || []).length;
  const bengaliChars = (content.match(/[\u0980-\u09FF]/g) || []).length;
  
  const hasEnglishExamKeywords = 
    /\b(synonym|antonym|preposition|spelling|verb|noun|adjective|adverb|tense|clause|phrase|idiom|pronoun|sentence|meaning|correct spelling|past participle|singular|plural|voice change|narration|fill in the blanks?|gerund|participle)\b/i.test(content) ||
    /who wrote|author of|meaning of the word|what does .* mean|which one is correct/i.test(content);

  if ((latinChars > 15 && latinChars > bengaliChars * 0.4) || hasEnglishExamKeywords) {
    return 'ইংরেজি';
  }

  // 2. MATH / গাণিতিক যুক্তি ও মানসিক দক্ষতা
  const hasMathKeywords =
    /(\+|\-|×|÷|\/|\=|\%|√|\²|\³)/.test(content) && /\d|[\u09E6-\u09EF]/.test(content) ||
    /(সমীকরণ|ভগ্নাংশ|বর্গমূল|ঘনমূল|ত্রিভুজ|চতুর্ভুজ|বৃত্ত|কোণ|ক্ষেত্রফল|পরিসীমা|শতকরা|অনুপাত|সমানুপাত|লাভ-ক্ষতি|মুনাফা|সুদকষা|ল\.সা\.গু|গ\.সা\.গু|উৎপাদক|লগারিদম|ধারা|সমান্তর ধারা|গুণোত্তর ধারা|মান কত|কত হবে|সমাধান করুন|সংখ্যাটির|পিতা ও পুত্রের|নৌকা ও স্রোত|ট্রেন|গতিবেগ|পাই|সমবাহু|সমকোণী|ত্রিকোণমিতি|বীজগণিত|জ্যামিতি|পাটিগণিত|ক্যালকুলাস)/.test(content);

  if (hasMathKeywords) {
    return 'গণিত';
  }

  // 3. ICT / কম্পিউটার ও তথ্যপ্রযুক্তি
  const hasIctKeywords =
    /(কম্পিউটার|ইন্টারনেট|রম|র‌্যাম|র‍্যাম|হার্ডওয়্যার|সফটওয়্যার|সফটওয়্যার|প্রসেসর|মাদারবোর্ড|বাইনারি|অকটাল|হেক্সাডেসিমেল|অপারেটিং সিস্টেম|উইন্ডোজ|লিনাক্স|মেমোরি|বিট|বাইট|কিলোবাইট|মেগাবাইট|গিগাবাইট|ডাটাবেজ|নেটওয়ার্ক|ল্যান|ওয়াইফাই|ব্লুটুথ|ইউআরএল|ওয়েবসাইট|ব্রাউজার|গুগল|ইমেইল|ফায়ারওয়াল|ভাইরাস|ম্যালওয়্যার|ক্লাউড|কৃত্রিম বুদ্ধিমত্তা|আইআইটি|প্রোগ্রামিং|html|http|cpu|ram|rom|ip address|lan|wan|wifi|iot|ai)/i.test(content);

  if (hasIctKeywords) {
    return 'ICT';
  }

  // 4. SCIENCE / সাধারণ বিজ্ঞান
  const hasScienceKeywords =
    /(পরমাণু|অণু|ইলেকট্রন|প্রোটন|নিউট্রন|মৌল|যৌগ|গ্যাস|অম্ল|ক্ষার|এসিড|ক্ষারক|ধাতু|অধাতু|বিক্রিয়া|রাসায়নিক|কোষ|ডিএনএ|আরএনএ|রক্ত|হিমোগ্লোবিন|ভিটামিন|হরমোন|এনজাইম|রোগ|জীবাণু|ভাইরাসজনিত|ব্যাকটেরিয়া|উদ্ভিদ|সালোকসংশ্লেষণ|প্রাণী|টিস্যু|অভিকর্ষ|মহাকর্ষ|গতিশক্তি|স্থিতিশক্তি|শব্দ তরঙ্গ|আলোর প্রতিসরণ|প্রতিফলন|লেন্স|চৌম্বক|তড়িৎ|বিদ্যুৎ|তেজস্ক্রিয়|পর্যায় সারণি|বায়ুমণ্ডল|ওজোন)/.test(content);

  if (hasScienceKeywords) {
    return 'বিজ্ঞান';
  }

  // 5. ETHICS & GOOD GOVERNANCE / নৈতিকতা, মূল্যবোধ ও সুশাসন
  const hasEthicsKeywords =
    /(নৈতিকতা|মূল্যবোধ|সুশাসন|নৈতিক আচরণ|সততা|দুর্নীতি|জবাবদিহিতা|স্বচ্ছতা|আইনের শাসন|মানবাধিকার|কর্তব্যবোধ|সামাজিক মূল্যবোধ|নাগরিক দায়িত্ব|পেশাগত সততা|ন্যায়পরায়ণতা|সুনাগরিক|নীতিবিদ্যা)/.test(content);

  if (hasEthicsKeywords) {
    return 'নৈতিকতা মূল্যবোধ ও সুশাসন';
  }

  // 6. GEOGRAPHY / ভূগোল, পরিবেশ ও দুর্যোগ ব্যবস্থাপনা
  const hasGeographyKeywords =
    /(ভূগোল|জলবায়ু|আবহাওয়া|বায়ুমণ্ডল|গ্রিনহাউস|ঘূর্ণিঝড়|ভূমিকম্প|সুনামি|আগ্নেয়গিরি|প্লেট টেকটোনিক|মরুভূমি|পর্বতমালা|মালভূমি|অক্ষাংশ|দ্রাঘিমাংশ|গ্রিনিচ মান মন্দির|জোয়ার-ভাটা|বায়ুপ্রবাহ|বৃষ্টিপাত|আর্দ্রতা|পরিবেশ দূষণ|বিশ্ব উষ্ণায়ন|দুর্যোগ ব্যবস্থাপনা)/.test(content);

  if (hasGeographyKeywords) {
    return 'ভূগোল';
  }

  // 7. INTERNATIONAL GK / আন্তর্জাতিক সাধারন জ্ঞান
  const hasIntlGkKeywords =
    /(জাতিসংঘ|ইউনেস্কো|ইউনিসেফ|বিশ্বব্যাংক|আইএমএফ|সার্ক|আসিয়ান|ন্যাটো|ইউরোপীয় ইউনিয়ন|নোবেল পুরস্কার|অস্কার|অলিম্পিক|বিশ্বকাপ|সদর দপ্তর|মহাসাগর|প্রশান্ত মহাসাগর|আটলান্টিক|ভারত মহাসাগর|প্রণালী|সুয়েজ খাল|পানামা খাল|রাজধানী|মুদ্রা|পার্লামেন্ট|রাষ্ট্রদূত|আন্তর্জাতিক আদালত|হেগ|জেনেভা|নিউইয়র্ক|রোম|প্যারিস|লন্ডন|ওয়াশিংটন|চীন|রাশিয়া|ভারত|যুক্তরাষ্ট্র|যুক্তরাজ্য|ইউক্রেন|ফিলিস্তিন|ইসরায়েল|মধ্যপ্রাচ্য|বিশ্ব স্বাস্থ্য সংস্থা|who|unicef|unesco|uno|nato|saarc)/i.test(content);

  if (hasIntlGkKeywords) {
    return 'আন্তর্জাতিক সাধারন জ্ঞান';
  }

  // 8. BANGLADESH GK / বাংলাদেশ বিষয়াবলি -GK
  const hasBdGkKeywords =
    /(বাংলাদেশ|বঙ্গবন্ধু|শেখ মুজিবুর রহমান|মুক্তিযুদ্ধ|১৯৭১|১৯৫২|ভাষা আন্দোলন|ছয় দফা|যুক্তফ্রন্ট|সংবিধান|জাতীয় সংসদ|প্রধানমন্ত্রী|রাষ্ট্রপতি|পদ্মা সেতু|যমুনা|মেঘনা|সুন্দরবন|জাতীয় স্মৃতিসৌধ|শহীদ মিনার|জাতীয় পতাকা|জাতীয় সংগীত|বীরশ্রেষ্ঠ|বিসিএস|উপজেলা|জেলা|বিভাগ|আদমশুমারি|জনশুমারি|মুগ্ধ|রংপুর|চট্টগ্রাম|রাজশাহী|খুলনা|বরিশাল|সিলেট|ময়মনসিংহ|ব-দ্বীপ|হাওর|বাওর|বিল|পাহাড়)/.test(content);

  if (hasBdGkKeywords) {
    return 'বাংলাদেশ বিষয়াবলি -GK';
  }

  // 9. BANGLA GRAMMAR / বাংলা ব্যাকরণ
  const hasBanglaGrammarKeywords =
    /(ব্যাকরণ|সন্ধি|সমাস|কারক|বিভক্তি|প্রত্যয়|উপসর্গ|অনুসর্গ|ধ্বনি|বর্ণ|ণ-ত্ব|ষ-ত্ব|বানান শুদ্ধি|বাক্য সংকোচন|এক কথায় প্রকাশ|বাগধারা|প্রবাদ-প্রবচন|বিপরীত শব্দ|সমার্থক শব্দ|শব্দার্থ|ক্রিয়ার কাল|পদ প্রকরণ|বিশেষ্য|বিশেষণ|সর্বনাম|অব্যয়|যতিচিহ্ন|উচ্চারণ)/.test(content);

  if (hasBanglaGrammarKeywords) {
    return 'বাংলা ব্যাকরণ';
  }

  // 10. BANGLA LITERATURE / বাংলা সাহিত্য
  const hasBanglaLitKeywords =
    /(সাহিত্য|কবি|উপন্যাস|নাটক|ছোটগল্প|কাব্যগ্রন্থ|মহাকাব্য|চর্যাপদ|মঙ্গলকাব্য|শ্রীকৃষ্ণকীর্তন|রবীন্দ্রনাথ ঠাকুর|কাজী নজরুল ইসলাম|মাইকেল মধুসূদন দত্ত|বঙ্কিমচন্দ্র চট্টোপাধ্যায়|শরৎচন্দ্র চট্টোপাধ্যায়|মীর মশাররফ হোসেন|জসীম উদ্‌দীন|জীবনানন্দ দাশ|শামসুর রাহমান|হুমায়ূন আহমেদ|সেলিনা হোসেন|সুফিয়া কামাল|বেগম রোকেয়া|রচয়িতা|কার রচনা|কোন যুগের নিদর্শন)/.test(content);

  if (hasBanglaLitKeywords) {
    return 'বাংলা';
  }

  // Default to বাংলা if Bengali text
  return 'বাংলা';
}
