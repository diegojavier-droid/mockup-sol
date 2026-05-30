# Mockup validado v1 — Documentación interna

Esta carpeta contiene la documentación interna del **mockup validado v1** de Sol Mai Peluquería.

Su objetivo es dejar trazabilidad clara del cierre de la Fase 0: qué se validó, bajo qué alcance, qué referencia técnica queda congelada y cómo deben compararse los cambios futuros del producto.

## Qué documenta esta carpeta

Esta carpeta documenta:

- El mockup aprobado por la dueña del negocio.
- El alcance visual y conceptual validado.
- El checklist de elementos revisados.
- La rama congelada que funciona como baseline histórica.
- El release/tag asociado a la validación.
- Los límites entre mockup aprobado y MVP funcional pendiente.

## Qué no es esta carpeta

Esta carpeta no documenta el MVP final ni reemplaza especificaciones funcionales futuras. El mockup validado no implica que existan todavía integraciones productivas, persistencia de reservas, backend, panel administrativo o automatizaciones reales.

## Baseline congelada

La rama `mockup-validado-v1` representa la versión aprobada del mockup y **no debe tocarse**. Su propósito es conservar una referencia estable para auditoría, comparación y toma de decisiones durante la evolución del producto.

El release/tag asociado es `v0.1-mockup-validado`.

## Uso recomendado

Todo cambio futuro del producto debe compararse contra esta baseline para responder claramente:

- Qué se mantiene igual respecto del mockup validado.
- Qué se modifica por decisión de producto.
- Qué se agrega para convertir el mockup en MVP funcional.
- Qué diferencias deben volver a validarse con la dueña del negocio.

La documentación de esta carpeta debe mantenerse sobria, estable y orientada a trazabilidad del proyecto.
