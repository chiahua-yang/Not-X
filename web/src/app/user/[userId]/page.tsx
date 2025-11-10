"use client";

import { useParams } from "next/navigation";
import ProfilePage from "@/components/ProfilePage";

export default function UserProfilePage() {
  const params = useParams();
  const userId = params.userId as string;

  return <ProfilePage userId={userId} />;
}
