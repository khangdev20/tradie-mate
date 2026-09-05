import Image from "next/image";

export default function Features() {
  return (
    <section className="py-24 px-margin-mobile md:px-margin-desktop">
      <div className="max-w-7xl mx-auto space-y-32">
        {/* Feature 1 */}
        <div className="flex flex-col md:flex-row items-center gap-24">
          <div className="flex-1">
            <h2 className="font-headline-lg text-headline-lg mb-gutter-sm">
              Smart Dashboard
            </h2>
            <p className="font-body text-body text-on-surface-variant mb-6">
              Optimised for one-tap navigation to your next site. TradieMate
              works fully offline, syncing your data automatically when you&apos;re
              back in range.
            </p>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 font-body text-body">
                <span className="material-symbols-outlined text-primary">
                  check_circle
                </span>{" "}
                One-tap job navigation
              </li>
              <li className="flex items-start gap-3 font-body text-body">
                <span className="material-symbols-outlined text-primary">
                  check_circle
                </span>{" "}
                Full offline mode support
              </li>
            </ul>
          </div>
          <div className="flex-1 w-full">
            <div className="tradie-card overflow-hidden">
              <Image
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAAuJlJqS1sXa8CcSO9sJVpWtvi25Ws0QjDyfMTyeMrbMlfbH4g5RXcVMJdIy8DA9fhuOKzgiFa5vl-HS40A7QsSzfbCI3CjZFSU3OPAQCXPVWPv1rlO9-wSesOS7Jgi4sPklmKMrq4PALob7cpmJ2ee9PJ14q4RUXS-4sxnMobVTlkDvzqnR866RUdv9pzAefz2RG0dCbISkI4ncUBJQ6dCIYwmED3tA3Lmhx0ExeKfV79uvJfvsqyJAYYkwbpXYUBrpzzaN5kixk"
                alt="Technician using tablet"
                width={600}
                height={400}
                className="w-full h-80 object-cover"
              />
            </div>
          </div>
        </div>

        {/* Feature 2 */}
        <div className="flex flex-col md:flex-row-reverse items-center gap-24">
          <div className="flex-1">
            <h2 className="font-headline-lg text-headline-lg mb-gutter-sm">
              Customer Live Tracking
            </h2>
            <p className="font-body text-body text-on-surface-variant mb-6">
              Give your customers peace of mind with real-time arrival updates.
              Verified badges show you&apos;re the pro they expected.
            </p>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 font-body text-body">
                <span className="material-symbols-outlined text-secondary">
                  check_circle
                </span>{" "}
                Fewer customer calls
              </li>
              <li className="flex items-start gap-3 font-body text-body">
                <span className="material-symbols-outlined text-secondary">
                  check_circle
                </span>{" "}
                Real-time GPS arrivals
              </li>
            </ul>
          </div>
          <div className="flex-1 w-full">
            <div className="tradie-card overflow-hidden">
              <Image
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBUBGC0c3hwj5ztwG4zdxPLS_him-JYB0OQi7IG7xVYVoP41Rn33q-Rhw83po7VjQlXhf_uX1mPQtEVW_zK9DZjet6G--LMs9bF_-esRAwIQdQU6WmOCBaiZHVocFQ-qDVA_X70YmfUtfT8EGJDVBMcHpGzEAvcAlviSl8ZEacye2kHAWfcWNkbmTnx9UgzrnEYp-HkngRIyzm-WLtUYA9ybSn9r3Lb9uTJ6ohxAX6Lahn2lhwnzc0Qxizf2i3iU50iaAQcipSnSLM"
                alt="Customer looking at phone"
                width={600}
                height={400}
                className="w-full h-80 object-cover"
              />
            </div>
          </div>
        </div>

        {/* Feature 3 */}
        <div className="flex flex-col md:flex-row items-center gap-24">
          <div className="flex-1">
            <h2 className="font-headline-lg text-headline-lg mb-gutter-sm">
              Invoicing & Payment
            </h2>
            <p className="font-body text-body text-on-surface-variant mb-6">
              GST is automatically calculated for every quote and invoice.
              Integrated with Xero for seamless bookkeeping and tax compliance.
            </p>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 font-body text-body">
                <span className="material-symbols-outlined text-tertiary">
                  check_circle
                </span>{" "}
                Digital signature capture
              </li>
              <li className="flex items-start gap-3 font-body text-body">
                <span className="material-symbols-outlined text-tertiary">
                  check_circle
                </span>{" "}
                Direct Xero & Square sync
              </li>
            </ul>
          </div>
          <div className="flex-1 w-full">
            <div className="tradie-card overflow-hidden">
              <Image
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAq9Up6pgg7s_urXahedJ3Bvpk_47NWiLZXfdHbu_cMspVuiXhbrGJm5lYt2YcO6LUECFohrRo3Pdy9L5uxgG4pQT11BuFWZqM-DY-yBhcIZORl1H-rvLJUjy3xZwRn3-XN_XXSU3ZkHNJNiXulLJgQcHQ1Upv1pz3uIE2FPcUfpT6vXOA8Snex5ofuywmWYzecn2IV1RtSeWAHdY65ot_MQB9ppOu9et3wRjfWk18U0ypEcMe0y_knL1KTBjvD0onoeqgfvSBZJZ0"
                alt="Invoice on screen"
                width={600}
                height={400}
                className="w-full h-80 object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
