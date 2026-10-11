import os

path = r"c:\Users\keert\bookashoot\src\engine\matching.ts"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add MAX_CONCURRENT_LEADS and calculateFairQueueBoost
old_top = """export const MAX_MATCHES = 6;

export const MATCH_WEIGHTS = {"""

new_top = """export const MAX_MATCHES = 6;
export const MAX_CONCURRENT_LEADS = 3;

/**
 * The "Fair-Queue" Gauge (The Hunger Score).
 * Studios with 0 leads today get highest priority (1.50x),
 * studios with 1 lead today get 1.00x, 2 leads get 0.75x, etc.
 * Idle wait bonus: if last dispatch was > 6 hours ago, adds +0.10.
 */
export function calculateFairQueueBoost(vendor: CustomerVendor): number {
  const leadsToday = Math.max(0, vendor.leadsToday ?? 0);
  const baseHunger = 1.5 / (1.0 + 0.5 * leadsToday);

  let idleBonus = 0;
  if (vendor.lastLeadDispatchedAt) {
    const elapsedMs = Date.now() - new Date(vendor.lastLeadDispatchedAt).getTime();
    if (!isNaN(elapsedMs) && elapsedMs > 6 * 3600 * 1000) {
      idleBonus = 0.1;
    }
  }

  return baseHunger + idleBonus;
}

export const MATCH_WEIGHTS = {"""

assert old_top in content, "old_top not found"
content = content.replace(old_top, new_top, 1)

# 2. Update scoreVendor to multiply by fairQueueBoost
old_score_return = """  return (
    availabilityScore * MATCH_WEIGHTS.availability +
    reqScore * MATCH_WEIGHTS.requirementMatch +
    budgetScore * MATCH_WEIGHTS.budgetMatch +
    ratingScore * MATCH_WEIGHTS.rating +
    experienceScore * MATCH_WEIGHTS.experience +
    portfolioScore * MATCH_WEIGHTS.portfolio +
    locationScore * MATCH_WEIGHTS.location
  );"""

new_score_return = """  const baseScore =
    availabilityScore * MATCH_WEIGHTS.availability +
    reqScore * MATCH_WEIGHTS.requirementMatch +
    budgetScore * MATCH_WEIGHTS.budgetMatch +
    ratingScore * MATCH_WEIGHTS.rating +
    experienceScore * MATCH_WEIGHTS.experience +
    portfolioScore * MATCH_WEIGHTS.portfolio +
    locationScore * MATCH_WEIGHTS.location;

  const fairQueueBoost = calculateFairQueueBoost(vendor);
  return Math.round(baseScore * fairQueueBoost * 1000) / 1000;"""

assert old_score_return in content, "old_score_return not found"
content = content.replace(old_score_return, new_score_return, 1)

# 3. Update candidates filter with Concurrency Cap
old_candidates_filter = """  const candidates = vendors.filter(
    (v) =>
      (!excludedVendorIds || !excludedVendorIds.includes(v.vendorId)) &&
      isPhotographyFirm(v) &&
      vendorServesLocationPreference(v, locationPref, eventCity) &&
      checkVendorAvailability(v, booking.days as EventDay[], req).available,
  );"""

new_candidates_filter = """  // Active Concurrency Cap: Studios with >= MAX_CONCURRENT_LEADS (3) active pending leads
  // are temporarily skipped to prevent overloading and give other studios an equal opportunity.
  const candidates = vendors.filter(
    (v) =>
      (!excludedVendorIds || !excludedVendorIds.includes(v.vendorId)) &&
      isPhotographyFirm(v) &&
      vendorServesLocationPreference(v, locationPref, eventCity) &&
      ((v.activePendingLeads ?? 0) < MAX_CONCURRENT_LEADS) &&
      checkVendorAvailability(v, booking.days as EventDay[], req).available,
  );"""

assert old_candidates_filter in content, "old_candidates_filter not found"
content = content.replace(old_candidates_filter, new_candidates_filter, 1)

# 4. Attach vendor to result items and use idle time tie-breaker in sort
old_result_item = """    return {
      match: {"""

new_result_item = """    return {
      vendor,
      match: {"""

assert old_result_item in content, "old_result_item not found"
content = content.replace(old_result_item, new_result_item, 1)

old_sort = """  // Rank by: [Tier Match] -> [Location/City Match] -> [Rating / Reviews / matchScore]
  const ranked = results
    .filter((r) => r.match.available)
    .sort((a, b) => {
      if (a.tierMatched !== b.tierMatched) {
        return a.tierMatched ? -1 : 1;
      }
      if (a.locationMatched !== b.locationMatched) {
        return a.locationMatched ? -1 : 1;
      }
      return b.match.matchScore - a.match.matchScore;
    });"""

new_sort = """  // Rank by: [Tier Match] -> [Location/City Match] -> [Fair-Queue matchScore] -> [Idle Time]
  const ranked = results
    .filter((r) => r.match.available)
    .sort((a, b) => {
      if (a.tierMatched !== b.tierMatched) {
        return a.tierMatched ? -1 : 1;
      }
      if (a.locationMatched !== b.locationMatched) {
        return a.locationMatched ? -1 : 1;
      }
      if (Math.abs(b.match.matchScore - a.match.matchScore) > 0.0001) {
        return b.match.matchScore - a.match.matchScore;
      }
      const aTime = a.vendor.lastLeadDispatchedAt ? new Date(a.vendor.lastLeadDispatchedAt).getTime() : 0;
      const bTime = b.vendor.lastLeadDispatchedAt ? new Date(b.vendor.lastLeadDispatchedAt).getTime() : 0;
      return aTime - bTime;
    });"""

assert old_sort in content, "old_sort not found"
content = content.replace(old_sort, new_sort, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated matching.ts successfully!")
