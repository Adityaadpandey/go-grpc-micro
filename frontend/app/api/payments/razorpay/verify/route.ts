import { createHmac } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookie } from "@/lib/session";
import { serverGraphQL } from "@/lib/apollo/server";

interface VerifyBody {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  // Cart data needed to create the order
  products: Array<{ id: string; quantity: number }>;
}

interface CreateOrderResult {
  createOrder: {
    id: string;
    createdAt: string;
    totalPrice: number;
    products: Array<{ id: string; name: string; price: number; quantity: number }>;
  } | null;
}

const CREATE_ORDER_MUTATION = `
  mutation CreateOrder($accountId: String!, $products: [OrderProductInput!]!) {
    createOrder(order: { accountId: $accountId, products: $products }) {
      id
      createdAt
      totalPrice
      products { id name price quantity }
    }
  }
`;

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Auth check
  const user = await getUserFromCookie();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as VerifyBody;
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, products } = body;

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !products?.length) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // ── Signature verification ─────────────────────────────────────────────────
  // Razorpay signs: HMAC-SHA256(key_secret, razorpay_order_id + "|" + razorpay_payment_id)
  const keySecret = process.env.RAZORPAY_KEY_SECRET ?? "";
  const expectedSignature = createHmac("sha256", keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  if (expectedSignature !== razorpaySignature) {
    return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
  }

  // ── Create the order in our system ────────────────────────────────────────
  const data = await serverGraphQL<CreateOrderResult>(CREATE_ORDER_MUTATION, {
    accountId: user.id,
    products,
  });

  if (!data.createOrder) {
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }

  return NextResponse.json({ order: data.createOrder });
}
