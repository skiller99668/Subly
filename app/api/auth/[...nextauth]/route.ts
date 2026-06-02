import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"

// In-memory user storage (replace with database later)
// Pre-hashed password for "password123"
const users: { [key: string]: { password: string; name: string } } = {
  demo: {
    password: "$2b$10$VLzMD3hQAdc5buBYD48oguHRuzbP1VuVu13Jir1v0KvxYvix8HiGa",
    name: "Demo User",
  },
}

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text", placeholder: "username" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null
        }

        const user = users[credentials.username]
        if (!user) {
          return null
        }

        const passwordMatch = await bcrypt.compare(
          credentials.password,
          user.password
        )
        if (!passwordMatch) {
          return null
        }

        return {
          id: credentials.username,
          name: user.name,
          email: `${credentials.username}@subly.local`,
        }
      },
    }),
  ],
  pages: {
    signIn: "/auth",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
      }
      return session
    },
  },
  session: {
    strategy: "jwt",
  },
})

export { handler as GET, handler as POST }
