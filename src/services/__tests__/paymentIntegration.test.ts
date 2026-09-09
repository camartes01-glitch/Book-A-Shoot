import { createPaymentOrder, verifyPayment, getPaymentStatus } from "../paymentApi";
import { camartesFetch, CamartesApiError } from "../camartesClient";

jest.mock("../camartesClient", () => ({
  camartesFetch: jest.fn(),
  CamartesApiError: class CamartesApiError extends Error {
    status: number;
    constructor(message: string, status = 500) {
      super(message);
      this.name = "CamartesApiError";
      this.status = status;
    }
  },
}));

describe("paymentApi integration", () => {
  const mockFetch = camartesFetch as jest.MockedFunction<typeof camartesFetch>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createPaymentOrder", () => {
    it("creates a payment order for a valid booking", async () => {
      mockFetch.mockResolvedValueOnce({
        order_id: "order_rzp_12345",
        amount: 8500,
        currency: "INR",
        key_id: "rzp_test_key123",
        booking_id: "bk_1001",
      });

      const order = await createPaymentOrder("bk_1001");

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/payments/order",
        {
          method: "POST",
          body: JSON.stringify({ booking_id: "bk_1001" }),
        },
        { requireAuth: true },
      );
      expect(order.order_id).toBe("order_rzp_12345");
      expect(order.amount).toBe(8500);
      expect(order.currency).toBe("INR");
    });

    it("rejects empty booking ID before making network call", async () => {
      await expect(createPaymentOrder("  ")).rejects.toThrow(
        "Booking ID is required to initiate payment.",
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("throws when backend fails to return an order_id", async () => {
      mockFetch.mockResolvedValueOnce({} as any);

      await expect(createPaymentOrder("bk_1001")).rejects.toThrow(
        "Camartes did not return a valid payment order.",
      );
    });
  });

  describe("verifyPayment", () => {
    it("verifies payment signature with the backend", async () => {
      mockFetch.mockResolvedValueOnce({
        success: true,
        status: "paid",
        booking_id: "bk_1001",
        payment_id: "pay_999",
      });

      const result = await verifyPayment({
        booking_id: "bk_1001",
        razorpay_order_id: "order_rzp_12345",
        razorpay_payment_id: "pay_rzp_payment_777",
        razorpay_signature: "sig_hmac_abc123",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/payments/verify",
        {
          method: "POST",
          body: JSON.stringify({
            booking_id: "bk_1001",
            razorpay_order_id: "order_rzp_12345",
            razorpay_payment_id: "pay_rzp_payment_777",
            razorpay_signature: "sig_hmac_abc123",
          }),
        },
        { requireAuth: true },
      );
      expect(result.success).toBe(true);
      expect(result.status).toBe("paid");
    });

    it("rejects incomplete payment details before network call", async () => {
      await expect(
        verifyPayment({
          booking_id: "bk_1001",
          razorpay_order_id: "",
          razorpay_payment_id: "pay_123",
          razorpay_signature: "sig_123",
        }),
      ).rejects.toThrow("Incomplete payment details received from gateway.");
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("getPaymentStatus", () => {
    it("returns payment details when present", async () => {
      mockFetch.mockResolvedValueOnce({
        payment_id: "pay_001",
        booking_id: "bk_1001",
        amount: 8500,
        currency: "INR",
        status: "paid",
        razorpay_order_id: "order_rzp_12345",
      });

      const status = await getPaymentStatus("bk_1001");
      expect(status).not.toBeNull();
      expect(status?.status).toBe("paid");
      expect(status?.amount).toBe(8500);
    });

    it("returns null when booking has no payment (404)", async () => {
      mockFetch.mockRejectedValueOnce(new CamartesApiError("Not found", 404));

      const status = await getPaymentStatus("bk_9999");
      expect(status).toBeNull();
    });
  });
});
