import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secretKey = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const encodedKey = new TextEncoder().encode(secretKey);

export interface User {
  id: string;
  fullName: string;
  email: string;
}

export async function signToken(user: User): Promise<string> {
  const token = await new SignJWT({
    id: user.id,
    fullName: user.fullName,
    email: user.email,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encodedKey);

  return token;
}

export async function verifyToken(token: string): Promise<User | null> {
  try {
    const { payload } = await jwtVerify(token, encodedKey);
    return {
      id: payload.id as string,
      fullName: payload.fullName as string,
      email: payload.email as string,
    };
  } catch (error) {
    return null;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;

  if (!token) {
    return null;
  }

  return await verifyToken(token);
}

export async function setAuthCookie(token: string, response?: Response) {
  const cookieStore = await cookies();
  cookieStore.set("auth-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

export async function removeAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete("auth-token");
}

export async function verifyCredentials(
  email: string,
  password: string
): Promise<User | null> {
  try {
    // Importar dinámicamente para evitar problemas en Edge Runtime
    const { PostgreSQLConnector } = await import("./replication/connectors");
    const client = await PostgreSQLConnector.connect();
    const result = await client.query(
      "SELECT id, full_name, email, password FROM users WHERE email = $1",
      [email]
    );
    await client.end();

    if (result.rows.length === 0) {
      return null;
    }

    const user = result.rows[0];

    // Comparar contraseña (sin hash por ahora según el plan)
    if (user.password !== password) {
      return null;
    }

    return {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
    };
  } catch (error) {
    console.error("Error verifying credentials:", error);
    return null;
  }
}

