import { StepShell } from "../wizard/StepShell";

export type CustomerField = "firstName" | "whatsapp" | "email" | "notes";

export interface CustomerFormState {
  firstName: string;
  whatsapp: string;
  email: string;
  notes: string;
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
    <StepShell title="¿Cómo podemos contactarte?">
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
          <CustomerTextarea
            error={errors.notes}
            label="¿Querés contarnos algo más?"
            maxLength={500}
            onChange={(value) => onChangeCustomerField("notes", value)}
            placeholder="Podés sumar preferencias, referencias de estilo, alergias, horarios a evitar o cualquier detalle que nos ayude a prepararte mejor."
            value={customer.notes}
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

function CustomerTextarea({
  error,
  label,
  maxLength,
  onChange,
  placeholder,
  value,
}: {
  error?: string;
  label: string;
  maxLength: number;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <textarea
        className="mt-2 min-h-28 w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-base text-foreground shadow-sm transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
      <span className="mt-1.5 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        {error ? <span className="text-destructive">{error}</span> : <span>Opcional</span>}
        <span>
          {value.length}/{maxLength}
        </span>
      </span>
    </label>
  );
}
