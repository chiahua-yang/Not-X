// Pusher configuration
// Temporary: hardcoded for testing, should use env vars in production

export const PUSHER_CONFIG = {
  key: process.env.NEXT_PUBLIC_PUSHER_KEY || "c9efd3da5981282fa847",
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "ap1",
};
