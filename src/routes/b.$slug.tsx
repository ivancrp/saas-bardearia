import { createFileRoute, notFound } from "@tanstack/react-router";
import { PublicBookingPage } from "@/components/public-booking/public-booking-page";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/b/$slug")({
  loader: async ({ params }) => {
    const { data: company, error } = await supabase
      .from("companies")
      .select("id, name, slug, phone, address, logo_url, brand_color, brand_accent, cover_url, tagline")
      .eq("slug", params.slug)
      .maybeSingle();
    if (error) throw error;
    if (!company) throw notFound();
    return { company };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `Agendar — ${loaderData.company.name}` },
          { name: "description", content: `Agende seu horário com ${loaderData.company.name}.` },
        ]
      : [],
  }),
  component: RoutePage,
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <p className="text-sm text-muted-foreground">{error.message}</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <p>Estabelecimento não encontrado.</p>
    </div>
  ),
});

function RoutePage() {
  const { company } = Route.useLoaderData();
  return <PublicBookingPage company={company} />;
}
