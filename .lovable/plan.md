# Auditoría UX — Sol Mai Peluquería (mock actual, mobile-first)

Rol: UX Strategist + Product Designer + Service Designer. Sin cambios de código.
Base: `lovable/navigation-ux-playground`, `docs/sol-mai-current-source-of-truth.md`.

## 1. Diagnóstico general

El mock ya transmite una identidad boutique clara: paleta cálida (cream/champagne), tipografía serif, foto real como protagonista y un flujo de reserva completo con seña 20% y estado pendiente. La clienta puede llegar de landing → categoría → servicio → drawer → wizard → confirmación sin fricción grave. La sensación es "salón cuidado", no "sistema de turnos genérico".

Sin embargo, hay tres tensiones que se repiten a lo largo del flujo:

1. **Densidad informativa desigual** entre superficies: la landing y el catálogo respiran, pero Personalización y el resumen final acumulan micro-datos (labels uppercase, tarjetas dentro de tarjetas, mini-chips de próximo turno) que rompen el aire boutique justo cuando la clienta está por pagar.
2. **Doble narrativa de compromiso**: el copy dice "reservá cuando estés lista" y "tu turno queda reservado cuando se acredita la seña", pero el CTA final es "Solicitar enlace de pago" y la pantalla final se llama "Pendiente de seña". La clienta no distingue con claridad *solicitud → seña → turno confirmado*.
3. **Navegación de retorno confusa**: en el catálogo hay "Volver", "Ver también" con las otras 3 categorías, y desde el drawer "Reservar turno" salta al wizard perdiendo contexto. Las salidas del wizard (back en step 1) devuelven al catálogo, no al drawer, lo que rompe la continuidad emocional.

Nada crítico bloquea reservar, pero sí hay puntos donde una clienta nueva puede dudar, releer o abandonar.

## 2. Hallazgos por superficie

### Landing
- Hero mobile bien resuelto: foto grande, chip "Santa Fe", próximo turno visible, dirección debajo.
- Un solo CTA "Ver servicios" — correcto (auditoría previa ya recomendó eliminar "Reservar" duplicado). Falta señal de recorrido: no hay indicio de cuántos pasos toma reservar ni si requiere pago.
- El H1 "Belleza a tu medida" es lindo pero no dice qué es Sol Mai. Falta un subtítulo funcional de 1 línea ("Peluquería boutique en Santa Fe. Reservá online con seña del 20%").
- Header solo tiene logo + link desktop "Reservar". En mobile no hay entrada rápida a WhatsApp/teléfono; una clienta que quiere consultar antes de reservar no tiene salida.

### Categorías (Peluquería / Maquillaje / Uñas / Depilación)
- Las 4 se ven coherentes visualmente. Depilación quedó bien integrada como cuarta card.
- Los taglines son breves y consistentes ("Cortes, color y tratamientos" / "Depilación facial, cejas y bozo"). ✓
- El "acento" por categoría (`categoryAccent`) es tan sutil que no se percibe como sistema; podría eliminarse sin perder nada.
- Los emojis (✂ ✿ ✦ ◦) mezclan estilos: dos de ellos (✦ ◦) se leen abstractos y débiles al lado de ✂. Riesgo boutique.

### Catálogo de servicios
- Cards con foto grande + nombre + "Desde $X" están limpias. ✓ El precio "Desde" se entiende.
- **Peluquería** tiene subgrupos ("Más elegidos", "Color & iluminación", "Cortes & peinados", "Tratamientos", "Combos boutique"): excelente jerarquía.
- **Maquillaje, Uñas, Depilación** caen en un solo grupo "Todos los servicios". Con solo 3–4 servicios el grupo se siente vacío y el H3 "Todos los servicios" redundante.
- Falta señal comercial simple: ni "duración aprox.", ni "requiere seña 20%" en la card. La clienta descubre la seña recién en el resumen final.
- El botón "Reservar en {categoría}" al pie del catálogo compite con las cards (que también llevan al drawer y al wizard). Riesgo de ramas paralelas.

