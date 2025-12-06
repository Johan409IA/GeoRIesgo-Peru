import { NextResponse } from "next/server";
import { removeAuthCookie } from "@/lib/auth";

export async function POST() {
  try {
    const response = NextResponse.json({
      success: true,
      message: "Sesión cerrada correctamente",
    });

    // Eliminar cookie
    response.cookies.delete("auth-token");

    return response;
  } catch (error: any) {
    console.error("Error in logout:", error);
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}

