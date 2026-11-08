import Image from "next/image";
import { Droplets, ShieldCheck, Zap, CalendarCheck } from "lucide-react";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-orange-500 via-orange-600 to-[#b45309] p-12 text-white lg:flex lg:flex-col">
        {/* ondes décoratives */}
        <svg
          className="absolute -bottom-10 left-0 w-full opacity-20"
          viewBox="0 0 800 200"
          aria-hidden
        >
          <path
            d="M0 120 C 150 60, 250 180, 400 120 S 650 60, 800 120 V200 H0 Z"
            fill="white"
          />
          <path
            d="M0 150 C 150 100, 250 200, 400 150 S 650 100, 800 150 V200 H0 Z"
            fill="white"
            opacity="0.6"
          />
        </svg>
        <div
          className="absolute -top-24 -right-24 size-96 rounded-full border-[40px] border-white/10"
          aria-hidden
        />
        <div className="relative flex items-center gap-4">
          <Image
            src="/logo.png"
            alt="Logo JIRAMA"
            width={64}
            height={64}
            className="rounded-full shadow-2xl ring-4 ring-white/30"
            priority
          />
          <div>
            <p className="text-2xl font-extrabold tracking-wide">JIRAMA</p>
            <p className="text-sm font-medium text-orange-100">
              Jiro sy Rano Malagasy · Antsirabe
            </p>
          </div>
        </div>
        <div className="relative my-auto max-w-lg">
          <h1 className="text-4xl leading-tight font-extrabold xl:text-5xl">
            Gérer les talents qui font couler l&apos;eau et briller la lumière.
          </h1>
          <p className="mt-5 text-lg text-orange-50/90">
            Dossiers du personnel, congés, présences des équipes postées et
            communication interne, réunis dans une seule plateforme sécurisée.
          </p>
          <ul className="mt-10 grid grid-cols-2 gap-4 text-sm">
            {[
              [Droplets, "Équipes de production 24h/24"],
              [Zap, "Rotations et astreintes"],
              [CalendarCheck, "Congés dématérialisés"],
              [ShieldCheck, "Accès sécurisé par rôle"],
            ].map(([Icon, label], i) => {
              const I = Icon as typeof Droplets;
              return (
                <li
                  key={i}
                  className="flex items-center gap-3 rounded-xl bg-white/10 p-3 backdrop-blur-sm"
                >
                  <span className="grid size-9 place-items-center rounded-lg bg-white/20">
                    <I className="size-5" />
                  </span>
                  {label as string}
                </li>
              );
            })}
          </ul>
        </div>
        <p className="relative text-xs text-orange-100/80">
          © {new Date().getFullYear()} JIRAMA Antsirabe — Service des Ressources
          Humaines
        </p>
      </section>
      <section className="flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_#fff4e6,_transparent_60%)] p-6 sm:p-12">
        <div className="w-full max-w-md animate-rise">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Image
              src="/logo.png"
              alt="Logo JIRAMA"
              width={48}
              height={48}
              className="rounded-full shadow-lg"
              priority
            />
            <div>
              <p className="text-lg font-extrabold">JIRAMA</p>
              <p className="text-xs text-muted-foreground">GRH · Antsirabe</p>
            </div>
          </div>
          {children}
        </div>
      </section>
    </div>
  );
}