### Drawer / ficha de servicio
- Imagen + nombre + duración + "Desde $X" + descripción + recomendación ("Ideal si querés..."). Estructura correcta.
- El copy `recommendedForByServiceId` es cálido y bien escrito. ✓
- Repite el nombre de categoría (chip arriba de la foto) y no muestra qué incluye el servicio ni si trae extras. Para servicios con extras (peluquería, maquillaje, uñas) la clienta no sabe qué va a poder sumar.
- El CTA "Reservar turno" es claro. Falta un secundario "Consultar por WhatsApp" para clientas que dudan.

### Wizard de reserva
- Stepper superior más resumen sticky mobile: buena orientación.
- Depilación omite Detalles y Extras correctamente (source-of-truth se cumple). ✓
- Personalización ya se saneó (flat sections, chips uniformes), pero sigue siendo el paso con más peso cognitivo. Riesgo: la clienta ya eligió servicio y siente que "empieza otro formulario". Falta un puente emocional ("Contanos un poco para preparar tu visita" → hoy dice "Cuanto más nos contás, mejor preparamos tu visita" que ya está bien, pero el H2 "Conozcamos tu cabello" para peluquería puede sentirse invasivo si solo quiere un brushing).
- Navegación anterior/siguiente sticky mobile: bien. El botón "Continuar" `looksDisabled` cuando falta algo es correcto tras el último sprint.
- "Atrás" desde el primer paso dice "← Volver al inicio" pero vuelve al catálogo o landing según return target; el copy no anticipa el destino.
- Extras: no se muestra el impacto en total ni en duración en el momento de tildar (o se muestra solo en resumen sticky). Verificar densidad.

### Resumen final y seña
- La tarjeta de seña 20% está bien jerarquizada visualmente (fondo cream, número grande). ✓
- **Riesgo alto de confusión**: el CTA dice "Solicitar enlace de pago", la pantalla siguiente se titula "Pendiente de seña", y el copy explicativo aparece dos veces ("Tu turno queda reservado cuando se acredita la seña"). Faltan estados intermedios narrados: 1) solicitud enviada, 2) enlace en camino, 3) seña acreditada, 4) turno confirmado.
- La pantalla `BookingConfirmation` es hoy un dead-end: solo "Volver al inicio". No dice cómo llega el enlace de pago, en cuánto tiempo, ni qué pasa si no paga. Una clienta real esperaría un "Te enviamos el enlace por WhatsApp" o "Revisá tu email".
- El saldo aparece como "Saldo a abonar en el salón". Claro. ✓

### Mobile-first
- Densidad general aceptable. Puntos de fricción:
  - Stepper mobile con labels truncados a la derecha (`min-w-0 truncate`) puede ocultar el nombre del paso actual en pantallas 360px.
  - Resumen sticky inferior + botones sticky + safe-area = mucho espacio inferior comprometido en pasos largos (Personalización, Fecha, Datos). El scroll útil queda corto.
  - Botones cumplen 44px mínimo. ✓
  - Foco de inputs en step Datos ya oculta el sticky (bien resuelto con `isMobileInputFocused`). ✓

## 3. Problemas priorizados

### Críticos (bloquean o generan pérdida de confianza)
1. **Ambigüedad solicitud/seña/turno confirmado.** Copy y estados desalineados en Review + Confirmation. Riesgo real de "pagué pero no sé si tengo turno".
2. **Confirmation es dead-end.** No explica qué pasa después ni por qué canal llega el enlace de pago. Sin backend real, al menos debe declarar el contrato.
3. **Seña no anunciada antes del final.** La clienta descubre el 20% recién en Review. Debería avisarse en landing, en la card del catálogo o en el drawer.

