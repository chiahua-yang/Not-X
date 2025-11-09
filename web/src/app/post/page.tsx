"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PostPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to home when accessing /post directly
    // The post modal should be triggered from the sidebar button
    router.push("/home");
  }, [router]);

  return null;
}


