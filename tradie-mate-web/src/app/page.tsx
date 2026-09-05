import Navbar from "@/components/layout/Navbar";
import Hero from "@/components/sections/Hero";
import ProblemSolution from "@/components/sections/ProblemSolution";
import Features from "@/components/sections/Features";
import SocialProof from "@/components/sections/SocialProof";
import Integrations from "@/components/sections/Integrations";
import Pricing from "@/components/sections/Pricing";
import CTA from "@/components/sections/CTA";
import Footer from "@/components/layout/Footer";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <ProblemSolution />
      <Features />
      <SocialProof />
      <Integrations />
      <Pricing />
      <CTA />
      <Footer />
    </main>
  );
}
