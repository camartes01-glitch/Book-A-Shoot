// This file is web-only and used to configure the root HTML for every web page during static render and dev.
import { ScrollViewStyleReset } from "expo-router/html";
import { type PropsWithChildren } from "react";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/favicon.png" />
        <meta name="theme-color" content="#EA580C" />

        {/* ── Instant Image Preloads for Critical Above-The-Fold LCP ── */}
        <link rel="preload" as="image" href="/book-a-shoot-wordmark.png" fetchPriority="high" />
        <link rel="preload" as="image" href="/hero1.webp" fetchPriority="high" />
        <link rel="preload" as="image" href="/phonehero1.webp" fetchPriority="high" />
        <link rel="preload" as="image" href="/contact.webp" />
        <link rel="preload" as="image" href="/phonecontact.webp" />

        {/* Reset web ScrollView to prevent duplicate scrollbars */}
        <ScrollViewStyleReset />

        {/* Google tag (gtag.js) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-GXE7WDJD9N" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());

              gtag('config', 'G-GXE7WDJD9N');
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
