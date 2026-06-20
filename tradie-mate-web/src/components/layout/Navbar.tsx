import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="fixed top-0 w-full z-50 bg-surface border-b border-outline-variant">
      <div className="flex justify-between items-center px-margin-mobile md:px-margin-desktop h-touch-target-min w-full max-w-7xl mx-auto">
        <div className="font-headline-md text-headline-md font-bold text-primary">
          TradieMate
        </div>
        <div className="hidden md:flex gap-gutter-md items-center">
          <Link
            className="text-on-surface-variant hover:text-primary transition-colors font-body text-body"
            href="#"
          >
            About
          </Link>
          <Link
            className="text-on-surface-variant hover:text-primary transition-colors font-body text-body"
            href="#"
          >
            Features
          </Link>
          <Link
            className="text-on-surface-variant hover:text-primary transition-colors font-body text-body"
            href="#"
          >
            Pricing
          </Link>
          <button className="btn-primary px-gutter-sm">Download</button>
        </div>
        <button className="md:hidden text-on-surface">
          <span className="material-symbols-outlined">menu</span>
        </button>
      </div>
    </nav>
  );
}
