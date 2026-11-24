'use client';

import { useMemo, useState } from 'react';
import type {
  DateOverride,
  DayAvailability,
  TimeSlot,
  WeeklyAvailability,
} from './registration-types';

export const WEEK_DAYS = [
  { key: 'monday', short: 'Mon', label: 'Monday' },
  { key: 'tuesday', short: 'Tue', label: 'Tuesday' },
  { key: 'wednesday', short: 'Wed', label: 'Wednesday' },
  { key: 'thursday', short: 'Thu', label: 'Thursday' },
  { key: 'friday', short: 'Fri', label: 'Friday' },
  { key: 'saturday', short: 'Sat', label: 'Saturday' },
  { key: 'sunday', short: 'Sun', label: 'Sunday' },
] as const;

const CALENDAR_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function makeSlot(): TimeSlot {
  return {
    id: `slot-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    start: '09:00',
    end: '17:00',
  };
}

export function createInitialWeeklyAvailability(): WeeklyAvailability {
  return WEEK_DAYS.reduce<WeeklyAvailability>((schedule, day) => {
    schedule[day.key] = {
      available: false,
      slots: [{ id: `${day.key}-initial`, start: '09:00', end: '17:00' }],
    };
    return schedule;
  }, {});
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatLongDate(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));
}

function sameMonth(a: Date, b: Date) {
  return a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}

type AvailabilityEditorProps = {
  legend: string;
  helperText: string;
  weekly: WeeklyAvailability;
  onWeeklyChange: (weekly: WeeklyAvailability) => void;
  overrides: DateOverride[];
  onOverridesChange: (overrides: DateOverride[]) => void;
  error?: string;
};

export function AvailabilityEditor({
  legend,
  helperText,
  weekly,
  onWeeklyChange,
  overrides,
  onOverridesChange,
  error,
}: AvailabilityEditorProps) {
  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(today));

  const selectedOverride = overrides.find((override) => override.date === selectedDate);
  const daysInMonth = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth() + 1,
    0,
  ).getDate();
  const leadingBlanks = visibleMonth.getDay();

  function updateDay(dayKey: string, update: Partial<DayAvailability>) {
    onWeeklyChange({
      ...weekly,
      [dayKey]: { ...weekly[dayKey], ...update },
    });
  }

  function updateWeeklySlot(dayKey: string, slotId: string, patch: Partial<TimeSlot>) {
    updateDay(dayKey, {
      slots: weekly[dayKey].slots.map((slot) =>
        slot.id === slotId ? { ...slot, ...patch } : slot,
      ),
    });
  }

  function removeWeeklySlot(dayKey: string, slotId: string) {
    const remaining = weekly[dayKey].slots.filter((slot) => slot.id !== slotId);
    updateDay(dayKey, { slots: remaining.length ? remaining : [makeSlot()] });
  }

  function setOverride(status: DateOverride['status'] | 'default') {
    const remaining = overrides.filter((override) => override.date !== selectedDate);
    if (status === 'default') {
      onOverridesChange(remaining);
      return;
    }
    onOverridesChange([
      ...remaining,
      {
        date: selectedDate,
        status,
        slots: status === 'available' ? [makeSlot()] : [],
      },
    ].sort((a, b) => a.date.localeCompare(b.date)));
  }

  function updateOverrideSlots(slots: TimeSlot[]) {
    if (!selectedOverride) return;
    onOverridesChange(
      overrides.map((override) =>
        override.date === selectedDate ? { ...override, slots } : override,
      ),
    );
  }

  function changeMonth(offset: number) {
    const nextMonth = new Date(
      visibleMonth.getFullYear(),
      visibleMonth.getMonth() + offset,
      1,
    );
    setVisibleMonth(nextMonth);
    setSelectedDate(
      sameMonth(nextMonth, today)
        ? toDateKey(today)
        : toDateKey(new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1)),
    );
  }

  const canGoPrevious = !sameMonth(visibleMonth, today);

  return (
    <fieldset className="hhh-registration-availability" aria-describedby={error ? 'availability-error' : undefined}>
      <legend>{legend}</legend>
      <p className="hhh-registration-help">{helperText}</p>

      <div className="hhh-availability-block">
        <div className="hhh-availability-heading">
          <div>
            <h4>Weekly schedule <span aria-hidden="true">*</span></h4>
            <p>Select at least one day and add one or more time slots.</p>
          </div>
        </div>

        <div className="hhh-weekly-schedule">
          {WEEK_DAYS.map((day) => {
            const schedule = weekly[day.key];
            return (
              <div className="hhh-weekly-day" key={day.key}>
                <label className="hhh-day-toggle">
                  <input
                    type="checkbox"
                    checked={schedule.available}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? 'availability-error' : undefined}
                    onChange={(event) => updateDay(day.key, { available: event.target.checked })}
                  />
                  <span>{day.label}</span>
                </label>

                {schedule.available ? (
                  <div className="hhh-time-slots">
                    {schedule.slots.map((slot, index) => (
                      <div className="hhh-time-slot" key={slot.id}>
                        <label>
                          <span className="hhh-sr-only">{day.label} slot {index + 1} start time</span>
                          <input
                            type="time"
                            value={slot.start}
                            onChange={(event) => updateWeeklySlot(day.key, slot.id, { start: event.target.value })}
                          />
                        </label>
                        <span aria-hidden="true">to</span>
                        <label>
                          <span className="hhh-sr-only">{day.label} slot {index + 1} end time</span>
                          <input
                            type="time"
                            value={slot.end}
                            onChange={(event) => updateWeeklySlot(day.key, slot.id, { end: event.target.value })}
                          />
                        </label>
                        <button
                          type="button"
                          className="hhh-icon-button"
                          onClick={() => removeWeeklySlot(day.key, slot.id)}
                          aria-label={`Remove ${day.label} time slot ${index + 1}`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="hhh-text-button"
                      onClick={() => updateDay(day.key, { slots: [...schedule.slots, makeSlot()] })}
                    >
                      Add another time slot
                    </button>
                  </div>
                ) : (
                  <span className="hhh-day-unavailable">Unavailable</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="hhh-availability-block">
        <div className="hhh-availability-heading">
          <div>
            <h4>Monthly overrides <span className="hhh-optional">Optional</span></h4>
            <p>Override the weekly schedule for a specific date when needed.</p>
          </div>
        </div>

        <div className="hhh-calendar-layout">
          <div className="hhh-calendar">
            <div className="hhh-calendar-toolbar">
              <button
                type="button"
                className="hhh-icon-button"
                aria-label="Previous month"
                disabled={!canGoPrevious}
                onClick={() => changeMonth(-1)}
              >
                ‹
              </button>
              <strong aria-live="polite">
                {new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(
                  visibleMonth,
                )}
              </strong>
              <button
                type="button"
                className="hhh-icon-button"
                aria-label="Next month"
                onClick={() => changeMonth(1)}
              >
                ›
              </button>
            </div>

            <div className="hhh-calendar-grid" aria-label="Monthly availability calendar">
              {CALENDAR_DAYS.map((day) => (
                <span className="hhh-calendar-weekday" key={day}>{day}</span>
              ))}
              {Array.from({ length: leadingBlanks }, (_, index) => (
                <span key={`blank-${index}`} aria-hidden="true" />
              ))}
              {Array.from({ length: daysInMonth }, (_, index) => {
                const date = new Date(
                  visibleMonth.getFullYear(),
                  visibleMonth.getMonth(),
                  index + 1,
                );
                const dateKey = toDateKey(date);
                const override = overrides.find((item) => item.date === dateKey);
                const isPast = date < today;
                const isSelected = dateKey === selectedDate;
                return (
                  <button
                    type="button"
                    key={dateKey}
                    disabled={isPast}
                    className={`hhh-calendar-day${isSelected ? ' is-selected' : ''}${override ? ` is-${override.status}` : ''}`}
                    aria-pressed={isSelected}
                    aria-label={`${formatLongDate(dateKey)}${override ? `, marked ${override.status}` : ', uses weekly schedule'}`}
                    onClick={() => setSelectedDate(dateKey)}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
            <div className="hhh-calendar-key" aria-hidden="true">
              <span><i className="is-available" /> Available override</span>
              <span><i className="is-unavailable" /> Unavailable override</span>
            </div>
          </div>

          <div className="hhh-date-override">
            <p className="hhh-date-override__date">{formatLongDate(selectedDate)}</p>
            <div className="hhh-segmented-control" aria-label="Date availability override">
              <button
                type="button"
                className={!selectedOverride ? 'is-active' : ''}
                onClick={() => setOverride('default')}
              >
                Weekly default
              </button>
              <button
                type="button"
                className={selectedOverride?.status === 'available' ? 'is-active' : ''}
                onClick={() => setOverride('available')}
              >
                Available
              </button>
              <button
                type="button"
                className={selectedOverride?.status === 'unavailable' ? 'is-active' : ''}
                onClick={() => setOverride('unavailable')}
              >
                Unavailable
              </button>
            </div>

            {!selectedOverride && (
              <p className="hhh-registration-help">This date follows the weekly schedule.</p>
            )}
            {selectedOverride?.status === 'unavailable' && (
              <p className="hhh-registration-help">No availability will be shown for this date.</p>
            )}
            {selectedOverride?.status === 'available' && (
              <div className="hhh-time-slots hhh-time-slots--override">
                {selectedOverride.slots.map((slot, index) => (
                  <div className="hhh-time-slot" key={slot.id}>
                    <label>
                      <span className="hhh-sr-only">Override slot {index + 1} start time</span>
                      <input
                        type="time"
                        value={slot.start}
                        onChange={(event) =>
                          updateOverrideSlots(
                            selectedOverride.slots.map((item) =>
                              item.id === slot.id ? { ...item, start: event.target.value } : item,
                            ),
                          )
                        }
                      />
                    </label>
                    <span aria-hidden="true">to</span>
                    <label>
                      <span className="hhh-sr-only">Override slot {index + 1} end time</span>
                      <input
                        type="time"
                        value={slot.end}
                        onChange={(event) =>
                          updateOverrideSlots(
                            selectedOverride.slots.map((item) =>
                              item.id === slot.id ? { ...item, end: event.target.value } : item,
                            ),
                          )
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className="hhh-icon-button"
                      aria-label={`Remove override time slot ${index + 1}`}
                      onClick={() => {
                        const remaining = selectedOverride.slots.filter((item) => item.id !== slot.id);
                        updateOverrideSlots(remaining.length ? remaining : [makeSlot()]);
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="hhh-text-button"
                  onClick={() => updateOverrideSlots([...selectedOverride.slots, makeSlot()])}
                >
                  Add another time slot
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && <p className="hhh-field-error" id="availability-error" role="alert">{error}</p>}
    </fieldset>
  );
}
