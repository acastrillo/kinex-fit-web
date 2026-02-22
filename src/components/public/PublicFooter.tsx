import Link from "next/link"
import { Dumbbell } from "lucide-react"

export function PublicFooter() {
    return (
        <footer className="border-t border-zinc-900 bg-[#050505] py-12 text-center md:text-left">
            <div className="container mx-auto px-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                    <Link href="/landing" className="flex items-center gap-2">
                        <Dumbbell className="h-6 w-6 text-[#FF6B35]" />
                        <span className="text-xl font-bold text-white">Kinex Fit</span>
                    </Link>
                    <div className="flex gap-6 text-sm text-zinc-500">
                        <Link href="/privacy" className="hover:text-zinc-300 transition-colors">Privacy</Link>
                        <Link href="/terms" className="hover:text-zinc-300 transition-colors">Terms</Link>
                        <Link href="/support" className="hover:text-zinc-300 transition-colors">Support</Link>
                    </div>
                    <div className="text-zinc-500 text-sm">
                        &copy; {new Date().getFullYear()} Kinex Fit. All rights reserved.
                    </div>
                </div>
            </div>
        </footer>
    )
}
