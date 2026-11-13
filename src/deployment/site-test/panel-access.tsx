import {ScopedPanel} from "@/components/booking/admin/ScopedPanel";
import { useNavigate } from "@tanstack/react-router";
import {useMemo,useEffect,type ReactNode} from "react";
import {QueryClientProvider} from "@tanstack/react-query";
import { useStaffIdentity } from "@/lib/api/admin-hooks";
import { SesionPanelCtx } from "@/lib/panel-sesion";
import {createPanelQueryClient,clearPanelQueryClient} from "@/lib/panel-query-client";
export function PanelAccess({children}:{children:ReactNode}) {
 const client=useMemo(()=>createPanelQueryClient(),[]);
 useEffect(()=>()=>clearPanelQueryClient(client),[client]);
 return <QueryClientProvider client={client}><OwnerPanel>{children}</OwnerPanel></QueryClientProvider>;
}
function OwnerPanel({children}:{children:ReactNode}) {
 const identity=useStaffIdentity(); const navigate=useNavigate();
 if(identity.isError) return <main className="mx-auto max-w-xl p-6"><h1>Panel</h1><p role="alert">{identity.error.message}</p><p>Abrí este Site con la cuenta de ChatGPT propietaria.</p><button onClick={()=>void identity.refetch()}>Reintentar</button><a href="/">Volver a la web</a></main>;
 if(!identity.data) return <main className="p-6"><p>Un segundo…</p></main>;
 return <ScopedPanel identity={identity.data} onClose={()=>void navigate({to:"/"})}>{children}</ScopedPanel>;
}
