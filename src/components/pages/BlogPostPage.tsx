import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, ArrowRight } from 'lucide-react';
import { BLOG_POSTS, ContentBlock } from '@/data/blogPosts';
import { GlobalFooter } from '@/components/layout/GlobalFooter';
import { TranslationFunction } from '@/types';

interface BlogPostPageProps {
    t: TranslationFunction;
    onSignIn?: () => void;
}

const renderBlock = (block: ContentBlock, idx: number) => {
    switch (block.type) {
        case 'h2':
            return (
                <h2 key={idx} className="text-xl sm:text-2xl font-semibold tracking-tight text-white mt-12 mb-4 first:mt-0">
                    {block.text}
                </h2>
            );
        case 'h3':
            return (
                <h3 key={idx} className="text-lg font-semibold tracking-tight text-zinc-100 mt-8 mb-3">
                    {block.text}
                </h3>
            );
        case 'p':
            return (
                <p key={idx} className="text-zinc-300 text-base leading-[1.8] mb-5">
                    {block.text}
                </p>
            );
        case 'ul':
            return (
                <ul key={idx} className="mb-5 flex flex-col gap-2">
                    {block.items.map((item, i) => (
                        <li key={i} className="flex gap-3 text-zinc-300 text-base leading-relaxed">
                            <span className="text-zinc-600 mt-1 shrink-0">–</span>
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            );
        case 'ol':
            return (
                <ol key={idx} className="mb-5 flex flex-col gap-2">
                    {block.items.map((item, i) => (
                        <li key={i} className="flex gap-3 text-zinc-300 text-base leading-relaxed">
                            <span className="text-zinc-500 font-mono text-sm shrink-0 mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                            <span>{item}</span>
                        </li>
                    ))}
                </ol>
            );
        case 'tip':
            return (
                <div key={idx} className="my-7 rounded-xl border border-zinc-700 bg-zinc-900 px-6 py-5">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">
                        {block.label ?? 'Tip'}
                    </p>
                    <p className="text-zinc-300 text-sm leading-relaxed">
                        {block.text}
                    </p>
                </div>
            );
        default:
            return null;
    }
};

export const BlogPostPage: React.FC<BlogPostPageProps> = ({ t, onSignIn }) => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();

    const post = BLOG_POSTS.find(p => p.slug === slug);
    const currentIdx = BLOG_POSTS.findIndex(p => p.slug === slug);
    const nextPost = BLOG_POSTS[currentIdx + 1] ?? BLOG_POSTS[0];

    if (!post) {
        return (
            <div className="bg-zinc-950 min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-zinc-500 text-sm mb-4">Post not found.</p>
                    <button onClick={() => navigate('/blog')} className="text-white text-sm underline underline-offset-4">
                        Back to blog
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-zinc-950 text-white min-h-screen flex flex-col">

            {/* Hero */}
            <div className={`w-full bg-gradient-to-br ${post.coverGradient} relative`}>
                <div className="w-full max-w-6xl mx-auto px-5 sm:px-8 pt-20 pb-14 sm:pt-28 sm:pb-20">
                    {/* Back */}
                    <button
                        onClick={() => navigate('/blog')}
                        className="flex items-center gap-2 text-white/60 hover:text-white text-sm transition-colors duration-200 mb-10 group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-200" />
                        Blog
                    </button>

                    {/* Meta */}
                    <div className="flex items-center gap-4 mb-5">
                        <span className="px-2 py-0.5 text-[10px] font-mono font-medium tracking-widest uppercase bg-white/10 text-white/70 rounded-md">
                            {post.category}
                        </span>
                        <span className="flex items-center gap-1.5 text-[11px] font-mono text-white/50 uppercase tracking-wide">
                            <Clock className="w-3 h-3" />
                            {post.readTime} min read
                        </span>
                        <span className="text-[11px] font-mono text-white/50 uppercase tracking-wide">
                            {post.date}
                        </span>
                    </div>

                    {/* Title */}
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-white leading-[1.15] max-w-3xl">
                        {post.title}
                    </h1>

                    {/* Excerpt */}
                    <p className="mt-5 text-white/60 text-base sm:text-lg leading-relaxed max-w-2xl">
                        {post.excerpt}
                    </p>
                </div>
            </div>

            {/* Article body */}
            <main className="flex-1 w-full max-w-2xl mx-auto px-5 sm:px-8 pt-14 pb-20">
                {post.content.length > 0 ? (
                    post.content.map((block, idx) => renderBlock(block, idx))
                ) : (
                    <p className="text-zinc-500 text-sm italic">This article is coming soon.</p>
                )}
            </main>

            {/* CTA Banner */}
            <div className="w-full border-t border-zinc-800 bg-zinc-900">
                <div className="max-w-6xl mx-auto px-5 sm:px-8 py-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                    <div>
                        <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">
                            Try it yourself
                        </p>
                        <h3 className="text-lg font-semibold text-white">
                            Ready to generate your first image?
                        </h3>
                        <p className="text-zinc-400 text-sm mt-1">
                            Start free — no credit card required.
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/')}
                        className="shrink-0 flex items-center gap-2 px-5 h-10 bg-white text-zinc-950 text-sm font-medium rounded-full hover:bg-zinc-100 transition-colors duration-200"
                    >
                        Open exposé <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Next article */}
            {nextPost && nextPost.slug !== post.slug && (
                <div
                    onClick={() => navigate(`/blog/${nextPost.slug}`)}
                    className={`group cursor-pointer w-full bg-gradient-to-br ${nextPost.coverGradient} border-t border-zinc-800`}
                >
                    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <p className="text-[10px] font-mono uppercase tracking-widest text-white/40 mb-2">
                                Next article
                            </p>
                            <h3 className="text-base font-semibold text-white group-hover:opacity-80 transition-opacity">
                                {nextPost.title}
                            </h3>
                        </div>
                        <ArrowRight className="w-5 h-5 text-white/50 group-hover:translate-x-1 group-hover:text-white transition-all duration-200 shrink-0" />
                    </div>
                </div>
            )}

            <GlobalFooter t={t} />
        </div>
    );
};
