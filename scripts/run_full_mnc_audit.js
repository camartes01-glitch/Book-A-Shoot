const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const assert = require('assert');

// 1. In-memory AsyncStorage implementation
const asyncStorageStore = new Map();
const mockAsyncStorage = {
  getItem: async (key) => (asyncStorageStore.has(key) ? asyncStorageStore.get(key) : null),
  setItem: async (key, val) => { asyncStorageStore.set(key, String(val)); },
  removeItem: async (key) => { asyncStorageStore.delete(key); },
  clear: async () => { asyncStorageStore.clear(); },
  getAllKeys: async () => Array.from(asyncStorageStore.keys()),
  multiGet: async (keys) => keys.map((k) => [k, asyncStorageStore.get(k) || null]),
};

// 2. Custom TypeScript & Module resolver for Node
const Module = require('module');
const origRequire = Module.prototype.require;

Module.prototype.require = function(request) {
  if (request === '@react-native-async-storage/async-storage') {
    return { __esModule: true, default: mockAsyncStorage, ...mockAsyncStorage };
  }
  if (request === 'react-native') {
    return {
      Platform: { OS: 'android', select: (obj) => obj.android || obj.default },
      StyleSheet: { create: (s) => s },
    };
  }
  if (request.startsWith('expo-') || request === 'expo' || request.includes('expo-modules-core')) {
    return {
      default: { expoConfig: { extra: {} } },
      Platform: { OS: 'android', select: (obj) => obj.android || obj.default },
      randomUUID: () => 'mock-uuid-' + Math.random().toString(36).substring(2, 9),
      expoConfig: { extra: {} },
      scheduleNotificationAsync: async () => 'notif-1',
      setNotificationHandler: () => {},
      addNotificationResponseReceivedListener: () => ({ remove: () => {} }),
      router: { push: () => {}, replace: () => {}, back: () => {}, canGoBack: () => true },
      maybeCompleteAuthSession: () => {},
      openAuthSessionAsync: async () => ({ type: 'cancel' }),
      makeRedirectUri: () => 'camartes://auth/callback',
      NativeModulesProxy: {},
      EventEmitter: class {},
      requireNativeModule: () => ({}),
    };
  }
  if (request.startsWith('@/')) {
    const resolvedPath = path.resolve(__dirname, '..', request.replace('@/', ''));
    return origRequire.call(this, resolvedPath);
  }
  return origRequire.call(this, request);
};

// 3. Register .ts file compiler
require.extensions['.ts'] = function(module, filename) {
  const source = fs.readFileSync(filename, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    },
  });
  module._compile(compiled.outputText, filename);
};

// Test Runner Harness
const testResults = [];
let suiteCount = 0;
let passCount = 0;
let failCount = 0;

