/**
 * Analytics Type Definitions
 */

export interface OrganizerAnalytics {
  totalEvents: number;
  totalRegistrations: number;
  totalRevenue: number;
  totalCheckedIn: number;
}

export interface EventAnalytics {
  registrationsCount: number;
  checkedInCount: number;
  revenue: number;
  attendanceRate: number; // percentage (e.g. 85.5)
}
