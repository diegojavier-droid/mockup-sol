import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacidad")({
  component: PrivacidadPage,
});

/**
 * Términos y política de privacidad.
 *
 * La mayoría de las clientas no va a leer esto, y está bien: existe para
 * que la página se vea seria y para que la que sí quiera mirar encuentre
 * una respuesta clara. Por eso arranca con dos líneas en castellano
 * común y recién después va al detalle, en vez de abrir con un bloque
 * jurídico que sólo transmite desconfianza.
 *
 * Cubre lo que corresponde informar: quién guarda los datos, para qué,
 * qué es voluntario, con quién se comparten y cómo pedir que se borren.
 *
 * Cada cambio de este texto sube TERMS_VERSION en el mismo commit. Si no,
 * quedan aceptaciones firmando un texto que la clienta nunca vio.
 */
function PrivacidadPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-12 lg:py-16">
      <h1 className="font-serif text-3xl text-foreground lg:text-4xl">Tus datos, en claro</h1>

      <p className="mt-4 text-base leading-relaxed text-muted-foreground">
        Te pedimos lo mínimo para poder atenderte bien: tu nombre, tu WhatsApp y tu email. No se los
        damos a nadie y no te vamos a llenar de mensajes. Abajo está el detalle completo, escrito
        como corresponde.
      </p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-foreground">
        <Seccion titulo="Quién es responsable de tus datos">
          <p>
            Sol Mai Peluquería, con domicilio en Santa Fe capital, provincia de Santa Fe, República
            Argentina. Contacto:{" "}
            <a className="underline underline-offset-2" href="mailto:solmaipeluqueria@gmail.com">
              solmaipeluqueria@gmail.com
            </a>
            .
          </p>
        </Seccion>

        <Seccion titulo="Qué datos guardamos y para qué">
          <p>
            Al reservar un turno guardamos tu nombre, tu teléfono de WhatsApp y tu email. Los usamos
            únicamente para confirmarte el turno, enviarte el enlace de la seña, recordarte la cita
            y contactarte si hay un cambio.
          </p>
          <p className="mt-3">
            También guardamos lo que se te hizo en el salón, la fórmula técnica utilizada y el
            importe abonado. Eso nos permite repetir o corregir un trabajo en tu próxima visita, y
            es información que el salón conserva como registro de su actividad.
          </p>
        </Seccion>

        <Seccion titulo="Datos de salud: las alergias">
          <p>
            En algunos servicios te preguntamos si tenés alergias. Es información de salud, y por
            eso merece un párrafo aparte: <strong>responderla es voluntaria</strong>. Si preferís no
            contestar, podés reservar igual y comentarlo en el salón.
          </p>
          <p className="mt-3">
            La usamos con un solo fin: elegir productos que no te hagan daño. No la compartimos con
            nadie ni la usamos para ninguna otra cosa.
          </p>
        </Seccion>

        <Seccion titulo="Con quién los compartimos">
          <p>
            Con nadie, salvo lo estrictamente necesario para que el servicio funcione: el procesador
            de pagos, cuando abonás la seña, recibe los datos que necesita para procesar esa
            operación. No vendemos, cedemos ni intercambiamos tus datos.
          </p>
        </Seccion>

        <Seccion titulo="Cuánto tiempo los conservamos">
          <p>
            Mientras seas clienta del salón y por el plazo que exijan las obligaciones comerciales e
            impositivas aplicables. Si pedís que los borremos, lo hacemos —salvo aquello que estemos
            obligados a conservar por ley, que en ese caso queda sin poder vincularse con vos.
          </p>
        </Seccion>

        <Seccion titulo="Tus derechos">
          <p>
            Tenés derecho a acceder a tus datos, a rectificarlos si están mal, a actualizarlos y a
            pedir que los suprimamos. Para ejercerlos, escribinos a{" "}
            <a className="underline underline-offset-2" href="mailto:solmaipeluqueria@gmail.com">
              solmaipeluqueria@gmail.com
            </a>{" "}
            y te respondemos.
          </p>
          <p className="mt-3 text-muted-foreground">
            No hace falta que expliques por qué. Nos escribís y listo.
          </p>
        </Seccion>

        <Seccion titulo="Sobre el turno y la seña">
          <p>
            El precio que ves al reservar es <strong>estimativo</strong>. El importe definitivo se
            establece en el salón, según el trabajo efectivamente realizado y los productos
            utilizados, y se te informa antes de cobrarlo.
          </p>
          <p className="mt-3">
            La seña confirma tu turno y se descuenta del total. Si avisás con al menos 24 horas de
            anticipación, se te devuelve. Si no avisás y no venís, se retiene.
          </p>
        </Seccion>

        <Seccion titulo="Cambios en este texto">
          <p>
            Si lo modificamos, la próxima vez que reserves vas a ver la versión nueva y se te va a
            pedir que la aceptes otra vez. Guardamos qué versión aceptaste y cuándo.
          </p>
        </Seccion>
      </div>

      <p className="mt-12 text-xs text-muted-foreground">Versión del 8 de septiembre de 2026.</p>
    </main>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-serif text-lg text-foreground">{titulo}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}
