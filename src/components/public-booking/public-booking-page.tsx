import type { Session } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getBrandTheme } from "./brand";
import { BookingAuthDialog } from "./booking-auth-dialog";
import { BookingFlow } from "./booking-flow";
import { EstablishmentHero } from "./establishment-hero";
import { ServicesGrid } from "./services-grid";
import type { PublicCompany, PublicService } from "./types";

type PublicBookingPageProps = {
  company: PublicCompany;
};

export function PublicBookingPage({ company }: PublicBookingPageProps) {
  const theme = getBrandTheme(company);
  const [session, setSession] = useState<Session | null>(null);
  const [pendingService, setPendingService] = useState<PublicService | null>(null);
  const [activeService, setActiveService] = useState<PublicService | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession && pendingService) {
        setActiveService(pendingService);
        setPendingService(null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [pendingService]);

  const { data: services = [] } = useQuery({
    queryKey: ["pub-services", company.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, name, description, duration_min, price_cents, commission_pct, active")
        .eq("company_id", company.id)
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data as PublicService[];
    },
  });

  function handleSelectService(service: PublicService) {
    if (session) setActiveService(service);
    else setPendingService(service);
  }

  return (
    <div
      className="min-h-screen bg-background"
      style={{ ["--brand" as string]: theme.brand, ["--accent" as string]: theme.accent }}
    >
      <EstablishmentHero
        company={company}
        theme={theme}
        session={session}
        onSignOut={() => supabase.auth.signOut()}
      />

      <main className="max-w-3xl mx-auto px-4 pb-16 -mt-2">
        {activeService ? (
          <BookingFlow
            company={company}
            session={session}
            service={activeService}
            theme={theme}
            onBack={() => setActiveService(null)}
          />
        ) : (
          <ServicesGrid services={services} theme={theme} onSelect={handleSelectService} />
        )}
      </main>

      {pendingService && (
        <BookingAuthDialog
          open
          companyName={company.name}
          service={pendingService}
          theme={theme}
          onClose={() => setPendingService(null)}
        />
      )}
    </div>
  );
}
