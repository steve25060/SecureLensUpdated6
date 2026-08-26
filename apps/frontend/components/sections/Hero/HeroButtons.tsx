"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Button from "@/components/common/Button";
import DemoGallery from "@/components/sections/DemoGallery/DemoGallery";
import { ArrowRight } from "lucide-react";

export default function HeroButtons() {
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const router = useRouter();

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.12 } },
  };
  const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

  const handleStartAnalysis = () => {
    router.push("/register");
  };

  return (
    <>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="mt-7 flex flex-wrap gap-3"
      >
        <motion.div variants={item}>
          <Button 
            className="group min-w-48 shadow-violet-700/30"
            onClick={handleStartAnalysis}
          >
            Start Security Analysis Free
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </motion.div>
        <motion.div variants={item}>
          <Button
            variant="secondary"
            className="min-w-36"
            onClick={() => setIsDemoOpen(true)}
          >
            Watch Demo
          </Button>
        </motion.div>
      </motion.div>

      <DemoGallery isOpen={isDemoOpen} onClose={() => setIsDemoOpen(false)} />
    </>
  );
}
