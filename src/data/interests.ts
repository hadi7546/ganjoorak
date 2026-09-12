export interface PoemInterest {
  key: string;
  label: string;
  emoji: string;
  queries: string[];
}

export const POEM_INTERESTS: PoemInterest[] = [
  {
    key: "love",
    label: "عاشقانه",
    emoji: "❤️",
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
    emoji: "🕊️",
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
    emoji: "💔",
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
    emoji: "🍷",
    queries: [
      "وصف شراب و ساقی و میخانه",
      "مستی و بی‌خودی و خرابات",
      "دعوت به می‌گساری و خوش‌باشی",
    ],
  },
  {
    key: "spring",
    label: "بهار و طبیعت",
    emoji: "🌸",
    queries: [
      "وصف بهار و شکفتن گل‌ها",
      "باغ و سبزه و نسیم سحری",
      "بلبل و گل و آواز پرندگان",
      "وصف باران و ابر و کوه",
    ],
  },
  {
    key: "wisdom",
    label: "پند و اندرز",
    emoji: "📜",
    queries: [
      "نصیحت و اندرز اخلاقی به آدمیان",
      "حکمت و خردمندی در زندگی",
      "پرهیز از آز و حرص و خودپسندی",
      "ارزش راستی و درستکاری",
    ],
  },
  {
    key: "satire",
    label: "طنز و شوخی",
    emoji: "😄",
    queries: [
      "شعر طنز و شوخی و هزل",
      "هجو و ریشخند و مطایبه",
      "خنده و شادی و بذله‌گویی",
    ],
  },
  {
    key: "epic",
    label: "حماسه و پهلوانی",
    emoji: "⚔️",
    queries: [
      "نبرد پهلوانان و دلاوری در میدان جنگ",
      "رزم و شمشیر و سپاه",
      "دلیری و نام‌آوری و افتخار",
    ],
  },
  {
    key: "time",
    label: "گذر عمر",
    emoji: "⏳",
    queries: [
      "گذر زمان و کوتاهی عمر آدمی",
      "پیری و موی سپید و افسوس جوانی",
      "قدر دانستن امروز و دم را غنیمت شمردن",
    ],
  },
  {
    key: "mortality",
    label: "مرگ و بی‌ثباتی دنیا",
    emoji: "🪦",
    queries: [
      "یاد مرگ و ناپایداری دنیا",
      "خاک شدن و سرنوشت آدمی",
      "بی‌وفایی دنیا و چرخ گردون",
    ],
  },
  {
    key: "prayer",
    label: "مناجات و نیایش",
    emoji: "🤲",
    queries: [
      "راز و نیاز و مناجات با خدا",
      "توبه و طلب بخشش از پروردگار",
      "ستایش خداوند و شکر نعمت",
    ],
  },
  {
    key: "loneliness",
    label: "تنهایی و دل‌تنگی",
    emoji: "🌫️",
    queries: [
      "احساس تنهایی و غم غربت",
      "دل‌تنگی و اندوه در دل شب",
      "بی‌کسی و بی‌پناهی",
    ],
  },
  {
    key: "hope",
    label: "امید و آرامش",
    emoji: "🌅",
    queries: [
      "امید به فردا و گشایش پس از سختی",
      "آرامش دل و رضایت و قناعت",
      "پایان شب سیه و سپیدی صبح",
    ],
  },
  {
    key: "night",
    label: "شب و مهتاب",
    emoji: "🌙",
    queries: [
      "وصف شب و مهتاب و ستارگان",
      "سحر و بانگ خروس و سپیده‌دم",
      "خواب و بیداری در دل شب",
    ],
  },
  {
    key: "friendship",
    label: "دوستی و یاران",
    emoji: "🤝",
    queries: [
      "قدر دوستان و یاران همدل",
      "وفا و مروت در دوستی",
      "شکایت از بی‌وفایی دوستان",
    ],
  },
  {
    key: "homeland",
    label: "وطن و ایران",
    emoji: "🏞️",
    queries: [
      "عشق به وطن و ایران",
      "افتخار به تاریخ و فرهنگ ایران",
      "یاد سرزمین مادری در غربت",
    ],
  },
  {
    key: "patience",
    label: "صبر و رضا",
    emoji: "🪷",
    queries: [
      "صبر در برابر سختی‌ها و رضا به تقدیر",
      "تحمل رنج و امید به پاداش",
      "قضا و قدر و تسلیم",
    ],
  },
  {
    key: "beauty",
    label: "وصف زیبایی",
    emoji: "✨",
    queries: [
      "وصف زیبایی روی و گیسوی یار",
      "چشم و ابرو و خال و لب معشوق",
      "قد و قامت و رفتار دلربا",
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
