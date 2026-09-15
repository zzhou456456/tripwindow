import DateTimePicker from '@react-native-community/datetimepicker';
import { useState, type ReactNode } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { toDate, toISODate } from '@/lib/format';

export const Accent = '#3c87f7';
export const Danger = '#e5484d';

export function Screen({
  children,
  refreshing = false,
  onRefresh,
}: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      keyboardShouldPersistTaps="handled"
      // Insets are applied manually below; NativeTabs would otherwise add them a second time on iOS.
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={[
        styles.screen,
        {
          // The web tab bar floats over the top of the page, so leave room for it there.
          paddingTop: insets.top + (Platform.OS === 'web' ? Spacing.six + Spacing.three : Spacing.three),
          paddingBottom: insets.bottom + BottomTabInset + Spacing.four,
        },
      ]}
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined}>
      {children}
    </ScrollView>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      {children}
    </ThemedView>
  );
}

export function Field({
  label,
  containerStyle,
  style,
  ...props
}: TextInputProps & { label: string; containerStyle?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return (
    <View style={[styles.field, containerStyle]}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <TextInput
        placeholderTextColor={theme.textSecondary}
        autoCorrect={false}
        style={[
          styles.input,
          { color: theme.text, backgroundColor: theme.background, borderColor: theme.backgroundSelected },
          style,
        ]}
        {...props}
      />
    </View>
  );
}

// Tap-to-pick date ('YYYY-MM-DD'). An empty value shows the placeholder, which is also the date the picker opens on.
export function DateField({
  label,
  value,
  onChange,
  placeholder,
  minimumDate,
  containerStyle,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  minimumDate?: string;
  containerStyle?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => new Date());

  // The native picker has no web implementation, so web keeps a typed field.
  if (Platform.OS === 'web') {
    return (
      <Field label={label} value={value} onChangeText={onChange} placeholder={placeholder} containerStyle={containerStyle} />
    );
  }

  const min = minimumDate ? toDate(minimumDate) : undefined;

  function show() {
    const current = toDate(value || placeholder);
    setDraft(min && current < min ? min : current);
    setOpen(true);
  }

  return (
    <View style={[styles.field, containerStyle]}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} date`}
        onPress={show}
        style={[styles.input, { backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}>
        <ThemedText style={styles.dateText} themeColor={value ? 'text' : 'textSecondary'}>
          {value || placeholder}
        </ThemedText>
      </Pressable>

      {Platform.OS === 'android' && open && (
        <DateTimePicker
          value={draft}
          mode="date"
          minimumDate={min}
          onValueChange={(_, date) => {
            setOpen(false);
            onChange(toISODate(date));
          }}
          onDismiss={() => setOpen(false)}
        />
      )}

      {Platform.OS === 'ios' && (
        <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
          <ThemedView type="backgroundElement" style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.two }]}>
            <View style={styles.sheetBar}>
              <Pressable accessibilityRole="button" onPress={() => setOpen(false)} hitSlop={Spacing.two}>
                <ThemedText themeColor="textSecondary">Cancel</ThemedText>
              </Pressable>
              <ThemedText type="smallBold">{label}</ThemedText>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setOpen(false);
                  onChange(toISODate(draft));
                }}
                hitSlop={Spacing.two}>
                <ThemedText type="smallBold" style={{ color: Accent }}>
                  Done
                </ThemedText>
              </Pressable>
            </View>
            <DateTimePicker
              value={draft}
              mode="date"
              display="spinner"
              style={styles.spinner}
              minimumDate={min}
              themeVariant={scheme === 'dark' ? 'dark' : 'light'}
              textColor={theme.text}
              onValueChange={(_, date) => setDraft(date)}
            />
          </ThemedView>
        </Modal>
      )}
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}) {
  const theme = useTheme();
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: primary ? Accent : theme.backgroundSelected, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
      ]}>
      <ThemedText type="smallBold" style={primary ? styles.primaryLabel : undefined}>
        {title}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  field: {
    gap: Spacing.one,
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two + Spacing.one,
    paddingVertical: Spacing.two + Spacing.half,
    fontSize: 16,
  },
  dateText: {
    fontSize: 16,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  sheet: {
    borderTopLeftRadius: Spacing.three,
    borderTopRightRadius: Spacing.three,
    paddingTop: Spacing.two,
  },
  // The native spinner keeps its intrinsic width and would otherwise hug the left edge.
  spinner: {
    alignSelf: 'center',
  },
  sheetBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  button: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two + Spacing.one,
    alignItems: 'center',
  },
  primaryLabel: {
    color: '#ffffff',
  },
});
