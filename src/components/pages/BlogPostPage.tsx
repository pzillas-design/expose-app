import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { BLOG_POSTS, ContentBlock, getTranslation } from '@/data/blogPosts';
import { GlobalFooter } from '@/components/layout/GlobalFooter';
import { Button } from '@/components/ui/DesignSystem';
import { PageSEO } from '@/components/seo/PageSEO';
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
    lang?: string;
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
                <div key={idx} className="my-7 rounded-xl border border-orange-200 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-950/30 px-6 py-5">
                    <p className="text-xs font-semibold text-orange-500 dark:text-orange-400 mb-2">
                        {block.label ?? 'Tip'}
                    </p>
                    <p className="text-zinc-700 dark:text-zinc-300 text-sm leading-relaxed">
                        {block.text}
                    </p>
                </div>
            );
        case 'image':
            return (
                <div key={idx} className="my-8 rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                    <img
                        src={block.src}
                        alt={block.alt ?? block.caption ?? ''}
                        className="w-full object-cover"
                    />
                </div>
            );
        default:
            return null;
    }
};

export const BlogPostPage: React.FC<BlogPostPageProps> = ({ t, onSignIn, lang = 'en' }) => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();

    const postIndex = BLOG_POSTS.findIndex(p => p.slug === slug);
    const post = BLOG_POSTS[postIndex];
    const heroImage = post?.coverImage ?? POST_IMAGES[postIndex % POST_IMAGES.length];
    const { title, excerpt, content } = post ? getTranslation(post, lang) : { title: '', excerpt: '', content: [] };

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
            <PageSEO
                title={title}
                description={excerpt}
                canonical={`https://expose.ae/blog/${post.slug}`}
                ogImage={heroImage}
                ogType="article"
                publishedTime={post.isoDate}
                jsonLd={{
                    "@context": "https://schema.org",
                    "@type": "Article",
                    "headline": title,
                    "description": excerpt,
                    "image": heroImage.startsWith('http') ? heroImage : `https://expose.ae${heroImage}`,
                    "datePublished": post.isoDate,
                    "author": { "@type": "Organization", "name": "exposé" },
                    "publisher": {
                        "@type": "Organization",
                        "name": "exposé",
                        "url": "https://expose.ae"
                    },
                    "url": `https://expose.ae/blog/${post.slug}`
                }}
            />

            {/* Space for expanded hero navbar (88px mobile / 148px desktop) */}
            <div className="h-[88px] md:h-[148px] shrink-0" />

            {/* Hero image — full width, tall */}
            <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] max-h-[60vh] overflow-hidden bg-zinc-100 dark:bg-zinc-900">
                <img
                    src={heroImage}
                    alt={title}
                    className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/30" />
            </div>

            {/* Title block */}
            <div className="w-full max-w-3xl mx-auto px-5 sm:px-8 pt-10 pb-8 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-3 mb-5">
                    <span className="px-3 py-1.5 rounded-lg text-[12px] font-medium bg-zinc-200/70 dark:bg-zinc-800/70 text-zinc-500 dark:text-zinc-400">
                        {post.category}
                    </span>
                    <span className="text-[11px] text-zinc-400 dark:text-zinc-500">{post.date}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-zinc-900 dark:text-white leading-[1.2]">
                    {title}
                </h1>
                <p className="mt-4 text-zinc-500 dark:text-zinc-400 text-base leading-relaxed">
                    {excerpt}
                </p>
            </div>

            {/* Article body */}
            <main className="flex-1 w-full max-w-3xl mx-auto px-5 sm:px-8 pt-10 pb-20">
                {content.length > 0 ? (
                    content.map((block, idx) => renderBlock(block, idx))
                ) : (
                    <p className="text-zinc-400 text-sm italic">This article is coming soon.</p>
                )}
            </main>

            {/* CTA Banner */}
            <div className="relative w-full overflow-hidden bg-zinc-950 dark:bg-zinc-950">
                {/* Orange glow */}
                <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-orange-500/20 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute top-1/2 -translate-y-1/2 -left-16 w-72 h-72 bg-orange-400/15 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute top-1/2 -translate-y-1/2 -right-16 w-72 h-72 bg-amber-500/15 rounded-full blur-[100px] pointer-events-none" />

                <div className="relative z-10 max-w-3xl mx-auto px-5 sm:px-8 py-24 sm:py-32 flex flex-col items-center text-center gap-8">
                    <h3 className="text-4xl sm:text-6xl md:text-7xl font-kumbh font-semibold tracking-tighter text-white leading-tight">
                        ready to try it yourself?
                    </h3>
                    <Button
                        onClick={() => navigate('/')}
                        variant="white"
                        size="l"
                        icon={<ChevronRight />}
                        iconPosition="right"
                    >
                        open exposé
                    </Button>
                </div>
            </div>

            <GlobalFooter t={t} />
        </div>
    );
};
