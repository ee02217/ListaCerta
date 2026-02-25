import { Platform, TextStyle, ViewStyle } from 'react-native';

export const theme = {
  colors: {
    primary: '#2563EB',
    primarySoft: '#DBEAFE',
    background: '#F4F6FB',
    surface: '#FFFFFF',
    text: '#0F172A',
    muted: '#64748B',
    border: '#DCE3EE',
    error: '#DC2626',
    errorSurface: '#FEE2E2',
    success: '#16A34A',
    warning: '#D97706',
    warningSurface: '#FFF7ED',
    tabInactive: '#94A3B8',
    surfaceMuted: '#F8FAFC',
    onPrimary: '#FFFFFF',
    scanBackground: '#0A1020',
    scanText: '#E2E8F0',
    scanMuted: '#94A3B8',
    scanBorder: '#1E293B',
    overlay: 'rgba(15,23,42,0.5)',
    modalOverlay: 'rgba(15,23,42,0.34)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    pill: 999,
  },
  typography: {
    title: {
      fontSize: 30,
      fontWeight: '800',
      color: '#0F172A',
    } as TextStyle,
    heading: {
      fontSize: 22,
      fontWeight: '700',
      color: '#0F172A',
    } as TextStyle,
    sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      color: '#64748B',
    } as TextStyle,
    body: {
      fontSize: 16,
      color: '#0F172A',
    } as TextStyle,
    bodyMuted: {
      fontSize: 14,
      color: '#64748B',
    } as TextStyle,
    caption: {
      fontSize: 12,
      color: '#64748B',
    } as TextStyle,
    button: {
      fontSize: 16,
      fontWeight: '700',
    } as TextStyle,
  },
  shadows: {
    card: {
      shadowColor: '#0F172A',
      shadowOpacity: 0.07,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: Platform.select({ ios: 2, android: 2, default: 0 }),
    } as ViewStyle,
    floating: {
      shadowColor: '#0F172A',
      shadowOpacity: 0.2,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: Platform.select({ ios: 5, android: 6, default: 0 }),
    } as ViewStyle,
  },
};

export type AppTheme = typeof theme;
