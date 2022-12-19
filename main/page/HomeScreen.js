import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default HomeScreen = ({ navigation }) => {

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home Screen</Text>
      <TouchableOpacity style={styles.button}
        onPress={() => {
          console.log("navigation", navigation);
          // navigation.navigate('HomeScreen2');
          navigation.push('HomeScreen2');
        }}><Text>跳转</Text></TouchableOpacity>
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