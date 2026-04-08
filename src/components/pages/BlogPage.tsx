import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Clock, Sun, Moon } from 'lucide-react';
import { BLOG_POSTS, BlogPost } from '@/data/blogPosts';
import { GlobalFooter } from '@/components/layout/GlobalFooter';
import { Logo } from '@/components/ui/Logo';
import { TranslationFunction } from '@/types';
import { useConfig } from '@/hooks/useConfig';

// Images from the about/home page
const POST_IMAGES = [
    '/home/1 creation reimagined/3.jpeg',
    '/home/1 creation reimagined/4.jpeg',
    '/home/1 creation reimagined/2.jpeg',
    '/home/1 creation reimagined/12.jpeg',
    '/home/1 creation reimagined/6.jpeg',
];

interface BlogPageProps {
    t: TranslationFunction;
    onSignIn?: () => void;
}

const PostCard: React.FC<{ post: BlogPost; index: number }> = ({ post, index }) => {
    const navigate = useNavigate();
    const coverImage = post.coverImage ?? POST_IMAGES[index % POST_IMAGES.length];

    return (
        <article
            onClick={() => navigate(`/blog/${post.slug}`)}
            className="group cursor-pointer grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 transition-all duration-300 shadow-sm hover:shadow-md dark:shadow-none"
        >
            {/* Cover */}
            <div className={`bg-gradient-to-br ${post.coverGradient} aspect-[4/3] lg:aspect-auto lg:min-h-[380px] relative overflow-hidden`}>
                <img
                    src={coverImage}
                    alt={post.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                {/* subtle dark overlay for readability */}
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-300" />
                {/* Index number */}
                <span className="absolute bottom-5 left-6 text-[80px] leading-none font-bold text-white/20 select-none">
                    {String(index + 1).padStart(2, '0')}
                </span>
            </div>

            {/* Content */}
            <div className="flex flex-col justify-between p-8 lg:p-12 bg-zinc-50 dark:bg-zinc-900">
                <div className="flex flex-col gap-5">
                    <span className="text-xs font-medium tracking-widest uppercase text-zinc-400 dark:text-zinc-500">
                        {post.category}
                    </span>
                    <h2 className="text-3xl lg:text-4xl font-semibold tracking-tight text-zinc-900 dark:text-white leading-[1.1]">
                        <span className="relative inline">
                            {post.title}
                            <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-zinc-900 dark:bg-white group-hover:w-full transition-all duration-500 ease-[cubic-bezier(0.8,0,0.2,1)]" />
                        </span>
                    </h2>
                    <p className="text-zinc-500 dark:text-zinc-400 text-base leading-relaxed max-w-lg">
                        {post.excerpt}
                    </p>
                </div>

                <div className="flex items-center justify-between mt-10">
                    <div className="flex items-center gap-5 text-xs text-zinc-400 dark:text-zinc-600">
                        <span>{post.date}</span>
                        <span className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3" />
                            {post.readTime} min
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors duration-200">
                        Read
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                    </div>
                </div>
            </div>
        </article>
    );
};

export const BlogPage: React.FC<BlogPageProps> = ({ t, onSignIn }) => {
    const navigate = useNavigate();
    const { themeMode, setThemeMode } = useConfig();

    const isDark = themeMode === 'dark' ||
        (themeMode === 'auto' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    const toggleTheme = () => setThemeMode(isDark ? 'light' : 'dark');

    return (
        <div className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 min-h-screen flex flex-col">

            {/* ── Navbar ─────────────────────────────────────────── */}
            <header className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-100 dark:border-zinc-800/60">
                <div className="max-w-6xl mx-auto px-5 sm:px-8 h-14 flex items-center justify-between gap-4">

                    {/* Logo */}
                    <button onClick={() => navigate('/about')} className="flex items-center gap-2 shrink-0">
                        <Logo className="w-5 h-5" />
                        <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-white">exposé</span>
                    </button>

                    {/* Nav links */}
                    <nav className="hidden sm:flex items-center gap-1">
                        {[
                            { label: 'About', path: '/about' },
                            { label: 'Blog', path: '/blog' },
                        ].map(({ label, path }) => (
                            <button
                                key={path}
                                onClick={() => navigate(path)}
                                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                                    path === '/blog'
                                        ? 'text-zinc-900 dark:text-white font-medium'
                                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </nav>

                    {/* Right actions */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleTheme}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        </button>
                        <button
                            onClick={onSignIn}
                            className="hidden sm:flex px-3 py-1.5 rounded-lg text-sm font-medium bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors"
                        >
                            Start
                        </button>
                    </div>
                </div>
            </header>

            {/* ── Content ────────────────────────────────────────── */}
            <main className="flex-1 w-full max-w-6xl mx-auto px-5 sm:px-8 pt-14 sm:pt-20 pb-20">

                {/* Header */}
                <div className="mb-14 border-b border-zinc-200 dark:border-zinc-800 pb-10">
                    <h1 className="text-5xl sm:text-7xl font-bold tracking-tight text-zinc-900 dark:text-white">
                        Blog
                    </h1>
                </div>

                {/* Cards */}
                <div className="flex flex-col gap-6">
                    {BLOG_POSTS.map((post, idx) => (
                        <PostCard key={post.slug} post={post} index={idx} />
                    ))}
                </div>
            </main>

            <GlobalFooter t={t} />
        </div>
    );
};
