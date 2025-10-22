import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Calendar, User, Share2 } from 'lucide-react';
import { blogPosts, getPostBySlug } from '@/content/blog/blogs';

interface BlogPostProps {
  params: {
    slug: string;
  };
}

export async function generateStaticParams() {
  return blogPosts.map(post => ({
    slug: post.slug,
  }));
}

export async function generateMetadata(
  { params }: BlogPostProps
): Promise<Metadata> {
  const post = getPostBySlug(params.slug);

  if (!post) {
    return {
      title: 'Blog Post Not Found',
      description: 'This blog post does not exist',
    };
  }

  return {
    title: `${post.title} - AffableLink Blog`,
    description: post.excerpt,
    keywords: [post.category, 'affiliate', 'partner programs', 'SaaS'],
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: `https://affablelink.com/blog/${params.slug}`,
      type: 'article',
      authors: [post.author],
      publishedTime: post.date,
      tags: [post.category],
    },
  };
}

export default function BlogPost({ params }: BlogPostProps) {
  const post = getPostBySlug(params.slug);

  if (!post) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-4xl font-bold text-white mb-4">Post Not Found</h1>
          <p className="text-xl text-slate-300 mb-8">
            This blog post doesn't exist. Check back soon for new content!
          </p>
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all"
          >
            <ArrowLeft size={18} />
            Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-2000"></div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-slate-700 backdrop-blur-md">
          <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 font-semibold mb-6 transition-colors"
            >
              <ArrowLeft size={18} />
              Back to Blog
            </Link>

            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-4 py-2 bg-blue-500/20 text-blue-300 text-xs font-bold rounded-full border border-blue-400/30">
                    {post.category}
                  </span>
                  <span className="text-sm text-slate-400">{post.readTime} min read</span>
                </div>
                <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight">{post.title}</h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-sm text-slate-400 pt-6 border-t border-slate-700">
              <div className="flex items-center gap-2">
                <Calendar size={16} />
                {new Date(post.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
              <div className="flex items-center gap-2">
                <User size={16} />
                {post.author}
              </div>
              <button className="flex items-center gap-2 hover:text-blue-400 transition-colors">
                <Share2 size={16} />
                Share
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-8 py-16">
          <article className="prose prose-invert max-w-none">
            {/* Excerpt */}
            <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-400/30 rounded-2xl p-8 mb-12">
              <p className="text-lg text-slate-200 font-medium leading-relaxed m-0">{post.excerpt}</p>
            </div>

            {/* Article Body */}
            <div className="bg-slate-800/50 rounded-2xl p-8 sm:p-12 border border-slate-700 backdrop-blur-sm prose prose-invert prose-sm sm:prose-base max-w-none">
              {/* Parse markdown content and render as HTML */}
              <div className="text-slate-300 leading-relaxed">
                {post.content.split('\n\n').map((paragraph, idx) => {
                  // Handle headings
                  if (paragraph.startsWith('# ')) {
                    return <h1 key={idx} className="text-3xl font-bold text-white mt-8 mb-4">{paragraph.slice(2)}</h1>
                  }
                  if (paragraph.startsWith('## ')) {
                    return <h2 key={idx} className="text-2xl font-bold text-white mt-6 mb-3">{paragraph.slice(3)}</h2>
                  }
                  if (paragraph.startsWith('### ')) {
                    return <h3 key={idx} className="text-xl font-bold text-white mt-5 mb-2">{paragraph.slice(4)}</h3>
                  }
                  // Handle lists
                  if (paragraph.startsWith('- ')) {
                    const items = paragraph.split('\n').filter(line => line.startsWith('- '));
                    return (
                      <ul key={idx} className="list-disc list-inside space-y-2 mb-4">
                        {items.map((item, i) => (
                          <li key={i}>{item.slice(2)}</li>
                        ))}
                      </ul>
                    );
                  }
                  if (/^\d+\./.test(paragraph)) {
                    const items = paragraph.split('\n').filter(line => /^\d+\./.test(line));
                    return (
                      <ol key={idx} className="list-decimal list-inside space-y-2 mb-4">
                        {items.map((item, i) => (
                          <li key={i}>{item.replace(/^\d+\.\s/, '')}</li>
                        ))}
                      </ol>
                    );
                  }
                  // Handle bold text
                  const processedText = paragraph
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                    .replace(/`(.*?)`/g, '<code className="bg-slate-900 px-2 py-1 rounded">$1</code>');

                  return <p key={idx} className="mb-4">{processedText}</p>;
                })}
              </div>
            </div>
          </article>

          {/* CTA Section */}
          <div className="mt-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to Launch Your Partner Program?</h2>
            <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
              See how AffableLink can help you build a world-class affiliate program in hours, not months.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-all"
              >
                Try AffableLink
              </Link>
              <Link
                href="/features"
                className="inline-flex items-center justify-center gap-2 bg-white/20 text-white px-8 py-3 rounded-lg font-semibold border-2 border-white/30 hover:bg-white/30 transition-all"
              >
                See Features
              </Link>
            </div>
          </div>

          {/* More Articles */}
          <div className="mt-16">
            <h2 className="text-3xl font-bold text-white mb-6">More Articles Coming</h2>
            <p className="text-slate-400 text-lg">
              We're continuously publishing deep dives into affiliate programs, partner marketing, and SaaS growth. Stay tuned for more insights!
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
