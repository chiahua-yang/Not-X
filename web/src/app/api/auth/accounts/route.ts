import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Get all registered accounts (for login page to show saved accounts)
export async function GET() {
  try {
    // Get all users who have completed registration (have a userId set)
    // Include their OAuth provider information
    const users = await prisma.user.findMany({
      where: {
        userId: {
          not: null,
        },
      },
      select: {
        id: true,
        userId: true,
        name: true,
        displayName: true,
        image: true,
        accounts: {
          select: {
            provider: true,
          },
          take: 1, // Get the first OAuth provider they used
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 5, // Show last 5 accounts
    });

    // Transform the data to include provider at the top level
    const usersWithProvider = users.map(user => ({
      id: user.id,
      userId: user.userId,
      name: user.name,
      displayName: user.displayName,
      image: user.image,
      provider: user.accounts[0]?.provider || null,
    }));

    return NextResponse.json(usersWithProvider);
  } catch (error) {
    console.error("Error fetching accounts:", error);
    return NextResponse.json({ error: "Failed to fetch accounts" }, { status: 500 });
  }
}
