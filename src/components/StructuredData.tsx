interface PoemStructuredData {
  id: number
  title: string
  poet: string
  verses: string[]
  url: string
}

interface PoetStructuredData {
  name: string
  url: string
  description?: string
}

export function PoemStructuredData({ poem }: { poem: PoemStructuredData }) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    "name": poem.title,
    "author": {
      "@type": "Person",
      "name": poem.poet
    },
    "url": poem.url,
    "text": poem.verses.join('\n'),
    "inLanguage": "fa",
    "isAccessibleForFree": true,
    "genre": ["شعر", "ادبیات فارسی"],
    "keywords": [poem.poet, poem.title, "شعر فارسی"]
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}

export function PoetStructuredData({ poet }: { poet: PoetStructuredData }) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": poet.name,
    "url": poet.url,
    "description": poet.description || `شاعر ایرانی و خالق آثار ادبیات فارسی`,
    "sameAs": [], // Can be populated with external links
    "jobTitle": "شاعر",
    "knowsAbout": ["شعر", "ادبیات فارسی", "کلام"]
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}

export function BreadcrumbStructuredData({ items }: { items: { name: string; url: string }[] }) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url
    }))
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}
