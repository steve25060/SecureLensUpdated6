'use client';

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Docs from "@/components/sections/Docs/Docs";

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-[#030614] text-white flex flex-col justify-between">
      <Navbar />
      <div className="pt-16">
        <Docs />
      </div>
      <Footer />
    </main>
  );
}
