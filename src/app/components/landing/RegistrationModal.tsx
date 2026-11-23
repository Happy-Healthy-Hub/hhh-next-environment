'use client';

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type RefObject,
} from 'react';
import {
  AvailabilityEditor,
  WEEK_DAYS,
  createInitialWeeklyAvailability,
} from './AvailabilityEditor';
import {
  submitRegistrationPreview,
  type DateOverride,
  type RegistrationKind,
  type RegistrationSubmission,
  type TimeSlot,
  type WeeklyAvailability,
} from './registration-types';

type RegistrationModalProps = {
  open: boolean;
  onClose: () => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
};

type FormValues = {
  fullName: string;
  mobile: string;
  email: string;
  address: string;
  pinCode: string;
  emergencyName: string;
  emergencyMobile: string;
  specialization: string;
  institution: string;
  qualification: string;
  organizationName: string;
  organizationType: 'Hospital' | 'Clinic' | 'Healthcare Organization' | 'Other';
  designation: string;
};

type FormErrors = Record<string, string>;

const INITIAL_VALUES: FormValues = {
  fullName: '',
  mobile: '',
  email: '',
  address: '',
  pinCode: '',
  emergencyName: '',
  emergencyMobile: '',
  specialization: '',
  institution: '',
  qualification: '',
  organizationName: '',
  organizationType: 'Hospital',
  designation: '',
};

const CAREGIVER_SKILLS = [
  'Companionship',
  'Personal care',
  'Meal support',
  'Mobility assistance',
  'Overnight care',
];

const PROVIDER_SERVICES = [
  'Hospital care',
  'Clinical services',
  'Home healthcare',
  'Rehabilitation',
  'Elder-care services',
];

function normalizeIndianMobile(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
}

function isValidIndianMobile(value: string) {
  return /^[6-9]\d{9}$/.test(normalizeIndianMobile(value));
}

function slotsAreValid(slots: TimeSlot[]) {
  if (!slots.length) return false;
  const sorted = [...slots].sort((a, b) => a.start.localeCompare(b.start));
  return sorted.every((slot, index) => {
    if (!slot.start || !slot.end || slot.start >= slot.end) return false;
    return index === 0 || sorted[index - 1].end <= slot.start;
  });
}

function validateAvailability(weekly: WeeklyAvailability, overrides: DateOverride[]) {
  const availableDays = WEEK_DAYS.filter((day) => weekly[day.key]?.available);
  if (!availableDays.length) return 'Select at least one available day.';
  if (availableDays.some((day) => !slotsAreValid(weekly[day.key].slots))) {
    return 'Check that every weekly time slot has a valid start and end time and does not overlap.';
  }
  if (
    overrides.some(
      (override) => override.status === 'available' && !slotsAreValid(override.slots),
    )
  ) {
    return 'Check the time slots in your monthly date overrides.';
  }
  return '';
}

function adminDestination() {
  return '/admin/login';
}

