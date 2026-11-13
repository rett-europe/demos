// The registration journey. Each chapter lives in <id>/ with its own demo.js and media/.
// kind: "video" = recorded app walkthrough, "cards" = explainer cards only (no recording).
window.JOURNEY = {
  title: { en: 'Register with rettX', es: 'Regístrate en rettX' },
  steps: [
    { id: 'onboarding', kind: 'video', title: { en: 'Onboarding', es: 'Primeros pasos' } },
    { id: 'create-patient', kind: 'video', title: { en: 'Create the patient', es: 'Crear el paciente' } },
    { id: 'upload-diagnosis', kind: 'video', title: { en: 'Upload the diagnosis', es: 'Subir el diagnóstico' } },
    { id: 'validation', kind: 'cards', title: { en: 'Diagnosis validation', es: 'Validación del diagnóstico' } },
    { id: 'completed', kind: 'video', title: { en: 'Registration completed', es: 'Registro completado' } },
  ],
  extras: [],
  ui: {
    en: { step: 'Step', of: 'of', next: 'Next', prev: 'Back', all: 'All steps', desktop: 'Desktop', mobile: 'Mobile', both: 'Side by side', steps: 'Steps', soon: 'Coming soon' },
    es: { step: 'Paso', of: 'de', next: 'Siguiente', prev: 'Atrás', all: 'Todos los pasos', desktop: 'Escritorio', mobile: 'Móvil', both: 'Lado a lado', steps: 'Pasos', soon: 'Próximamente' },
  },
};
