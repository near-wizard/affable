import { Metadata } from 'next';
import { FeaturesContent } from '@/components/window-content/features';

export const metadata: Metadata = {
  title: 'Features - AffableLink | Affiliate Software Features',
  description: 'Explore AffableLink features: real-time analytics, fraud detection, commission management, custom attribution, partner dashboards, and more. All premium features included in every plan.',
  keywords: ['affiliate features', 'partner program features', 'fraud detection', 'commission tracking', 'analytics dashboard'],
  openGraph: {
    title: 'Features - AffableLink | Affiliate Software Features',
    description: 'All premium affiliate management features included. No feature gatekeeping.',
    url: 'https://affablelink.com/features',
    type: 'website',
  },
};

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-8">
      {/* SEO Header */}
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Features</h1>
        <p className="text-xl text-gray-700 max-w-3xl">
          Powerful, founder-friendly affiliate platform features. Everything you need, nothing you don't.
        </p>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto">
        <article className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Everything Included</h2>
            <p className="text-lg text-gray-700 mb-8 leading-relaxed">
              We don't believe in feature gatekeeping. Every plan includes all premium features from day one.
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              {[
                { title: 'Real-Time Analytics', desc: 'Track affiliate performance instantly with live dashboards' },
                { title: 'Fraud Detection', desc: 'AI-powered protection against suspicious activity' },
                { title: 'Commission Management', desc: 'Flexible rules, tiered payouts, instant tracking' },
                { title: 'Custom Attribution', desc: 'Choose your attribution model - first-click, last-click, multi-touch' },
                { title: 'Partner Dashboard', desc: 'Affiliates get real-time stats, earnings, and insights' },
                { title: 'Smart Link Generation', desc: 'Create unlimited tracking links with custom parameters' },
                { title: 'Multi-Currency Support', desc: 'Accept partners and pay in multiple currencies' },
                { title: 'API & Webhooks', desc: 'Full REST API for custom integrations' },
              ].map((feature) => (
                <div key={feature.title} className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Built for Both Sides</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">For Vendors</h3>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex gap-3"><span>✓</span> Campaign management & versioning</li>
                  <li className="flex gap-3"><span>✓</span> Partner approval workflows</li>
                  <li className="flex gap-3"><span>✓</span> Real-time performance tracking</li>
                  <li className="flex gap-3"><span>✓</span> Advanced fraud detection</li>
                  <li className="flex gap-3"><span>✓</span> Custom commission rules</li>
                  <li className="flex gap-3"><span>✓</span> Automated payouts</li>
                  <li className="flex gap-3"><span>✓</span> Webhook integrations</li>
                </ul>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">For Partners</h3>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex gap-3"><span>✓</span> Partner dashboard & analytics</li>
                  <li className="flex gap-3"><span>✓</span> Real-time earnings tracking</li>
                  <li className="flex gap-3"><span>✓</span> Flexible link generation</li>
                  <li className="flex gap-3"><span>✓</span> Marketing materials library</li>
                  <li className="flex gap-3"><span>✓</span> Direct vendor communication</li>
                  <li className="flex gap-3"><span>✓</span> Monthly payouts</li>
                  <li className="flex gap-3"><span>✓</span> Multiple payment methods</li>
                </ul>
              </div>
            </div>
          </section>
        </article>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Interactive Feature Explorer</h2>
          <p className="text-gray-600 mb-6">
            Click the Features window icon on the left to explore all features in our interactive desktop interface.
          </p>
          <div className="bg-slate-100 rounded-lg p-8 min-h-[400px] flex items-center justify-center text-center text-gray-500">
            <p className="text-lg font-medium">Open the interactive Features window for the full experience</p>
          </div>
        </div>
      </main>
    </div>
  );
}
