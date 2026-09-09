import { camartesFetch, CamartesApiError } from "./camartesClient";

export interface PaymentOrder {
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
  booking_id: string;
}

export interface RazorpayPaymentResult {
  booking_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface PaymentVerifyResult {
  success: boolean;
  status: string;
  booking_id: string;
  payment_id: string;
}

export interface PaymentStatus {
  payment_id: string;
  booking_id: string;
  amount: number;
  currency: string;
  status: string;
  razorpay_order_id: string;
  created_at?: string;
}

/**
 * Creates an authoritative payment order on the Camartes backend for a booking.
 * Enforces authenticated customer ownership and valid payable status.
 */
export async function createPaymentOrder(bookingId: string): Promise<PaymentOrder> {
  const id = bookingId.trim();
  if (!id) {
    throw new CamartesApiError("Booking ID is required to initiate payment.", 400);
  }

  const response = await camartesFetch<PaymentOrder>(
    "/api/payments/order",
    {
      method: "POST",
      body: JSON.stringify({ booking_id: id }),
    },
    { requireAuth: true },
  );

  if (!response?.order_id) {
    throw new CamartesApiError("Camartes did not return a valid payment order.", 502);
  }

  return response;
}

/**
 * Verifies Razorpay HMAC signature with the Camartes backend and transitions booking to confirmed/paid.
 */
export async function verifyPayment(payload: RazorpayPaymentResult): Promise<PaymentVerifyResult> {
  if (!payload.razorpay_order_id || !payload.razorpay_payment_id || !payload.razorpay_signature) {
    throw new CamartesApiError("Incomplete payment details received from gateway.", 400);
  }

  const response = await camartesFetch<PaymentVerifyResult>(
    "/api/payments/verify",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    { requireAuth: true },
  );

  if (!response?.success) {
    throw new CamartesApiError("Payment verification failed on the server.", 400);
  }

  return response;
}

/**
 * Fetches the current payment record and status for a booking.
 */
export async function getPaymentStatus(bookingId: string): Promise<PaymentStatus | null> {
  try {
    return await camartesFetch<PaymentStatus>(
      `/api/payments/${encodeURIComponent(bookingId)}`,
      { method: "GET" },
      { requireAuth: true },
    );
  } catch (error) {
    if (error instanceof CamartesApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}
