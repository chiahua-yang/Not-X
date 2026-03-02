// Client-side Pusher instance
import PusherClient from "pusher-js";
import { PUSHER_CONFIG } from "./pusher-config";

let pusherClient: PusherClient | null = null;

export function getPusherClient() {
  if (!pusherClient) {
    const key = PUSHER_CONFIG.key;
    const cluster = PUSHER_CONFIG.cluster;

    console.log("[Pusher Client] Initializing with:", { key, cluster });

    if (!key || !cluster) {
      console.error("[Pusher Client] Missing environment variables!");
      console.error("NEXT_PUBLIC_PUSHER_KEY:", key);
      console.error("NEXT_PUBLIC_PUSHER_CLUSTER:", cluster);
    }

    pusherClient = new PusherClient(key!, {
      cluster: cluster!,
    });

    // Log connection state changes
    pusherClient.connection.bind("state_change", (states: any) => {
      console.log("[Pusher Client] State changed:", states.previous, "->", states.current);
    });

    pusherClient.connection.bind("connected", () => {
      console.log("[Pusher Client] Connected successfully!");
    });

    pusherClient.connection.bind("error", (err: any) => {
      // Use warn so successful POSTs don't look broken; connection can fail due to key/cluster or auth.
      console.warn("[Pusher Client] Connection error (realtime may be limited):", err?.message ?? err);
    });
  }
  return pusherClient;
}
