import os

# 1. Copy businessHours.ts to vendor frontend utils
vendor_utils_path = r"C:\Users\keert\camartes\camartes-prelaunch-1\frontend\utils\businessHours.ts"
client_engine_path = r"C:\Users\keert\bookashoot\src\engine\businessHours.ts"

with open(client_engine_path, "r", encoding="utf-8") as f:
    engine_code = f.read()

with open(vendor_utils_path, "w", encoding="utf-8") as f:
    f.write(engine_code)

print("1. Copied businessHours.ts to vendor frontend utils successfully!")

# 2. Update bookings.tsx in vendor frontend
bk_path = r"C:\Users\keert\camartes\camartes-prelaunch-1\frontend\app\(tabs)\bookings.tsx"
with open(bk_path, "r", encoding="utf-8") as f:
    bk_code = f.read()

# Add import if not present
if "calculateBusinessSla" not in bk_code:
    import_target = "import { differenceInSeconds"
    import_replacement = "import { calculateBusinessSla, hasFirmTimedOut } from '../../utils/businessHours';\nimport { differenceInSeconds"
    if import_target in bk_code:
        bk_code = bk_code.replace(import_target, import_replacement, 1)
        print("2. Added calculateBusinessSla import to bookings.tsx")
    else:
        print("Warning: import_target not found in bookings.tsx")

# Spot A: Sorting getStatus(item) around line 2366
old_sort_spot = """          if (pendingStatuses.includes(s)) {
            const createdAt = item.created_at ? new Date(item.created_at).getTime() : now;
            if (now - createdAt > 60 * 60000) {
              return 'response_timeout';
            }
          }"""

new_sort_spot = """          if (pendingStatuses.includes(s)) {
            const dispTime = item.dispatched_at || item.request_sent_at || item.created_at;
            if (dispTime && hasFirmTimedOut(dispTime, now)) {
              return 'response_timeout';
            }
          }"""

if old_sort_spot in bk_code:
    bk_code = bk_code.replace(old_sort_spot, new_sort_spot, 1)
    print("3. Updated getStatus timeout check in bookings.tsx")
else:
    print("Warning: old_sort_spot not found in bookings.tsx")

# Spot B: renderRentalCountdown (the countdown timer)
old_countdown = """    const timeoutMins = isRental ? 30 : 60;
    const targetDispTime = (!isRental ? (booking.dispatched_at || booking.request_sent_at) : null) || booking.created_at;
    const createdAt = targetDispTime ? parseISO(targetDispTime) : new Date();
    const diffSec = differenceInSeconds(new Date(createdAt.getTime() + timeoutMins * 60000), now);

    if (diffSec <= 0) {"""

new_countdown = """    const timeoutMins = isRental ? 30 : 60;
    const targetDispTime = (!isRental ? (booking.dispatched_at || booking.request_sent_at) : null) || booking.created_at;
    const createdAt = targetDispTime ? parseISO(targetDispTime) : new Date();

    // For non-rental bookings, calculate exact 9 AM - 9 PM business hours SLA
    const sla = !isRental && targetDispTime ? calculateBusinessSla(targetDispTime, now) : null;
    const diffSec = sla ? differenceInSeconds(sla.expiresAt, now) : differenceInSeconds(new Date(createdAt.getTime() + timeoutMins * 60000), now);

    if (sla && sla.phase === 'QUEUED_NIGHT') {
      return (
        <View style={[styles.countdownContainer, { backgroundColor: '#EFF6FF', borderColor: '#93C5FD' }]}>
          <Text style={[styles.countdownText, { color: '#1D4ED8' }]}>
            🌙 Response window starts at 9:00 AM (60m SLA)
          </Text>
        </View>
      );
    }

    if (sla && sla.phase === 'PAUSED_OVERNIGHT') {
      return (
        <View style={[styles.countdownContainer, { backgroundColor: '#FEF3C7', borderColor: '#FCD34D' }]}>
          <Text style={[styles.countdownText, { color: '#B45309' }]}>
            🌙 SLA Paused for night · Resumes 9:00 AM ({sla.remainingMinutes}m left)
          </Text>
        </View>
      );
    }

    if (diffSec <= 0 || (sla && sla.isExpired)) {"""

if old_countdown in bk_code:
    bk_code = bk_code.replace(old_countdown, new_countdown, 1)
    print("4. Updated renderRentalCountdown with business hours in bookings.tsx")
else:
    print("Warning: old_countdown not found in bookings.tsx")

# Spot C: renderBookingDetails status calculation around line 2688
old_details_timeout = """    // Apply 60-minute timeout logic for non-rentals based on vendor dispatch time
    if (!isRental && (status === 'pending' || status === 'request_sent' || status === 'requested' || status === 'request sent')) {
      const targetDispTime = booking.dispatched_at || booking.request_sent_at || booking.created_at;
      const createdAt = targetDispTime ? parseISO(targetDispTime) : new Date();
      const diffSec = differenceInSeconds(new Date(createdAt.getTime() + 60 * 60000), now);
      if (diffSec <= 0) {
        status = 'response_timeout';
      }
    }"""

new_details_timeout = """    // Apply 60-minute business hours SLA timeout logic for non-rentals
    if (!isRental && (status === 'pending' || status === 'request_sent' || status === 'requested' || status === 'request sent')) {
      const targetDispTime = booking.dispatched_at || booking.request_sent_at || booking.created_at;
      if (targetDispTime && hasFirmTimedOut(targetDispTime, now)) {
        status = 'response_timeout';
      }
    }"""

if old_details_timeout in bk_code:
    bk_code = bk_code.replace(old_details_timeout, new_details_timeout, 1)
    print("5. Updated renderBookingDetails timeout check in bookings.tsx")
else:
    print("Warning: old_details_timeout not found in bookings.tsx")

# Spot D: compact card displayStatus calculation around line 5270
old_card_timeout = """                  if (!isRental && (displayStatus === 'PENDING' || displayStatus === 'REQUEST_SENT' || displayStatus === 'REQUESTED' || displayStatus === 'REQUEST SENT')) {
                    const targetDispTime = item.dispatched_at || item.request_sent_at || item.created_at;
                    const createdAt = targetDispTime ? parseISO(targetDispTime) : new Date();
                    const diffSec = differenceInSeconds(new Date(createdAt.getTime() + 60 * 60000), now);
                    if (diffSec <= 0) {
                      displayStatus = 'RESPONSE TIMEOUT';
                    }
                  }"""

new_card_timeout = """                  if (!isRental && (displayStatus === 'PENDING' || displayStatus === 'REQUEST_SENT' || displayStatus === 'REQUESTED' || displayStatus === 'REQUEST SENT')) {
                    const targetDispTime = item.dispatched_at || item.request_sent_at || item.created_at;
                    if (targetDispTime && hasFirmTimedOut(targetDispTime, now)) {
                      displayStatus = 'RESPONSE TIMEOUT';
                    }
                  }"""

if old_card_timeout in bk_code:
    bk_code = bk_code.replace(old_card_timeout, new_card_timeout, 1)
    print("6. Updated compact card timeout check in bookings.tsx")
else:
    print("Warning: old_card_timeout not found in bookings.tsx")

with open(bk_path, "w", encoding="utf-8") as f:
    f.write(bk_code)

print("Saved all vendor frontend updates successfully!")
