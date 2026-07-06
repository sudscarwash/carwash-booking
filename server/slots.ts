/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CarWash, Booking, BookingStatus } from '../src/types.js';

export interface TimeSlotResponse {
  timeSlot: string;
  startTime: string;
  endTime: string;
  capacity: number;
  bookedCount: number;
  isAvailable: boolean;
  bookings: { id: string; customerName: string; status: BookingStatus }[];
}

/**
 * Generates dynamic time slots for a given car wash, date, and active bookings list.
 */
export function generateSlotsForDate(
  carWash: CarWash,
  dateString: string, // YYYY-MM-DD
  bookings: Booking[]
): TimeSlotResponse[] {
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
  const [openHour, openMin] = daySchedule.open.split(':').map(Number);
  const [closeHour, closeMin] = daySchedule.close.split(':').map(Number);

  const startMinutes = openHour * 60 + openMin;
  const endMinutes = closeHour * 60 + closeMin;
  const duration = carWash.slotDuration || 30;

  const slots: TimeSlotResponse[] = [];
  let currentMinutes = startMinutes;

  // For checking past slots if the date is today
  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = dateString === todayStr;
  const now = new Date();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  const currentTotalMinutes = currentHour * 60 + currentMin;

  // 3. Generate slots iteratively
  while (currentMinutes + duration <= endMinutes) {
    // Check if slot overlaps with break
    let overlapsWithBreak = false;
    if (
      (daySchedule as any).hasBreak &&
      (daySchedule as any).breakStart &&
      (daySchedule as any).breakEnd
    ) {
      const [bStartH, bStartM] = (daySchedule as any).breakStart.split(':').map(Number);
      const [bEndH, bEndM] = (daySchedule as any).breakEnd.split(':').map(Number);
      const breakStartMin = bStartH * 60 + bStartM;
      const breakEndMin = bEndH * 60 + bEndM;

      const slotStart = currentMinutes;
      const slotEnd = currentMinutes + duration;

      if (slotStart < breakEndMin && slotEnd > breakStartMin) {
        overlapsWithBreak = true;
      }
    }

    if (overlapsWithBreak) {
      currentMinutes += duration;
      continue;
    }

    const startH = Math.floor(currentMinutes / 60);
    const startM = currentMinutes % 60;
    const endH = Math.floor((currentMinutes + duration) / 60);
    const endM = (currentMinutes + duration) % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');
    const startTimeStr = `${pad(startH)}:${pad(startM)}`;
    const endTimeStr = `${pad(endH)}:${pad(endM)}`;
    const timeSlotStr = `${startTimeStr} - ${endTimeStr}`;

    // Filter active bookings for this slot
    const slotBookings = bookings.filter(
      (b) =>
        b.carWashId === carWash.id &&
        b.date === dateString &&
        b.timeSlot === timeSlotStr &&
        b.status !== BookingStatus.CANCELLED &&
        b.status !== BookingStatus.REJECTED
    );

    const bookedCount = slotBookings.length;
    const capacity = carWash.capacityPerSlot || 1;

    // A slot is available if:
    // 1. Current bookings count is less than capacity
    // 2. If it's today, the slot start time is in the future
    let isAvailable = bookedCount < capacity;
    if (isToday && currentMinutes <= currentTotalMinutes) {
      isAvailable = false;
    }

    slots.push({
      timeSlot: timeSlotStr,
      startTime: startTimeStr,
      endTime: endTimeStr,
      capacity,
      bookedCount,
      isAvailable,
      bookings: slotBookings.map((b) => ({
        id: b.id,
        customerName: b.customerName,
        status: b.status,
      })),
    });

    currentMinutes += duration;
  }

  return slots;
}
