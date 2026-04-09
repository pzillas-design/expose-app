import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Clock } from 'lucide-react';
import { BLOG_POSTS, BlogPost, getTranslation } from '@/data/blogPosts';
import { GlobalFooter } from '@/components/layout/GlobalFooter';
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
            className="group cursor-pointer grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] rounded-2xl overflow-hidden transition-all duration-300"
        >
            {/* Cover */}
            <div className="aspect-[4/3] lg:aspect-auto lg:min-h-[380px] relative overflow-hidden rounded-2xl lg:rounded-r-none">
                <img
                    src={coverImage}
                    alt={title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-300" />
            </div>

            {/* Content */}
            <div className="flex flex-col justify-between p-8 lg:p-12 bg-zinc-50 dark:bg-zinc-900 rounded-2xl lg:rounded-l-none">
                <div className="flex flex-col gap-4">
                    <span className="text-xs text-zinc-400 dark:text-zinc-500 flex items-center gap-3">
                        <span>{post.date}</span>
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {post.readTime} min
                        </span>
                    </span>
                    <h2 className="text-3xl lg:text-4xl font-semibold tracking-tight text-zinc-900 dark:text-white leading-[1.1]">
                        {title}
                    </h2>
                    <p className="text-zinc-500 dark:text-zinc-400 text-base leading-relaxed max-w-lg">
                        {excerpt}
                    </p>
                </div>

                <div className="flex items-center justify-start mt-10">
                    <div className="w-9 h-9 rounded-full border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-400 dark:text-zinc-500 group-hover:bg-zinc-900 group-hover:border-zinc-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:border-white dark:group-hover:text-zinc-900 transition-all duration-200">
                        <ChevronRight className="w-4 h-4" />
                    </div>
                </div>
            </div>
        </article>
    );
};

export const BlogPage: React.FC<BlogPageProps> = ({ t, lang = 'en' }) => {
    return (
        <div className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 min-h-screen flex flex-col">

            <main className="flex-1 w-full max-w-6xl mx-auto px-5 sm:px-8 pt-28 sm:pt-40 pb-20">

                {/* Heading */}
                <div className="mb-14">
                    <h1 className="text-5xl sm:text-7xl font-bold tracking-tight text-zinc-900 dark:text-white">
                        Blog
                    </h1>
                </div>

                {/* Cards */}
                <div className="flex flex-col gap-6">
                    {BLOG_POSTS.map((post, idx) => (
                        <PostCard key={post.slug} post={post} index={idx} lang={lang} />
                    ))}
                </div>
            </main>

            <GlobalFooter t={t} />
        </div>
    );
};
