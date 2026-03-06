// Server-side Pusher instance
import Pusher from "pusher";

export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

// Trigger a Pusher event
export async function triggerPusherEvent(
  channel: string,
  event: string,
  data: any
) {
  try {
    if (process.env.NODE_ENV === "development") {
      console.log(`[Pusher Server] Triggering event:`, { channel, event, data });
    }
    const result = await pusherServer.trigger(channel, event, data);
    if (process.env.NODE_ENV === "development") {
      console.log(`[Pusher Server] Event triggered successfully:`, result);
    }
  } catch (error) {
    console.error("[Pusher Server] Failed to trigger event:", error);
    throw error;
  }
}
