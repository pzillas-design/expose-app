import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Clock, ArrowRight } from 'lucide-react';
import { BLOG_POSTS, ContentBlock } from '@/data/blogPosts';
import { GlobalFooter } from '@/components/layout/GlobalFooter';
import { TranslationFunction } from '@/types';

const POST_IMAGES = [
    '/home/1 creation reimagined/3.jpeg',
    '/home/1 creation reimagined/4.jpeg',
    '/home/1 creation reimagined/2.jpeg',
    '/home/1 creation reimagined/12.jpeg',
    '/home/1 creation reimagined/6.jpeg',
    '/home/1 creation reimagined/6.jpeg',
];

interface BlogPostPageProps {
    t: TranslationFunction;
    onSignIn?: () => void;
}

const renderBlock = (block: ContentBlock, idx: number) => {
    switch (block.type) {
        case 'h2':
            return (
                <h2 key={idx} className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white mt-12 mb-4 first:mt-0">
                    {block.text}
                </h2>
            );
        case 'h3':
            return (
                <h3 key={idx} className="text-lg font-semibold tracking-tight text-zinc-800 dark:text-zinc-100 mt-8 mb-3">
                    {block.text}
                </h3>
            );
        case 'p':
            return (
                <p key={idx} className="text-zinc-600 dark:text-zinc-300 text-base leading-[1.8] mb-5">
                    {block.text}
                </p>
            );
        case 'ul':
            return (
                <ul key={idx} className="mb-5 flex flex-col gap-2">
                    {block.items.map((item, i) => (
                        <li key={i} className="flex gap-3 text-zinc-600 dark:text-zinc-300 text-base leading-relaxed">
                            <span className="text-zinc-300 dark:text-zinc-600 mt-1 shrink-0">–</span>
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            );
        case 'ol':
            return (
                <ol key={idx} className="mb-5 flex flex-col gap-2">
                    {block.items.map((item, i) => (
                        <li key={i} className="flex gap-3 text-zinc-600 dark:text-zinc-300 text-base leading-relaxed">
                            <span className="text-zinc-400 dark:text-zinc-500 font-mono text-sm shrink-0 mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                            <span>{item}</span>
                        </li>
                    ))}
                </ol>
            );
        case 'tip':
            return (
                <div key={idx} className="my-7 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-6 py-5">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-2">
                        {block.label ?? 'Tip'}
                    </p>
                    <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed">
                        {block.text}
                    </p>
                </div>
            );
        case 'image':
            return (
                <div key={idx} className="my-8 rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                    <img
                        src={block.src}
                        alt={block.alt ?? ''}
                        className="w-full object-cover aspect-[16/9]"
                    />
                    {block.caption && (
                        <p className="px-4 py-2.5 text-[11px] text-zinc-400 dark:text-zinc-500 text-center">
                            {block.caption}
                        </p>
                    )}
                </div>
            );
        default:
            return null;
    }
};

export const BlogPostPage: React.FC<BlogPostPageProps> = ({ t, onSignIn }) => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();

    const postIndex = BLOG_POSTS.findIndex(p => p.slug === slug);
    const post = BLOG_POSTS[postIndex];
    const nextPost = BLOG_POSTS[postIndex + 1] ?? BLOG_POSTS[0];
    const heroImage = post?.coverImage ?? POST_IMAGES[postIndex % POST_IMAGES.length];

    if (!post) {
        return (
            <div className="bg-white dark:bg-zinc-950 min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-zinc-500 text-sm mb-4">Post not found.</p>
                    <button onClick={() => navigate('/blog')} className="text-zinc-900 dark:text-white text-sm underline underline-offset-4">
                        Back to blog
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 min-h-screen flex flex-col">

            {/* Space for expanded hero navbar (88px mobile / 148px desktop) */}
            <div className="h-[88px] md:h-[148px] shrink-0" />

            {/* Hero image — full width, tall */}
            <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] max-h-[60vh] overflow-hidden bg-zinc-100 dark:bg-zinc-900">
                <img
                    src={heroImage}
                    alt={post.title}
                    className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/30" />
            </div>

            {/* Title block */}
            <div className="w-full max-w-2xl mx-auto px-5 sm:px-8 pt-10 pb-8 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-4 mb-5">
                    <span className="text-[10px] font-medium tracking-widest uppercase text-zinc-400">
                        {post.category}
                    </span>
                    <span className="text-zinc-200 dark:text-zinc-700">·</span>
                    <span className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                        <Clock className="w-3 h-3" />
                        {post.readTime} min read
                    </span>
                    <span className="text-zinc-200 dark:text-zinc-700">·</span>
                    <span className="text-[11px] text-zinc-400">{post.date}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-zinc-900 dark:text-white leading-[1.2]">
                    {post.title}
                </h1>
                <p className="mt-4 text-zinc-500 dark:text-zinc-400 text-base leading-relaxed">
                    {post.excerpt}
                </p>
            </div>

            {/* Article body */}
            <main className="flex-1 w-full max-w-2xl mx-auto px-5 sm:px-8 pt-10 pb-20">
                {post.content.length > 0 ? (
                    post.content.map((block, idx) => renderBlock(block, idx))
                ) : (
                    <p className="text-zinc-400 text-sm italic">This article is coming soon.</p>
                )}
            </main>

            {/* CTA Banner */}
            <div className="w-full border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                <div className="max-w-2xl mx-auto px-5 sm:px-8 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                    <div>
                        <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 mb-2">
                            Try it yourself
                        </p>
                        <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
                            Ready to generate your first image?
                        </h3>
                        <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
                            Start free — no credit card required.
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/')}
                        className="shrink-0 flex items-center gap-2 px-5 h-10 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium rounded-full hover:bg-zinc-700 dark:hover:bg-zinc-100 transition-colors duration-200"
                    >
                        Open exposé <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Next article */}
            {nextPost && nextPost.slug !== post.slug && (
                <div
                    onClick={() => navigate(`/blog/${nextPost.slug}`)}
                    className="group cursor-pointer w-full border-t border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                >
                    <div className="max-w-2xl mx-auto px-5 sm:px-8 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 mb-1.5">
                                Next article
                            </p>
                            <h3 className="text-sm font-medium text-zinc-900 dark:text-white group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
                                {nextPost.title}
                            </h3>
                        </div>
                        <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-1 group-hover:text-zinc-900 dark:group-hover:text-white transition-all duration-200 shrink-0" />
                    </div>
                </div>
            )}

            <GlobalFooter t={t} />
        </div>
    );
};
