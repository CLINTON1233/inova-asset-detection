"use client";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import "./globals.css";

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "auto";
  }, [menuOpen]);

  return (
    <div className="relative min-h-screen flex flex-col font-poppins">
      {/* NAVBAR */}
      <nav className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 md:px-10 py-5">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-3">
          <Image
            src="/seatrium.png"
            alt="Seatrium Logo"
            width={150}
            height={150}
            className="object-contain cursor-pointer"
            priority
          />
        </Link>

        {/* Right Menu */}
        <div className="hidden md:flex items-center space-x-5">
          <Link
            href="/register"
            className="px-5 py-2 border border-white text-white rounded-lg hover:bg-white hover:text-blue-700 transition font-medium"
          >
            Sign up
          </Link>
          <Link
            href="/login"
            className="px-5 py-2 bg-white text-blue-700 rounded-lg hover:bg-gray-100 transition font-medium"
          >
            Sign in
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden text-white focus:outline-none"
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </nav>

      {/* MOBILE MENU OVERLAY */}
      {menuOpen && (
        <div className="fixed inset-0 bg-blue-800/95 text-white flex flex-col items2-center justify-center space-y-6 z-30 md:hidden">

          <div className="flex flex-col space-y-3 w-3/4 pt-6">
            <Link
              href="/register"
              className="text-center border-2 border-white rounded-lg py-2 hover:bg-white hover:text-blue-700 transition"
            >
              Sign up
            </Link>
            <Link
              href="/login"
              className="text-center bg-white text-blue-700 rounded-lg py-2 hover:bg-gray-100 font-medium transition"
            >
              Sign in
            </Link>
          </div>
        </div>
      )}

      {/* HERO SECTION */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 -z-10">
          <Image
            src="/bg_seatrium 3.png"
            alt="Background"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-700/50 via-blue-500/30 to-gray-700/40" />
        </div>

        {/* Content */}
        <div className="absolute left-6 md:left-16 top-1/2 transform -translate-y-1/2 text-white text-left max-w-xl">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold mb-4 md:mb-6 leading-tight">
            Smart IT Inventory System
          </h1>
          <p className="text-base sm:text-lg md:text-xl mb-6 md:mb-8 leading-relaxed opacity-90">
            Seamlessly manage and track IT equipment using advanced visual
            recognition and intelligent scanning. Experience a fast, accurate,
            and efficient inventory process through a unified and responsive
            dashboard.
          </p>

          <Link
            href="/login"
            className="inline-block bg-blue-800 hover:bg-blue-700 text-white font-semibold px-6 sm:px-12 py-2 sm:py-3 rounded-full text-base sm:text-lg transition transform hover:scale-105 shadow-lg"
          >
            Get Started
          </Link>
        </div>

        <footer className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-center text-white text-sm opacity-80">
          Smart IT Inventory System{" "}
          <a
            href="https://www.linkedin.com/in/clinton-alfaro/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-white hover:underline"
          >
          
          </a>{" "}
          •{" "}
          <Link
            href="https://seatrium.com"
            target="_blank"
            className="underline hover:opacity-100"
          >
            seatrium.com
          </Link>
        </footer>
      </div>
    </div>
  );
}