### Importantes (bajan sensación boutique y aumentan fricción)
4. Falta subtítulo funcional en hero (qué es Sol Mai + reserva online + seña 20%).
5. Ausencia de WhatsApp/consulta como salida secundaria (header y drawer).
6. Catálogo de Maquillaje, Uñas y Depilación sin agrupación ni encabezado significativo (título "Todos los servicios" redundante).
7. Personalización sigue percibiéndose como "formulario" para servicios simples de peluquería (brushing, peinado diario). No debería aparecer o debería reducirse a 1 pregunta.
8. Drawer no muestra qué incluye ni si tiene extras. Genera incertidumbre.

### Menores (pulido)
9. Emojis de categoría inconsistentes (✂ vs ✦ ◦). Uniformar o quitar.
10. `categoryAccent` invisible: eliminar o hacerlo evidente.
11. Stepper mobile: mostrar label del paso actual en línea propia si trunca.
12. Copy "← Volver al inicio" en paso 1 del wizard: precisar destino según return target.
13. Repetición del disclaimer de seña (aparece 3 veces entre Review y Confirmation).

## 4. Recomendación de próximo sprint

**Objetivo del sprint:** cerrar el loop de confianza *solicitud → seña → turno confirmado* y comunicar la seña antes del final. Todo lo demás es pulido posterior.

Orden sugerido:

1. **Sprint 1 (crítico, alto impacto, bajo esfuerzo).**
   - Rediseñar copy + estados de Review y Confirmation con timeline explícita (solicitud → enlace → seña → turno confirmado).
   - Anunciar seña 20% en landing (chip informativo o línea bajo el H1) y en drawer (línea bajo el precio "Desde").
   - Convertir Confirmation en pantalla útil: qué pasa ahora, por dónde llega el enlace, tiempo estimado, botón secundario "Escribirnos por WhatsApp".

2. **Sprint 2 (importante, mediano esfuerzo).**
   - Agregar subtítulo funcional en hero.
   - WhatsApp como salida secundaria en header mobile y como CTA secundario en drawer.
   - Agrupar servicios de Maquillaje/Uñas/Depilación con títulos con sentido (ej: "Novias y eventos" / "Manicura y diseño" / "Rostro") o quitar el H3 cuando hay un solo grupo.
   - Regla de personalización: si el servicio no tiene campos con opciones múltiples reales, omitir el paso completo (no solo bucketizar campos vacíos).

3. **Sprint 3 (pulido).**
   - Uniformar emojis o migrar a íconos vectoriales sutiles.
   - Limpiar `categoryAccent` y disclaimers duplicados.
   - Ajuste de Stepper mobile con label del paso en su propia línea.
   - Copy de "Atrás" contextual al return target.

## 5. Qué va a Codex y qué queda en Lovable

**Lovable (esta rama, cambios de UI/copy acotados):**
- Copy y jerarquía de Review + Confirmation.
- Anuncio de seña en landing + drawer.
- Subtítulo hero, agrupaciones de catálogo, disclaimers duplicados, emojis y accent.
- Regla de omisión de Personalización cuando no hay campos con valor.

**Codex (fuera de esta rama, decisiones estructurales o backend):**
- Contrato real del enlace de pago (canal WhatsApp/email, timeout, expiración de solicitud pending_payment).
- Estados del turno en un futuro Admin (solicitud → pendiente → confirmado → cancelado por falta de seña).
- Editor de servicios/precios/duración (Admin/Catálogo).
- Integración real de WhatsApp/CRM/Mercado Pago.

## 6. Fuera de alcance

- No se propone rediseño de marca, cambios en CRM, pagos reales, backend, ni servicios o precios nuevos.
- No se sugieren features grandes (favoritos, cuenta de clienta, reprogramación) porque no están justificadas por la evidencia del mock actual.

## 7. Entregable

Este documento es el diagnóstico. Al aprobar, se puede pasar a BUILD MODE con el Sprint 1 (loop de confianza seña + Confirmation útil + aviso de seña temprano) como primer paquete.
