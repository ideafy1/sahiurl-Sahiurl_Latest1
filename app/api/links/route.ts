import { type NextRequest, NextResponse } from "next/server"
import { getUserLinks } from "@/lib/firebase/links"
import { auth as adminAuth, firestore } from "@/lib/firebase/admin"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Get the authorization token from the request
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]

    // Verify the token using Firebase Admin
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (error) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const userId = decodedToken.uid;

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit") as string) : undefined
    const orderBy = searchParams.get("orderBy") as any || undefined
    const orderDir = searchParams.get("orderDir") as any || undefined
    const status = searchParams.get("status") as any || undefined

    // Get the user's links
    const links = await getUserLinks({
      userId,
      limit,
      orderBy,
      orderDir,
      status,
    }).catch(error => {
      console.error("Firestore error:", error)
      throw new Error("Failed to retrieve links")
    })

    // Add proper headers handling for static generation
    const headers = Object.fromEntries(request.headers.entries())
    
    // Update response to include cache busting
    return new Response(JSON.stringify({ 
      success: true, 
      links,
      generatedAt: Date.now()
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
    })
  } catch (error: any) {
    console.error("Error fetching links:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch links" }, { status: 500 })
  }
}

