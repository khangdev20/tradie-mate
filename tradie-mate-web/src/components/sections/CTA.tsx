export default function CTA() {
  return (
    <section className="py-24 px-margin-mobile md:px-margin-desktop bg-[#a5360d] text-white">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="font-headline-xl-mobile md:font-headline-lg mb-gutter-sm">
          Ready to take control of your work day?
        </h2>
        <p className="text-body mb-gutter-md opacity-90">
          Join thousands of Aussie tradies who are saving 10+ hours a week on
          paperwork.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-gutter-sm">
          <button className="bg-white text-primary px-8 h-12 rounded-lg font-bold hover:bg-surface-container transition-colors">
            Download App Now
          </button>
          <button className="border border-white/40 text-white px-8 h-12 rounded-lg font-bold hover:bg-white/10 transition-colors">
            Book a Demo
          </button>
        </div>
      </div>
    </section>
  );
}
