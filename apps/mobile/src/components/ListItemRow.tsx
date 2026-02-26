import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from './Card';
import { theme } from '../theme';

type ListItemRowProps = {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  trailing?: ReactNode;
};

export function ListItemRow({ title, subtitle, trailing, onPress, onLongPress }: ListItemRowProps) {
  return (
    <Card onPress={onPress} onLongPress={onLongPress} style={styles.card}>
      <View style={styles.row}>
        <View style={styles.textGroup}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {trailing}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
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
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  subtitle: {
    ...theme.typography.caption,
  },
});
