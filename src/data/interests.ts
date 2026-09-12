export interface PoemInterest {
  key: string;
  label: string;
  queries: string[];
}

export const POEM_INTERESTS: PoemInterest[] = [
  {
    key: "love",
    label: "عاشقانه",
    queries: [
      "شعری درباره عشق و دلدادگی",
      "شوق دیدار یار و بی‌قراری عاشق",
      "وصف معشوق و دلبری او",
      "عشق پاک و بی‌ریا",
    ],
  },
  {
    key: "mystic",
    label: "عرفانی",
    queries: [
      "سیر و سلوک عارفانه و رسیدن به حق",
      "فنا و بقا در راه عشق الهی",
      "دل و آینه و کشف حقیقت",
      "ترک خودی و رهایی از نفس",
    ],
  },
  {
    key: "separation",
    label: "فراق و جدایی",
    queries: [
      "درد جدایی از یار",
      "شکایت از هجران و دوری",
      "اشک و شب‌های بی‌خوابی عاشق",
      "انتظار بازگشت یار",
    ],
  },
  {
    key: "wine",
    label: "باده و ساقی",
    queries: [
      "میخانه و پیر مغان و جام",
      "وصف شراب و ساقی و میخانه",
      "باده نوشیدن در بزم و مجلس",
      "دعوت به می‌گساری و خوش‌باشی",
    ],
  },
  {
    key: "spring",
    label: "بهار و طبیعت",
    queries: [
      "وصف بهار و شکفتن گل‌ها",
      "نسیم صبا و بوی گل",
      "باغ و سبزه و نسیم سحری",
      "بلبل و گل و آواز پرندگان",
    ],
  },
  {
    key: "wisdom",
    label: "پند و اندرز",
    queries: [
      "نصیحت و اندرز اخلاقی به آدمیان",
      "راستگویی بهتر از دروغ است",
      "حکمت و خردمندی در زندگی",
      "پرهیز از آز و حرص و خودپسندی",
    ],
  },
  {
    key: "satire",
    label: "طنز و شوخی",
    queries: [
      "شعر هجو در نکوهش کسی",
      "مسخره کردن و خنده گرفتن از مردم",
      "حکایت خنده‌دار و مزاح",
      "شعر طنز و شوخی و هزل",
    ],
  },
  {
    key: "epic",
    label: "حماسه و پهلوانی",
    queries: [
      "نبرد پهلوانان و دلاوری در میدان جنگ",
      "رزم و شمشیر و سپاه",
      "نام نیک پهلوان در جهان بماند",
      "گرز و کمند و اسب و لشکر",
    ],
  },
  {
    key: "time",
    label: "گذر عمر",
    queries: [
      "گذر زمان و کوتاهی عمر آدمی",
      "دریغ از روزگار جوانی",
      "موی سپید شد و جوانی رفت",
      "قدر دانستن امروز و دم را غنیمت شمردن",
    ],
  },
  {
    key: "mortality",
    label: "مرگ و بی‌ثباتی دنیا",
    queries: [
      "یاد مرگ و ناپایداری دنیا",
      "جفای چرخ گردون و روزگار",
      "دنیا سرای گذر است و ماندنی نیست",
      "خاک شدن و سرنوشت آدمی",
    ],
  },
  {
    key: "prayer",
    label: "مناجات و نیایش",
    queries: [
      "راز و نیاز و مناجات با خدا",
      "توبه و طلب بخشش از پروردگار",
      "ستایش خداوند و شکر نعمت",
    ],
  },
  {
    key: "loneliness",
    label: "تنهایی و دل‌تنگی",
    queries: [
      "احساس تنهایی و غم غربت",
      "دل‌تنگی و اندوه در دل شب",
      "بی‌کسی و بی‌پناهی",
    ],
  },
  {
    key: "hope",
    label: "امید و آرامش",
    queries: [
      "امید به فردا و گشایش پس از سختی",
      "آرامش دل و رضایت و قناعت",
      "پایان شب سیه و سپیدی صبح",
    ],
  },
  {
    key: "night",
    label: "شب و مهتاب",
    queries: [
      "مهتاب و ستاره در آسمان شب",
      "شب تاریک و بیداری تا صبح",
      "وصف شب و مهتاب و ستارگان",
      "خواب و بیداری در دل شب",
    ],
  },
  {
    key: "friendship",
    label: "دوستی و یاران",
    queries: [
      "دوست خوب در روز سختی",
      "جدایی از دوستان و یاد ایشان",
      "قدر دوستان و یاران همدل",
      "شکایت از بی‌وفایی دوستان",
    ],
  },
  {
    key: "homeland",
    label: "وطن و ایران",
    queries: [
      "عشق به وطن و ایران",
      "افتخار به تاریخ و فرهنگ ایران",
      "دوری از خانه و آرزوی بازگشت",
      "غریبی و دوری از وطن",
    ],
  },
  {
    key: "patience",
    label: "صبر و رضا",
    queries: [
      "صبر در برابر سختی‌ها و رضا به تقدیر",
      "تحمل رنج و امید به پاداش",
      "قضا و قدر و تسلیم",
    ],
  },
  {
    key: "beauty",
    label: "وصف زیبایی",
    queries: [
      "وصف رخسار و زیبایی معشوق",
      "حسن و جمال یار بی‌همتاست",
      "وصف زیبایی روی و گیسوی یار",
      "چشم و ابرو و خال و لب معشوق",
    ],
  },
];

export const DEFAULT_SUGGESTED_INTEREST_KEYS = [
  "love",
  "mystic",
  "wisdom",
  "spring",
  "separation",
  "wine",
  "satire",
  "epic",
];

const INTEREST_BY_KEY = new Map(
  POEM_INTERESTS.map((interest) => [interest.key, interest]),
);

export const getInterestByKey = (key: string | null | undefined) =>
  key ? INTEREST_BY_KEY.get(key) ?? null : null;

export const isValidInterestKey = (key: string) => INTEREST_BY_KEY.has(key);

export const sanitizeInterestKeys = (keys: unknown): string[] => {
  if (!Array.isArray(keys)) {
    return [];
  }

  return Array.from(
    new Set(
      keys.filter(
        (key): key is string => typeof key === "string" && isValidInterestKey(key),
      ),
    ),
  );
};

export const orderInterestsForRail = (selectedKeys: string[]): PoemInterest[] => {
  const selected = sanitizeInterestKeys(selectedKeys);
  const selectedSet = new Set(selected);

  const chosen = selected
    .map((key) => INTEREST_BY_KEY.get(key))
    .filter((interest): interest is PoemInterest => Boolean(interest));

  if (chosen.length === 0) {
    const suggested = DEFAULT_SUGGESTED_INTEREST_KEYS.map((key) =>
      INTEREST_BY_KEY.get(key),
    ).filter((interest): interest is PoemInterest => Boolean(interest));

    return [
      ...suggested,
      ...POEM_INTERESTS.filter(
        (interest) => !DEFAULT_SUGGESTED_INTEREST_KEYS.includes(interest.key),
      ),
    ];
  }

  return [
    ...chosen,
    ...POEM_INTERESTS.filter((interest) => !selectedSet.has(interest.key)),
  ];
};