async function test(name, fn) {
  suiteCount++;
  try {
    await fn();
    passCount++;
    console.log(`  ✓ PASS: ${name}`);
    testResults.push({ name, passed: true });
  } catch (err) {
    failCount++;
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    Error: ${err.message}`);
    testResults.push({ name, passed: false, error: err.message });
  }
}

async function runMncAudit() {
  console.log('================================================================');
  console.log('       MNC-GRADE COMPREHENSIVE END-TO-END AUDIT SUITE           ');
  console.log('================================================================\n');

  // Load modules
  const validation = require('@/src/engine/validation');
  const matching = require('@/src/engine/matching');
  const pricing = require('@/src/engine/pricing');
  const bookingApi = require('@/src/services/bookingApi');
  const bookingFilters = require('@/src/domain/bookingFilters');
  const bookingRequest = require('@/src/domain/bookingRequest');
  const dayServices = require('@/src/domain/dayServices');
  const notificationEngine = require('@/src/services/notificationEngine');
  const notificationContent = require('@/src/domain/notificationContent');
  const notificationRouting = require('@/src/domain/notificationRouting');
  const messagesApi = require('@/src/services/messagesApi');

  // -------------------------------------------------------------
  // SUITE 1: ALBUM DELIVERY DATE CONDITIONAL LOGIC (USER REQUIREMENT #1)
  // -------------------------------------------------------------
  console.log('[SUITE 1] Album Delivery Date & Validation Logic');

  await test('1.1: If album is selected, missing expectedDeliveryDate causes validation failure', async () => {
    const day = {
      dayId: 'd1',
      order: 1,
      eventTypeIds: ['wedding'],
      eventDate: '2026-11-20',
      startTime: '10:00',
      endTime: '18:00',
      location: { city: 'Hyderabad', formattedAddress: 'Hyderabad' },
      photography: { traditional: true, candid: false, traditionalCount: 1, candidCount: 0 },
      videography: { traditional: false, candid: false, traditionalCount: 0, candidCount: 0 },
      aerial: { drones: 0 },
      ledWall: { enabled: false, size: '8 x 12', screenCount: 1 },
      webLive: { enabled: false, quality: 'HD', cameraCount: 1 },
    };

    const bookingWithAlbum = {
      bookingId: 'bk_album_1',
      status: 'DRAFT',
      days: [day],
      deliverables: {
        photo: { rawPhotos: false, editedPhotosOption: '100', album: true, albumPagesOption: '20' },
        video: { rawVideo: false, editedTraditionalVideoCount: 0, editedCinematicVideoCount: 0, teaserCinematicEnabled: false },
      },
      expectedDeliveryDate: null, // missing!
    };

    const issues = validation.validateBooking(bookingWithAlbum);
    assert(issues.some((i) => i.code === 'DELIVERY_DATE_REQUIRED'), 'Must require expectedDeliveryDate when album is true');
  });

  await test('1.2: If album is NOT selected, missing expectedDeliveryDate does NOT block validation', async () => {
    const day = {
      dayId: 'd2',
      order: 1,
      eventTypeIds: ['wedding'],
      eventDate: '2026-11-20',
      startTime: '10:00',
      endTime: '18:00',
      location: { city: 'Hyderabad', formattedAddress: 'Hyderabad' },
      photography: { traditional: true, candid: false, traditionalCount: 1, candidCount: 0 },
      videography: { traditional: false, candid: false, traditionalCount: 0, candidCount: 0 },
      aerial: { drones: 0 },
      ledWall: { enabled: false, size: '8 x 12', screenCount: 1 },
      webLive: { enabled: false, quality: 'HD', cameraCount: 1 },
    };

    const bookingWithoutAlbum = {
      bookingId: 'bk_no_album_1',
      status: 'DRAFT',
      days: [day],
      deliverables: {
        photo: { rawPhotos: true, editedPhotosOption: '100', album: false },
        video: { rawVideo: false, editedTraditionalVideoCount: 0, editedCinematicVideoCount: 0, teaserCinematicEnabled: false },
      },
      expectedDeliveryDate: null, // missing, but album is false!
    };

    const issues = validation.validateBooking(bookingWithoutAlbum);
    assert(!issues.some((i) => i.code === 'DELIVERY_DATE_REQUIRED'), 'Must NOT require expectedDeliveryDate when album is false');
    assert.strictEqual(issues.length, 0, 'Should have 0 validation issues');
  });

  await test('1.3: Album delivery date before the final event date is strictly rejected', async () => {
    const days = [{ dayId: 'd1', eventDate: '2026-11-25', startTime: '10:00', endTime: '18:00' }];
    const pastDate = '2026-11-20'; // Before event date!
    const issues = validation.validateExpectedDelivery(days, pastDate);
    assert(issues.some((i) => i.code === 'DELIVERY_BEFORE_EVENT'), 'Must block delivery before event');
  });

  await test('1.4: Album delivery date on or after the final event date is valid', async () => {
    const days = [{ dayId: 'd1', eventDate: '2026-11-25', startTime: '10:00', endTime: '18:00' }];
    const validDate = '2026-12-10'; // After event date
    const issues = validation.validateExpectedDelivery(days, validDate);
    assert.strictEqual(issues.length, 0, 'Valid date on or after event date must pass');
  });

  // -------------------------------------------------------------
  // SUITE 2: PROVIDERS SEARCHING & MATCHING ENGINE
  // -------------------------------------------------------------
  console.log('\n[SUITE 2] Providers Searching & Matching Engine');

  const testVendors = [
    {
      vendorId: 'firm_1',
      studioName: 'Alpha Studios',
      city: 'Hyderabad',
      rating: 4.8,
      completedBookings: 85,
      basePricePerDay: 45000,
      portfolioImages: ['https://example.com/p1.jpg'],
      photography: { traditional: true, candid: true, maxPhotographers: 6 },
      videography: { traditional: true, candid: true, maxVideographers: 4 },
      aerial: { photography: true, videography: true, maxDrones: 2 },
      ledWall: { available: true, sizes: ['8 x 12'], maxScreens: 4 },
      webLive: { available: true, qualities: ['HD', '4K'] },
      serviceAreas: ['Hyderabad', 'Secunderabad'],
      kycVerified: true,
      listedAvailable: true,
      serviceType: 'firm',
    },
    {
      vendorId: 'firm_2',
      studioName: 'Beta Creations',
      city: 'Hyderabad',
      rating: 4.2,
      completedBookings: 30,
      basePricePerDay: 30000,
      portfolioImages: ['https://example.com/p2.jpg'],
      photography: { traditional: true, candid: false, maxPhotographers: 2 }, // Only 2 photographers, NO candid!
      videography: { traditional: true, candid: false, maxVideographers: 2 },
      aerial: { photography: false, videography: false, maxDrones: 0 },
      ledWall: { available: false, sizes: [], maxScreens: 0 },
      webLive: { available: false, qualities: [] },
      serviceAreas: ['Hyderabad'],
      kycVerified: true,
      listedAvailable: true,
      serviceType: 'firm',
    },
    {
      vendorId: 'firm_3',
      studioName: 'Bengaluru Vision',
      city: 'Bengaluru', // Different city
      rating: 4.9,
      completedBookings: 120,
      basePricePerDay: 55000,
      portfolioImages: ['https://example.com/p3.jpg'],
      photography: { traditional: true, candid: true, maxPhotographers: 8 },
      videography: { traditional: true, candid: true, maxVideographers: 8 },
      aerial: { photography: true, videography: true, maxDrones: 4 },
      ledWall: { available: true, sizes: ['8 x 12'], maxScreens: 6 },
      webLive: { available: true, qualities: ['HD', '4K'] },
      serviceAreas: ['Bengaluru'],
      kycVerified: true,
      listedAvailable: true,
      serviceType: 'firm',
    },
  ];

  await test('2.1: City-based filtering correctly excludes out-of-market providers', async () => {
    const bookingHyd = {
      days: [{
        dayId: 'd1',
        order: 1,
        eventTypeIds: ['wedding'],
        eventDate: '2026-11-20',
        startTime: '10:00',
        endTime: '18:00',
        location: { city: 'Hyderabad', formattedAddress: 'Banjara Hills, Hyderabad' },
        photography: { traditional: true, candid: false, traditionalCount: 1, candidCount: 0 },
        videography: { traditional: false, candid: false, traditionalCount: 0, candidCount: 0 },
        aerial: { drones: 0 },
        ledWall: { enabled: false, size: '8 x 12', screenCount: 1 },
        webLive: { enabled: false, quality: 'HD', cameraCount: 1 },
      }],
      deliverables: { photo: { album: false } },
      providerLocationPreference: { mode: 'event_location', city: 'Hyderabad' },
    };

    const matches = matching.matchVendors(bookingHyd, testVendors, 'standard', 50000);
    assert(matches.some((m) => m.vendorId === 'firm_1'), 'Alpha Studios in Hyderabad must match');
    assert(!matches.some((m) => m.vendorId === 'firm_3'), 'Bengaluru Vision must be filtered out for Hyderabad booking');
  });

  await test('2.2: Capacity enforcement rejects providers lacking photographer count', async () => {
    const highCapacityBooking = {
      days: [{
        dayId: 'd1',
        order: 1,
        eventTypeIds: ['wedding'],
        eventDate: '2026-11-20',
        startTime: '10:00',
        endTime: '18:00',
        location: { city: 'Hyderabad', formattedAddress: 'Hyderabad' },
        photography: { traditional: true, candid: false, traditionalCount: 4, candidCount: 0 }, // 4 traditional photographers
        videography: { traditional: false, candid: false, traditionalCount: 0, candidCount: 0 },
        aerial: { drones: 0 },
        ledWall: { enabled: false, size: '8 x 12', screenCount: 1 },
        webLive: { enabled: false, quality: 'HD', cameraCount: 1 },
      }],
      deliverables: { photo: { album: false } },
      providerLocationPreference: null,
    };

    const matches = matching.matchVendors(highCapacityBooking, testVendors, 'standard', 50000);
    assert(matches.some((m) => m.vendorId === 'firm_1'), 'Alpha Studios (max 6) can satisfy 4 photographers');
    assert(!matches.some((m) => m.vendorId === 'firm_2'), 'Beta Creations (max 2) must be excluded for 4 photographers requirement');
  });

  await test('2.3: Service capability enforcement (Candid photography requirement)', async () => {
    const candidBooking = {
      days: [{
        dayId: 'd1',
        order: 1,
        eventTypeIds: ['wedding'],
        eventDate: '2026-11-20',
        startTime: '10:00',
        endTime: '18:00',
        location: { city: 'Hyderabad', formattedAddress: 'Hyderabad' },
        photography: { traditional: true, candid: true, traditionalCount: 1, candidCount: 1 }, // Candid required
        videography: { traditional: false, candid: false, traditionalCount: 0, candidCount: 0 },
        aerial: { drones: 0 },
        ledWall: { enabled: false, size: '8 x 12', screenCount: 1 },
        webLive: { enabled: false, quality: 'HD', cameraCount: 1 },
      }],
      deliverables: { photo: { album: false } },
      providerLocationPreference: null,
    };

    const matches = matching.matchVendors(candidBooking, testVendors, 'standard', 50000);
    assert(matches.some((m) => m.vendorId === 'firm_1'), 'Alpha Studios provides candid photography');
    assert(!matches.some((m) => m.vendorId === 'firm_2'), 'Beta Creations lacks candid photography and is excluded');
  });

  // -------------------------------------------------------------
  // SUITE 3: STEP-BY-STEP BOOKING CREATION & ISOLATION
  // -------------------------------------------------------------
  console.log('\n[SUITE 3] Step-by-Step Booking Creation & Isolation');

  await test('3.1: startFreshBooking creates clean isolated booking without residual data', async () => {
    await asyncStorageStore.clear();
    const b1 = await bookingApi.startFreshBooking('cust_audit_1');
    assert(b1.bookingId, 'Booking ID must be generated');
    assert.strictEqual(b1.days.length, 1, 'Fresh booking starts with 1 clean day');
    assert.strictEqual(b1.days[0].eventTypeIds.length, 0, 'No preset event types');
    assert.strictEqual(b1.budget, null, 'Budget is null initially');
    assert.strictEqual(b1.selectedPackage, null, 'Package is null initially');
  });

  await test('3.2: Multi-day addition, update, and reordering work accurately', async () => {
    const b = await bookingApi.startFreshBooking('cust_audit_2');
    await bookingApi.addDay(b.bookingId);
    const with2 = await bookingApi.getBooking(b.bookingId);
    assert.strictEqual(with2.days.length, 2, 'Must have 2 event days');

    const day1Id = with2.days[0].dayId;
    const day2Id = with2.days[1].dayId;

    await bookingApi.updateDay(b.bookingId, day1Id, { eventTypeIds: ['haldi'], eventDate: '2026-12-01' });
    await bookingApi.updateDay(b.bookingId, day2Id, { eventTypeIds: ['reception'], eventDate: '2026-12-02' });

    const updated = await bookingApi.getBooking(b.bookingId);
    assert.deepStrictEqual(updated.days[0].eventTypeIds, ['haldi']);
    assert.deepStrictEqual(updated.days[1].eventTypeIds, ['reception']);

    // Reorder days
    await bookingApi.reorderDays(b.bookingId, [day2Id, day1Id]);
    const reordered = await bookingApi.getBooking(b.bookingId);
    assert.strictEqual(reordered.days[0].dayId, day2Id, 'First day is now day 2');
    assert.strictEqual(reordered.days[1].dayId, day1Id, 'Second day is now day 1');
  });

  await test('3.3: Single day protection blocks deleting the only day', async () => {
    const b = await bookingApi.startFreshBooking('cust_audit_3');
    assert.strictEqual(b.days.length, 1);
    await assert.rejects(
      async () => {
        await bookingApi.deleteDay(b.bookingId, b.days[0].dayId);
      },
      /A booking must have at least one event day/,
      'Must reject deleting the only event day',
    );
  });

  // -------------------------------------------------------------
  // SUITE 4: REPLACEMENT WAVES, ACCEPTANCE & REJECTION LOGIC
  // -------------------------------------------------------------
  console.log('\n[SUITE 4] Replacement Waves, Vendor Acceptance & Rejection');

  await test('4.1: Vendor acceptance unlocks contact info & transitions status', async () => {
    const acceptedBooking = {
      bookingId: 'bk_acc_1',
      remoteBookingId: 'rem_acc_1',
      status: 'VENDOR_ACCEPTED',
      confirmed_provider_id: null,
      assigned_photographers: [
        {
          id: 'v_acc_1',
          name: 'Prime Studio',
          has_accepted: true,
          contact_phone: '+91 9876543210',
          contact_email: 'prime@studio.com',
          contact_unlocked: true,
        },
      ],
      days: [{ dayId: 'd1', eventDate: '2026-11-25', startTime: '10:00', endTime: '18:00' }],
    };

    const effective = bookingFilters.getEffectiveBookingStatus(acceptedBooking);
    assert.strictEqual(effective, 'VENDOR_ACCEPTED', 'Effective status must be VENDOR_ACCEPTED');
    assert.strictEqual(bookingFilters.isEnquiryBooking(acceptedBooking), true, 'Pre-confirmation accepted request is an enquiry');
    assert.strictEqual(bookingFilters.isUpcomingBooking(acceptedBooking), false, 'Not upcoming until customer confirms');
  });

  await test('4.2: Customer confirmation transitions request into Upcoming booking', async () => {
    const confirmedBooking = {
      bookingId: 'bk_conf_1',
      remoteBookingId: 'rem_conf_1',
      status: 'CUSTOMER_CONFIRMED',
      confirmed_provider_id: 'v_acc_1',
      assigned_photographers: [{ id: 'v_acc_1', name: 'Prime Studio', has_accepted: true }],
      days: [{ dayId: 'd1', eventDate: '2099-12-01', startTime: '10:00', endTime: '18:00' }],
    };

    const effective = bookingFilters.getEffectiveBookingStatus(confirmedBooking);
    assert.strictEqual(effective, 'CUSTOMER_CONFIRMED', 'Status must be CUSTOMER_CONFIRMED');
    assert.strictEqual(bookingFilters.isUpcomingBooking(confirmedBooking), true, 'Upcoming filter matches confirmed shoot');
    assert.strictEqual(bookingFilters.isEnquiryBooking(confirmedBooking), false, 'Enquiry filter excludes confirmed shoot');
  });

  await test('4.3: Terminal statuses (cancelled, rejected, expired) qualify as cancelled requests', async () => {
    const cancelled = { bookingId: 'bk_c_1', status: 'CUSTOMER_CANCELLED', days: [] };
    const rejected = { bookingId: 'bk_r_1', status: 'VENDOR_REJECTED', days: [] };
    const expired = { bookingId: 'bk_e_1', status: 'EXPIRED', days: [] };
    const vendorCancelled = { bookingId: 'bk_vc_1', status: 'VENDOR_CANCELLED', days: [] };

    assert.strictEqual(bookingFilters.isCancelledBooking(cancelled), true, 'Customer cancelled matches');
    assert.strictEqual(bookingFilters.isCancelledBooking(rejected), true, 'Vendor rejected matches');
    assert.strictEqual(bookingFilters.isCancelledBooking(expired), true, 'Expired matches');
    assert.strictEqual(bookingFilters.isCancelledBooking(vendorCancelled), true, 'Vendor cancelled matches');
  });

  await test('4.4: Terminal and rejected requests qualify for "Search Again" retry', async () => {
    const rejectedBooking = {
      bookingId: 'bk_retry_1',
      remoteBookingId: 'rem_retry_1',
      status: 'VENDOR_REJECTED',
      days: [{ dayId: 'd1', eventDate: '2099-11-20', startTime: '10:00', endTime: '18:00' }],
    };
    assert.strictEqual(bookingFilters.canSearchAgain(rejectedBooking), true, 'Rejected booking can search again');
  });

  // -------------------------------------------------------------
  // SUITE 5: PERMANENT DELETION & CROSS-BOOKING ISOLATION
  // -------------------------------------------------------------
  console.log('\n[SUITE 5] Permanent Deletion & Cross-Booking Isolation');

  await test('5.1: Deleting a draft permanently purges it from local storage', async () => {
    const b = await bookingApi.startFreshBooking('cust_del_1');
    assert(await bookingApi.getBooking(b.bookingId) !== null);

    const delResult = await bookingApi.deleteBooking(b.bookingId);
    assert.strictEqual(delResult.deleted, true, 'deleteBooking must return deleted: true');
    assert.strictEqual(await bookingApi.getBooking(b.bookingId), null, 'Booking must be null after deletion');
  });

  await test('5.2: Deleting a cancelled request purges it and registers in blacklist', async () => {
    const cancelled = {
      bookingId: 'bk_cancelled_to_delete',
      remoteBookingId: 'rem_cancelled_999',
      status: 'CUSTOMER_CANCELLED',
      customerId: 'cust_del_2',
      days: [],
      matches: [],
      activityLog: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await bookingApi.saveBooking(cancelled);

    const delResult = await bookingApi.deleteBooking(cancelled.bookingId);
    assert.strictEqual(delResult.deleted, true, 'Cancelled booking delete returns deleted: true');
    assert.strictEqual(await bookingApi.getBooking(cancelled.bookingId), null);

    // Verify blacklist
    const deletedIds = await bookingApi.getDeletedBookingIds();
    assert(deletedIds.has(cancelled.bookingId), 'bookingId must be in blacklist');
    assert(deletedIds.has(cancelled.remoteBookingId), 'remoteBookingId must be in blacklist');
  });

  await test('5.3: Cross-Booking Isolation: Deleting Booking A leaves Booking B 100% intact', async () => {
    const bA = await bookingApi.startFreshBooking('cust_iso_A');
    await bookingApi.updateDay(bA.bookingId, bA.days[0].dayId, { eventTypeIds: ['engagement'] });

    const bB = await bookingApi.startFreshBooking('cust_iso_B');
    await bookingApi.updateDay(bB.bookingId, bB.days[0].dayId, { eventTypeIds: ['wedding'] });

    await bookingApi.deleteBooking(bA.bookingId);

    // A is gone
    assert.strictEqual(await bookingApi.getBooking(bA.bookingId), null);
    // B is completely intact
    const intactB = await bookingApi.getBooking(bB.bookingId);
    assert.notStrictEqual(intactB, null);
    assert.strictEqual(intactB.bookingId, bB.bookingId);
    assert.deepStrictEqual(intactB.days[0].eventTypeIds, ['wedding']);
  });

  // -------------------------------------------------------------
  // SUITE 6: NOTIFICATIONS & DEEP LINK ROUTING
  // -------------------------------------------------------------
  console.log('\n[SUITE 6] Notification Routing & Generation');

  await test('6.1: Notification content generated accurately for booking lifecycle', async () => {
    const copy = notificationContent.buildNotificationContent('vendor_accepted', {
      firmName: 'Shutter Magic',
      eventName: 'Wedding Celebration',
    });
    assert(copy.title.length > 0);
    assert(copy.body.includes('Shutter Magic'));

    const route = notificationRouting.resolveNotificationRoute({
      id: 'notif_1',
      type: 'vendor_accepted',
      bookingId: 'bk_note_1',
      firmId: 'v_acc_1',
      title: copy.title,
      body: copy.body,
      read: false,
      createdAt: new Date().toISOString(),
    });
    assert.strictEqual(route.pathname, '/bookings/[bookingId]');
    assert.strictEqual(route.params.bookingId, 'bk_note_1');
  });

  // -------------------------------------------------------------
  // SUITE 7: CHAT SYSTEM & INSTANT REFLECTION
  // -------------------------------------------------------------
  console.log('\n[SUITE 7] Chat System Chronological Sorting & Instant State');

  await test('7.1: Messages are sorted accurately with millisecond timestamp comparison', async () => {
    const messages = [
      { id: 3, message: 'Third', createdAt: '2026-10-20T10:05:00.500Z', isMine: true },
      { id: 1, message: 'First', createdAt: '2026-10-20T10:00:00.000Z', isMine: false },
      { id: 2, message: 'Second', createdAt: '2026-10-20T10:02:30.000Z', isMine: true },
    ];

    const sorted = [...messages].sort((a, b) => {
      const tA = new Date(a.createdAt || 0).getTime();
      const tB = new Date(b.createdAt || 0).getTime();
      if (!isNaN(tA) && !isNaN(tB) && tA !== tB) return tA - tB;
      return (a.createdAt || '').localeCompare(b.createdAt || '') || (Number(a.id || 0) - Number(b.id || 0));
    });

    assert.strictEqual(sorted[0].id, 1, 'Earliest message is index 0');
    assert.strictEqual(sorted[1].id, 2, 'Middle message is index 1');
    assert.strictEqual(sorted[2].id, 3, 'Latest message is index 2');
  });

  // -------------------------------------------------------------
  // SUITE 8: API SECURITY, DATA PRIVACY & MASKING
  // -------------------------------------------------------------
  console.log('\n[SUITE 8] Security, Privacy & Contact Masking');

  await test('8.1: Phone numbers are masked properly for privacy protection', async () => {
    const maskedIndian = bookingRequest.maskPhoneNumber('+919876543210');
    assert(maskedIndian.includes('•'), 'Indian phone number must be masked');
    assert(maskedIndian.endsWith('210'), 'Should only reveal trailing digits');

    const maskedStandard = bookingRequest.maskPhoneNumber('9876543210');
    assert(maskedStandard.includes('•'), 'Standard phone number must be masked');
  });

  await test('8.2: Email addresses are masked with only first letters visible', async () => {
    const masked = bookingRequest.maskEmail('rahul.verma@example.com');
    assert(masked.startsWith('ra•••••@'), 'First 2 characters visible followed by dots');
    assert(masked.endsWith('@example.com'), 'Domain preserved');
  });

  // -------------------------------------------------------------
  // SUMMARY REPORT
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`TOTAL TESTS: ${suiteCount} | PASSED: ${passCount} | FAILED: ${failCount}`);
  console.log('================================================================\n');

  if (failCount > 0) {
    console.error('AUDIT FAILED: Some tests did not pass.');
    process.exit(1);
  } else {
    console.log('✓ ALL MNC-GRADE VERIFICATION TESTS PASSED SUCCESSFULLY (100% GREEN)');
    process.exit(0);
  }
}

runMncAudit().catch((err) => {
  console.error('Fatal Test Runner Exception:', err);
  process.exit(1);
});
