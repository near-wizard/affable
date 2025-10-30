import { Metadata } from 'next';
import { rfds } from '@/content/rfd/rfds';
import Link from 'next/link';
import { ExternalLink, MessageCircle, Calendar, User, Tag } from 'lucide-react';

export const metadata: Metadata = {
  title: 'RFDs - AffableLink | Requests for Discussion',
  description: 'Explore AffableLink RFDs (Requests for Discussion). Learn about our architectural decisions, market strategy, database design, and the reasoning behind our platform design.',
  keywords: ['RFD', 'requests for discussion', 'architecture', 'design decisions', 'platform development'],
  openGraph: {
    title: 'RFDs - AffableLink | Requests for Discussion',
    description: 'Transparent design decisions through structured RFD discussions',
    url: 'https://affablelink.com/rfd',
    type: 'website',
  },
};

const stateConfig = {
  prediscussion: { badge: 'bg-muted text-slate-700', icon: '💭', label: 'Pre-Discussion' },
  ideation: { badge: 'bg-amber-100 text-amber-700', icon: '💡', label: 'Ideation' },
  discussion: { badge: 'bg-cyan-100 text-cyan-700', icon: '💬', label: 'Discussion' },
  published: { badge: 'bg-emerald-100 text-emerald-700', icon: '📚', label: 'Published' },
  committed: { badge: 'bg-violet-100 text-violet-700', icon: '✅', label: 'Committed' },
  abandoned: { badge: 'bg-rose-100 text-primary', icon: '🗑️', label: 'Abandoned' },
};

export default function RFDsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-8">
      {/* SEO Header */}
      <header className="mb-12">
        <h1 className="text-4xl font-bold text-foreground mb-4">RFDs</h1>
        <p className="text-xl text-foreground max-w-3xl leading-relaxed">
          Requests for Discussion (RFDs) are design documents that propose new features, architectural decisions, and significant changes to AffableLink. We believe in transparent, collaborative decision-making.
        </p>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto">
        {/* What are RFDs Section */}
        <article className="bg-white rounded-2xl shadow-lg p-8 mb-12">
          <section className="mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-6">What are RFDs?</h2>
            <p className="text-lg text-foreground mb-4 leading-relaxed">
              An RFD is a document that proposes a major feature or a significant change to AffableLink's architecture, strategy, or product direction. RFDs are inspired by the Requests for Discussion process used at companies like Oxide Computer.
            </p>
            <p className="text-lg text-foreground mb-4 leading-relaxed">
              Rather than making decisions behind closed doors, we document our reasoning and invite community input. This ensures our decisions are well-thought-out and benefit from diverse perspectives.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-6">RFD States</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-muted rounded-lg p-4 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">💭</span>
                  <h3 className="font-bold text-foreground">Pre-Discussion</h3>
                </div>
                <p className="text-muted-foreground text-sm">Early idea stage, not yet ready for feedback</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">💡</span>
                  <h3 className="font-bold text-foreground">Ideation</h3>
                </div>
                <p className="text-muted-foreground text-sm">Idea is being developed and refined</p>
              </div>
              <div className="bg-cyan-50 rounded-lg p-4 border border-cyan-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">💬</span>
                  <h3 className="font-bold text-foreground">Discussion</h3>
                </div>
                <p className="text-muted-foreground text-sm">Open discussion and community feedback</p>
              </div>
              <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">📚</span>
                  <h3 className="font-bold text-foreground">Published</h3>
                </div>
                <p className="text-muted-foreground text-sm">Complete and published for reference</p>
              </div>
              <div className="bg-violet-50 rounded-lg p-4 border border-violet-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">✅</span>
                  <h3 className="font-bold text-foreground">Committed</h3>
                </div>
                <p className="text-muted-foreground text-sm">Approved and implementation started</p>
              </div>
              <div className="bg-primary/10 rounded-lg p-4 border border-rose-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🗑️</span>
                  <h3 className="font-bold text-foreground">Abandoned</h3>
                </div>
                <p className="text-muted-foreground text-sm">Decided against or no longer relevant</p>
              </div>
            </div>
          </section>
        </article>

        {/* RFDs List */}
        <article className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-3xl font-bold text-foreground mb-8">Active RFDs</h2>

          <div className="space-y-4">
            {rfds.map((rfd) => {
              const config = stateConfig[rfd.state];
              return (
                <div
                  key={rfd.number}
                  className="border-2 border-border rounded-lg p-6 hover:border-blue-400 transition-colors"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-2xl">{config.icon}</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${config.badge}`}>
                          {config.label}
                        </span>
                      </div>
                      <Link
                        href={`/rfd/${rfd.number}`}
                        className="text-2xl font-bold text-primary hover:text-blue-800 transition-colors"
                      >
                        RFD {rfd.number}: {rfd.title}
                      </Link>
                    </div>
                  </div>

                  {/* Metadata Row */}
                  <div className="flex flex-wrap gap-6 mb-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} />
                      {new Date(rfd.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                    <div className="flex items-center gap-2">
                      <User size={16} />
                      {rfd.authors.join(', ')}
                    </div>
                    {rfd.labels.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Tag size={16} />
                        {rfd.labels.join(', ')}
                      </div>
                    )}
                  </div>

                  {/* Preview */}
                  <p className="text-foreground mb-4 line-clamp-2">
                    {rfd.content.split('\n')[2] || rfd.content.substring(0, 200)}
                  </p>

                  {/* CTA */}
                  <div className="flex items-center gap-4">
                    <Link
                      href={`/rfd/${rfd.number}`}
                      className="inline-flex items-center gap-2 text-primary hover:text-blue-800 font-semibold transition-colors"
                    >
                      Read More →
                    </Link>
                    {rfd.discussion && (
                      <a
                        href={rfd.discussion}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <MessageCircle size={16} />
                        Discussion
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      </main>
    </div>
  );
}
