import React from "react";
import { Platform } from "react-native";
import Head from "expo-router/head";

export interface SEOHeadProps {
  title?: string;
  description?: string;
  canonicalPath?: string;
  ogImage?: string;
  ogType?: "website" | "article" | "profile";
  keywords?: string[];
  noIndex?: boolean;
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>;
}

const DEFAULT_TITLE =
  "Book A Shoot — Hire KYC-Verified Photographers & Cinematographers";
const DEFAULT_DESCRIPTION =
  "Book vetted, 100% KYC-verified photography and cinematography studios across Hyderabad, Bangalore, and Andhra Pradesh with guaranteed milestone escrow and 1-hour auto-backfill.";
const BASE_URL = "https://www.bookashoot.online";
const DEFAULT_OG_IMAGE = `${BASE_URL}/book-a-shoot-wordmark.png`;

export const SEOHead: React.FC<SEOHeadProps> = ({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  canonicalPath = "",
  ogImage = DEFAULT_OG_IMAGE,
  ogType = "website",
  keywords = [],
  noIndex = false,
  publishedTime,
  modifiedTime,
  author = "Camartes Technologies Private Limited",
  structuredData,
}) => {
  // Client & SSR canonical determination
  const cleanPath = canonicalPath.startsWith("/")
    ? canonicalPath
    : `/${canonicalPath}`;
  const canonicalUrl = `${BASE_URL}${cleanPath === "/" ? "" : cleanPath}`;
  const fullOgImage = ogImage.startsWith("http")
    ? ogImage
    : `${BASE_URL}${ogImage.startsWith("/") ? ogImage : `/${ogImage}`}`;

  // Keep title clean and formatted
  const displayTitle = title.includes("Book A Shoot")
    ? title
    : `${title} | Book A Shoot`;

  const structuredDataList = structuredData
    ? Array.isArray(structuredData)
      ? structuredData
      : [structuredData]
    : [];

  return (
    <Head>
      <title>{displayTitle}</title>
      <meta name="description" content={description} />
      {keywords.length > 0 && (
        <meta name="keywords" content={keywords.join(", ")} />
      )}
      <meta name="author" content={author} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Robots Directives */}
      {noIndex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta
          name="robots"
          content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
        />
      )}

      {/* OpenGraph Metadata */}
      <meta property="og:site_name" content="Book A Shoot by Camartes" />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={displayTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullOgImage} />
      <meta property="og:image:alt" content={displayTitle} />
      <meta property="og:locale" content="en_IN" />

      {/* Article specific metadata */}
      {ogType === "article" && publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {ogType === "article" && modifiedTime && (
        <meta property="article:modified_time" content={modifiedTime} />
      )}
      {ogType === "article" && author && (
        <meta property="article:author" content={author} />
      )}

      {/* Twitter Cards */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={displayTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullOgImage} />
      <meta name="twitter:image:alt" content={displayTitle} />

      {/* Structured Data Scripts (JSON-LD) */}
      {structuredDataList.map((data, index) => (
        <script
          key={`structured-data-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(data),
          }}
        />
      ))}
    </Head>
  );
};
