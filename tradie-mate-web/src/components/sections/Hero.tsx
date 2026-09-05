import Image from "next/image";

export default function Hero() {
  return (
    <section className="pt-32 pb-16 px-margin-mobile md:px-margin-desktop bg-surface overflow-hidden">
      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-gutter-md items-center">
        <div>
          <h1 className="font-headline-xl-mobile md:font-headline-xl text-headline-xl-mobile md:text-headline-xl text-on-surface mb-gutter-sm">
            Know where to go. <br />
            Know what to charge. <br />
            <span className="text-primary">Get paid fast.</span>
          </h1>
          <p className="font-body text-body text-on-surface-variant mb-gutter-md max-w-md">
            Built for Australian tradies — plumbers, electricians, carpenters,
            and more. Manage your business from your pocket.
          </p>
          <div className="flex flex-wrap gap-gutter-sm mb-gutter-md">
            <button className="btn-primary px-8">Download Free</button>
            <button className="btn-secondary px-8">See How It Works</button>
          </div>
          <div className="flex gap-gutter-sm">
            <div className="h-10 w-32 bg-on-background rounded flex items-center justify-center text-white text-[10px] font-bold uppercase tracking-wider border border-white/10">
              App Store
            </div>
            <div className="h-10 w-32 bg-on-background rounded flex items-center justify-center text-white text-[10px] font-bold uppercase tracking-wider border border-white/10">
              Google Play
            </div>
          </div>
        </div>
        <div className="relative">
          <div className="tradie-card p-4 mx-auto max-w-xs md:max-w-md relative z-10">
            <Image
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCyrNt_5ZbPuFr-gdu48eP5RJhrdtqrDRDFCC6R8-mB3aOQeCy4VIGcTYzZEoFiznGBjGSD6blJ2osETvt-IBfwXbPY-o70dk0gwLYQA3mP8DgZQIK_Ur7g7kygXaUvh6L6sID6epj4mzKj29SLmp5tnmS4s8ih21n9qKainDzjxWehqpsX2uCS93Mq2tbCNFxEqFvDDBK4KXVBoX9C55nCbSUhCsm-yvzOLYbmhaZQChqnOARQhqo62mCZMBnvwhQ9cHAzzOtm6gk"
              alt="Mobile app dashboard"
              width={500}
              height={800}
              className="rounded-lg w-full object-cover"
              priority
            />
          </div>
          <div className="absolute -top-10 -right-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-0"></div>
        </div>
      </div>
      {/* Trust Bar */}
      <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-outline-variant flex flex-wrap justify-between gap-gutter-sm items-center opacity-70">
        <span className="font-caption text-caption flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">
            calculate
          </span>{" "}
          GST Auto-calculated
        </span>
        <span className="font-caption text-caption flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">verified</span>{" "}
          ABN Verified
        </span>
        <span className="font-caption text-caption flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">sync</span> Xero
          Integrated
        </span>
        <span className="font-caption text-caption flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">wifi_off</span>{" "}
          Works Offline
        </span>
      </div>
    </section>
  );
}
