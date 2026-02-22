import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Dumbbell } from "lucide-react"

export function PublicNav() {
    return (
        <nav className="fixed top-0 w-full z-50 border-b border-white/10 bg-[#0A0A0A]/80 backdrop-blur-md">
            <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                <Link href="/landing" className="flex items-center gap-2">
                    <div className="bg-gradient-to-br from-[#FF6B35] to-[#FF9F2E] p-1.5 rounded-lg">
                        <Dumbbell className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-white">Kinex Fit</span>
                </Link>
                <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/70">
                    <Link href="/landing" className="hover:text-white transition-colors">Home</Link>
                    <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
                    <Link href="/support" className="hover:text-white transition-colors">Support</Link>
                </div>
                <div className="flex items-center gap-4">
                    <Link href="/sign-in" className="text-sm font-medium text-white/70 hover:text-white hidden sm:block">
                        Log in
                    </Link>
                    <Link
                        href="/auth/login?mode=signup"
                        className={cn(
                            buttonVariants(),
                            "bg-[#FF6B35] hover:bg-[#E55A2B] text-white border-none rounded-full px-6"
                        )}
                    >
                        Sign Up
                    </Link>
                </div>
            </div>
        </nav>
    )
}
