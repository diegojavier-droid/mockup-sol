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
}: {
  customer: CustomerFormState;
  errors: CustomerErrors;
  isRecognized: boolean;
  onChangeCustomerField: (field: CustomerField, value: string) => void;
}) {
  return (
    <StepShell
      title="Tus datos"
      subtitle="Te pedimos lo mínimo para identificarte y coordinar tu turno por WhatsApp."
    >
      <div className="rounded-3xl border border-border bg-card p-5 shadow-sm lg:p-6">
        {isRecognized && (
          <div className="mb-5 rounded-2xl border border-primary/20 bg-cream px-4 py-3 text-sm font-medium text-foreground">
            ✓ Datos recuperados automáticamente
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
            value={customer.whatsapp}
          />
          <CustomerInput
            autoComplete="email"
            error={errors.email}
            inputMode="email"
            label="Email"
            onChange={(value) => onChangeCustomerField("email", value)}
            placeholder="tu@email.com (opcional)"
            value={customer.email}
          />
        </div>

        <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
          Te vamos a contactar por WhatsApp para confirmar el turno y coordinar cualquier detalle.
        </p>
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
  value,
}: {
  autoComplete: string;
  error?: string;
  inputMode?: "email" | "tel";
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">
        {label} {required && <span className="text-primary">*</span>}
      </span>
      <input
        autoComplete={autoComplete}
        className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-base text-foreground shadow-sm transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
      {error && <span className="mt-1.5 block text-xs text-destructive">{error}</span>}
    </label>
  );
}
