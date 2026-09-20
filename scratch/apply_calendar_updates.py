import re

def update_calendar_header():
    header_path = r"C:\Users\keert\camartes\camartes-prelaunch-1\frontend\components\calendar\CalendarHeader.tsx"
    with open(header_path, "r", encoding="utf-8") as f:
        code = f.read()

    # 1. Ensure ActivityIndicator is imported from 'react-native'
    if "ActivityIndicator" not in code:
        code = code.replace(
            "import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Dimensions } from 'react-native';",
            "import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Dimensions, ActivityIndicator } from 'react-native';"
        )

    # 2. Add onRefresh to CalendarHeaderProps
    if "onRefresh?: () => void;" not in code:
        code = code.replace(
            "isLoading?: boolean;\n}",
            "isLoading?: boolean;\n  onRefresh?: () => void;\n}"
        )

    # 3. Add onRefresh to CalendarHeader function parameters
    if "onRefresh," not in code:
        code = code.replace(
            "totalEventsCount,\n  isLoading,\n}: CalendarHeaderProps",
            "totalEventsCount,\n  isLoading,\n  onRefresh,\n}: CalendarHeaderProps"
        )

    # 4. Update filterOptions to include 'book_a_shoot' when isIncomingActive
    old_filters = """  const filterOptions = [
    { key: 'all', label: 'All' },
    { key: 'rental', label: 'Rentals' },
    { key: 'out_qc', label: 'OUT QC' },
    { key: 'in_qc', label: 'IN QC' },
    { key: 'service', label: 'Services' },
    { key: 'completed', label: 'Done' },
  ];

  const isIncomingActive = activeRole === 'incoming' || activeRole === 'requests';"""

    new_filters = """  const isIncomingActive = activeRole === 'incoming' || activeRole === 'requests';

  const filterOptions = isIncomingActive
    ? [
        { key: 'all', label: 'All' },
        { key: 'book_a_shoot', label: 'Book A Shoot' },
        { key: 'rental', label: 'Rentals' },
        { key: 'out_qc', label: 'OUT QC' },
        { key: 'in_qc', label: 'IN QC' },
        { key: 'service', label: 'Services' },
        { key: 'completed', label: 'Done' },
      ]
    : [
        { key: 'all', label: 'All' },
        { key: 'rental', label: 'Rentals' },
        { key: 'out_qc', label: 'OUT QC' },
        { key: 'in_qc', label: 'IN QC' },
        { key: 'service', label: 'Services' },
        { key: 'completed', label: 'Done' },
      ];"""

    if old_filters in code:
        code = code.replace(old_filters, new_filters)
    else:
        print("Note: filterOptions pattern not matched directly, checking regex")

    # 5. Replace tiny invisible 6px liveDotPulseSmall with a visible mobile sync badge
    old_mobile_dot = """            {isLoading && (
              <View style={styles.liveDotPulseSmall} />
            )}"""

    new_mobile_sync = """            {isLoading ? (
              <View style={styles.mobileSyncBadge}>
                <ActivityIndicator size="small" color={colors.primary[500]} style={{ transform: [{ scale: 0.65 }] }} />
                <Text style={styles.mobileSyncText}>Syncing</Text>
              </View>
            ) : (
              <TouchableOpacity
                onPress={onRefresh}
                style={styles.mobileSyncBadgeIdle}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <CrossPlatformIcon name="sync" size={11} color="#64748B" />
                <Text style={styles.mobileSyncTextIdle}>Live</Text>
              </TouchableOpacity>
            )}"""

    if old_mobile_dot in code:
        code = code.replace(old_mobile_dot, new_mobile_sync)

    # 6. Add styles for mobileSyncBadge and mobileSyncBadgeIdle
    new_styles = """  mobileSyncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFEDD5',
    gap: 4,
    marginLeft: 6,
  },
  mobileSyncText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary[500],
  },
  mobileSyncBadgeIdle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 3,
    marginLeft: 6,
  },
  mobileSyncTextIdle: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  liveDotPulseSmall: {"""

    if "liveDotPulseSmall: {" in code and "mobileSyncBadge:" not in code:
        code = code.replace("  liveDotPulseSmall: {", new_styles)

    with open(header_path, "w", encoding="utf-8") as f:
        f.write(code)
    print("CalendarHeader.tsx successfully updated.")

