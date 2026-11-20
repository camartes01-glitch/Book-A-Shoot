/**
 * Hub of every city we serve: /photographers
 */
import React from "react";
import { ScrollView, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { UniversalNavbar } from "@/src/components/UniversalNavbar";
import { UniversalFooter } from "@/src/components/UniversalFooter";
import { SEOHead } from "@/src/components/SEOHead";
import {
  BookingButton,
  Breadcrumbs,
  H1,
  H2,
  InfoCards,
  LinkCard,
  Paragraph,
  Section,
  seoStyles,
  useStartBooking,
} from "@/src/components/seo/SeoBlocks";
import {
  BOOKING_STEPS,
  SEO_CITIES,
  cityPath,
  getService,
  pagesForCity,
  serviceCityPath,
} from "@/src/seo/seoContent";
import { breadcrumbSchema, itemListSchema } from "@/src/seo/structuredData";

const PATH = "/photographers";
const DESCRIPTION =
  "Book verified photographers in Hyderabad, Vijayawada, Bengaluru and Visakhapatnam for weddings, pre-wedding shoots, birthdays, maternity and more. Compare studios that fit your budget.";

export default function PhotographersHubPage() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const startBooking = useStartBooking();
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Photographers", path: PATH },
  ];

  return (
    <View style={seoStyles.root}>
      <SEOHead
        title="Book Verified Photographers by City | Book A Shoot"
        description={DESCRIPTION}
        canonicalPath={PATH}
        structuredData={[
          breadcrumbSchema(crumbs),
          itemListSchema(SEO_CITIES.map((c) => ({ name: `Photographers in ${c.name}`, path: cityPath(c.slug) }))),
        ]}
      />
      <UniversalNavbar activeRoute="services" />
      <ScrollView
        style={seoStyles.scroll}
        contentContainerStyle={{ paddingTop: insets.top + (width >= 1024 ? 96 : 84), paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={seoStyles.container}>
          <Breadcrumbs items={[crumbs[0], { name: "Photographers" }]} />
          <View style={{ gap: 12, marginBottom: 32 }}>
            <H1>Book verified photographers in your city</H1>
            <Text style={seoStyles.lead}>
              Book A Shoot connects you with KYC-verified photography studios for weddings, pre-wedding shoots,
              birthdays, maternity sessions, corporate events and more. Choose your city to see local guidance, or
              start a request and let studios come to you.
            </Text>
            <BookingButton label="Start your request" onPress={() => startBooking({ placement: "hub_hero" })} />
          </View>

          {SEO_CITIES.map((city) => {
            const pages = pagesForCity(city.slug);
            return (
              <Section key={city.slug} title={`Photographers in ${city.name}`}>
                <Paragraph>{city.intro[0]}</Paragraph>
                <View style={seoStyles.linkRow}>
                  <LinkCard href={cityPath(city.slug)} title={`All photographers in ${city.name}`} />
                  {pages.map((p) => {
                    const service = getService(p.service);
                    return service ? (
                      <LinkCard
                        key={p.service}
                        href={serviceCityPath(p.service, p.city)}
                        title={`${service.name} in ${city.name}`}
                      />
                    ) : null;
                  })}
                </View>
              </Section>
            );
          })}

          <Section title="How booking works">
            <InfoCards items={BOOKING_STEPS} numbered />
          </Section>

          <View style={seoStyles.ctaBanner}>
            <H2 style={{ textAlign: "center" }}>Not sure where to start?</H2>
            <Text style={seoStyles.ctaBannerText}>
              Send one request with your event, date and budget. Verified studios that fit will respond.
            </Text>
            <BookingButton center label="Book now" onPress={() => startBooking({ placement: "hub_footer" })} />
          </View>
        </View>
        <UniversalFooter />
      </ScrollView>
    </View>
  );
}
