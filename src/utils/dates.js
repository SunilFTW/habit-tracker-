import { format, startOfDay, subDays, differenceInDays, isToday, parseISO, startOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';

export const todayStr = () => format(new Date(), 'yyyy-MM-dd');

export const formatDate = (date) => format(new Date(date), 'MMM d, yyyy');

export const formatDateShort = (date) => format(new Date(date), 'MMM d');

export const getDayName = (date) => format(new Date(date), 'EEE');

export const getWeekDays = () => {
  const start = startOfWeek(new Date(), { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return format(d, 'yyyy-MM-dd');
  });
};

export const getLast7Days = () => {
  return Array.from({ length: 7 }, (_, i) => {
    return format(subDays(new Date(), 6 - i), 'yyyy-MM-dd');
  });
};

export const getLast30Days = () => {
  return Array.from({ length: 30 }, (_, i) => {
    return format(subDays(new Date(), 29 - i), 'yyyy-MM-dd');
  });
};

export const getMonthDays = (date = new Date()) => {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  return eachDayOfInterval({ start, end }).map(d => format(d, 'yyyy-MM-dd'));
};

export const isDateToday = (dateStr) => {
  return isToday(new Date(dateStr));
};

export const daysBetween = (date1, date2) => {
  return differenceInDays(new Date(date1), new Date(date2));
};

export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  if (hour < 21) return 'Good Evening';
  return 'Good Night';
};
