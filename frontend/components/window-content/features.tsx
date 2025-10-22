import { Zap, BarChart3, Shield, Link2, Users, CreditCard, Smartphone, Headphones, Globe, Lock, Gauge, Rocket } from 'lucide-react';

export function FeaturesContent() {
  const features = [
    {
      title: "Real-Time Analytics",
      description: "Track affiliate performance instantly with live dashboards and detailed conversion tracking.",
      icon: <BarChart3 className="w-6 h-6" />,
      color: "from-blue-500 to-blue-600",
      lightColor: "from-blue-50 to-blue-100"
    },
    {
      title: "Commission Management",
      description: "Automated commission calculations with flexible rules, tiered payouts, and instant tracking.",
      icon: <CreditCard className="w-6 h-6" />,
      color: "from-green-500 to-green-600",
      lightColor: "from-green-50 to-green-100"
    },
    {
      title: "Fraud Detection",
      description: "AI-powered algorithms detect suspicious activity and prevent fraud before it costs you money.",
      icon: <Shield className="w-6 h-6" />,
      color: "from-red-500 to-red-600",
      lightColor: "from-red-50 to-red-100"
    },
    {
      title: "Custom Attribution",
      description: "Choose your attribution model - first-click, last-click, multi-touch, or custom rules.",
      icon: <Link2 className="w-6 h-6" />,
      color: "from-purple-500 to-purple-600",
      lightColor: "from-purple-50 to-purple-100"
    },
    {
      title: "Partner Dashboard",
      description: "Affiliates get their own dashboard with real-time stats, earnings, and performance insights.",
      icon: <Users className="w-6 h-6" />,
      color: "from-orange-500 to-orange-600",
      lightColor: "from-orange-50 to-orange-100"
    },
    {
      title: "Smart Link Generation",
      description: "Generate unlimited tracking links with custom UTM parameters and deep linking support.",
      icon: <Zap className="w-6 h-6" />,
      color: "from-yellow-500 to-yellow-600",
      lightColor: "from-yellow-50 to-yellow-100"
    },
    {
      title: "Multi-Currency Support",
      description: "Accept partners and process payouts in multiple currencies with automatic conversion.",
      icon: <Globe className="w-6 h-6" />,
      color: "from-indigo-500 to-indigo-600",
      lightColor: "from-indigo-50 to-indigo-100"
    },
    {
      title: "API & Webhooks",
      description: "Full REST API and webhook support for custom integrations and real-time data sync.",
      icon: <Lock className="w-6 h-6" />,
      color: "from-cyan-500 to-cyan-600",
      lightColor: "from-cyan-50 to-cyan-100"
    },
    {
      title: "Performance Optimization",
      description: "Lightweight tracking pixels and optimized infrastructure for zero impact on your site.",
      icon: <Gauge className="w-6 h-6" />,
      color: "from-pink-500 to-pink-600",
      lightColor: "from-pink-50 to-pink-100"
    },
  ]

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-3">
            Powerful Features Built for Scale
          </h1>
          <p className="text-lg text-foreground/70 leading-relaxed">
            Everything you need to build, manage, and optimize your partner program. All features included in every plan—no feature gatekeeping.
          </p>
        </div>

        <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-6">
          <p className="text-foreground/90 font-medium">
            ✨ <span className="text-primary font-bold">Premium-grade tools</span> with a founder-friendly philosophy. We give you access to everything from day one, even on starter plans.
          </p>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {features.map((feature, index) => (
          <div
            key={index}
            className="group bg-white rounded-2xl p-6 border-2 border-border shadow-sm hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-2 cursor-pointer"
          >
            {/* Icon Background */}
            <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${feature.lightColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <div className={`bg-gradient-to-br ${feature.color} rounded-lg p-2 text-white`}>
                {feature.icon}
              </div>
            </div>

            {/* Content */}
            <h3 className="text-lg font-bold text-foreground mb-2">{feature.title}</h3>
            <p className="text-sm text-foreground/70 leading-relaxed">{feature.description}</p>
          </div>
        ))}
      </div>

      {/* Feature Categories Section */}
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-foreground">Built for Modern Partner Programs</h2>
          <p className="text-lg text-foreground/70">Everything you need to succeed</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* For Vendors */}
          <div className="bg-gradient-to-br from-primary/5 to-primary/0 border-2 border-primary/20 rounded-2xl p-8 shadow-lg shadow-primary/10 hover:shadow-xl hover:shadow-primary/20 transition-all duration-300">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg mb-3">
                <Rocket className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-foreground">For Vendors</h3>
            </div>
            <ul className="space-y-3">
              {[
                "Campaign management & versioning",
                "Partner approval workflows",
                "Real-time performance tracking",
                "Advanced fraud detection",
                "Custom commission rules",
                "Automated payouts",
                "Webhook integrations"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="text-primary font-bold mt-1">✓</span>
                  <span className="text-foreground/80">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* For Partners */}
          <div className="bg-gradient-to-br from-primary/5 to-primary/0 border-2 border-primary/20 rounded-2xl p-8 shadow-lg shadow-primary/10 hover:shadow-xl hover:shadow-primary/20 transition-all duration-300">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg mb-3">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-foreground">For Partners</h3>
            </div>
            <ul className="space-y-3">
              {[
                "Partner dashboard & analytics",
                "Real-time earnings tracking",
                "Flexible link generation",
                "Marketing materials library",
                "Direct vendor communication",
                "Monthly payouts",
                "Multiple payment methods"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="text-primary font-bold mt-1">✓</span>
                  <span className="text-foreground/80">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Why Choose AffableLink */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-primary/20 rounded-2xl p-8 space-y-6 shadow-lg shadow-primary/10 hover:shadow-xl hover:shadow-primary/20 transition-all duration-300">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Why AffableLink Features Matter</h2>
          <p className="text-foreground/70">
            We don't lock features behind premium tiers. You get all of this, right from day one.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="text-3xl font-bold text-primary">100%</div>
            <p className="text-sm text-foreground/70">Feature Parity - Every plan has access to all features. No feature gatekeeping.</p>
          </div>
          <div className="space-y-2">
            <div className="text-3xl font-bold text-primary">24/7</div>
            <p className="text-sm text-foreground/70">Real-Time Data - All analytics and tracking update instantly, no delays.</p>
          </div>
          <div className="space-y-2">
            <div className="text-3xl font-bold text-primary">Built</div>
            <p className="text-sm text-foreground/70">by Partners - Created by someone who's lived both sides of the table.</p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-8 text-white text-center shadow-2xl shadow-primary/30">
        <h2 className="text-2xl font-bold mb-3">Ready to build your partner program?</h2>
        <p className="text-white/90 mb-6 leading-relaxed">
          Get started in less than 24 hours with all these features included. No credit card required.
        </p>
        <button className="bg-white text-primary px-8 py-3 rounded-full font-bold hover:bg-gray-100 transition-all transform hover:scale-105 shadow-lg shadow-white/30">
          Start Free Today
        </button>
      </div>
    </div>
  )
}
