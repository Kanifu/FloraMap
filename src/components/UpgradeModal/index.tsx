import React from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Tier } from '@/hooks/useFeatureFlag';

interface Props {
  visible: boolean;
  onClose: () => void;
  featureLabel: string;
  featureDescription: string;
  requiredTier: Tier;
}

const TIER_LABELS: Record<Tier, string> = {
  free: 'Gratis',
  plus: '⭐ Plus',
  premium: '💎 Premium',
};

const TIER_PRICES: Record<Tier, string> = {
  free: '',
  plus: '€1,99/mnd of €9,99/jaar',
  premium: '€3,99/mnd of €19,99/jaar',
};

const PLUS_BENEFITS = [
  'Onbeperkt planten toevoegen',
  'Onbeperkte AI-assistent vragen',
  'Oogstdagboek & foto-dagboek',
  'Maankalender & vorstmeldingen',
  'Dark mode',
];

const PREMIUM_EXTRA_BENEFITS = [
  'Meerdere tuinen (max 5)',
  'Bodemgezondheid & bodemprofiel',
  'PDF-export van tuinrapporten',
  'Gewasrotatie tracking',
  'Statistieken & seizoensdashboard',
];

export const UpgradeModal: React.FC<Props> = ({
  visible, onClose, featureLabel, featureDescription, requiredTier,
}) => {
  const theme = useTheme();
  const isPremium = requiredTier === 'premium';

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.overlay,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: theme.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: 36,
      gap: 12,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.border,
      alignSelf: 'center',
      marginBottom: 8,
    },
    tierBadge: {
      alignSelf: 'center',
      fontSize: 13,
      fontWeight: '700',
      color: isPremium ? '#7c3aed' : '#d97706',
      backgroundColor: isPremium ? '#ede9fe' : '#fef3c7',
      paddingHorizontal: 14,
      paddingVertical: 4,
      borderRadius: 20,
    },
    title: {
      fontSize: 22,
      fontWeight: '800',
      color: theme.primaryDark,
      textAlign: 'center',
    },
    description: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    price: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.primary,
      textAlign: 'center',
    },
    divider: {
      height: 1,
      backgroundColor: theme.border,
      marginVertical: 4,
    },
    benefitsTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    benefit: {
      fontSize: 14,
      color: theme.primaryDark,
      lineHeight: 22,
    },
    upgradeBtn: {
      backgroundColor: isPremium ? '#7c3aed' : theme.primary,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 4,
    },
    upgradeBtnText: {
      fontSize: 16,
      fontWeight: '800',
      color: '#fff',
    },
    trialNote: {
      fontSize: 12,
      color: theme.textMuted,
      textAlign: 'center',
    },
    cancelBtn: {
      alignItems: 'center',
      paddingVertical: 8,
    },
    cancelBtnText: {
      fontSize: 14,
      color: theme.textSecondary,
    },
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.tierBadge}>{TIER_LABELS[requiredTier]}-feature</Text>
          <Text style={styles.title}>{featureLabel}</Text>
          <Text style={styles.description}>{featureDescription}</Text>
          {TIER_PRICES[requiredTier] ? (
            <Text style={styles.price}>{TIER_PRICES[requiredTier]}</Text>
          ) : null}
          <View style={styles.divider} />
          <Text style={styles.benefitsTitle}>
            {isPremium ? 'Premium voordelen' : 'Plus voordelen'}
          </Text>
          {PLUS_BENEFITS.map((b) => (
            <Text key={b} style={styles.benefit}>✓ {b}</Text>
          ))}
          {isPremium && PREMIUM_EXTRA_BENEFITS.map((b) => (
            <Text key={b} style={styles.benefit}>✓ {b}</Text>
          ))}
          <View style={styles.divider} />
          <TouchableOpacity style={styles.upgradeBtn} onPress={onClose}>
            <Text style={styles.upgradeBtnText}>Binnenkort beschikbaar</Text>
          </TouchableOpacity>
          <Text style={styles.trialNote}>In-app aankopen worden later toegevoegd</Text>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>Sluiten</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
