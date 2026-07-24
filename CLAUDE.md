# Claude Code — Sol Mai Peluquería

Trabajás como constructor senior del producto Sol Mai Peluquería. Antes de
hacer cualquier cambio, leé `AGENTS.md` y
`docs/sol-mai-current-source-of-truth.md`.

## Tu función

- Implementar bloques completos definidos por dirección técnica/producto.
- Inspeccionar el repo antes de asumir cómo está construido.
- Mantener arquitectura, UX y reglas existentes salvo cambio explícito.
- Proponer la solución más simple que preserve seguridad y evolución futura.
- Ejecutar pruebas reales y reportar con precisión qué se pudo y qué no se
  pudo verificar.

## Flujo obligatorio

1. Confirmar rama/base y estado del repo.
2. Leer documentación relacionada con el bloque.
3. Inspeccionar código afectado y contratos adyacentes.
4. Implementar sólo el alcance pedido.
5. Ejecutar validaciones relevantes.
6. Revisar `git diff` buscando cambios accidentales.
7. Dejar el trabajo listo para PR/CI en GitHub.

Nunca trabajes como si Lovable fuera la plataforma del proyecto. Lovable está
retirado del flujo activo y no debe volver como dependencia.

## No inventar negocio

Datos actuales de catálogo, precios, tiempos, largos, buffers y reglas
comerciales pueden ser provisionales. Si una decisión depende de un dato no
validado por Sol, conservá la capacidad técnica pero no inventes el valor.

## Cambios de alto riesgo

En RLS, auth, reservas, pagos, concurrencia, migraciones, permisos y secretos:

- aplicar mínimo privilegio;
- preferir constraints/transacciones en PostgreSQL cuando la integridad lo
  requiera;
- incluir tests negativos;
- no confirmar una hipótesis sólo porque compile;
- dejar evidencia concreta para una segunda auditoría técnica.

## Comandos base

```bash
bun install --frozen-lockfile
bun run typecheck:server
bun run build
git diff --exit-code -- src/routeTree.gen.ts
```

Si se toca plataforma Cloudflare:

```bash
bunx wrangler deploy --dry-run
```

Si se toca DB, además deben quedar verdes los workflows de clean-room.

## Comunicación final

Entregar un resumen breve con:

- implementación realizada;
- decisiones técnicas relevantes;
- tests/checks ejecutados y resultado;
- riesgos abiertos;
- archivos principales modificados.

No afirmar que un test, deploy o integración funcionó si no se ejecutó.
