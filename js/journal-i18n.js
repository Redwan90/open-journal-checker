import { DEFAULT_CONFIG } from './config.js';

const localized = {
  "ar": [
    "المجلة المفتوحة التجريبية",
    "فحوص التحضير إرشادية. تكون الأولوية دائماً لتعليمات المؤلفين الحالية للمجلة وقرارات المحرر.",
    [
      "مقالة بحثية",
      "مقالة مراجعة",
      "مراسلة قصيرة",
      "دراسة حالة",
      "ورقة منهجية"
    ],
    [
      "علوم الحاسوب والذكاء الاصطناعي",
      "الهندسة",
      "العلوم الصحية والحياتية",
      "التربية والعلوم الاجتماعية"
    ],
    [
      "المخطوطة أصلية وليست قيد المراجعة لدى جهة أخرى.",
      "راجع جميع المؤلفين المخطوطة المقدمة ووافقوا عليها.",
      "ذُكرت موافقة أخلاقيات البحث أو الإعفاء منها حيثما ينطبق ذلك.",
      "رُوعيت الموافقة المستنيرة وخصوصية المشاركين حيثما ينطبق ذلك.",
      "أُفصح عن تضارب المصالح، بما في ذلك التصريح بعدم وجوده.",
      "أُفصح عن التمويل وأدوار الجهات الراعية، بما في ذلك عدم وجود تمويل.",
      "قُدِّم بيان إتاحة البيانات حيثما ينطبق ذلك.",
      "أُفصح عن أي استخدام للذكاء الاصطناعي التوليدي وفقاً لسياسة المجلة.",
      "رُوجعت المراجع، بما في ذلك روابط DOI المتاحة.",
      "تلتزم المخطوطة بتعليمات المجلة الخاصة بالتنسيق وإخفاء هوية المؤلفين."
    ],
    "تُترجم نصوص المجلة التجريبية الافتراضية. تبقى النصوص المخصصة التي تدخلها المجلة بلغتها الأصلية."
  ],
  "ku": [
    "گۆڤارا ڤەکری یا تاقیکرنێ",
    "پشکنینێن ئامادەکرنێ تەنێ ڕاوێژن. ڕێنمایێن نوکە یێن گۆڤارێ بۆ نڤیسەران و بریارێن سەرنڤیسەری هەردەم پێشینەیی هەیە.",
    [
      "وتارا ڤەکۆلینێ",
      "وتارا پێداچوونێ",
      "ڕاگەهاندنا کورت",
      "لێکۆلینا کەیسەکی",
      "وتارا ڕێبازێ"
    ],
    [
      "زانستا کۆمپیوتەری و زیرەکیا دەستکرد",
      "ئەندازیاری",
      "زانستێن تەندروستی و ژیانێ",
      "پەروەردە و زانستێن جڤاکی"
    ],
    [
      "دەستنڤیس ڕەسەنە و ل جهەکێ دی د بن هەڵسەنگاندنێ دا نینە.",
      "هەمی نڤیسەران دەستنڤیسا پێشکێشکری پێداچوون کریە و پەسەند کریە.",
      "پەسەندکرنا ئەخلاقێن ڤەکۆلینێ یان لێبورین ژێ هاتیە دیارکرن، ل جهێ پێدڤی.",
      "ڕەزامەندیا ئاگەهدار و تایبەتمەندیا بەشداربوویان هاتینە ڕەچاوکرن، ل جهێ پێدڤی.",
      "ناکۆکیێن بەرژەوەندییان هاتینە ئاشکراکرن، تەنانەت ئەگەر هیچ نەبن.",
      "داراییکرن و ڕۆلێن پشتیڤانان هاتینە ئاشکراکرن، تەنانەت ئەگەر داراییکرن نەبیت.",
      "بەیانەکا بەردەستبوونا داتایان هاتیە دان، ل جهێ پێدڤی.",
      "هەر بکارئینانەکا زیرەکیا دەستکرد یا بەرهەمهێنەر ل گۆڕ سیاسەتا گۆڤارێ هاتیە ئاشکراکرن.",
      "ژێدەر هاتینە پشکنین، دگەل لینکێن DOI یێن بەردەست.",
      "دەستنڤیس پەیڕەوی ڕێنمایێن گۆڤارێ یێن ڤێکرنێ و ڤەشارتنا ناسنامەیا نڤیسەران دکەت."
    ],
    "دەقێن گۆڤارا تاقیکرنێ دهێنە وەرگێڕان. دەقێن تایبەت یێن گۆڤارێ ب زمانێ وان یێ ڕەسەن دمینن."
  ],
  "tr": [
    "Açık Dergi Demosu",
    "Hazırlık kontrolleri tavsiye niteliğindedir. Derginin güncel yazar rehberi ve editör kararları her zaman önceliklidir.",
    [
      "Araştırma makalesi",
      "Derleme makalesi",
      "Kısa bildiri",
      "Vaka çalışması",
      "Yöntem makalesi"
    ],
    [
      "Bilgisayar bilimi ve yapay zekâ",
      "Mühendislik",
      "Sağlık ve yaşam bilimleri",
      "Eğitim ve sosyal bilimler"
    ],
    [
      "Makale özgündür ve başka bir yerde değerlendirme aşamasında değildir.",
      "Tüm yazarlar gönderilen makaleyi incelemiş ve onaylamıştır.",
      "Gerekli durumlarda araştırma etiği onayı veya muafiyeti belirtilmiştir.",
      "Gerekli durumlarda bilgilendirilmiş onam ve katılımcı gizliliği dikkate alınmıştır.",
      "Çıkar çatışmaları açıklanmış; yoksa bulunmadığı belirtilmiştir.",
      "Finansman ve sponsorların rolleri açıklanmış; finansman yoksa bu belirtilmiştir.",
      "Gerekli durumlarda veri erişilebilirliği beyanı sunulmuştur.",
      "Üretken yapay zekânın her türlü kullanımı dergi politikasına uygun olarak açıklanmıştır.",
      "Mevcut DOI bağlantıları da dahil olmak üzere kaynaklar kontrol edilmiştir.",
      "Makale, derginin biçimlendirme ve yazar kimliğini gizleme talimatlarına uygundur."
    ],
    "Varsayılan demo dergisinin metinleri çevrilir. Derginin girdiği özel metinler özgün dilinde kalır."
  ]
};

export function journalText(language, kind, value) {
  const locale = localized[language];
  if (!locale) return value;
  if (kind === 'name') return value === DEFAULT_CONFIG.journalName ? locale[0] : value;
  if (kind === 'guidance') return value === DEFAULT_CONFIG.extraGuidance ? locale[1] : value;
  const originals = kind === 'article' ? DEFAULT_CONFIG.articleTypes : kind === 'subject' ? DEFAULT_CONFIG.subjects.map(s => s.name) : kind === 'confirmation' ? DEFAULT_CONFIG.confirmations : [];
  const index = originals.indexOf(value);
  const translated = locale[kind === 'article' ? 2 : kind === 'subject' ? 3 : 4];
  return index < 0 ? value : translated[index];
}
