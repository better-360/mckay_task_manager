import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { NotificationService } from "@/lib/notification-service"

// GET /api/notifications - Kullanıcının bildirimlerini getir
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { error: "Giriş yapmanız gerekiyor" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get("limit") || "20")

    const notifications = await NotificationService.getUserNotifications(
      session.user.id,
      limit
    )

    return NextResponse.json(notifications)
  } catch (error) {
    console.error("Notifications fetch error:", error)
    return NextResponse.json(
      { error: "Bildirimler yüklenirken hata oluştu" },
      { status: 500 }
    )
  }
}

// PUT /api/notifications - Bildirimleri okundu olarak işaretle
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { error: "Giriş yapmanız gerekiyor" },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { notificationId, markAllAsRead } = body

    if (markAllAsRead) {
      await NotificationService.markAllAsRead(session.user.id)
    } else if (notificationId) {
      await NotificationService.markAsRead(notificationId, session.user.id)
    } else {
      return NextResponse.json(
        { error: "notificationId veya markAllAsRead gerekli" },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Notification update error:", error)
    return NextResponse.json(
      { error: "Bildirim güncellenirken hata oluştu" },
      { status: 500 }
    )
  }
} 