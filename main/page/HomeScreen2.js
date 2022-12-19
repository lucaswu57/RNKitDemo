import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default HomeScreen2 = ({ navigation }) => {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home Screen222</Text>
      <TouchableOpacity
      style={styles.button}
        onPress={() => {
          navigation.goBack();
        }}><Text>goback</Text></TouchableOpacity>
    </View>
  );
}


const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: "#DDDDDD",
    padding: 10,
  }
});