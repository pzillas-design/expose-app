import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { BLOG_POSTS, BlogPost, getTranslation } from '@/data/blogPosts';
import { GlobalFooter } from '@/components/layout/GlobalFooter';
import { PageSEO } from '@/components/seo/PageSEO';
import { TranslationFunction } from '@/types';

interface BlogPageProps {
    t: TranslationFunction;
    onSignIn?: () => void;
    lang?: string;
}

const POST_IMAGES = [
    '/home/1 creation reimagined/3.jpeg',
    '/home/1 creation reimagined/4.jpeg',
    '/home/1 creation reimagined/2.jpeg',
    '/home/1 creation reimagined/12.jpeg',
    '/home/1 creation reimagined/6.jpeg',
];

const PostCard: React.FC<{ post: BlogPost; index: number; lang: string }> = ({ post, index, lang }) => {
    const navigate = useNavigate();
    const coverImage = post.coverImage ?? POST_IMAGES[index % POST_IMAGES.length];
    const { title, excerpt } = getTranslation(post, lang);

    return (
        <article
            onClick={() => navigate(`/blog/${post.slug}`)}
            className="group cursor-pointer grid grid-cols-1 md:grid-cols-[1fr_1.2fr] rounded-2xl overflow-hidden transition-all duration-300"
        >
            {/* Cover */}
            <div className="aspect-[16/9] md:aspect-auto md:min-h-[280px] lg:min-h-[360px] relative overflow-hidden">
                <img
                    src={coverImage}
                    alt={title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-300" />
            </div>

            {/* Content */}
            <div className="flex flex-col justify-between p-8 md:p-10 lg:p-14 bg-zinc-50 dark:bg-zinc-900">
                <div className="flex flex-col gap-4">
                    <h2 className="text-xl md:text-2xl lg:text-4xl font-semibold tracking-tight text-zinc-900 dark:text-white leading-[1.15]">
                        {title}
                    </h2>
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm md:text-base leading-relaxed">
                        {excerpt}
                    </p>
                </div>

                {/* Date + Chevron — bottom */}
                <div className="flex items-center justify-between mt-8">
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">
                        {post.date}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-zinc-200/80 dark:bg-zinc-700/60 flex items-center justify-center text-zinc-500 dark:text-zinc-400 group-hover:bg-zinc-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-zinc-900 transition-all duration-200">
                        <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                </div>
            </div>
        </article>
    );
};

export const BlogPage: React.FC<BlogPageProps> = ({ t, lang = 'en' }) => {
    const [activeCategory, setActiveCategory] = useState<string | null>(null);

    const categories = useMemo(() => {
        const seen = new Set<string>();
        BLOG_POSTS.forEach(p => seen.add(p.category));
        return Array.from(seen);
    }, []);

    const filtered = useMemo(() =>
        activeCategory ? BLOG_POSTS.filter(p => p.category === activeCategory) : BLOG_POSTS,
        [activeCategory]
    );

    return (
        <div className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 min-h-screen flex flex-col">
            <PageSEO
                title="Blog"
                description="Guides, tutorials and use cases for AI image creation with exposé — visual prompting, staging, product photography and more."
                canonical="https://expose.ae/blog"
                ogType="website"
            />

            <main className="flex-1 w-full max-w-6xl mx-auto px-5 sm:px-8 pt-24 sm:pt-40 pb-20">

                {/* Heading + Pills */}
                <div className="mb-10 sm:mb-14 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <h1 className="text-4xl sm:text-7xl font-bold tracking-tight text-zinc-900 dark:text-white">
                        Blog
                    </h1>
                    <div className="flex items-center gap-2 flex-wrap sm:justify-end sm:pb-2">
                        <button
                            onClick={() => setActiveCategory(null)}
                            className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                                activeCategory === null
                                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                                    : 'bg-zinc-200/70 dark:bg-zinc-800/70 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                            }`}
                        >
                            All
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
                                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                                    activeCategory === cat
                                        ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                                        : 'bg-zinc-200/70 dark:bg-zinc-800/70 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Cards */}
                <div className="flex flex-col gap-5 sm:gap-8">
                    {filtered.map((post, idx) => (
                        <PostCard key={post.slug} post={post} index={BLOG_POSTS.indexOf(post)} lang={lang} />
                    ))}
                </div>
            </main>

            <GlobalFooter t={t} />
        </div>
    );
};
