import React, { useState } from 'react';
import { Typo, Theme, Button } from '@/components/ui/DesignSystem';
import { Mail, Send, MessageSquare } from 'lucide-react';

export const ContactPage: React.FC = () => {
    const [formData, setFormData] = useState({ name: '', email: '', message: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        // Simulate submission
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsSubmitted(true);
        setIsSubmitting(false);
        setTimeout(() => {
            setIsSubmitted(false);
            setFormData({ name: '', email: '', message: '' });
        }, 3000);
    };

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
            {/* Hero */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5" />
                <div className="relative max-w-6xl mx-auto px-6 py-24">
                    <div className="text-center space-y-4">
                        <h1 className={`${Typo.H1} text-5xl md:text-6xl font-bold ${Theme.Colors.TextHighlight}`}>
                            Get in Touch
                        </h1>
                        <p className={`${Typo.Body} text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto`}>
                            Have questions? We'd love to hear from you.
                        </p>
                    </div>
                </div>
            </section>

            <div className="max-w-6xl mx-auto px-6 pb-24">
                <div className="grid md:grid-cols-2 gap-12">
                    {/* Contact Form */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 md:p-12">
                        <h2 className={`${Typo.H2} text-3xl font-bold mb-8 ${Theme.Colors.TextHighlight}`}>
                            Send us a Message
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className={`${Typo.Label} block mb-2 text-sm font-medium ${Theme.Colors.TextHighlight}`}>
                                    Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 transition-all"
                                    placeholder="Your name"
                                />
                            </div>
                            <div>
                                <label className={`${Typo.Label} block mb-2 text-sm font-medium ${Theme.Colors.TextHighlight}`}>
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 transition-all"
                                    placeholder="your@email.com"
                                />
                            </div>
                            <div>
                                <label className={`${Typo.Label} block mb-2 text-sm font-medium ${Theme.Colors.TextHighlight}`}>
                                    Message
                                </label>
                                <textarea
                                    value={formData.message}
                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                    required
                                    rows={6}
                                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 transition-all resize-none"
                                    placeholder="Tell us what's on your mind..."
                                />
                            </div>
                            <Button
                                type="submit"
                                disabled={isSubmitting || isSubmitted}
                                className="w-full h-12"
                                icon={isSubmitted ? <MessageSquare className="w-5 h-5" /> : <Send className="w-5 h-5" />}
                            >
                                {isSubmitted ? 'Message Sent!' : isSubmitting ? 'Sending...' : 'Send Message'}
                            </Button>
                        </form>
                    </div>

                    {/* Contact Info & Image */}
                    <div className="space-y-8">
                        <div className="aspect-video bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-800 dark:to-zinc-900 rounded-3xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
                            <div className="w-full h-full flex items-center justify-center">
                                <span className="text-sm font-medium text-zinc-400 dark:text-zinc-600">Image Placeholder</span>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                                        <Mail className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className={`${Typo.H3} font-bold mb-1 ${Theme.Colors.TextHighlight}`}>
                                            Email
                                        </h3>
                                        <a href="mailto:hello@expose.ae" className="text-blue-600 dark:text-blue-400 hover:underline">
                                            hello@expose.ae
                                        </a>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
                                <h3 className={`${Typo.H3} font-bold mb-3 ${Theme.Colors.TextHighlight}`}>
                                    Response Time
                                </h3>
                                <p className={`${Typo.Body} text-zinc-600 dark:text-zinc-400`}>
                                    We typically respond within 24 hours during business days.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
