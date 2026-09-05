export default function SocialProof() {
  return (
    <section className="py-24 bg-surface-container px-margin-mobile md:px-margin-desktop">
      <div className="max-w-7xl mx-auto text-center mb-16">
        <div className="inline-flex items-center gap-1 mb-4">
          <span
            className="material-symbols-outlined text-[#FACC15]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            star
          </span>
          <span
            className="material-symbols-outlined text-[#FACC15]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            star
          </span>
          <span
            className="material-symbols-outlined text-[#FACC15]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            star
          </span>
          <span
            className="material-symbols-outlined text-[#FACC15]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            star
          </span>
          <span
            className="material-symbols-outlined text-[#FACC15]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            star
          </span>
        </div>
        <h2 className="font-headline-lg text-headline-lg">
          4.8★ from 2,400+ Australian tradies
        </h2>
        <p className="text-on-surface-variant mt-2">
          Trusted by tradies across NSW · VIC · QLD · WA · SA
        </p>
      </div>
      <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-gutter-md">
        <div className="tradie-card p-gutter-md bg-surface">
          <p className="font-body text-body mb-gutter-sm italic">
            &quot;Changed the game for my plumbing biz. I get paid before I even
            leave the driveway now. No more chasing late invoices on
            Sundays.&quot;
          </p>
          <div className="font-headline-md text-headline-md">Jake M.</div>
          <div className="font-caption text-caption text-on-surface-variant">
            Plumber, Sydney
          </div>
        </div>
        <div className="tradie-card p-gutter-md bg-surface">
          <p className="font-body text-body mb-gutter-sm italic">
            &quot;The document management saved me. Got an alert for my insurance
            renewal before it lapsed. Worth every cent for the peace of mind.&quot;
          </p>
          <div className="font-headline-md text-headline-md">Sarah K.</div>
          <div className="font-caption text-caption text-on-surface-variant">
            Electrician, Melbourne
          </div>
        </div>
        <div className="tradie-card p-gutter-md bg-surface">
          <p className="font-body text-body mb-gutter-sm italic">
            &quot;Simplest app I&apos;ve used. No junk, just the info I need. Customer
            tracking means my clients stop calling me every 5 mins asking where I
            am.&quot;
          </p>
          <div className="font-headline-md text-headline-md">Tom B.</div>
          <div className="font-caption text-caption text-on-surface-variant">
            Carpenter, Brisbane
          </div>
        </div>
      </div>
    </section>
  );
}
