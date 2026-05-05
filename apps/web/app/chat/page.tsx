import { Topbar } from "@/components/Topbar";
import { getSupabaseServer } from "@/lib/supabase/server";
import { ChatApp } from "./chat-app";
import { AuthGate } from "./auth-gate";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <Topbar
        title="Chat"
        subtitle={
          user
            ? `Conectado como ${user.email}`
            : "Conversación persistida en Supabase + claude CLI"
        }
      />
      <div className="px-8 py-6">
        {user ? (
          <ChatApp userId={user.id} userEmail={user.email ?? ""} />
        ) : (
          <AuthGate />
        )}
      </div>
    </>
  );
}
