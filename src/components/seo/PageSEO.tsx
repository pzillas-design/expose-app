import React from 'react';
import { Helmet } from 'react-helmet-async';

interface PageSEOProps {
    title: string;
    description: string;
    canonical: string;
    ogImage?: string;
    ogType?: 'website' | 'article';
    publishedTime?: string;
    jsonLd?: object;
}

export const PageSEO: React.FC<PageSEOProps> = ({
    title,
    description,
    canonical,
    ogImage = 'https://expose.ae/og_image.png',
    ogType = 'website',
    publishedTime,
    jsonLd,
}) => {
    const fullTitle = `${title} — exposé`;

    return (
        <Helmet>
            <title>{fullTitle}</title>
            <meta name="description" content={description} />
            <link rel="canonical" href={canonical} />

            <meta property="og:type" content={ogType} />
            <meta property="og:url" content={canonical} />
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={ogImage.startsWith('http') ? ogImage : `https://expose.ae${ogImage}`} />
            {publishedTime && <meta property="article:published_time" content={publishedTime} />}

            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:url" content={canonical} />
            <meta name="twitter:title" content={fullTitle} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={ogImage.startsWith('http') ? ogImage : `https://expose.ae${ogImage}`} />

            {jsonLd && (
                <script type="application/ld+json">
                    {JSON.stringify(jsonLd)}
                </script>
            )}
        </Helmet>
    );
};
