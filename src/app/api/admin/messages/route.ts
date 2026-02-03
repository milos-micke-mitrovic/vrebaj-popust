import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const PAGE_SIZE = 20;

function isAuthorized(request: NextRequest): boolean {
  const key = request.nextUrl.searchParams.get("key");
  const secret = process.env.ADMIN_SECRET;
  return Boolean(secret && key === secret);
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const page = Math.max(1, parseInt(request.nextUrl.searchParams.get("page") || "1", 10) || 1);

  try {
    const [messages, total] = await Promise.all([
      prisma.contactMessage.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.contactMessage.count(),
    ]);

    return NextResponse.json({
      messages,
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total,
        totalPages: Math.ceil(total / PAGE_SIZE),
      },
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

// Mark messages as read/unread
export async function PATCH(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
    const read = typeof body.read === "boolean" ? body.read : true;

    if (ids.length === 0) {
      return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
    }

    await prisma.contactMessage.updateMany({
      where: { id: { in: ids } },
      data: { read },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating messages:", error);
    return NextResponse.json(
      { error: "Failed to update messages" },
      { status: 500 }
    );
  }
}

// Delete messages
export async function DELETE(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
    const all = body.all === true;

    if (!all && ids.length === 0) {
      return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
    }

    if (all) {
      await prisma.contactMessage.deleteMany();
    } else {
      await prisma.contactMessage.deleteMany({
        where: { id: { in: ids } },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting messages:", error);
    return NextResponse.json(
      { error: "Failed to delete messages" },
      { status: 500 }
    );
  }
}
