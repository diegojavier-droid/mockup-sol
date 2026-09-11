import { describe, expect, test } from "bun:test";
import { explicarLaVuelta } from "./staff-auth";

/**
 * POR QUÉ EXISTE ESTE ARCHIVO
 *
 * El primer intento de entrar al panel con un link al mail falló, y lo
 * caro no fue el fallo: fue que los tres finales posibles se veían
 * idénticos —el formulario de nuevo, en silencio, pidiendo el correo que
 * la persona acababa de escribir—. Sin una diferencia visible no había
 * forma de saber si el link había vencido, si la configuración estaba
 * mal, o si el canje se había roto.
 *
 * Estas pruebas fijan esa diferencia. Cada una es un final concreto que
 * se vio de verdad mientras se depuraba.
 */
describe("qué se le dice a quien vuelve del mail", () => {
  test("el link vencido o ya usado se nombra como lo que es", () => {
    const aviso = explicarLaVuelta({
      search: "?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid",
      hash: "",
      adentro: false,
    });
    expect(aviso).toMatch(/venció/);
    // Y dice qué hacer: un cartel que sólo informa deja a la persona
    // mirando la pantalla.
    expect(aviso).toMatch(/nuevo/);
  });

  test("el mismo error llega a veces en el fragmento, no en la query", () => {
    // Supabase usa uno u otro según el flujo. Mirar sólo la query fue
    // parte de por qué el primer diagnóstico tardó.
    const aviso = explicarLaVuelta({
      search: "",
      hash: "#error=access_denied&error_code=otp_expired",
      adentro: false,
    });
    expect(aviso).toMatch(/venció/);
  });

  test("un error que no conocemos igual se cuenta, no se traga", () => {
    const aviso = explicarLaVuelta({
      search: "?error=server_error&error_code=unexpected_failure",
      hash: "",
      adentro: false,
    });
    expect(aviso).not.toBeNull();
    expect(aviso).toMatch(/link/);
  });

  test("volvió con código y no hay sesión: el canje falló en silencio", () => {
    // Este es el caso que no deja rastro en la URL. PKCE guarda una clave
    // en el navegador donde se pidió el link; si el link se abre en otro,
    // el código no sirve y Supabase no lo dice por ningún lado.
    const aviso = explicarLaVuelta({
      search: "?code=pkce-abc123",
      hash: "",
      adentro: false,
    });
    expect(aviso).toMatch(/otro navegador/);
  });

  test("volvió con código y SÍ entró: no se muestra ningún cartel", () => {
    // El camino feliz tiene que ser silencioso. Si acá apareciera un
    // aviso, lo veríamos cada vez que alguien entra bien.
    expect(explicarLaVuelta({ search: "?code=pkce-abc123", hash: "", adentro: true })).toBeNull();
  });

  test("entrar de cero, sin venir de ningún mail, no es un problema", () => {
    expect(explicarLaVuelta({ search: "", hash: "", adentro: false })).toBeNull();
    expect(explicarLaVuelta({ search: "?tab=finanzas", hash: "", adentro: false })).toBeNull();
  });

  test("sin ingreso configurado no se culpa al link", () => {
    // `adentro: null` es «no se pudo ni intentar el canje». Que no haya
    // sesión ahí no prueba nada sobre el link, y decir «se abrió en otro
    // navegador» mandaría a la persona a perseguir un problema que no
    // tiene.
    expect(explicarLaVuelta({ search: "?code=pkce-abc123", hash: "", adentro: null })).toBeNull();
    // Pero un error explícito de Supabase se sigue contando.
    expect(
      explicarLaVuelta({ search: "?error_code=otp_expired", hash: "", adentro: null }),
    ).toMatch(/venció/);
  });

  test("el error manda sobre el código, aunque vengan los dos", () => {
    // Si Supabase dijo por qué falló, esa razón es mejor que nuestra
    // inferencia.
    const aviso = explicarLaVuelta({
      search: "?code=pkce-abc123&error_code=otp_expired",
      hash: "",
      adentro: false,
    });
    expect(aviso).toMatch(/venció/);
    expect(aviso).not.toMatch(/otro navegador/);
  });
});
