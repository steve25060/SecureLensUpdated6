import Navbar from "@/components/layout/Navbar";
import Hero from "@/components/sections/Hero/Hero";
import Features from "@/components/sections/Features/Features";
import Solutions from "@/components/sections/Solutions/Solutions";
import HowItWorks from "@/components/sections/HowItWorks/HowItWorks";
import Pricing from "@/components/sections/Pricing/Pricing";
import Docs from "@/components/sections/Docs/Docs";
import About from "@/components/sections/About/About";
import Footer from "@/components/layout/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <Features />
      <Solutions />
      <HowItWorks />
      <Pricing />
      <Docs />
      <About />
      <Footer />
    </>
  );
}
