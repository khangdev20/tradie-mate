import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-surface-container-highest w-full py-gutter-md border-t border-outline-variant">
      <div className="flex flex-col md:flex-row justify-between items-center px-margin-mobile md:px-margin-desktop gap-gutter-sm w-full max-w-7xl mx-auto">
        <div className="flex flex-col items-center md:items-start">
          <div className="font-headline-md text-headline-md text-on-surface font-bold mb-1">
            TradieMate
          </div>
          <div className="font-caption text-caption text-on-surface-variant">
            © 2024 TradieMate. Australian Owned. ABN 12 345 678 910.
          </div>
          <div className="font-caption text-caption text-on-surface-variant mt-1 italic">
            Made in Australia for the world.
          </div>
        </div>
        <div className="flex gap-gutter-md">
          <Link
            className="font-caption text-caption text-on-surface-variant hover:text-on-surface hover:underline"
            href="#"
          >
            Terms of Service
          </Link>
          <Link
            className="font-caption text-caption text-on-surface-variant hover:text-on-surface hover:underline"
            href="#"
          >
            Privacy Policy
          </Link>
          <Link
            className="font-caption text-caption text-on-surface-variant hover:text-on-surface hover:underline"
            href="#"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </footer>
  );
}
