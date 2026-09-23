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
        <title>Book A Shoot — Hire KYC-Verified Photographers & Cinematographers</title>
        <meta
          name="description"
          content="Book vetted, 100% KYC-verified photography and cinematography studios across Hyderabad, Bangalore, and Andhra Pradesh with guaranteed milestone escrow and 1-hour auto-backfill."
        />
        <meta property="og:title" content="Book A Shoot — Hire KYC-Verified Photographers & Cinematographers" />
        <meta
          property="og:description"
          content="India's trusted event photography platform. Weddings, Sangeet, Pre-weddings, Birthdays, and Custom Celebrations."
        />
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="shortcut icon" type="image/png" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/favicon.png" />
        <meta name="theme-color" content="#EA580C" />

        {/* Reset web ScrollView to prevent duplicate scrollbars */}
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
