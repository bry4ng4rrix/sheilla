import Link from "next/link";
import Image from "next/image";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center p-6">
      <div className="text-center">
        <Image
          src="/logo.png"
          alt=""
          width={72}
          height={72}
          className="mx-auto rounded-full opacity-90"
        />
        <p className="mt-6 text-6xl font-extrabold text-orange-500">404</p>
        <p className="mt-2 text-lg font-semibold">Page introuvable</p>
        <Link
          href="/dashboard"
          className={buttonVariants({ className: "mt-6" })}
        >
          Retour au tableau de bord
        </Link>
      </div>
    </div>
  );
}
