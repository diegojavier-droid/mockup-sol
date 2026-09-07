import { useState, type FocusEvent } from "react";
import { StepShell } from "../wizard/StepShell";

export type CustomerField = "firstName" | "whatsapp" | "email";

export interface CustomerFormState {
  firstName: string;
  whatsapp: string;
  email: string;
}

export type CustomerErrors = Partial<Record<CustomerField, string>>;
export type CustomerTouched = Partial<Record<CustomerField, boolean>>;

export function CustomerDataStep({
  customer,
  errors,
  isRecognized,
  onChangeCustomerField,
  onMobileInputFocusChange,
}: {
  customer: CustomerFormState;
  errors: CustomerErrors;
  isRecognized: boolean;
  onChangeCustomerField: (field: CustomerField, value: string) => void;
  onMobileInputFocusChange?: (isFocused: boolean) => void;
}) {
  const handleFocusCapture = (event: FocusEvent<HTMLDivElement>) => {
    if (!isMobileFormControl(event.target)) return;

    onMobileInputFocusChange?.(isMobileViewport());

    if (!isMobileViewport()) return;

    window.setTimeout(() => {
      event.target.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
  };

  const handleBlurCapture = (event: FocusEvent<HTMLDivElement>) => {
    // El elemento se guarda ANTES del requestAnimationFrame. React deja
    // `currentTarget` en null apenas termina el handler, así que leerlo
    // adentro del callback tiraba «Cannot read properties of null» en
    // cada blur: la clienta pasaba de un campo a otro y el resumen con
    // el precio, que se esconde mientras escribe para no pelear con el
    // teclado, ya no volvía a aparecer.
    const container = event.currentTarget;

    window.requestAnimationFrame(() => {
      if (container.contains(document.activeElement)) return;

      onMobileInputFocusChange?.(false);
    });
  };

  return (
    <StepShell title="¿Cómo podemos contactarte?">
      <p className="-mt-1 text-sm leading-relaxed text-muted-foreground">
        Usaremos estos datos para enviarte la confirmación, el enlace de seña y el recordatorio del
        turno.
      </p>
      <div
        className="mt-5 rounded-3xl border border-border bg-card p-5 shadow-sm lg:p-6"
        onBlurCapture={handleBlurCapture}
        onFocusCapture={handleFocusCapture}
      >
        {isRecognized && (
          <div className="mb-5 rounded-2xl border border-primary/20 bg-cream px-4 py-3 text-sm font-medium text-foreground">
            ✓ Datos recuperados
          </div>
        )}

        <div className="grid gap-4">
          <CustomerInput
            autoComplete="given-name"
            error={errors.firstName}
            label="Nombre"
            onChange={(value) => onChangeCustomerField("firstName", value)}
            placeholder="Tu nombre"
            required
            value={customer.firstName}
          />
          <CustomerInput
            autoComplete="tel"
            error={errors.whatsapp}
            inputMode="tel"
            label="WhatsApp"
            onChange={(value) => onChangeCustomerField("whatsapp", value)}
            placeholder="Ej: 342 555 1234"
            required
            type="tel"
            value={customer.whatsapp}
          />
          <CustomerInput
            autoComplete="email"
            error={errors.email}
            inputMode="email"
            label="Email"
            onChange={(value) => onChangeCustomerField("email", value)}
            placeholder="tu@email.com"
            required
            type="email"
            value={customer.email}
          />
        </div>
      </div>
    </StepShell>
  );
}

function CustomerInput({
  autoComplete,
  error,
  inputMode,
  label,
  onChange,
  placeholder,
  required = false,
  type = "text",
  value,
}: {
  autoComplete: string;
  error?: string;
  inputMode?: "email" | "numeric" | "tel";
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  type?: "email" | "tel" | "text";
  value: string;
}) {
  return (
    <label className="block scroll-mb-36">
      <span className="text-sm font-medium text-foreground">
        {label} {required && <span className="text-primary">*</span>}
      </span>
      <input
        autoComplete={autoComplete}
        className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-base text-foreground shadow-sm transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
      {error && <span className="mt-1.5 block text-xs text-destructive">{error}</span>}
    </label>
  );
}

function isMobileViewport() {
  return window.matchMedia("(max-width: 1023px)").matches;
}

function isMobileFormControl(target: EventTarget): target is HTMLElement {
  return target instanceof HTMLElement && target.matches("input, textarea, select");
}
