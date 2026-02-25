import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme';

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
};

export function SectionHeader({ title, subtitle, trailing }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.textGroup}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  textGroup: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  title: {
    ...theme.typography.heading,
  },
  subtitle: {
    ...theme.typography.bodyMuted,
  },
});
