"use client"

export const dynamic = "force-dynamic"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"

function VerifyEmailContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const token = searchParams.get("token")

    const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
    const [message, setMessage] = useState("Verifying your email...")

    useEffect(() => {
        if (!token) {
            setStatus("error")
            setMessage("Verification token is missing.")
            return
        }

        const verify = async () => {
            try {
                const response = await fetch(`/api/users/auth/verify-email?token=${token}`)
                const data = await response.json()

                if (response.ok) {
                    setStatus("success")
                    setMessage(data.message || "Email verified successfully! Redirecting to login...")
                    setTimeout(() => {
                        router.push("/?verified=true")
                    }, 3000)
                } else {
                    setStatus("error")
                    setMessage(data.message || "Email verification failed.")
                }
            } catch (err) {
                setStatus("error")
                setMessage("An error occurred during verification.")
            }
        }

        verify()
    }, [token, router])

    return (
        <div className="bg-[#1F2833] p-8 rounded-2xl shadow-2xl max-w-md w-full text-center border border-gray-800">
            {status === "loading" && (
                <div className="flex flex-col items-center">
                    <Loader2 className="w-16 h-16 text-[#66FCF1] animate-spin mb-4" />
                    <h1 className="text-2xl font-bold mb-2">Verifying...</h1>
                    <p className="text-gray-400">{message}</p>
                </div>
            )}

            {status === "success" && (
                <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
                    <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
                    <h1 className="text-2xl font-bold mb-2 text-green-400">Success!</h1>
                    <p className="text-gray-300">{message}</p>
                    <button
                        onClick={() => router.push("/")}
                        className="mt-6 px-6 py-2 bg-[#45A29E] hover:bg-[#66FCF1] text-black font-semibold rounded-lg transition-colors"
                    >
                        Go to Login
                    </button>
                </div>
            )}

            {status === "error" && (
                <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
                    <XCircle className="w-16 h-16 text-red-500 mb-4" />
                    <h1 className="text-2xl font-bold mb-2 text-red-400">Verification Failed</h1>
                    <p className="text-gray-300">{message}</p>
                    <button
                        onClick={() => router.push("/")}
                        className="mt-6 px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
                    >
                        Back to Home
                    </button>
                </div>
            )}
        </div>
    )
}

export default function VerifyEmailPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#0B0C10] text-white p-4">
            <Suspense fallback={
                <div className="bg-[#1F2833] p-8 rounded-2xl shadow-2xl max-w-md w-full text-center border border-gray-800">
                    <div className="flex flex-col items-center">
                        <Loader2 className="w-16 h-16 text-[#66FCF1] animate-spin mb-4" />
                        <h1 className="text-2xl font-bold mb-2">Loading...</h1>
                        <p className="text-gray-400">Preparing verification environment...</p>
                    </div>
                </div>
            }>
                <VerifyEmailContent />
            </Suspense>
        </div>
    )
}
