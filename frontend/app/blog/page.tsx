import { Metadata } from 'next';
import Link from 'next/link';
import { Calendar, User, ArrowRight, BookOpen, Mail } from 'lucide-react';
import { blogPosts, type BlogPost } from '@/content/blog/blogs';

export const metadata: Metadata = {
  title: 'Blog - AffableLink | Affiliate & Partner Program Insights',
  description: 'Learn about affiliate programs, partner marketing, commission strategies, and SaaS growth. Expert insights for founders building partner programs.',
  keywords: ['affiliate marketing', 'partner programs', 'SaaS growth', 'founder insights', 'commission strategies'],
  openGraph: {
    title: 'Blog - AffableLink',
    description: 'Founder-focused insights on building and scaling partner programs',
    url: 'https://affablelink.com/blog',
    type: 'website',
  },
};

const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  'Getting Started': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  'Security': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  'Strategy': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  'Design': { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
  'Engineering': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
};

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-2000"></div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Hero Header */}
        <header className="pt-16 pb-20 px-4 sm:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <BookOpen className="text-white" size={28} />
              </div>
              <span className="text-blue-400 font-semibold text-lg">Knowledge Base</span>
            </div>
            <h1 className="text-5xl sm:text-6xl font-bold text-white mb-6 leading-tight">
              Insights for <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Modern Founders</span>
            </h1>
            <p className="text-xl text-slate-300 max-w-2xl leading-relaxed">
              Deep dives into affiliate programs, partner marketing, and SaaS growth. Learn from experts building the fastest affiliate platform.
            </p>
          </div>
        </header>

        {/* Main Content */}
        <main className="px-4 sm:px-8 pb-20">
          <div className="max-w-5xl mx-auto">
            {/* Blog Posts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
              {blogPosts.map((post, index) => {
                const colors = categoryColors[post.category] || categoryColors['Getting Started'];
                const isFeatured = index === 0;

                return (
                  <Link key={post.slug} href={`/blog/${post.slug}`}>
                    <article
                      className={`group h-full bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl overflow-hidden hover:from-slate-700 hover:to-slate-600 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl border border-slate-700 hover:border-blue-500 cursor-pointer ${
                        isFeatured ? 'lg:col-span-2' : ''
                      }`}
                    >
                      <div className="p-8 h-full flex flex-col">
                        {/* Icon and Category */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <span className={`text-4xl`}>{post.icon}</span>
                            <span className={`px-4 py-2 ${colors.bg} ${colors.text} text-xs font-bold rounded-full border ${colors.border}`}>
                              {post.category}
                            </span>
                          </div>
                          <div className="text-slate-500 text-sm">{post.readTime} min</div>
                        </div>

                        {/* Title */}
                        <h2 className={`font-bold text-slate-100 mb-4 group-hover:text-blue-300 transition-colors ${isFeatured ? 'text-3xl' : 'text-2xl'}`}>
                          {post.title}
                        </h2>

                        {/* Excerpt */}
                        <p className="text-slate-300 mb-6 leading-relaxed flex-grow">
                          {post.excerpt}
                        </p>

                        {/* Footer with metadata and CTA */}
                        <div className="flex items-center justify-between pt-6 border-t border-slate-600">
                          <div className="flex items-center gap-4 text-sm text-slate-400">
                            <div className="flex items-center gap-2">
                              <Calendar size={16} />
                              {new Date(post.date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </div>
                            <div className="flex items-center gap-2">
                              <User size={16} />
                              {post.author}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-blue-400 group-hover:text-blue-300 font-semibold">
                            Read <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </div>
                    </article>
                  </Link>
                );
              })}
            </div>

            {/* Newsletter CTA Section */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-center mb-12">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-white/20 rounded-lg">
                  <Mail className="text-white" size={32} />
                </div>
              </div>
              <h3 className="text-3xl font-bold text-white mb-3">Stay Updated</h3>
              <p className="text-blue-100 max-w-2xl mx-auto mb-8">
                Get notified when we publish new insights on affiliate programs, partner marketing, and scaling SaaS businesses.
              </p>
              <form className="flex gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="your@email.com"
                  className="flex-1 px-6 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-blue-100 focus:outline-none focus:bg-white/30 focus:border-white/50 transition-all"
                />
                <button
                  type="submit"
                  className="px-8 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors hover:shadow-lg"
                >
                  Subscribe
                </button>
              </form>
            </div>

            {/* Stats Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 text-center">
                <div className="text-4xl font-bold text-blue-400 mb-2">5</div>
                <p className="text-slate-300">Insightful Articles</p>
              </div>
              <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 text-center">
                <div className="text-4xl font-bold text-purple-400 mb-2">1hr+</div>
                <p className="text-slate-300">Total Reading Time</p>
              </div>
              <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 text-center">
                <div className="text-4xl font-bold text-pink-400 mb-2">Expert</div>
                <p className="text-slate-300">Quality Content</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
