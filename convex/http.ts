import { httpRouter } from "convex/server";
import { Webhook } from "svix";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/webhooks/clerk",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error("CLERK_WEBHOOK_SECRET is not set");
    }

    const svixId = request.headers.get("svix-id");
    const svixTimestamp = request.headers.get("svix-timestamp");
    const svixSignature = request.headers.get("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      return new Response("Missing svix headers", { status: 400 });
    }

    const payload = await request.text();
    const wh = new Webhook(webhookSecret);

    let event: {
      type: string;
      data: {
        id: string;
        first_name: string | null;
        last_name: string | null;
        email_addresses: Array<{ email_address: string }>;
        image_url: string | null;
      };
    };

    try {
      event = wh.verify(payload, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      }) as typeof event;
    } catch {
      return new Response("Invalid signature", { status: 400 });
    }

    if (event.type === "user.created" || event.type === "user.updated") {
      const { id, first_name, last_name, email_addresses, image_url } =
        event.data;

      const name =
        [first_name, last_name].filter(Boolean).join(" ") || "Unknown User";
      const email = email_addresses[0]?.email_address ?? "";

      await ctx.runMutation(internal.users.upsertUser, {
        clerkId: id,
        name,
        email,
        imageUrl: image_url ?? undefined,
      });
    }

    return new Response("OK", { status: 200 });
  }),
});

export default http;