def update_calendar_utils():
    utils_path = r"C:\Users\keert\camartes\camartes-prelaunch-1\frontend\utils\calendarUtils.ts"
    with open(utils_path, "r", encoding="utf-8") as f:
        code = f.read()

    # Expand startDateRaw and endDateRaw to recognize eventDate / endDate
    old_raw = "const startDateRaw = b.rental_start_date || b.start_date || b.event_date || b.booking_date || b.created_at;"
    new_raw = "const startDateRaw = b.rental_start_date || b.start_date || b.event_date || b.eventDate || b.booking_date || b.created_at;"
    if old_raw in code:
        code = code.replace(old_raw, new_raw)

    old_end = "const endDateRaw = b.rental_end_date || b.end_date || b.event_end_date || startDateRaw;"
    new_end = "const endDateRaw = b.rental_end_date || b.end_date || b.event_end_date || b.endDate || startDateRaw;"
    if old_end in code:
        code = code.replace(old_end, new_end)

    with open(utils_path, "w", encoding="utf-8") as f:
        f.write(code)
    print("calendarUtils.ts successfully updated.")

def update_calendar_screen():
    cal_path = r"C:\Users\keert\camartes\camartes-prelaunch-1\frontend\app\(tabs)\calendar.tsx"
    with open(cal_path, "r", encoding="utf-8") as f:
        code = f.read()

    # 1. Lower network timeout from 25000 to 10000
    code = code.replace("timeout: 25000,", "timeout: 10000,")

    # 2. Add isBookAShootRequest helper if not present
    if "const isBookAShootRequest" not in code:
        helper = """// Helper to identify Book A Shoot lead requests
const isBookAShootRequest = (item: any): boolean => {
  if (!item) return false;
  const isRental = item.item_type === 'rental' || !!item.is_rental_asset || !!item.rental_id;
  if (isRental) return false;
  return Boolean(
    item.lead_broadcast ||
    (item.assigned_provider_ids && item.assigned_provider_ids.length > 0) ||
    item.lead_details ||
    item.service_type === 'photography_firm' ||
    (item.service_type || '').includes('photo') ||
    item.app === 'bookashoot' ||
    item.source === 'bookashoot' ||
    (item.title && item.title.includes('Book A Shoot'))
  );
};

export default function CalendarScreen() {"""
        code = code.replace("export default function CalendarScreen() {", helper)

    # 3. Enhance acceptedServices mapping to robustly extract dates from Book A Shoot
    old_mapping = """        // Filter strictly for confirmed shoot bookings (customer clicked final confirm)
        const acceptedServices = providerReqsRaw
          .filter(isConfirmedIncomingShoot)
          .map((s: any) => ({
            ...s,
            db_id: s.db_id || s.id || s.booking_id,
            booking_id: s.booking_id || s.id,
            service_type: s.service_type || s.event_type || 'Photography Service',
            event_type: s.event_type || s.lead_details?.eventType || s.service_type || 'Shoot',
            title: s.event_type || s.service_type || s.lead_details?.eventType || 'Photography Service',
            start_date: s.event_date || s.start_date,
            end_date: s.end_date || s.event_date || s.start_date,
            event_date: s.event_date || s.start_date,
            venue_address: s.venue_address || s.lead_details?.venueAddress || s.location_preference?.formattedAddress || s.location || '',
            total_amount: Number(s.budget || s.total_amount || 0),
            client_name: s.client_name || 'Customer',
            client_contact: s.client_phone || s.client_contact || '',
            client_email: s.client_email || '',
            client_profile_id: s.client_profile_id || s.customer_id || s.client_id || '',
            provider_name: s.provider_name || 'My Service Profile',
            item_type: 'service',
            is_incoming: true,
          }));"""

    new_mapping = """        // Filter strictly for confirmed shoot bookings (customer clicked final confirm)
        const acceptedServices = providerReqsRaw
          .filter(isConfirmedIncomingShoot)
          .map((s: any) => {
            const rawEventDate =
              s.event_date ||
              s.start_date ||
              s.eventDate ||
              (s.lead_details && (s.lead_details.eventDate || s.lead_details.event_date)) ||
              (s.days && s.days[0] && (s.days[0].eventDate || s.days[0].event_date));
            const rawEndDate = s.end_date || s.event_end_date || s.endDate || rawEventDate;
            const isBAS = isBookAShootRequest(s);
            const displayTitle = isBAS
              ? (s.event_type || s.lead_details?.eventType || 'Book A Shoot')
              : (s.event_type || s.service_type || s.lead_details?.eventType || 'Photography Service');

            return {
              ...s,
              db_id: s.db_id || s.id || s.booking_id,
              booking_id: s.booking_id || s.id,
              service_type: s.service_type || s.event_type || (isBAS ? 'Book A Shoot' : 'Photography Service'),
              event_type: s.event_type || s.lead_details?.eventType || s.service_type || 'Shoot',
              title: displayTitle,
              start_date: rawEventDate,
              end_date: rawEndDate,
              event_date: rawEventDate,
              venue_address: s.venue_address || s.lead_details?.venueAddress || s.location_preference?.formattedAddress || s.location || '',
              total_amount: Number(s.budget || s.total_amount || 0),
              client_name: s.client_name || (isBAS ? 'Customer' : 'Client'),
              client_contact: s.client_phone || s.client_contact || '',
              client_email: s.client_email || '',
              client_profile_id: s.client_profile_id || s.customer_id || s.client_id || '',
              provider_name: s.provider_name || 'My Service Profile',
              item_type: 'service',
              is_incoming: true,
            };
          });"""

    if old_mapping in code:
        code = code.replace(old_mapping, new_mapping)

    # 4. Filter events for 'book_a_shoot'
    old_filtered = """  const filteredEvents = useMemo(() => {
    if (selectedFilter === 'all') return allEvents;
    if (selectedFilter === 'completed') return allEvents.filter((ev) => ev.isCompleted);
    if (selectedFilter === 'rental') {
      return allEvents.filter((ev) => ev.type === 'out_qc' || ev.type === 'in_qc' || ev.type === 'rental');
    }
    return allEvents.filter((ev) => ev.type === selectedFilter);
  }, [allEvents, selectedFilter]);"""

    new_filtered = """  const filteredEvents = useMemo(() => {
    if (selectedFilter === 'all') return allEvents;
    if (selectedFilter === 'completed') return allEvents.filter((ev) => ev.isCompleted);
    if (selectedFilter === 'rental') {
      return allEvents.filter((ev) => ev.type === 'out_qc' || ev.type === 'in_qc' || ev.type === 'rental');
    }
    if (selectedFilter === 'book_a_shoot') {
      return allEvents.filter((ev) => isBookAShootRequest(ev.rawBooking));
    }
    return allEvents.filter((ev) => ev.type === selectedFilter);
  }, [allEvents, selectedFilter]);"""

    if old_filtered in code:
        code = code.replace(old_filtered, new_filtered)

    # 5. Pass onRefresh={loadCalendarData} to CalendarHeader
    if "onRefresh={loadCalendarData}" not in code:
        code = code.replace(
            "totalEventsCount={filteredEvents.length}\n        isLoading={isLoading}\n      />",
            "totalEventsCount={filteredEvents.length}\n        isLoading={isLoading}\n        onRefresh={loadCalendarData}\n      />"
        )

    # 6. Add loading state overlay in viewContent
    old_view_content = """      {/* Calendar Views */}
      <View style={styles.viewContent}>"""

    new_view_content = """      {/* Calendar Views */}
      <View style={styles.viewContent}>
        {isLoading && filteredEvents.length === 0 ? (
          <View style={styles.calendarLoadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary[500]} />
            <Text style={styles.calendarLoadingText}>Syncing your calendar bookings...</Text>
          </View>
        ) : null}"""

    if old_view_content in code and "calendarLoadingOverlay" not in code:
        code = code.replace(old_view_content, new_view_content)

    # 7. Add styles for calendarLoadingOverlay
    styles_marker = "const styles = StyleSheet.create({\n  safeArea: {"
    new_overlay_styles = """const styles = StyleSheet.create({
  calendarLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    gap: 12,
  },
  calendarLoadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  safeArea: {"""

    if styles_marker in code and "calendarLoadingText:" not in code:
        code = code.replace(styles_marker, new_overlay_styles)

    # 8. Ensure Text is imported in calendar.tsx
    if "Text" not in code.split("from 'react-native';")[0]:
        code = code.replace(
            "View,\n  StyleSheet,\n  ActivityIndicator,",
            "View,\n  Text,\n  StyleSheet,\n  ActivityIndicator,"
        )

    with open(cal_path, "w", encoding="utf-8") as f:
        f.write(code)
    print("calendar.tsx successfully updated.")

update_calendar_header()
update_calendar_utils()
update_calendar_screen()