export function RegistrationModal({ open, onClose, returnFocusRef }: RegistrationModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [view, setView] = useState<'select' | RegistrationKind | 'success'>('select');
  const [registrationKind, setRegistrationKind] = useState<RegistrationKind>('caregiver');
  const [step, setStep] = useState(1);
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
  const [weekly, setWeekly] = useState<WeeklyAvailability>(() => createInitialWeeklyAvailability());
  const [overrides, setOverrides] = useState<DateOverride[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState('');
  const [customService, setCustomService] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const returnFocusElement = returnFocusRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute('hidden'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      returnFocusElement?.focus();
    };
  }, [onClose, open, returnFocusRef]);

  if (!open) return null;

  function resetExperience() {
    setView('select');
    setStep(1);
    setValues(INITIAL_VALUES);
    setWeekly(createInitialWeeklyAvailability());
    setOverrides([]);
    setSkills([]);
    setServices([]);
    setCustomSkill('');
    setCustomService('');
    setErrors({});
    setSubmitting(false);
  }

  function closeModal() {
    onClose();
    window.setTimeout(resetExperience, 0);
  }

  function chooseRegistration(kind: RegistrationKind) {
    setRegistrationKind(kind);
    setView(kind);
    setStep(1);
    setErrors({});
  }

  function setField<K extends keyof FormValues>(field: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    if (errors[field]) {
      setErrors((current) => {
        const next = { ...current };
        delete next[field];
        return next;
      });
    }
  }

  function validateStepOne() {
    const nextErrors: FormErrors = {};
    if (!values.fullName.trim()) nextErrors.fullName = 'Enter a full name.';
    if (!isValidIndianMobile(values.mobile)) {
      nextErrors.mobile = 'Enter a valid 10-digit Indian mobile number.';
    }
    if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) {
      nextErrors.email = 'Enter a valid email address.';
    }
    if (!values.address.trim()) nextErrors.address = 'Enter the full address.';
    if (!/^[1-9]\d{5}$/.test(values.pinCode.trim())) {
      nextErrors.pinCode = 'Enter a valid six-digit Indian PIN code.';
    }
    if (values.emergencyMobile && !isValidIndianMobile(values.emergencyMobile)) {
      nextErrors.emergencyMobile = 'Enter a valid 10-digit Indian mobile number.';
    }
    const availabilityError = validateAvailability(weekly, overrides);
    if (availabilityError) nextErrors.availability = availabilityError;
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function validateStepTwo() {
    const nextErrors: FormErrors = {};
    if (registrationKind === 'caregiver') {
      if (!values.specialization.trim()) nextErrors.specialization = 'Enter a specialization.';
      if (!values.institution.trim()) nextErrors.institution = 'Enter the college or institution.';
      if (!values.qualification.trim()) nextErrors.qualification = 'Enter the qualification.';
      if (!skills.length) nextErrors.skills = 'Select or add at least one skill.';
    } else {
      if (!values.organizationName.trim()) nextErrors.organizationName = 'Enter the organization name.';
      if (!services.length) nextErrors.services = 'Select or add at least one service.';
      if (!values.designation.trim()) nextErrors.designation = 'Enter the representative designation.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function goNext() {
    if (!validateStepOne()) {
      window.requestAnimationFrame(() =>
        dialogRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      );
      return;
    }
    setStep(2);
    setErrors({});
    dialogRef.current?.querySelector<HTMLElement>('.hhh-registration-form__title')?.focus();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    if (!validateStepTwo()) {
      window.requestAnimationFrame(() =>
        dialogRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      );
      return;
    }
    setSubmitting(true);

    const shared = {
      fullName: values.fullName.trim(),
      mobile: normalizeIndianMobile(values.mobile),
      email: values.email.trim(),
      address: values.address.trim(),
      pinCode: values.pinCode.trim(),
      emergencyName: values.emergencyName.trim(),
      emergencyMobile: values.emergencyMobile
        ? normalizeIndianMobile(values.emergencyMobile)
        : '',
      weeklyAvailability: weekly,
      monthlyOverrides: overrides,
    };

    const submission: RegistrationSubmission =
      registrationKind === 'caregiver'
        ? {
            ...shared,
            kind: 'caregiver',
            specialization: values.specialization.trim(),
            institution: values.institution.trim(),
            qualification: values.qualification.trim(),
            skills,
          }
        : {
            ...shared,
            kind: 'provider',
            organizationName: values.organizationName.trim(),
            organizationType: values.organizationType,
            services,
            designation: values.designation.trim(),
          };

    await submitRegistrationPreview(submission);
    setSubmitting(false);
    setView('success');
  }

  const adminUrl = adminDestination();
  const roleLabel = registrationKind === 'caregiver' ? 'Caregiver' : 'Provider';

  return (
    <div
      className="hhh-registration-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeModal();
      }}
    >
      <div
        ref={dialogRef}
        className={`hhh-registration-dialog${view === 'select' || view === 'success' ? ' hhh-registration-dialog--compact' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <button
          ref={closeButtonRef}
          type="button"
          className="hhh-registration-close"
          aria-label="Close registration dialog"
          onClick={closeModal}
        >
          ×
        </button>

        {view === 'select' && (
          <div className="hhh-registration-selection">
            <p className="hhh-registration-kicker">Registration</p>
            <h2 id={titleId}>Join Happy and Healthy Hub</h2>
            <p id={descriptionId}>Choose how you would like to join our care network.</p>

            <div className="hhh-registration-options">
              <button type="button" className="hhh-registration-option" onClick={() => chooseRegistration('caregiver')}>
                <span className="hhh-registration-option__icon" aria-hidden="true">C</span>
                <span>
                  <strong>Caregiver</strong>
                  <small>Register as a care associate.</small>
                </span>
              </button>
              <button type="button" className="hhh-registration-option" onClick={() => chooseRegistration('provider')}>
                <span className="hhh-registration-option__icon" aria-hidden="true">P</span>
                <span>
                  <strong>Provider</strong>
                  <small>Register as a hospital, clinic, or organization representative.</small>
                </span>
              </button>
              {adminUrl ? (
                <a className="hhh-registration-option" href={adminUrl}>
                  <span className="hhh-registration-option__icon" aria-hidden="true">A</span>
                  <span>
                    <strong>Admin</strong>
                    <small>Access the authorized administrative login.</small>
                  </span>
                </a>
              ) : (
                <div className="hhh-registration-option is-disabled" aria-disabled="true">
                  <span className="hhh-registration-option__icon" aria-hidden="true">A</span>
                  <span>
                    <strong>Admin</strong>
                    <small>Administrative login is not configured yet.</small>
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {(view === 'caregiver' || view === 'provider') && (
          <form className="hhh-registration-form" noValidate onSubmit={submit}>
            <header className="hhh-registration-form__header">
              <button type="button" className="hhh-text-button" onClick={() => { setView('select'); setStep(1); setErrors({}); }}>
                Back to registration types
              </button>
              <p className="hhh-registration-kicker">{roleLabel} registration</p>
              <h2 className="hhh-registration-form__title" id={titleId} tabIndex={-1}>
                {step === 1
                  ? registrationKind === 'caregiver'
                    ? 'Personal details & availability'
                    : 'Representative details & availability'
                  : registrationKind === 'caregiver'
                    ? 'Academic & professional details'
                    : 'Organization & specialization'}
              </h2>
              <p id={descriptionId}>
                {registrationKind === 'provider' && step === 1
                  ? "Share the representative's availability, not every professional's schedule."
                  : 'Complete the required fields below. Your information stays in this browser preview only.'}
              </p>
              <ol className="hhh-step-indicator" aria-label="Registration progress">
                <li className={step >= 1 ? 'is-active' : ''} aria-current={step === 1 ? 'step' : undefined}>
                  <span>1</span> Details & availability
                </li>
                <li className={step >= 2 ? 'is-active' : ''} aria-current={step === 2 ? 'step' : undefined}>
                  <span>2</span> {registrationKind === 'caregiver' ? 'Professional details' : 'Organization details'}
                </li>
              </ol>
            </header>

            {step === 1 ? (
              <div className="hhh-registration-form__body">
                <div className="hhh-form-grid">
                  <TextField
                    label={registrationKind === 'caregiver' ? 'Full Name' : 'Representative Full Name'}
                    name="fullName"
                    value={values.fullName}
                    onChange={(value) => setField('fullName', value)}
                    error={errors.fullName}
                    autoComplete="name"
                    required
                  />
                  <TextField
                    label="Mobile Number"
                    name="mobile"
                    value={values.mobile}
                    onChange={(value) => setField('mobile', value)}
                    error={errors.mobile}
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="10-digit Indian mobile number"
                    required
                  />
                  <TextField
                    label="Email Address"
                    name="email"
                    type="email"
                    value={values.email}
                    onChange={(value) => setField('email', value)}
                    error={errors.email}
                    autoComplete="email"
                    required
                  />
                  <TextField
                    label="PIN Code"
                    name="pinCode"
                    value={values.pinCode}
                    onChange={(value) => setField('pinCode', value)}
                    error={errors.pinCode}
                    inputMode="numeric"
                    autoComplete="postal-code"
                    maxLength={6}
                    required
                  />
                  <TextField
                    label="Full Address"
                    name="address"
                    value={values.address}
                    onChange={(value) => setField('address', value)}
                    error={errors.address}
                    autoComplete="street-address"
                    multiline
                    required
                    className="hhh-field--full"
                  />
                  <TextField
                    label="Emergency Contact Name"
                    name="emergencyName"
                    value={values.emergencyName}
                    onChange={(value) => setField('emergencyName', value)}
                    autoComplete="off"
                    optional
                  />
                  <TextField
                    label="Emergency Contact Mobile"
                    name="emergencyMobile"
                    value={values.emergencyMobile}
                    onChange={(value) => setField('emergencyMobile', value)}
                    error={errors.emergencyMobile}
                    inputMode="tel"
                    autoComplete="off"
                    optional
                  />
                </div>

                <AvailabilityEditor
                  legend={registrationKind === 'caregiver' ? 'Your availability' : "Representative's availability"}
                  helperText="Weekly availability is the default schedule. Monthly overrides take precedence for selected dates."
                  weekly={weekly}
                  onWeeklyChange={setWeekly}
                  overrides={overrides}
                  onOverridesChange={setOverrides}
                  error={errors.availability}
                />
              </div>
            ) : (
              <div className="hhh-registration-form__body">
                {registrationKind === 'caregiver' ? (
                  <div className="hhh-form-grid">
                    <TextField
                      label="Specialization"
                      name="specialization"
                      value={values.specialization}
                      onChange={(value) => setField('specialization', value)}
                      error={errors.specialization}
                      placeholder="For example, elder care or home-care assistance"
                      required
                    />
                    <TextField
                      label="College / Institution Name"
                      name="institution"
                      value={values.institution}
                      onChange={(value) => setField('institution', value)}
                      error={errors.institution}
                      required
                    />
                    <TextField
                      label="Education / Qualification"
                      name="qualification"
                      value={values.qualification}
                      onChange={(value) => setField('qualification', value)}
                      error={errors.qualification}
                      required
                      className="hhh-field--full"
                    />
                    <ChipPicker
                      legend="Skills"
                      options={CAREGIVER_SKILLS}
                      selected={skills}
                      onChange={setSkills}
                      customValue={customSkill}
                      onCustomValueChange={setCustomSkill}
                      error={errors.skills}
                      addLabel="Add custom skill"
                    />
                  </div>
                ) : (
                  <div className="hhh-form-grid">
                    <TextField
                      label="Organization Name"
                      name="organizationName"
                      value={values.organizationName}
                      onChange={(value) => setField('organizationName', value)}
                      error={errors.organizationName}
                      required
                    />
                    <label className="hhh-field">
                      <span>Organization Type <b aria-hidden="true">*</b></span>
                      <select
                        name="organizationType"
                        value={values.organizationType}
                        onChange={(event) =>
                          setField('organizationType', event.target.value as FormValues['organizationType'])
                        }
                      >
                        <option>Hospital</option>
                        <option>Clinic</option>
                        <option>Healthcare Organization</option>
                        <option>Other</option>
                      </select>
                    </label>
                    <TextField
                      label="Representative Designation / Role"
                      name="designation"
                      value={values.designation}
                      onChange={(value) => setField('designation', value)}
                      error={errors.designation}
                      required
                      className="hhh-field--full"
                    />
                    <ChipPicker
                      legend="Specialization / Services Offered"
                      options={PROVIDER_SERVICES}
                      selected={services}
                      onChange={setServices}
                      customValue={customService}
                      onCustomValueChange={setCustomService}
                      error={errors.services}
                      addLabel="Add custom service"
                    />
                  </div>
                )}
              </div>
            )}

            <footer className="hhh-registration-form__footer">
              {step === 1 ? (
                <>
                  <button type="button" className="hhh-form-button hhh-form-button--secondary" onClick={() => setView('select')}>
                    Back
                  </button>
                  <button type="button" className="hhh-form-button hhh-form-button--primary" onClick={goNext}>
                    Next
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="hhh-form-button hhh-form-button--secondary" onClick={() => { setStep(1); setErrors({}); }}>
                    Back
                  </button>
                  <button type="submit" className="hhh-form-button hhh-form-button--primary" disabled={submitting}>
                    {submitting ? 'Preparing preview…' : 'Submit registration'}
                  </button>
                </>
              )}
            </footer>
          </form>
        )}

        {view === 'success' && (
          <div className="hhh-registration-success">
            <div className="hhh-registration-success__icon" aria-hidden="true">✓</div>
            <p className="hhh-registration-kicker">Submission pending backend integration</p>
            <h2 id={titleId}>Registration details validated</h2>
            <p id={descriptionId}>
              Your entries passed frontend validation. Registration cannot be submitted until the
              backend provides an approved public applicant endpoint.
            </p>
            <div className="hhh-demo-notice" role="status">
              <strong>Demo preview — your details have not been submitted yet.</strong>
              <span>No information was sent, stored, or used to create an account.</span>
            </div>
            <button type="button" className="hhh-form-button hhh-form-button--primary" onClick={closeModal}>
              Return to the website
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

type TextFieldProps = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  inputMode?: 'text' | 'email' | 'tel' | 'numeric';
  autoComplete?: string;
  placeholder?: string;
  maxLength?: number;
  required?: boolean;
  optional?: boolean;
  multiline?: boolean;
  className?: string;
};

function TextField({
  label,
  name,
  value,
  onChange,
  error,
  type = 'text',
  inputMode,
  autoComplete,
  placeholder,
  maxLength,
  required,
  optional,
  multiline,
  className = '',
}: TextFieldProps) {
  const errorId = `${name}-error`;
  const common = {
    id: name,
    name,
    value,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(event.target.value),
    'aria-invalid': Boolean(error),
    'aria-describedby': error ? errorId : undefined,
    autoComplete,
    placeholder,
    required,
    maxLength,
  };
  return (
    <label className={`hhh-field ${className}`}>
      <span>
        {label} {required && <b aria-hidden="true">*</b>}
        {optional && <small>Optional</small>}
      </span>
      {multiline ? (
        <textarea {...common} rows={3} />
      ) : (
        <input {...common} type={type} inputMode={inputMode} />
      )}
      {error && <small className="hhh-field-error" id={errorId}>{error}</small>}
    </label>
  );
}

type ChipPickerProps = {
  legend: string;
  options: string[];
  selected: string[];
  onChange: (items: string[]) => void;
  customValue: string;
  onCustomValueChange: (value: string) => void;
  error?: string;
  addLabel: string;
};

function ChipPicker({
  legend,
  options,
  selected,
  onChange,
  customValue,
  onCustomValueChange,
  error,
  addLabel,
}: ChipPickerProps) {
  const errorId = `${addLabel.toLowerCase().replace(/\s+/g, '-')}-error`;

  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  }

  function addCustom() {
    const value = customValue.trim();
    if (!value) return;
    if (!selected.some((item) => item.toLowerCase() === value.toLowerCase())) {
      onChange([...selected, value]);
    }
    onCustomValueChange('');
  }

  return (
    <fieldset className="hhh-chip-picker hhh-field--full">
      <legend>{legend} <b aria-hidden="true">*</b></legend>
      <div className="hhh-chip-picker__options">
        {options.map((option) => (
          <label key={option} className={selected.includes(option) ? 'is-selected' : ''}>
            <input
              type="checkbox"
              checked={selected.includes(option)}
              onChange={() => toggle(option)}
            />
            {option}
          </label>
        ))}
        {selected.filter((item) => !options.includes(item)).map((item) => (
          <button type="button" key={item} className="is-selected" onClick={() => toggle(item)} aria-label={`Remove ${item}`}>
            {item} ×
          </button>
        ))}
      </div>
      <div className="hhh-chip-picker__custom">
        <input
          type="text"
          value={customValue}
          onChange={(event) => onCustomValueChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addCustom();
            }
          }}
          placeholder={addLabel}
          aria-label={addLabel}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
        />
        <button type="button" className="hhh-form-button hhh-form-button--secondary" onClick={addCustom}>
          Add
        </button>
      </div>
      {error && <small className="hhh-field-error" id={errorId}>{error}</small>}
    </fieldset>
  );
}
