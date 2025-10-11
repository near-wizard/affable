import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Rocket, Sparkles, Target, Heart, Zap, Mail, Linkedin, Twitter, Github, ArrowRight, Check, Code, Users, TrendingUp } from 'lucide-react';



export default function AboutFounder() {
  const [activeTab, setActiveTab] = useState('story');

  const milestones = [
    { year: 'High School', icon: '🍫', text: 'Top candy salesman for musical fundraising. Top Christmas decoration seller for Boy Scouts. Turns out, I was born to sell.' },
    { year: '2014-2024', icon: '🎯', text: 'Spent a decade as an affiliate partner, breaking referral records along the way.' },
    { year: 'The Pattern', icon: '🤔', text: 'Every platform I used was either built by non-partners or way too complicated.' },
    { year: 'The Realization', icon: '💻', text: 'As a software engineer, I realized: I can just build what I wish existed.' },
    { year: 'Today', icon: '🚀', text: 'Combining a lifetime of sales instinct with 10 years of partner experience and engineering skills.' },
  ];

  const principles = [
    {
      icon: <Sparkles className="text-yellow-500" />,
      title: 'No BS',
      description: 'Clear pricing. No hidden fees. No dark patterns. What you see is what you get.'
    },
    {
      icon: <Zap className="text-blue-500" />,
      title: 'Ship Fast',
      description: 'I ship features in days, not quarters. Your feedback becomes reality quickly.'
    },
    {
      icon: <Heart className="text-red-500" />,
      title: 'Actually Care',
      description: 'Your success is my success. If you win, I win. Simple as that.'
    },
    {
      icon: <Target className="text-green-500" />,
      title: 'Stay Focused',
      description: 'No feature bloat. Every line of code serves one purpose: making you money.'
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section - More Dynamic */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            {/* Fun animated emoji */}
            <div className="inline-block mb-8 relative">
              <div className="text-8xl animate-bounce rounded-full overflow-hidden">
              <Image
                src="/nearwizard.jpg"  // path relative to /public
                alt="Cartoon Profile picture of founder, animated to bounce"
                width={300}
                height={300}
            />
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-400 rounded-full border-4 border-white"></div>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tight">
              Built by Someone Who's Been
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-200 to-pink-200">
                On Both Sides of the Table
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-indigo-100 max-w-3xl mx-auto mb-8">
              A decade breaking referral records as a partner. Software engineer who builds the tools. 
              Now creating the platform that works for everyone.
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <button className="group bg-white text-purple-600 px-8 py-4 rounded-full font-bold text-lg hover:bg-yellow-300 hover:text-purple-900 transition-all transform hover:scale-105 shadow-2xl flex items-center gap-2">
                Get Started Free
                <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
              </button>
              <button className="bg-transparent border-3 border-white text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-white/10 transition-all backdrop-blur">
                Watch Demo
              </button>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/50 rounded-full mt-2"></div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 overflow-x-auto py-4">
            {['story', 'why-me', 'vision', 'connect'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 rounded-full font-semibold whitespace-nowrap transition-all ${
                  activeTab === tab
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg scale-105'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab === 'story' && '📖 The Story'}
                {tab === 'why-me' && '🎯 Why Me?'}
                {tab === 'vision' && '🚀 The Vision'}
                {tab === 'connect' && '💬 Let\'s Talk'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Story Tab */}
        {activeTab === 'story' && (
          <div className="space-y-12 animate-fadeIn">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
                From Frustrated Marketer to Builder
              </h2>
              <p className="text-xl text-gray-600">
                This platform exists because I lived the pain.
              </p>
            </div>

            {/* Timeline */}
            <div className="relative">
              <div className="absolute left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-600 to-pink-600"></div>
              <div className="space-y-8">
                {milestones.map((milestone, index) => (
                  <div key={index} className="relative pl-20">
                    <div className="absolute left-0 w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg transform hover:rotate-12 transition-transform">
                      {milestone.icon}
                    </div>
                    <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-gray-100 hover:border-purple-300 transition-all hover:-translate-y-1">
                      <div className="text-sm font-bold text-purple-600 mb-2">{milestone.year}</div>
                      <p className="text-lg text-gray-700">{milestone.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* The Real Talk Section */}
            <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 rounded-3xl p-8">
              <div className="flex items-start gap-4">
                <div className="text-4xl">🔥</div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Why This Matters to You</h3>
                  
                  <div className="mb-6">
                    <p className="text-gray-700 leading-relaxed mb-2 font-semibold">
                      <span className="text-purple-600">If you're a vendor:</span>
                    </p>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      I know what makes partners actually perform. I've been the partner who broke records, 
                      so I built the tools that attract and retain top performers. No guessing what partners need—I lived it.
                    </p>
                  </div>

                  <div className="mb-6">
                    <p className="text-gray-700 leading-relaxed mb-2 font-semibold">
                      <span className="text-blue-600">If you're a partner:</span>
                    </p>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      I've dealt with every platform headache you can imagine. Lost commissions, confusing dashboards, 
                      slow payouts. This platform exists because I built exactly what I wished existed.
                    </p>
                  </div>

                  <div className="p-4 bg-white rounded-lg border-2 border-orange-300">
                    <p className="text-gray-700 leading-relaxed font-semibold">
                      Natural salesperson + 10 years as a top partner + software engineering = 
                      a platform that actually works for both sides.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Credibility Proof */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-2xl p-6 text-center">
                <div className="text-4xl mb-3">🎯</div>
                <div className="text-3xl font-bold text-gray-900 mb-2">Born to Sell</div>
                <div className="text-gray-700">Top seller since high school fundraisers</div>
                <div className="text-xs text-gray-600 mt-2">Vendors: I know what drives performance</div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-2xl p-6 text-center">
                <div className="text-4xl mb-3">📈</div>
                <div className="text-3xl font-bold text-gray-900 mb-2">Record Breaker</div>
                <div className="text-gray-700">10 years breaking referral records as a partner</div>
                <div className="text-xs text-gray-600 mt-2">Partners: I've been in your shoes</div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-2xl p-6 text-center">
                <div className="text-4xl mb-3">💻</div>
                <div className="text-3xl font-bold text-gray-900 mb-2">Builder</div>
                <div className="text-gray-700">Engineer who codes the solution</div>
                <div className="text-xs text-gray-600 mt-2">Both: Fast, reliable tech</div>
              </div>
            </div>
          </div>
        )}

        {/* Why Me Tab */}
        {activeTab === 'why-me' && (
          <div className="space-y-12 animate-fadeIn">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
                Why Trust a Solo Founder?
              </h2>
              <p className="text-xl text-gray-600">
                Because it's actually better for you.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {principles.map((principle, index) => (
                <div
                  key={index}
                  className="group bg-gradient-to-br from-white to-gray-50 rounded-3xl p-8 border-2 border-gray-200 hover:border-purple-400 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    {principle.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">{principle.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{principle.description}</p>
                </div>
              ))}
            </div>

            {/* Stats Section */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl p-12 text-white">
              <h3 className="text-3xl font-bold mb-8 text-center">By The Numbers</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                <div className="text-center">
                  <div className="text-5xl font-black mb-2">10+</div>
                  <div className="text-purple-200">Years Experience</div>
                  <div className="text-sm text-purple-300 mt-1">(As a partner)</div>
                </div>
                <div className="text-center">
                  <div className="text-5xl font-black mb-2">🏆</div>
                  <div className="text-purple-200">Record Breaker</div>
                  <div className="text-sm text-purple-300 mt-1">(Multiple times)</div>
                </div>
                <div className="text-center">
                  <div className="text-5xl font-black mb-2">100%</div>
                  <div className="text-purple-200">Self-Built</div>
                  <div className="text-sm text-purple-300 mt-1">(Every line of code)</div>
                </div>
                <div className="text-center">
                  <div className="text-5xl font-black mb-2">0</div>
                  <div className="text-purple-200">VC Pressure</div>
                  <div className="text-sm text-purple-300 mt-1">(Bootstrapped)</div>
                </div>
              </div>
            </div>

            {/* What You Get Section */}
            <div className="bg-white rounded-3xl p-8 border-2 border-gray-200 shadow-lg">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">What Working With Me Means:</h3>
              <div className="space-y-4">
                {[
                  'I\'ve actually lived as a partner - I know what frustrates you',
                  'Technical skills to build exactly what\'s needed (no outsourcing)',
                  'Direct line to someone who\'s broken referral records',
                  'Features shipped in days by someone who codes daily',
                  'Zero BS - I\'ve been on your side of the table',
                  'A builder who understands both marketing AND engineering'
                ].map((item, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mt-1">
                      <Check className="text-white" size={16} />
                    </div>
                    <p className="text-gray-700 text-lg">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Vision Tab */}
        {activeTab === 'vision' && (
          <div className="space-y-12 animate-fadeIn">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
                Where We're Going
              </h2>
              <p className="text-xl text-gray-600">
                The future of partner marketing, minus the BS.
              </p>
            </div>

            {/* Current Status */}
            <div className="bg-white rounded-3xl p-8 border-2 border-gray-200 shadow-lg">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                Current Status
              </h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-green-50 rounded-2xl border-2 border-green-200">
                  <div className="text-3xl mb-3">✅</div>
                  <div className="font-bold text-gray-900 mb-2">Core Platform</div>
                  <div className="text-sm text-gray-600">Gathering Initial Interest, Dashboard <Link href="/vendor/dashboard" className="text-blue-600 hover:underline">Mocks for Vendors</Link> and <Link href="/partner/dashboard" className="text-blue-600 hover:underline">For Partner Sellers</Link></div>
                </div>
                <div className="text-center p-6 bg-yellow-50 rounded-2xl border-2 border-yellow-200">
                  <div className="text-3xl mb-3">🚧</div>
                  <div className="font-bold text-gray-900 mb-2">In Progress</div>
                  <div className="text-sm text-gray-600">Tracking, attribution, payouts all working </div>
                </div>
                <div className="text-center p-6 bg-blue-50 rounded-2xl border-2 border-blue-200">
                  <div className="text-3xl mb-3">🔮</div>
                  <div className="font-bold text-gray-900 mb-2">Coming Soon</div>
                  <div className="text-sm text-gray-600">Integrations, Advanced analytics, multi-currency</div>
                </div>
              </div>
            </div>

            {/* Roadmap */}
            <div className="space-y-6">
              <h3 className="text-3xl font-bold text-gray-900">Roadmap (Your Input Shapes This)</h3>
              
              {[
                { phase: 'Q4 2024', items: ['Multi-stage funnel tracking', 'PayPal & Paddle integration', 'Email automation'], status: 'active' },
                { phase: 'Q1 2025', items: ['Mobile app', 'API for custom integrations', 'Multi-language support'], status: 'planned' },
                { phase: 'Q2 2025', items: ['AI-powered insights', 'White-label options', 'Enterprise features'], status: 'planned' },
              ].map((phase, index) => (
                <div key={index} className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-purple-300 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xl font-bold text-gray-900">{phase.phase}</h4>
                    <span className={`px-4 py-1 rounded-full text-sm font-semibold ${
                      phase.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {phase.status === 'active' ? 'In Progress' : 'Planned'}
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {phase.items.map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-gray-600">
                        <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-8 text-white text-center">
              <h3 className="text-3xl font-bold mb-4">Your Feedback Matters</h3>
              <p className="text-xl text-blue-100 mb-6">
                Early users literally shape what gets built. Got an idea? I want to hear it.
              </p>
              <button className="bg-white text-purple-600 px-8 py-4 rounded-full font-bold text-lg hover:bg-yellow-300 hover:text-purple-900 transition-all transform hover:scale-105">
                Share Your Ideas
              </button>
            </div>
          </div>
        )}

        {/* Connect Tab */}
        {activeTab === 'connect' && (
          <div className="space-y-12 animate-fadeIn">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
                Let's Connect
              </h2>
              <p className="text-xl text-gray-600">
                Seriously, I actually want to talk to you.
              </p>
            </div>

            {/* Contact Cards */}
            <div className="grid md:grid-cols-2 gap-6">
              <a href="mailto:founder@yourplatform.com" className="group block">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl p-8 text-white hover:scale-105 transition-all shadow-xl">
                  <Mail size={40} className="mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="text-2xl font-bold mb-2">Email Me Directly</h3>
                  <p className="text-blue-100 mb-4">founder@yourplatform.com</p>
                  <div className="text-sm bg-white/20 rounded-full px-4 py-2 inline-block">
                    Response within 24 hours ⚡
                  </div>
                </div>
              </a>

              <a href="https://cal.com/yourname" className="group block" target="_blank" rel="noopener noreferrer">
                <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-3xl p-8 text-white hover:scale-105 transition-all shadow-xl">
                  <Rocket size={40} className="mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="text-2xl font-bold mb-2">Book a 30min Call</h3>
                  <p className="text-purple-100 mb-4">Let's chat about your needs</p>
                  <div className="text-sm bg-white/20 rounded-full px-4 py-2 inline-block">
                    Free strategy session 🎯
                  </div>
                </div>
              </a>
            </div>

            {/* Social Links */}
            <div className="bg-white rounded-3xl p-8 border-2 border-gray-200 shadow-lg">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Find Me On</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { icon: <Linkedin />, name: 'LinkedIn', url: '#', color: 'hover:bg-blue-50 hover:border-blue-400' },
                  { icon: <Twitter />, name: 'Twitter', url: '#', color: 'hover:bg-sky-50 hover:border-sky-400' },
                  { icon: <Github />, name: 'GitHub', url: '#', color: 'hover:bg-gray-50 hover:border-gray-400' },
                  { icon: <Code />, name: 'Dev.to', url: '#', color: 'hover:bg-purple-50 hover:border-purple-400' },
                ].map((social, index) => (
                  <a
                    key={index}
                    href={social.url}
                    className={`flex flex-col items-center justify-center p-6 border-2 border-gray-200 rounded-2xl transition-all ${social.color}`}
                  >
                    <div className="text-gray-700 mb-2">{social.icon}</div>
                    <div className="text-sm font-semibold text-gray-900">{social.name}</div>
                  </a>
                ))}
              </div>
            </div>

            {/* Final CTA */}
            <div className="bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 rounded-3xl p-12 text-center">
              <h3 className="text-4xl font-black text-white mb-4">Ready to Grow Your Partner Revenue?</h3>
              <p className="text-xl text-white/90 mb-8">
                Join early adopters who are already seeing results. No credit card required.
              </p>
              <button className="bg-white text-orange-600 px-12 py-5 rounded-full font-bold text-xl hover:bg-yellow-300 hover:text-orange-700 transition-all transform hover:scale-110 shadow-2xl">
                Start Free Trial →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <a
        href="#"
        className="fixed bottom-8 right-8 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-all z-50 group"
      >
        <Mail className="group-hover:rotate-12 transition-transform" size={24} />
      </a>
    </div>
  );
}