/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

const AppNavigator = createStackNavigator({
    //这里注册了每个独立的页面。
    pa: {screen: a_page},
    pb: {screen: b_page},
    pc: {screen: c_page},
}, {
    //这里的'pa'对应着上面注册的pa，里可以理解为a_page的一个索引
    //这里的initialRouteName: 'pa',你可以想象成Android的启动页的lunch。如果你想
    //把pb换成启动项那么你可以写成 initialRouteName: 'pb',
    initialRouteName: 'pa',
});


const AppNavigator = createStackNavigator({});
AppRegistry.registerComponent(appName, () => App);
