import React from 'react';
import { Typo, Theme, Button } from '@/components/ui/DesignSystem';
import { Sparkles, Zap, Shield, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AboutPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
            {/* Hero Section */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5" />
                <div className="relative max-w-6xl mx-auto px-6 py-24 md:py-32">
                    <div className="text-center space-y-6">
                        <h1 className={`${Typo.H1} text-5xl md:text-7xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent`}>
                            Expose
                        </h1>
                        <p className={`${Typo.Body} text-xl md:text-2xl text-zinc-600 dark:text-zinc-400 max-w-3xl mx-auto`}>
                            AI-powered image generation and editing for creative professionals
                        </p>
                    </div>
                </div>
            </section>

            {/* Mission Section */}
            <section className="max-w-6xl mx-auto px-6 py-16">
                <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div className="space-y-6">
                        <h2 className={`${Typo.H2} text-4xl font-bold ${Theme.Colors.TextHighlight}`}>
                            Our Mission
                        </h2>
                        <p className={`${Typo.Body} text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed`}>
                            We believe in empowering creators with cutting-edge AI technology. Expose combines the power of Google's Gemini models with an intuitive interface to make professional image generation accessible to everyone.
                        </p>
                        <p className={`${Typo.Body} text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed`}>
                            Whether you're a designer, marketer, or creative enthusiast, Expose helps you bring your vision to life with unprecedented speed and quality.
                        </p>
                    </div>
                    <div className="relative aspect-video bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-800 dark:to-zinc-900 rounded-3xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-sm font-medium text-zinc-400 dark:text-zinc-600">Image Placeholder</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="max-w-6xl mx-auto px-6 py-16">
                <h2 className={`${Typo.H2} text-4xl font-bold text-center mb-12 ${Theme.Colors.TextHighlight}`}>
                    Why Choose Expose
                </h2>
                <div className="grid md:grid-cols-3 gap-8">
                    {[
                        {
                            icon: <Sparkles className="w-6 h-6" />,
                            title: 'AI-Powered',
                            description: 'Leverage Google Gemini 3.0 for stunning, high-quality image generation'
                        },
                        {
                            icon: <Zap className="w-6 h-6" />,
                            title: 'Lightning Fast',
                            description: 'Generate professional images in seconds with our optimized workflow'
                        },
                        {
                            icon: <Shield className="w-6 h-6" />,
                            title: 'Secure & Private',
                            description: 'Your data is encrypted and stored securely with enterprise-grade protection'
                        }
                    ].map((feature, i) => (
                        <div
                            key={i}
                            className="group p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300 hover:shadow-lg"
                        >
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform duration-300">
                                {feature.icon}
                            </div>
                            <h3 className={`${Typo.H3} text-xl font-bold mb-2 ${Theme.Colors.TextHighlight}`}>
                                {feature.title}
                            </h3>
                            <p className={`${Typo.Body} text-zinc-600 dark:text-zinc-400`}>
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Team Section */}
            <section className="max-w-6xl mx-auto px-6 py-16">
                <h2 className={`${Typo.H2} text-4xl font-bold text-center mb-12 ${Theme.Colors.TextHighlight}`}>
                    Meet the Team
                </h2>
                <div className="grid md:grid-cols-3 gap-8">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="text-center space-y-4">
                            <div className="aspect-square bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-800 dark:to-zinc-900 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 mx-auto max-w-xs">
                                <div className="w-full h-full flex items-center justify-center">
                                    <span className="text-sm font-medium text-zinc-400 dark:text-zinc-600">Team Member {i}</span>
                                </div>
                            </div>
                            <div>
                                <h3 className={`${Typo.H3} font-bold ${Theme.Colors.TextHighlight}`}>Name</h3>
                                <p className={`${Typo.Body} text-sm text-zinc-500 dark:text-zinc-500`}>Role</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA Section */}
            <section className="max-w-4xl mx-auto px-6 py-24">
                <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-3xl p-12 text-center text-white">
                    <div className="relative z-10 space-y-6">
                        <h2 className="text-4xl md:text-5xl font-bold">
                            Ready to Create?
                        </h2>
                        <p className="text-xl opacity-90 max-w-2xl mx-auto">
                            Join thousands of creators using Expose to bring their ideas to life
                        </p>
                        <Button
                            onClick={() => navigate('/projects')}
                            className="bg-white text-purple-600 hover:bg-zinc-100 h-14 px-8 text-lg font-semibold"
                            icon={<ArrowRight className="w-5 h-5" />}
                        >
                            Get Started
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    );
};
