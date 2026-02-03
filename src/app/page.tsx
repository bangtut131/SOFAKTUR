import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function WelcomePage() {
    return (
        <main className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-6 text-center font-sans">
            <div className="bg-white p-12 rounded-3xl shadow-xl max-w-2xl w-full space-y-8 border border-gray-100">

                {/* Logo Section */}
                <div className="flex justify-center mb-8">
                    <img
                        src="/logo.png"
                        alt="PT Gama Agro Sejati"
                        className="h-24 w-auto object-contain"
                    />
                </div>

                {/* Welcome Text */}
                <div className="space-y-4">
                    <h1 className="text-3xl font-bold text-gray-800">
                        Selamat Datang
                    </h1>
                    <h2 className="text-xl font-medium text-gray-600">
                        Team Divisi Finance & Accounting <br />
                        <span className="text-blue-600 font-bold">PT. Gama Agro Sejati</span>
                    </h2>
                    <p className="text-gray-400 text-sm pt-4">
                        Aplikasi Stock Opname Faktur Terintegrasi Accurate Online
                    </p>
                </div>

                {/* CTA Button */}
                <div className="pt-8">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold px-10 py-4 rounded-full shadow-lg hover:shadow-xl transform transition hover:-translate-y-1 active:scale-95"
                    >
                        Mulai SO Sekarang
                        <ArrowRight />
                    </Link>
                </div>

            </div>

            <footer className="mt-12 text-gray-400 text-xs">
                &copy; 2026 PT. Gama Agro Sejati - IT Division
            </footer>
        </main>
    );
}
