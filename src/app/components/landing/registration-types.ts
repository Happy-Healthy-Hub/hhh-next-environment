export type RegistrationKind = 'caregiver' | 'provider';

export type TimeSlot = {
  id: string;
  start: string;
  end: string;
};

export type DayAvailability = {
  available: boolean;
  slots: TimeSlot[];
};

export type WeeklyAvailability = Record<string, DayAvailability>;

export type DateOverride = {
  date: string;
  status: 'available' | 'unavailable';
  slots: TimeSlot[];
};

export type SharedRegistrationDetails = {
  fullName: string;
  mobile: string;
  email: string;
  address: string;
  pinCode: string;
  emergencyName: string;
  emergencyMobile: string;
  weeklyAvailability: WeeklyAvailability;
  monthlyOverrides: DateOverride[];
};

export type CaregiverRegistration = SharedRegistrationDetails & {
  kind: 'caregiver';
  specialization: string;
  institution: string;
  qualification: string;
  skills: string[];
};

export type ProviderRegistration = SharedRegistrationDetails & {
  kind: 'provider';
  organizationName: string;
  organizationType: 'Hospital' | 'Clinic' | 'Healthcare Organization' | 'Other';
  services: string[];
  designation: string;
};

export type RegistrationSubmission = CaregiverRegistration | ProviderRegistration;

export type RegistrationSubmissionResult = {
  status: 'demo-preview';
};

export type RegistrationSubmissionHandler = (
  registration: RegistrationSubmission,
) => Promise<RegistrationSubmissionResult>;

/**
 * Frontend-only adapter. Replace this function with the future HHH API call.
 * It deliberately performs no network request and stores no personal data.
 */
export const submitRegistrationPreview: RegistrationSubmissionHandler = async () => ({
  status: 'demo-preview',
});
