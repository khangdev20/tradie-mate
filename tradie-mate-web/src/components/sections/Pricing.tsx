export default function Pricing() {
  return (
    <section className="py-24 px-margin-mobile md:px-margin-desktop bg-surface">
      <div className="max-w-7xl mx-auto text-center mb-16">
        <h2 className="font-headline-lg text-headline-lg">
          Straightforward Pricing
        </h2>
        <p className="text-on-surface-variant">Choose the plan that fits your crew.</p>
      </div>
      <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-gutter-md">
        <div className="tradie-card p-gutter-md flex flex-col">
          <div className="mb-6">
            <h3 className="font-headline-md text-headline-md">Free</h3>
            <div className="text-4xl font-bold mt-2">
              $0 <span className="text-caption font-normal">/mo</span>
            </div>
            <p className="text-caption text-on-surface-variant mt-2">
              Great for getting started.
            </p>
          </div>
          <ul className="space-y-4 mb-8 flex-1">
            <li className="flex items-center gap-3">
              <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
                check
              </span>{" "}
              1 tradie account
            </li>
            <li className="flex items-center gap-3">
              <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
                check
              </span>{" "}
              10 jobs per month
            </li>
            <li className="flex items-center gap-3">
              <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
                check
              </span>{" "}
              Basic invoicing
            </li>
          </ul>
          <button className="btn-secondary w-full">Start for Free</button>
        </div>
        <div className="tradie-card p-gutter-md border-primary border-2 flex flex-col relative">
          <div className="absolute -top-3 right-gutter-md bg-primary text-white text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-widest">
            Most Popular
          </div>
          <div className="mb-6">
            <h3 className="font-headline-md text-headline-md">Pro</h3>
            <div className="text-4xl font-bold mt-2">
              $29 <span className="text-caption font-normal">/mo</span>
            </div>
            <p className="text-caption text-on-surface-variant mt-2">
              Full power for growing businesses.
            </p>
          </div>
          <ul className="space-y-4 mb-8 flex-1">
            <li className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-[18px]">
                check
              </span>{" "}
              Unlimited jobs
            </li>
            <li className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-[18px]">
                check
              </span>{" "}
              Xero sync
            </li>
            <li className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-[18px]">
                check
              </span>{" "}
              Live customer tracking
            </li>
            <li className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-[18px]">
                check
              </span>{" "}
              Licence & Doc mgmt
            </li>
            <li className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-[18px]">
                check
              </span>{" "}
              Priority support
            </li>
          </ul>
          <button className="btn-primary w-full">Get Started Pro</button>
        </div>
      </div>
    </section>
  );
}
