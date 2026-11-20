import React from "react";
import { ScrollView, Text, View } from "react-native";
import { SEOHead } from "@/src/components/SEOHead";
import { UniversalNavbar } from "@/src/components/UniversalNavbar";
import { UniversalFooter } from "@/src/components/UniversalFooter";
import { H1, LinkCard, seoStyles } from "@/src/components/seo/SeoBlocks";
import { SEO_CITIES, cityPath } from "@/src/seo/seoContent";

/** Shown for a city or service we have no page for. Never indexed. */
export function SeoNotFound() {
  return (
    <View style={seoStyles.root}>
      <SEOHead title="Page not found" description="This page does not exist." noIndex />
      <UniversalNavbar activeRoute="services" />
      <ScrollView style={seoStyles.scroll} contentContainerStyle={{ paddingTop: 110, paddingBottom: 40 }}>
        <View style={[seoStyles.container, { gap: 16, marginBottom: 32 }]}>
          <H1>We couldn't find that page</H1>
          <Text style={seoStyles.lead}>Browse photographers in the cities we serve:</Text>
          <View style={seoStyles.linkRow}>
            {SEO_CITIES.map((c) => (
              <LinkCard key={c.slug} href={cityPath(c.slug)} title={`Photographers in ${c.name}`} />
            ))}
          </View>
        </View>
        <UniversalFooter />
      </ScrollView>
    </View>
  );
}
