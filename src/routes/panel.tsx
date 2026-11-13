/** Staff authorization remains enforced on every administrative API request. */
import {createFileRoute,Outlet} from '@tanstack/react-router';
import {PanelAccess} from '@deployment/panel-access';
export const Route=createFileRoute('/panel')({component:PanelLayout});
function PanelLayout(){return <PanelAccess><Outlet/></PanelAccess>;}
