import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { getUserFromCookie } from "@/lib/session";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID ?? "",
  key_secret: process.env.RAZORPAY_KEY_SECRET ?? "",
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Auth check
  const user = await getUserFromCookie();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { amount: number };
  const { amount } = body;

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  // Razorpay amounts are in the smallest currency unit (paise for INR)
  const amountInPaise = Math.round(amount * 100);

  const order = await razorpay.orders.create({
    amount: amountInPaise,
    currency: "INR",
    receipt: `rcpt_${Date.now()}`,
  });

  return NextResponse.json({
    razorpayOrderId: order.id,
    amount: amountInPaise,
    currency: order.currency,
    keyId: process.env.RAZORPAY_KEY_ID,
  });
}
