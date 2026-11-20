/**
 * City landing page: /photographers/{city}
 * Content comes from src/seo/seoContent.ts; every page is pre-rendered.
 */
import React from "react";
import { ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useWindowDimensions } from "react-native";
import { Lightbulb } from "lucide-react-native";
import { UniversalNavbar } from "@/src/components/UniversalNavbar";
import { UniversalFooter } from "@/src/components/UniversalFooter";
import { SEOHead } from "@/src/components/SEOHead";
import { SeoHero } from "@/src/components/seo/SeoHero";
import { SeoNotFound } from "@/src/components/seo/SeoNotFound";
import {
  ActionChips,
  BookingButton,
  Breadcrumbs,
  FaqList,
  H2,
  H3,
  InfoCards,
  LinkCard,
  LocalityChips,
  Paragraph,
  Section,
  seoStyles,
  useStartBooking,
} from "@/src/components/seo/SeoBlocks";
import {
  BOOKING_STEPS,
  SEO_CITIES,
  SEO_SERVICES,
  cityPath,
  getCity,
  getServiceCityPage,
  serviceCityPath,
} from "@/src/seo/seoContent";
import { breadcrumbSchema, faqSchema, serviceSchema } from "@/src/seo/structuredData";
import { colors } from "@/src/constants/theme";

export function generateStaticParams() {
  return SEO_CITIES.map((c) => ({ city: c.slug }));
}

export default function CityLandingPage() {
  const { city: citySlug } = useLocalSearchParams<{ city: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const startBooking = useStartBooking();
  const city = getCity(citySlug);

  if (!city) return <SeoNotFound />;

  const path = cityPath(city.slug);
  const otherCities = SEO_CITIES.filter((c) => c.slug !== city.slug);
  const servicesWithPages = SEO_SERVICES.filter((s) => getServiceCityPage(s.slug, city.slug));
  const servicesWithoutPages = SEO_SERVICES.filter((s) => !getServiceCityPage(s.slug, city.slug));
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Photographers", path: "/photographers" },
    { name: city.name, path },
  ];

  return (
    <View style={seoStyles.root}>
      <SEOHead
        title={city.title}
        description={city.metaDescription}
        canonicalPath={path}
        ogImage={city.hero.src}
        structuredData={[
          breadcrumbSchema(crumbs),
          serviceSchema({
            name: `Photographer booking in ${city.name}`,
            serviceType: "Photography and videography booking",
            description: city.metaDescription,
            path,
            city: city.name,
            state: city.state,
          }),
          faqSchema(city.faqs),
        ]}
      />
      <UniversalNavbar activeRoute="services" />
      <ScrollView
        style={seoStyles.scroll}
        contentContainerStyle={{ paddingTop: insets.top + (width >= 1024 ? 96 : 84), paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={seoStyles.container}>
          <Breadcrumbs items={[crumbs[0], crumbs[1], { name: city.name }]} />

          <SeoHero
            eyebrow={`Book A Shoot · ${city.name}`}
            h1={city.h1}
            lead={city.intro[0]}
            image={city.hero}
            ctaLabel={`Find photographers in ${city.name}`}
            onCta={() => startBooking({ city: city.slug, placement: "city_hero" })}
          />

          <Section title={`Photography in ${city.name}`}>
            {city.intro.slice(1).map((p) => (
              <Paragraph key={p}>{p}</Paragraph>
            ))}
          </Section>

          <Section title={`Photographers in ${city.name} by event`}>
            <View style={seoStyles.linkRow}>
              {servicesWithPages.map((service) => (
                <LinkCard
                  key={service.slug}
                  href={serviceCityPath(service.slug, city.slug)}
                  title={`${service.name} in ${city.name}`}
                  body={service.shortDescription}
                />
              ))}
            </View>
            {servicesWithoutPages.length ? (
              <View style={{ gap: 12 }}>
                <H3>{`Also book in ${city.name}`}</H3>
                <ActionChips
                  items={servicesWithoutPages.map((service) => ({
                    label: service.name,
                    onPress: () =>
                      startBooking({
                        eventTypeId: service.eventTypeId,
                        city: city.slug,
                        service: service.slug,
                        placement: "city_service_chip",
                      }),
                  }))}
                />
              </View>
            ) : null}
          </Section>

          <Section title={`How much does photography cost in ${city.name}?`}>
            {city.costGuide.map((p) => (
              <Paragraph key={p}>{p}</Paragraph>
            ))}
          </Section>

          <Section title={`Areas we serve in ${city.name}`}>
            <LocalityChips localities={city.localities} />
          </Section>

          <Section title={`Planning a shoot in ${city.name}`}>
            {city.planningNotes.map((note) => (
              <View key={note.title} style={seoStyles.callout}>
                <Lightbulb size={20} color={colors.primaryDark} />
                <View style={seoStyles.calloutBody}>
                  <H3>{note.title}</H3>
                  <Text style={seoStyles.calloutText}>{note.body}</Text>
                </View>
              </View>
            ))}
          </Section>

          <Section title="How booking works">
            <InfoCards items={BOOKING_STEPS} numbered />
          </Section>

          <Section title={`Photographers in ${city.name}: FAQs`}>
            <FaqList faqs={city.faqs} />
          </Section>

          <View style={seoStyles.ctaBanner}>
            <H2 style={{ textAlign: "center" }}>{`Book a photographer in ${city.name}`}</H2>
            <Text style={seoStyles.ctaBannerText}>
              Share your event, date and budget once. Verified studios respond, and you choose.
            </Text>
            <BookingButton center label="Book now" onPress={() => startBooking({ city: city.slug, placement: "city_footer" })} />
          </View>

          <Section title="Photographers in other cities">
            <View style={seoStyles.linkRow}>
              {otherCities.map((c) => (
                <LinkCard key={c.slug} href={cityPath(c.slug)} title={`Photographers in ${c.name}`} />
              ))}
            </View>
          </Section>
        </View>
        <UniversalFooter />
      </ScrollView>
    </View>
  );
}
