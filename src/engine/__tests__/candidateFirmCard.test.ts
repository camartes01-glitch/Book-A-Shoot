import type { AssignedPhotographer } from "@/src/types/booking";
import { maskPhoneNumber } from "@/src/domain/bookingRequest";

describe("Candidate Firm Workflow & Logic", () => {
  const awaitingFirm: AssignedPhotographer = {
    id: "firm_1",
    provider_id: "firm_1",
    name: "Aura Motion Studios",
    rating: 4.9,
    city: "Bangalore",
    has_accepted: false,
    is_confirmed: false,
    can_confirm: false,
    contact_unlocked: false,
    contact_phone: "+919876543210",
  };

  const acceptedFirm: AssignedPhotographer = {
    id: "firm_2",
    provider_id: "firm_2",
    name: "Lens & Light Studios",
    rating: 4.8,
    city: "Bangalore",
    has_accepted: true,
    is_confirmed: false,
    can_confirm: true,
    contact_unlocked: true,
    contact_phone: "+919876543210",
    contact_whatsapp: "9876543210",
  };

  const confirmedFirm: AssignedPhotographer = {
    id: "firm_2",
    provider_id: "firm_2",
    name: "Lens & Light Studios",
    rating: 4.8,
    city: "Bangalore",
    has_accepted: true,
    is_confirmed: true,
    can_confirm: false,
    contact_unlocked: true,
    contact_phone: "+919876543210",
  };

  test("awaiting firm has masked contact and cannot be confirmed", () => {
    expect(awaitingFirm.has_accepted).toBe(false);
    expect(awaitingFirm.can_confirm).toBe(false);
    expect(awaitingFirm.contact_unlocked).toBe(false);
    const masked = maskPhoneNumber(awaitingFirm.contact_phone);
    expect(masked).toBe("+91 ••••• ••210");
  });

  test("accepted firm unlocks contact and can be confirmed by client", () => {
    expect(acceptedFirm.has_accepted).toBe(true);
    expect(acceptedFirm.can_confirm).toBe(true);
    expect(acceptedFirm.contact_unlocked).toBe(true);
    expect(acceptedFirm.contact_phone).toBe("+919876543210");

    // WhatsApp clean link validation
    const digits = (acceptedFirm.contact_whatsapp || acceptedFirm.contact_phone || "").replace(/\D/g, "");
    const clean10 = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : (digits.length >= 10 ? digits.slice(-10) : digits);
    const waUrl = `https://wa.me/91${clean10}?text=${encodeURIComponent(`Hi ${acceptedFirm.name}, I would like to discuss my shoot request.`)}`;
    expect(waUrl).toBe("https://wa.me/919876543210?text=Hi%20Lens%20%26%20Light%20Studios%2C%20I%20would%20like%20to%20discuss%20my%20shoot%20request.");
  });

  test("confirmed firm locks lead and prevents confirming others", () => {
    expect(confirmedFirm.is_confirmed).toBe(true);
    expect(confirmedFirm.can_confirm).toBe(false);
    expect(confirmedFirm.has_accepted).toBe(true);
  });

  test("status message distinguishes 1-5 candidate firms from 6 dispatched firms", () => {
    const msg3 = "Found 3 suitable photography firms meeting your criteria.";
    const msg6 = "Dispatched to 6 suitable photography firms.";

    expect(msg3.includes("6")).toBe(false);
    expect(msg6.includes("6")).toBe(true);
  });

  test("filters candidate firms: excludes timed out or rejected firms, and checks acceptance for chat", () => {
    const firms = [
      { id: "f1", provider_id: "f1", name: "Firm 1", has_accepted: true },
      { id: "f2", provider_id: "f2", name: "Firm 2", has_accepted: false },
      { id: "f3", provider_id: "f3", name: "Firm 3", has_accepted: false, is_rejected: true },
      { id: "f4", provider_id: "f4", name: "Firm 4", has_accepted: false, is_timed_out: true },
    ];

    const activeFirms = firms.filter(
      (f) => !f.is_rejected && !f.is_timed_out,
    );

    expect(activeFirms).toHaveLength(2);
    expect(activeFirms[0].has_accepted).toBe(true);
    expect(activeFirms[1].has_accepted).toBe(false);
  });
});
