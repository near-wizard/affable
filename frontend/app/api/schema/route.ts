import { NextResponse } from 'next/server';

/**
 * JSON-LD Schema endpoint for SEO
 * Returns structured data for search engines and LLMs
 */
export async function GET() {
  const baseUrl = 'https://affablelink.com';

  // Organization schema
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${baseUrl}/#organization`,
    name: 'AffableLink',
    url: baseUrl,
    logo: {
      '@type': 'ImageObject',
      url: `${baseUrl}/placeholder-logo.png`,
      width: 256,
      height: 256,
    },
    description: 'Premium affiliate platform for founders',
    sameAs: [
      'https://twitter.com/affablelink',
      'https://github.com/near-wizard/affable',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Support',
      email: 'support@affablelink.com',
    },
  };

  // Product schema
  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': `${baseUrl}/#product`,
    name: 'AffableLink',
    description: 'Founder-friendly affiliate and partner program management software',
    url: baseUrl,
    applicationCategory: 'BusinessApplication',
    offers: {
      '@type': 'Offer',
      priceCurrency: 'USD',
      price: '0',
      description: 'Free to start, usage-based pricing',
    },
    screenshot: `${baseUrl}/placeholder.png`,
  };

  // FAQ schema
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'How fast can I launch my partner program with AffableLink?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'You can launch your affiliate partner program in less than 24 hours with AffableLink. Our founder-friendly platform is designed to get you up and running quickly without months of setup and configuration.',
        },
      },
      {
        '@type': 'Question',
        name: 'What features does AffableLink include?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'AffableLink includes real-time analytics, fraud detection, commission management, custom attribution models, partner dashboards, smart link generation, multi-currency support, API access, and webhook integrations. All features are included in every plan with no feature gatekeeping.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is AffableLink suitable for startups?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, AffableLink is specifically designed for founders and startups. We offer usage-based pricing, no minimums, and all premium features from day one. Perfect for growing your partner program from first partner to thousands.',
        },
      },
      {
        '@type': 'Question',
        name: 'How does AffableLink handle fraud detection?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'AffableLink uses AI-powered algorithms to detect suspicious activity and prevent fraud before it costs you money. Our fraud detection is built-in to every plan.',
        },
      },
    ],
  };

  // BreadcrumbList schema
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: baseUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Features',
        item: `${baseUrl}/features`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: 'Pricing',
        item: `${baseUrl}/pricing`,
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: 'RFDs',
        item: `${baseUrl}/rfd`,
      },
    ],
  };

  // WebSite schema with search action
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    url: baseUrl,
    name: 'AffableLink',
    description: 'Founder-friendly affiliate and partner program platform',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  // Combine all schemas
  const schemas = [
    organizationSchema,
    productSchema,
    websiteSchema,
    faqSchema,
    breadcrumbSchema,
  ];

  return NextResponse.json(
    {
      '@context': 'https://schema.org',
      '@graph': schemas,
    },
    {
      headers: {
        'Content-Type': 'application/ld+json',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        'X-Robots-Tag': 'index, follow',
      },
    }
  );
}
