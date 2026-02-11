import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

const authOptions = {
    providers: [
        Credentials({
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                // Call backend API for authentication
                if (credentials?.email && credentials?.password) {
                    try {
                        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: credentials.email, password: credentials.password }),
                        })

                        if (!response.ok) {
                            throw new Error('Invalid credentials')
                        }

                        const data = await response.json()
                        return {
                            id: data.user.id,
                            name: data.user.name,
                            email: data.user.email,
                            role: data.user.role,
                        }
                    } catch (error) {
                        throw new Error('Authentication failed')
                    }
                }
                return null;
            },
        }),
    ],
    session: {
        strategy: "jwt" as "jwt",
    },
    pages: {
        signIn: "/login",
    },
}

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions)

export const GET = handlers.GET
export const POST = handlers.POST
