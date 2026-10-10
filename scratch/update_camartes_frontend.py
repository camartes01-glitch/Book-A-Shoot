import os

# 1. Update timelineUtils.ts
tl_path = r"C:\Users\keert\camartes\camartes-prelaunch-1\frontend\utils\timelineUtils.ts"
with open(tl_path, "r", encoding="utf-8") as f:
    tl_code = f.read()

tl_target = "const targetDateStr = rental.request_sent_at || rental.dispatched_at || rental.created_at;"
tl_replace = "const targetDateStr = rental.dispatched_at || rental.request_sent_at || rental.created_at;"

if tl_target in tl_code:
    tl_code = tl_code.replace(tl_target, tl_replace, 1)
    with open(tl_path, "w", encoding="utf-8") as f:
        f.write(tl_code)
    print("1. Updated timelineUtils.ts to prioritize dispatched_at")
else:
    print("1. tl_target not found or already updated")

# 2. Update bookings.tsx
bk_path = r"C:\Users\keert\camartes\camartes-prelaunch-1\frontend\app\(tabs)\bookings.tsx"
with open(bk_path, "r", encoding="utf-8") as f:
    bk_code = f.read()

# Spot 1: renderAcceptanceCountdown
spot1_target = """    const timeoutMins = isRental ? 30 : 60;
    const createdAt = booking.created_at ? parseISO(booking.created_at) : new Date();
    const diffSec = differenceInSeconds(new Date(createdAt.getTime() + timeoutMins * 60000), now);"""

spot1_replace = """    const timeoutMins = isRental ? 30 : 60;
    const targetDispTime = (!isRental ? (booking.dispatched_at || booking.request_sent_at) : null) || booking.created_at;
    const createdAt = targetDispTime ? parseISO(targetDispTime) : new Date();
    const diffSec = differenceInSeconds(new Date(createdAt.getTime() + timeoutMins * 60000), now);"""

if spot1_target in bk_code:
    bk_code = bk_code.replace(spot1_target, spot1_replace, 1)
    print("2. Updated renderAcceptanceCountdown in bookings.tsx")
else:
    print("2. Warning: spot1_target not found")

# Spot 2: renderBookingDetails status calculation
spot2_target = """    // Apply 60-minute timeout logic for non-rentals
    if (!isRental && (status === 'pending' || status === 'request_sent' || status === 'requested' || status === 'request sent')) {
      const createdAt = booking.created_at ? parseISO(booking.created_at) : new Date();
      const diffSec = differenceInSeconds(new Date(createdAt.getTime() + 60 * 60000), now);
      if (diffSec <= 0) {
        status = 'response_timeout';
      }
    }"""

spot2_replace = """    // Apply 60-minute timeout logic for non-rentals based on vendor dispatch time
    if (!isRental && (status === 'pending' || status === 'request_sent' || status === 'requested' || status === 'request sent')) {
      const targetDispTime = booking.dispatched_at || booking.request_sent_at || booking.created_at;
      const createdAt = targetDispTime ? parseISO(targetDispTime) : new Date();
      const diffSec = differenceInSeconds(new Date(createdAt.getTime() + 60 * 60000), now);
      if (diffSec <= 0) {
        status = 'response_timeout';
      }
    }"""

if spot2_target in bk_code:
    bk_code = bk_code.replace(spot2_target, spot2_replace, 1)
    print("3. Updated renderBookingDetails timeout in bookings.tsx")
else:
    print("3. Warning: spot2_target not found")

# Spot 3: compact card displayStatus calculation
spot3_target = """                  if (!isRental && (displayStatus === 'PENDING' || displayStatus === 'REQUEST_SENT' || displayStatus === 'REQUESTED' || displayStatus === 'REQUEST SENT')) {
                    const createdAt = item.created_at ? parseISO(item.created_at) : new Date();
                    const diffSec = differenceInSeconds(new Date(createdAt.getTime() + 60 * 60000), now);
                    if (diffSec <= 0) {
                      displayStatus = 'RESPONSE TIMEOUT';
                    }
                  }"""

spot3_replace = """                  if (!isRental && (displayStatus === 'PENDING' || displayStatus === 'REQUEST_SENT' || displayStatus === 'REQUESTED' || displayStatus === 'REQUEST SENT')) {
                    const targetDispTime = item.dispatched_at || item.request_sent_at || item.created_at;
                    const createdAt = targetDispTime ? parseISO(targetDispTime) : new Date();
                    const diffSec = differenceInSeconds(new Date(createdAt.getTime() + 60 * 60000), now);
                    if (diffSec <= 0) {
                      displayStatus = 'RESPONSE TIMEOUT';
                    }
                  }"""

if spot3_target in bk_code:
    bk_code = bk_code.replace(spot3_target, spot3_replace, 1)
    print("4. Updated compact card timeout in bookings.tsx")
else:
    print("4. Warning: spot3_target not found")

with open(bk_path, "w", encoding="utf-8") as f:
    f.write(bk_code)
print("Saved frontend changes successfully!")
