/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CarWash, Booking, BookingStatus, TimeSlotItem, TimeSlotSliceDetail } from '../src/types.js';

export interface TimeSlotResponse extends TimeSlotItem {}

/**
 * Parses a time string "HH:MM" into total minutes from midnight.
 */
export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const match = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (!match) return 0;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

/**
 * Formats total minutes from midnight into "HH:MM" format.
 */
export function minutesToTimeString(minutes: number): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${pad(h)}:${pad(m)}`;
}

/**
 * Parses a slot string like "10:00 - 11:00", "10:00 - 10:30", or "10:00" into start and end minutes.
 */
export function parseTimeSlotRange(timeSlotStr: string, defaultDurationMinutes: number = 30): { startMin: number; endMin: number } | null {
  if (!timeSlotStr) return null;
  const trimmed = timeSlotStr.trim();
  
  if (trimmed.includes(' - ')) {
    const [startStr, endStr] = trimmed.split(' - ');
    const startMin = timeStringToMinutes(startStr);
    let endMin = timeStringToMinutes(endStr);
    if (endMin <= startMin) {
      endMin = startMin + defaultDurationMinutes;
    }
    return { startMin, endMin };
  }

  // Single time string
  const startMin = timeStringToMinutes(trimmed);
  return { startMin, endMin: startMin + defaultDurationMinutes };
}

/**
 * Checks if a slot string represents a flexible or 0-slot item (e.g. walk-in, products).
 */
export function isZeroSlotBooking(timeSlot: string): boolean {
  if (!timeSlot) return true;
  const lower = timeSlot.toLowerCase();
  return (
    lower.includes('walk-in') ||
    lower.includes('anytime') ||
    lower.includes('no slot') ||
    lower.includes('flex') ||
    lower.includes('0 slots') ||
    lower.includes('(0 slots)')
  );
}

/**
 * Checks if a booking overlaps with a given time interval [intervalStartMin, intervalEndMin).
 */
export function isBookingOverlapping(
  booking: Booking,
  intervalStartMin: number,
  intervalEndMin: number
): boolean {
  if (
    booking.status === BookingStatus.CANCELLED ||
    booking.status === BookingStatus.REJECTED ||
    isZeroSlotBooking(booking.timeSlot)
  ) {
    return false;
  }

  const range = parseTimeSlotRange(booking.timeSlot);
  if (!range) return false;

  // Overlap occurs when booking starts before interval ends AND booking ends after interval starts
  return range.startMin < intervalEndMin && range.endMin > intervalStartMin;
}

/**
 * Retrieves any custom schedule override/holiday for a specific date on a car wash.
 */
export function getScheduleOverrideForDate(carWash: CarWash, dateString: string) {
  let overrides = carWash.scheduleOverrides;
  if (!overrides && carWash.scheduleOverridesJson) {
    try {
      overrides = typeof carWash.scheduleOverridesJson === 'string' 
        ? JSON.parse(carWash.scheduleOverridesJson) 
        : carWash.scheduleOverridesJson;
    } catch {
      overrides = [];
    }
  }
  if (!overrides || !Array.isArray(overrides)) return null;
  return overrides.find((o) => o.date === dateString) || null;
}

/**
 * Validates whether a requested booking slot range has sufficient bay capacity on all 30-minute slices.
 */
export function validateSlotCapacity(
  carWash: CarWash,
  dateString: string,
  timeSlotStr: string,
  allBookings: Booking[],
  excludeBookingId?: string
): { isValid: boolean; error?: string } {
  if (isZeroSlotBooking(timeSlotStr)) {
    return { isValid: true };
  }

  const range = parseTimeSlotRange(timeSlotStr);
  if (!range) {
    return { isValid: false, error: 'Invalid time slot format.' };
  }

  // 🌴 Check holiday / ad-hoc schedule overrides
  const override = getScheduleOverrideForDate(carWash, dateString);
  if (override) {
    if (override.type === 'FULL_DAY') {
      return { isValid: false, error: `Car wash is closed for holiday (${override.reason || 'Holiday Closure'}).` };
    }
    if (override.type === 'HALF_DAY_MORNING') {
      const morningCutoff = override.customEndTime ? timeStringToMinutes(override.customEndTime) : 780; // 13:00 default
      if (range.startMin < morningCutoff) {
        return {
          isValid: false,
          error: `Morning slots are closed today for half-day holiday (${override.reason || 'Holiday'}). Available from ${minutesToTimeString(morningCutoff)} onwards.`,
        };
      }
    }
    if (override.type === 'HALF_DAY_AFTERNOON') {
      const afternoonCutoff = override.customStartTime ? timeStringToMinutes(override.customStartTime) : 780; // 13:00 default
      if (range.endMin > afternoonCutoff) {
        return {
          isValid: false,
          error: `Afternoon slots are closed today for half-day holiday (${override.reason || 'Holiday'}). Available before ${minutesToTimeString(afternoonCutoff)}.`,
        };
      }
    }
    if (override.type === 'CUSTOM_HOURS' && override.customStartTime && override.customEndTime) {
      const blockStart = timeStringToMinutes(override.customStartTime);
      const blockEnd = timeStringToMinutes(override.customEndTime);
      if (range.startMin < blockEnd && range.endMin > blockStart) {
        return {
          isValid: false,
          error: `Selected slot falls within temporary schedule closure (${override.customStartTime} - ${override.customEndTime}: ${override.reason || 'Special Closure'}).`,
        };
      }
    }
  }

  // Check business schedule
  const dateObj = new Date(dateString + 'T00:00:00');
  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = daysOfWeek[dateObj.getDay()] as keyof typeof carWash.openingHours;
  const daySchedule = carWash.openingHours[dayName];

  if (!daySchedule || !daySchedule.isOpen || !daySchedule.open || !daySchedule.close) {
    return { isValid: false, error: 'Car wash business is closed on this date.' };
  }

  const openMinutes = timeStringToMinutes(daySchedule.open);
  const closeMinutes = timeStringToMinutes(daySchedule.close);

  if (range.startMin < openMinutes || range.endMin > closeMinutes) {
    return { isValid: false, error: 'Selected time slot exceeds business operating hours.' };
  }

  // Check break overlap
  if ((daySchedule as any).hasBreak && (daySchedule as any).breakStart && (daySchedule as any).breakEnd) {
    const breakStartMin = timeStringToMinutes((daySchedule as any).breakStart);
    const breakEndMin = timeStringToMinutes((daySchedule as any).breakEnd);
    if (range.startMin < breakEndMin && range.endMin > breakStartMin) {
      return { isValid: false, error: 'Selected time slot falls within business closure / break hours.' };
    }
  }

  const capacity = carWash.capacityPerSlot || 1;
  const sliceStep = carWash.slotDuration || 30;

  // Active bookings on this date (excluding the specified booking if rescheduling)
  const activeBookings = allBookings.filter(
    (b) =>
      b.carWashId === carWash.id &&
      b.date === dateString &&
      (!excludeBookingId || b.id !== excludeBookingId) &&
      b.status !== BookingStatus.CANCELLED &&
      b.status !== BookingStatus.REJECTED &&
      !isZeroSlotBooking(b.timeSlot)
  );

  // Check every 30-minute slice in the requested range
  for (let sliceStart = range.startMin; sliceStart < range.endMin; sliceStart += sliceStep) {
    const sliceEnd = Math.min(sliceStart + sliceStep, range.endMin);
    const overlapping = activeBookings.filter((b) => isBookingOverlapping(b, sliceStart, sliceEnd));

    if (overlapping.length >= capacity) {
      const sliceTimeStr = `${minutesToTimeString(sliceStart)} - ${minutesToTimeString(sliceEnd)}`;
      return {
        isValid: false,
        error: `Bay capacity is fully booked during ${sliceTimeStr}. Please choose an earlier or later time slot.`,
      };
    }
  }

  return { isValid: true };
}

/**
 * Generates dynamic time slots for a given car wash, date, active bookings list, and service duration.
 */
export function generateSlotsForDate(
  carWash: CarWash,
  dateString: string, // YYYY-MM-DD
  bookings: Booking[],
  requestedDurationMinutes: number = 30
): TimeSlotResponse[] {
  // 🌴 Check full-day holiday override
  const override = getScheduleOverrideForDate(carWash, dateString);
  if (override && override.type === 'FULL_DAY') {
    return [];
  }

  // 1. Determine day of week
  const dateObj = new Date(dateString + 'T00:00:00');
  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = daysOfWeek[dateObj.getDay()] as keyof typeof carWash.openingHours;

  const daySchedule = carWash.openingHours[dayName];

  // If closed or open/close times are missing, return no slots
  if (!daySchedule || !daySchedule.isOpen || !daySchedule.open || !daySchedule.close) {
    return [];
  }

  // 2. Parse open and close times into minutes from midnight
  const startMinutes = timeStringToMinutes(daySchedule.open);
  const endMinutes = timeStringToMinutes(daySchedule.close);
  
  // Base slot interval step configured by the car wash (defaults to 30 mins)
  const slotInterval = carWash.slotDuration || 30;
  const duration = Math.max(slotInterval, requestedDurationMinutes || slotInterval);
  const capacity = carWash.capacityPerSlot || 1;

  const slots: TimeSlotResponse[] = [];
  let currentStart = startMinutes;

  // For checking past slots if the date is today (Brunei local time: UTC+8)
  const nowBrunei = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const todayStr = nowBrunei.toISOString().split('T')[0];
  const isToday = dateString === todayStr;
  const currentHour = nowBrunei.getUTCHours();
  const currentMin = nowBrunei.getUTCMinutes();
  const currentTotalMinutes = currentHour * 60 + currentMin;

  // Active bookings on this date
  const activeBookings = bookings.filter(
    (b) =>
      b.carWashId === carWash.id &&
      b.date === dateString &&
      b.status !== BookingStatus.CANCELLED &&
      b.status !== BookingStatus.REJECTED &&
      !isZeroSlotBooking(b.timeSlot)
  );

  // 3. Generate slots iteratively in 30-minute starting steps up to closing time
  while (currentStart < endMinutes) {
    const candidateEnd = currentStart + duration;
    const startTimeStr = minutesToTimeString(currentStart);
    const endTimeStr = minutesToTimeString(candidateEnd);
    const timeSlotStr = `${startTimeStr} - ${endTimeStr}`;

    let isAvailable = true;
    let unavailableReason: string | undefined = undefined;

    // A. Check if slot exceeds business closing time
    if (candidateEnd > endMinutes) {
      isAvailable = false;
      unavailableReason = `Exceeds closing time (${daySchedule.close}). Service duration is ${duration} mins.`;
    }

    // B. Check holiday / ad-hoc half-day or custom closure
    if (isAvailable && override) {
      if (override.type === 'HALF_DAY_MORNING') {
        const morningCutoff = override.customEndTime ? timeStringToMinutes(override.customEndTime) : 780; // 13:00
        if (currentStart < morningCutoff) {
          isAvailable = false;
          unavailableReason = `Morning slots closed for holiday (${override.reason || 'Holiday'}). Available from ${minutesToTimeString(morningCutoff)}.`;
        }
      } else if (override.type === 'HALF_DAY_AFTERNOON') {
        const afternoonCutoff = override.customStartTime ? timeStringToMinutes(override.customStartTime) : 780; // 13:00
        if (candidateEnd > afternoonCutoff) {
          isAvailable = false;
          unavailableReason = `Afternoon slots closed for holiday (${override.reason || 'Holiday'}). Available before ${minutesToTimeString(afternoonCutoff)}.`;
        }
      } else if (override.type === 'CUSTOM_HOURS' && override.customStartTime && override.customEndTime) {
        const blockStart = timeStringToMinutes(override.customStartTime);
        const blockEnd = timeStringToMinutes(override.customEndTime);
        if (currentStart < blockEnd && candidateEnd > blockStart) {
          isAvailable = false;
          unavailableReason = `Closed for temporary closure (${override.customStartTime} - ${override.customEndTime}: ${override.reason || 'Holiday'}).`;
        }
      }
    }

    // C. Check if slot overlaps with scheduled lunch or prayer break
    if (
      isAvailable &&
      (daySchedule as any).hasBreak &&
      (daySchedule as any).breakStart &&
      (daySchedule as any).breakEnd
    ) {
      const breakStartMin = timeStringToMinutes((daySchedule as any).breakStart);
      const breakEndMin = timeStringToMinutes((daySchedule as any).breakEnd);

      if (currentStart < breakEndMin && candidateEnd > breakStartMin) {
        isAvailable = false;
        unavailableReason = `Overlaps with lunch / prayer break (${(daySchedule as any).breakStart} - ${(daySchedule as any).breakEnd}). Service requires ${duration} continuous mins.`;
      }
    }

    // D. Collect all bookings and check bay capacity across all 30-minute slices
    const overlappingBookingsMap = new Map<string, Booking>();
    const sliceDetails: TimeSlotSliceDetail[] = [];
    let maxSliceBookedCount = 0;
    let hasFullSlice = false;
    const fullSlices: { start: string; end: string; booked: number; capacity: number }[] = [];

    for (let sliceStart = currentStart; sliceStart < candidateEnd; sliceStart += slotInterval) {
      const sliceEnd = Math.min(sliceStart + slotInterval, candidateEnd);
      const sliceOverlapping = activeBookings.filter((b) => isBookingOverlapping(b, sliceStart, sliceEnd));
      const sliceBooked = sliceOverlapping.length;
      const sliceFull = sliceBooked >= capacity;

      if (sliceBooked > maxSliceBookedCount) {
        maxSliceBookedCount = sliceBooked;
      }
      if (sliceFull) {
        hasFullSlice = true;
        fullSlices.push({
          start: minutesToTimeString(sliceStart),
          end: minutesToTimeString(sliceEnd),
          booked: sliceBooked,
          capacity,
        });
      }

      sliceDetails.push({
        startTime: minutesToTimeString(sliceStart),
        endTime: minutesToTimeString(sliceEnd),
        bookedCount: sliceBooked,
        capacity,
        isFull: sliceFull,
      });

      sliceOverlapping.forEach((b) => overlappingBookingsMap.set(b.id, b));
    }

    // E. If any 30-min slice is at or over capacity, slot is unavailable
    if (hasFullSlice && isAvailable) {
      isAvailable = false;
      if (sliceDetails.length > 1) {
        // Multi-slot service (e.g. 60 min, 90 min)
        const firstSliceFull = sliceDetails[0].isFull;
        const laterSlicesFull = sliceDetails.slice(1).some((s) => s.isFull);

        if (!firstSliceFull && laterSlicesFull) {
          const fullLater = fullSlices.map((fs) => `${fs.start} - ${fs.end}`).join(', ');
          unavailableReason = `Next slot (${fullLater}) is fully booked (${fullSlices[0].booked}/${capacity} bays) for this ${duration}-min service.`;
        } else if (firstSliceFull && !laterSlicesFull) {
          unavailableReason = `Starting slot (${sliceDetails[0].startTime} - ${sliceDetails[0].endTime}) is fully booked (${sliceDetails[0].bookedCount}/${capacity} bays).`;
        } else {
          unavailableReason = `Multiple slots are fully booked during this ${duration}-min window (${capacity}/${capacity} bays).`;
        }
      } else {
        unavailableReason = `Fully booked (${maxSliceBookedCount}/${capacity} bays occupied).`;
      }
    }

    // F. If it's today, check if start time has already passed (Brunei time)
    if (isToday && currentStart <= currentTotalMinutes) {
      isAvailable = false;
      if (!unavailableReason) {
        unavailableReason = 'Appointment time has already passed.';
      }
    }

    const overlappingBookingsList = Array.from(overlappingBookingsMap.values());

    slots.push({
      timeSlot: timeSlotStr,
      startTime: startTimeStr,
      endTime: endTimeStr,
      durationMinutes: duration,
      capacity,
      bookedCount: maxSliceBookedCount,
      isAvailable,
      unavailableReason,
      sliceDetails,
      bookings: overlappingBookingsList.map((b) => ({
        id: b.id,
        customerName: b.customerName,
        status: b.status,
      })),
    });

    currentStart += slotInterval;
  }

  return slots;
}

