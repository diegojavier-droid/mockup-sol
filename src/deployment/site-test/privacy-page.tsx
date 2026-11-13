


/** Site-only draft. Keep the displayed version aligned with TERMS_VERSION. */
export default function PrivacidadPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-12 lg:py-16">
      <h1 className="font-serif text-3xl text-foreground lg:text-4xl">Tus datos, en claro</h1>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">
        Este aviso explica cómo se guarda la información en este Site privado de Sol Mai.
        Usá datos ficticios para recorrer la reserva. No se realizan cobros ni se envían mensajes.
      </p>
      <p className="mt-4 text-sm text-muted-foreground">
        Borrador para revisar antes de usar el sistema con clientas reales. No tiene validación legal.
      </p>
      <div className="mt-10 space-y-8 text-sm leading-relaxed text-foreground">
        <Seccion titulo="Qué datos se piden">
          <p>Nombre, teléfono y email son obligatorios para completar el turno. Se guardan junto con
            el servicio y el horario para identificarlo en la agenda. La validación comprueba el
            formato, no verifica que el teléfono o el email pertenezcan a una persona.</p>
          <p className="mt-3">En este Site no se usan para contactarte, hacer publicidad ni enviar
            confirmaciones. No ingreses datos de personas reales, contraseñas ni información de pago.</p>
        </Seccion>
        <Seccion titulo="Alergias y comentario para Sol">
          <p>Podés dejar estas respuestas sin completar. Si las agregás, se guardan con el turno y
            se muestran en la agenda privada para conversar al llegar al salón, antes del servicio.
            Una respuesta sin completar no significa que no haya alergias.</p>
          <p className="mt-3">Las alergias son información de salud y un comentario también puede
            contener datos sensibles. Para esta prueba, escribí sólo ejemplos ficticios. No se usan
            para diagnosticar ni para decidir automáticamente qué productos aplicar.</p>
          <p className="mt-3">No se incluyen en las consultas de precio o de horarios ni en el
            enlace de estado del turno. No guardamos un borrador de estos campos en el navegador.</p>
        </Seccion>
        <Seccion titulo="Dónde se guardan y quién accede">
          <p>Los turnos se guardan en una base separada de la operación real del salón. Este Site
            está restringido a su propietario; no se concedió acceso a empleados ni a visitantes externos.</p>
          <p className="mt-3">Para que funcione intervienen los servicios técnicos de ChatGPT Sites,
            Cloudflare y Supabase. La información se procesa en esa infraestructura; no se envía a la
            base de producción, a un procesador de pagos ni a un proveedor de email o WhatsApp.</p>
        </Seccion>
        <Seccion titulo="Aceptación y control de la información">
          <p>Antes de enviar el turno, tenés que aceptar este aviso y confirmar que usás datos
            ficticios. Guardamos la versión aceptada y la fecha junto con la reserva. La casilla
            empieza desmarcada y no se recupera de una sesión anterior.</p>
          <p className="mt-3">Los registros de prueba permanecen en la base hasta que su administrador
            gestione su limpieza; no hay borrado automático configurado. Podés pedir al administrador
            del Site que revise, corrija o elimine los datos de prueba. No se promete un plazo legal
            de conservación que todavía no fue definido.</p>
        </Seccion>
        <Seccion titulo="Sobre el turno y la seña">
          <p>La reserva se registra en la agenda de prueba. El cálculo de seña puede mostrarse,
            pero el pago está deshabilitado. Un turno web queda pendiente y el horario se libera
            cuando vence su espera de 10 minutos. No representa un pago ni una reserva real del salón.</p>
        </Seccion>
        <Seccion titulo="Antes de abrirlo a clientas reales">
          <p>Sol Mai deberá validar el responsable y su canal de contacto, las finalidades, los
            proveedores, los plazos de conservación, el ejercicio de derechos y el tratamiento de
            información de salud con asesoramiento adecuado. Este borrador no sustituye esa revisión.</p>
        </Seccion>
      </div>
      <p className="mt-12 text-xs text-muted-foreground">Versión 2026-11-12-site.</p>
    </main>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return <section><h2 className="font-serif text-lg text-foreground">{titulo}</h2><div className="mt-2">{children}</div></section>;
}
