import { StyleSheet, View } from "react-native";

import { Button, ScreenContainer, Text } from "../src/shared/ui";

export default function HomeScreen() {
  return (
    <ScreenContainer>
      <View style={styles.content}>
        <Text variant="title">Personal Finance</Text>
        <Text style={styles.subtitle}>
          Стартовая страница с Expo Router и общими компонентами.
        </Text>
        <Button title="Начать" onPress={() => {}} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
  },
  subtitle: {
    color: "#4b5563",
  },
});
