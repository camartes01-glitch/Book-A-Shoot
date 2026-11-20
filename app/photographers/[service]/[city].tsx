/**
 * Service + city landing page: /photographers/{service}/{city}
 * Content comes from src/seo/seoContent.ts; every page is pre-rendered.
 */
import React from "react";
import { ScrollView, Text, View, useWindowDimensions } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CheckCircle2, Lightbulb } from "lucide-react-native";
import { UniversalNavbar } from "@/src/components/UniversalNavbar";
import { UniversalFooter } from "@/src/components/UniversalFooter";
import { SEOHead } from "@/src/components/SEOHead";
import { SeoHero } from "@/src/components/seo/SeoHero";
import { SeoNotFound } from "@/src/components/seo/SeoNotFound";
import {
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
  TextLink,
  seoStyles,
  useStartBooking,
} from "@/src/components/seo/SeoBlocks";
import {
  BOOKING_STEPS,
  SERVICE_CITY_PAGES,
  cityPath,
  getCity,
  getService,
  getServiceCityPage,
  pagesForCity,
  sameServiceOtherCities,
  serviceCityPath,
} from "@/src/seo/seoContent";
import { breadcrumbSchema, faqSchema, serviceSchema } from "@/src/seo/structuredData";
import { colors } from "@/src/constants/theme";

export function generateStaticParams() {
  return SERVICE_CITY_PAGES.map((p) => ({ service: p.service, city: p.city }));
}

export default function ServiceCityPageScreen() {
  const params = useLocalSearchParams<{ service: string; city: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = width >= 1024;
  const startBooking = useStartBooking();

  const page = getServiceCityPage(params.service, params.city);
  const city = getCity(params.city);
  const service = getService(params.service);
  if (!page || !city || !service) return <SeoNotFound />;

  const path = serviceCityPath(service.slug, city.slug);
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Photographers", path: "/photographers" },
    { name: city.name, path: cityPath(city.slug) },
    { name: `${service.name} in ${city.name}`, path },
  ];
  const book = (placement: string) =>
    startBooking({ eventTypeId: service.eventTypeId, city: city.slug, service: service.slug, placement });
  const otherServicesHere = pagesForCity(city.slug).filter((p) => p.service !== service.slug);
  const sameServiceElsewhere = sameServiceOtherCities(service.slug, city.slug);

  return (
    <View style={seoStyles.root}>
      <SEOHead
        title={page.title}
        description={page.metaDescription}
        canonicalPath={path}
        ogImage={page.hero.src}
        structuredData={[
          breadcrumbSchema(crumbs),
          serviceSchema({
            name: `${service.name} in ${city.name}`,
            serviceType: service.noun,
            description: page.metaDescription,
            path,
            city: city.name,
            state: city.state,
          }),
          faqSchema(page.faqs),
        ]}
      />
      <UniversalNavbar activeRoute="services" />
      <ScrollView
        style={seoStyles.scroll}
        contentContainerStyle={{ paddingTop: insets.top + (wide ? 96 : 84), paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={seoStyles.container}>
          <Breadcrumbs items={[...crumbs.slice(0, 3), { name: service.name }]} />

          <SeoHero
            eyebrow={`Book A Shoot · ${city.name}`}
            h1={page.h1}
            lead={page.intro[0]}
            image={city.hero}
            ctaLabel={`Find ${service.name.toLowerCase()}`}
            onCta={() => book("service_city_hero")}
          />

          <Section title={`Booking ${service.noun} in ${city.name}`}>
            {page.intro.slice(1).map((p) => (
              <Paragraph key={p}>{p}</Paragraph>
            ))}
          </Section>

          <Section title="What you can book">
            <View style={seoStyles.bullets}>
              {page.whatToExpect.map((item) => (
                <View key={item} style={seoStyles.bulletRow}>
                  <CheckCircle2 size={18} color={colors.primaryDark} />
                  <Text style={seoStyles.bulletText}>{item}</Text>
                </View>
              ))}
            </View>
          </Section>

          <View style={[seoStyles.callout, seoStyles.block]}>
            <Lightbulb size={20} color={colors.primaryDark} />
            <View style={seoStyles.calloutBody}>
              <H3>{page.localTip.title}</H3>
              <Text style={seoStyles.calloutText}>{page.localTip.body}</Text>
            </View>
          </View>

          <Section title={`How much does ${service.noun} cost in ${city.name}?`}>
            {page.indicativeBudgets ? (
              <>
                <View style={[seoStyles.budgetGrid, wide && seoStyles.budgetGridWide]}>
                  {page.indicativeBudgets.map((tier) => (
                    <View key={tier.name} style={seoStyles.budgetCard}>
                      <H3>{tier.name}</H3>
                      <Text style={seoStyles.budgetRange}>{tier.range}</Text>
                      <Text style={seoStyles.budgetDesc}>{tier.description}</Text>
                      {tier.includes.map((inc) => (
                        <View key={inc} style={seoStyles.bulletRow}>
                          <CheckCircle2 size={15} color={colors.primaryDark} />
                          <Text style={[seoStyles.bulletText, { fontSize: 15, lineHeight: 24 }]}>{inc}</Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
                <Text style={seoStyles.note}>
                  Indicative budgets only, not quotes. Each studio's package and price is shown when it accepts your
                  request.
                </Text>
              </>
            ) : null}
            {city.costGuide.map((p) => (
              <Paragraph key={p}>{p}</Paragraph>
            ))}
          </Section>

          <Section title={`Areas covered in ${city.name}`}>
            <LocalityChips localities={city.localities} />
          </Section>

          <Section title="How booking works">
            <InfoCards items={BOOKING_STEPS} numbered />
          </Section>

          <Section title="Frequently asked questions">
            <FaqList faqs={page.faqs} />
          </Section>

          <View style={seoStyles.ctaBanner}>
            <H2 style={{ textAlign: "center" }}>{`Book ${service.name.toLowerCase()} in ${city.name}`}</H2>
            <Text style={seoStyles.ctaBannerText}>
              Share your date, venue and budget once. Verified studios respond, and you choose.
            </Text>
            <BookingButton center label="Book now" onPress={() => book("service_city_footer")} />
          </View>

          <Section title="Related pages">
            <View style={seoStyles.linkRow}>
              <LinkCard href={cityPath(city.slug)} title={`All photographers in ${city.name}`} />
              {otherServicesHere.map((p) => {
                const s = getService(p.service);
                return s ? (
                  <LinkCard key={p.service} href={serviceCityPath(p.service, p.city)} title={`${s.name} in ${city.name}`} />
                ) : null;
              })}
              {sameServiceElsewhere.map((p) => {
                const c = getCity(p.city);
                return c ? (
                  <LinkCard key={p.city} href={serviceCityPath(p.service, p.city)} title={`${service.name} in ${c.name}`} />
                ) : null;
              })}
            </View>
            {page.relatedArticles?.length ? (
              <View style={{ gap: 8 }}>
                <H3>From the blog</H3>
                {page.relatedArticles.map((a) => (
                  <TextLink key={a.path} href={a.path}>
                    {a.title}
                  </TextLink>
                ))}
              </View>
            ) : null}
          </Section>
        </View>
        <UniversalFooter />
      </ScrollView>
    </View>
  );
}
