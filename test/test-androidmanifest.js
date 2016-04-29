import { expect } from 'chai';
import path from 'path';

import AndroidManifest from '../src/AndroidManifest';

describe('AndroidManifest', () => {

	describe('<application>', () => {
		const am = new AndroidManifest(path.resolve('./test/mocks/mockManifestFiles/AndroidManifest_application.xml'));

		it('should match object', () => {
			expect(am).to.be.an.Object;
			expect(am).to.have.key('application');
			expect(am.application).to.have.keys([
				'allowTaskReparenting',
				'allowBackup',
				'backupAgent',
				'debuggable',
				'description',
				'enabled',
				'hasCode',
				'hardwareAccelerated',
				'icon',
				'killAfterRestore',
				'largeHeap',
				'label',
				'logo',
				'manageSpaceActivity',
				'name',
				'permission',
				'persistent',
				'process',
				'restoreAnyVersion',
				'requiredAccountType',
				'restrictedAccountType',
				'supportsRtl',
				'taskAffinity',
				'testOnly',
				'theme',
				'uiOptions',
				'vmSafeMode'
			]);
		});

		it('toString()', () => {
			expect(am.toString()).equal('[object Object]');
		});

		it('toString("json")', () => {
			expect(am.toString('json')).equal('{"application":{"allowTaskReparenting":false,"allowBackup":true,"backupAgent":".MyBackupAgent","debuggable":false,"description":"this is a test","enabled":true,"hasCode":true,"hardwareAccelerated":false,"icon":"@drawable/icon","killAfterRestore":true,"largeHeap":false,"label":"test","logo":"@drawable/logo","manageSpaceActivity":".TestActivity","name":"test","permission":"testPermission","persistent":true,"process":"test","restoreAnyVersion":false,"requiredAccountType":"com.google","restrictedAccountType":"com.google","supportsRtl":false,"taskAffinity":"test","testOnly":false,"theme":"testTheme","uiOptions":"none","vmSafeMode":false}}');
		});

		it('toString("pretty-json")', () => {
			expect(am.toString('pretty-json')).equal([
				'{',
				'	"application": {',
				'		"allowTaskReparenting": false,',
				'		"allowBackup": true,',
				'		"backupAgent": ".MyBackupAgent",',
				'		"debuggable": false,',
				'		"description": "this is a test",',
				'		"enabled": true,',
				'		"hasCode": true,',
				'		"hardwareAccelerated": false,',
				'		"icon": "@drawable/icon",',
				'		"killAfterRestore": true,',
				'		"largeHeap": false,',
				'		"label": "test",',
				'		"logo": "@drawable/logo",',
				'		"manageSpaceActivity": ".TestActivity",',
				'		"name": "test",',
				'		"permission": "testPermission",',
				'		"persistent": true,',
				'		"process": "test",',
				'		"restoreAnyVersion": false,',
				'		"requiredAccountType": "com.google",',
				'		"restrictedAccountType": "com.google",',
				'		"supportsRtl": false,',
				'		"taskAffinity": "test",',
				'		"testOnly": false,',
				'		"theme": "testTheme",',
				'		"uiOptions": "none",',
				'		"vmSafeMode": false',
				'	}',
				'}'
			].join('\n'));
		});

		it('toString("xml")', () => {
			expect(am.toString('xml')).equal([
				'<?xml version="1.0" encoding="UTF-8"?>',
				'<manifest>',
				'	<application android:allowTaskReparenting="false" android:allowBackup="true" android:backupAgent=".MyBackupAgent" android:debuggable="false" android:description="this is a test" android:enabled="true" android:hasCode="true" android:hardwareAccelerated="false" android:icon="@drawable/icon" android:killAfterRestore="true" android:largeHeap="false" android:label="test" android:logo="@drawable/logo" android:manageSpaceActivity=".TestActivity" android:name="test" android:permission="testPermission" android:persistent="true" android:process="test" android:restoreAnyVersion="false" android:requiredAccountType="com.google" android:restrictedAccountType="com.google" android:supportsRtl="false" android:taskAffinity="test" android:testOnly="false" android:theme="testTheme" android:uiOptions="none" android:vmSafeMode="false"/>',
				'</manifest>'
			].join('\r\n'));
		});
	});

	describe('AndroidManifest.xml Sample 1', () => {
		const am = new AndroidManifest(path.resolve('./test/mocks/mockManifestFiles/AndroidManifest-sample1.xml'));

		it('should match object', () => {
			expect(am).to.be.an.Object;
		});

		it('toString()', () => {
			expect(am.toString()).equal('[object Object]');
		});

		it('toString("json")', () => {
			expect(am.toString('json')).equal('{"__attr__":{"xmlns:android":"http://schemas.android.com/apk/res/android","package":"com.appcelerator.testapp","android:versionCode":1,"android:versionName":"1.0"},"uses-sdk":{"minSdkVersion":10,"targetSdkVersion":14,"maxSdkVersion":18},"application":{"icon":"@drawable/appicon","label":"Testapp","name":"TestappApplication","debuggable":false,"activity":{".TestappActivity":{"name":".TestappActivity","label":"Testapp","theme":"@style/Theme.Titanium","configChanges":["keyboardHidden","orientation"],"intent-filter":[{"action":["android.intent.action.MAIN"],"category":["android.intent.category.LAUNCHER"]}]},"org.appcelerator.titanium.TiActivity":{"name":"org.appcelerator.titanium.TiActivity","configChanges":["keyboardHidden","orientation"]},"org.appcelerator.titanium.TiTranslucentActivity":{"name":"org.appcelerator.titanium.TiTranslucentActivity","configChanges":["keyboardHidden","orientation"],"theme":"@android:style/Theme.Translucent"},"ti.modules.titanium.ui.android.TiPreferencesActivity":{"name":"ti.modules.titanium.ui.android.TiPreferencesActivity"}},"service":{"org.appcelerator.titanium.analytics.TiAnalyticsService":{"name":"org.appcelerator.titanium.analytics.TiAnalyticsService","exported":false}}}}');
		});

		it('toString("pretty-json")', () => {
			expect(am.toString('pretty-json')).equal([
				'{',
				'	"__attr__": {',
				'		"xmlns:android": "http://schemas.android.com/apk/res/android",',
				'		"package": "com.appcelerator.testapp",',
				'		"android:versionCode": 1,',
				'		"android:versionName": "1.0"',
				'	},',
				'	"uses-sdk": {',
				'		"minSdkVersion": 10,',
				'		"targetSdkVersion": 14,',
				'		"maxSdkVersion": 18',
				'	},',
				'	"application": {',
				'		"icon": "@drawable/appicon",',
				'		"label": "Testapp",',
				'		"name": "TestappApplication",',
				'		"debuggable": false,',
				'		"activity": {',
				'			".TestappActivity": {',
				'				"name": ".TestappActivity",',
				'				"label": "Testapp",',
				'				"theme": "@style/Theme.Titanium",',
				'				"configChanges": [',
				'					"keyboardHidden",',
				'					"orientation"',
				'				],',
				'				"intent-filter": [',
				'					{',
				'						"action": [',
				'							"android.intent.action.MAIN"',
				'						],',
				'						"category": [',
				'							"android.intent.category.LAUNCHER"',
				'						]',
				'					}',
				'				]',
				'			},',
				'			"org.appcelerator.titanium.TiActivity": {',
				'				"name": "org.appcelerator.titanium.TiActivity",',
				'				"configChanges": [',
				'					"keyboardHidden",',
				'					"orientation"',
				'				]',
				'			},',
				'			"org.appcelerator.titanium.TiTranslucentActivity": {',
				'				"name": "org.appcelerator.titanium.TiTranslucentActivity",',
				'				"configChanges": [',
				'					"keyboardHidden",',
				'					"orientation"',
				'				],',
				'				"theme": "@android:style/Theme.Translucent"',
				'			},',
				'			"ti.modules.titanium.ui.android.TiPreferencesActivity": {',
				'				"name": "ti.modules.titanium.ui.android.TiPreferencesActivity"',
				'			}',
				'		},',
				'		"service": {',
				'			"org.appcelerator.titanium.analytics.TiAnalyticsService": {',
				'				"name": "org.appcelerator.titanium.analytics.TiAnalyticsService",',
				'				"exported": false',
				'			}',
				'		}',
				'	}',
				'}'
			].join('\n'));
		});

		it('toString("xml")', () => {
			expect(am.toString('xml')).equal([
				'<?xml version="1.0" encoding="UTF-8"?>',
				'<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="com.appcelerator.testapp" android:versionCode="1" android:versionName="1.0">',
				'	<uses-sdk android:minSdkVersion="10" android:targetSdkVersion="14" android:maxSdkVersion="18"/>',
				'	<application android:icon="@drawable/appicon" android:label="Testapp" android:name="TestappApplication" android:debuggable="false">',
				'		<activity android:name=".TestappActivity" android:label="Testapp" android:theme="@style/Theme.Titanium" android:configChanges="keyboardHidden|orientation">',
				'			<intent-filter>',
				'				<action android:name="android.intent.action.MAIN"/>',
				'				<category android:name="android.intent.category.LAUNCHER"/>',
				'			</intent-filter>',
				'		</activity>',
				'		<activity android:name="org.appcelerator.titanium.TiActivity" android:configChanges="keyboardHidden|orientation"/>',
				'		<activity android:name="org.appcelerator.titanium.TiTranslucentActivity" android:configChanges="keyboardHidden|orientation" android:theme="@android:style/Theme.Translucent"/>',
				'		<activity android:name="ti.modules.titanium.ui.android.TiPreferencesActivity"/>',
				'		<service android:name="org.appcelerator.titanium.analytics.TiAnalyticsService" android:exported="false"/>',
				'	</application>',
				'</manifest>'
			].join('\r\n'));
		});
	});

	describe('AndroidManifest.xml Sample 2', () => {
		const am = new AndroidManifest(path.resolve('./test/mocks/mockManifestFiles/AndroidManifest-sample2.xml'));

		it('should match object', () => {
			expect(am).to.be.an.Object;
		});

		it('toString()', () => {
			expect(am.toString()).equal('[object Object]');
		});

		it('toString("json")', () => {
			expect(am.toString('json')).equal('{"__attr__":{"android:versionCode":1,"android:versionName":"1","package":"com.appcelerator.testapp2","xmlns:android":"http://schemas.android.com/apk/res/android"},"uses-sdk":{"minSdkVersion":10,"targetSdkVersion":17},"permission":{"com.appcelerator.testapp2.permission.C2D_MESSAGE":{"name":"com.appcelerator.testapp2.permission.C2D_MESSAGE","protectionLevel":"signature"}},"application":{"debuggable":false,"icon":"@drawable/appicon","label":"testapp2","name":"Testapp2Application","activity":{".TestappActivity":{"alwaysRetainTaskState":true,"configChanges":["keyboardHidden","orientation"],"label":"testapp","name":".TestappActivity","theme":"@style/Theme.Titanium","intent-filter":[{"action":["android.intent.action.MAIN"],"category":["android.intent.category.LAUNCHER"]}]},".Testapp2Activity":{"configChanges":["keyboardHidden","orientation"],"label":"testapp2","name":".Testapp2Activity","theme":"@style/Theme.Titanium","intent-filter":[{"action":["android.intent.action.MAIN"],"category":["android.intent.category.LAUNCHER"]}]},"com.appcelerator.testapp2.TestactivityActivity":{"configChanges":["keyboardHidden","orientation"],"name":"com.appcelerator.testapp2.TestactivityActivity"},"org.appcelerator.titanium.TiActivity":{"configChanges":["keyboardHidden","orientation"],"name":"org.appcelerator.titanium.TiActivity"},"org.appcelerator.titanium.TiTranslucentActivity":{"configChanges":["keyboardHidden","orientation"],"name":"org.appcelerator.titanium.TiTranslucentActivity","theme":"@android:style/Theme.Translucent"},"ti.modules.titanium.ui.android.TiPreferencesActivity":{"name":"ti.modules.titanium.ui.android.TiPreferencesActivity"}},"service":{"com.appcelerator.cloud.push.PushService":{"name":"com.appcelerator.cloud.push.PushService"},"org.appcelerator.titanium.analytics.TiAnalyticsService":{"exported":false,"name":"org.appcelerator.titanium.analytics.TiAnalyticsService"},"com.appcelerator.testapp2.TestserviceService":{"name":"com.appcelerator.testapp2.TestserviceService"}},"receiver":{"ti.cloudpush.IntentReceiver":{"name":"ti.cloudpush.IntentReceiver"},"ti.cloudpush.MQTTReceiver":{"name":"ti.cloudpush.MQTTReceiver","intent-filter":[{"action":["android.intent.action.BOOT_COMPLETED","android.intent.action.USER_PRESENT","com.appcelerator.cloud.push.PushService.MSG_ARRIVAL"],"category":["android.intent.category.HOME"]}],"meta-data":{"com.appcelerator.cloud.push.BroadcastReceiver.ArrivalActivity":{"name":"com.appcelerator.cloud.push.BroadcastReceiver.ArrivalActivity","value":"ti.cloudpush.MQTTReceiver"}}},"ti.cloudpush.GCMReceiver":{"name":"ti.cloudpush.GCMReceiver","permission":"com.google.android.c2dm.permission.SEND","intent-filter":[{"action":["com.google.android.c2dm.intent.RECEIVE"],"category":["com.appcelerator.testapp2"]}]},"com.appcelerator.cloud.push.PushBroadcastReceiver":{"name":"com.appcelerator.cloud.push.PushBroadcastReceiver","permission":"com.google.android.c2dm.permission.SEND","intent-filter":[{"action":["com.google.android.c2dm.intent.REGISTRATION"],"category":["com.appcelerator.testapp2"]}]}}},"uses-permission":["android.permission.VIBRATE","android.permission.ACCESS_NETWORK_STATE","android.permission.WRITE_EXTERNAL_STORAGE","com.google.android.c2dm.permission.RECEIVE","android.permission.WAKE_LOCK","android.permission.ACCESS_WIFI_STATE","android.permission.RECEIVE_BOOT_COMPLETED","com.appcelerator.testapp2.permission.C2D_MESSAGE","android.permission.READ_PHONE_STATE","android.permission.INTERNET","android.permission.GET_ACCOUNTS"]}');
		});

		it('toString("pretty-json")', () => {
			expect(am.toString('pretty-json')).equal([
				'{',
				'	"__attr__": {',
				'		"android:versionCode": 1,',
				'		"android:versionName": "1",',
				'		"package": "com.appcelerator.testapp2",',
				'		"xmlns:android": "http://schemas.android.com/apk/res/android"',
				'	},',
				'	"uses-sdk": {',
				'		"minSdkVersion": 10,',
				'		"targetSdkVersion": 17',
				'	},',
				'	"permission": {',
				'		"com.appcelerator.testapp2.permission.C2D_MESSAGE": {',
				'			"name": "com.appcelerator.testapp2.permission.C2D_MESSAGE",',
				'			"protectionLevel": "signature"',
				'		}',
				'	},',
				'	"application": {',
				'		"debuggable": false,',
				'		"icon": "@drawable/appicon",',
				'		"label": "testapp2",',
				'		"name": "Testapp2Application",',
				'		"activity": {',
				'			".TestappActivity": {',
				'				"alwaysRetainTaskState": true,',
				'				"configChanges": [',
				'					"keyboardHidden",',
				'					"orientation"',
				'				],',
				'				"label": "testapp",',
				'				"name": ".TestappActivity",',
				'				"theme": "@style/Theme.Titanium",',
				'				"intent-filter": [',
				'					{',
				'						"action": [',
				'							"android.intent.action.MAIN"',
				'						],',
				'						"category": [',
				'							"android.intent.category.LAUNCHER"',
				'						]',
				'					}',
				'				]',
				'			},',
				'			".Testapp2Activity": {',
				'				"configChanges": [',
				'					"keyboardHidden",',
				'					"orientation"',
				'				],',
				'				"label": "testapp2",',
				'				"name": ".Testapp2Activity",',
				'				"theme": "@style/Theme.Titanium",',
				'				"intent-filter": [',
				'					{',
				'						"action": [',
				'							"android.intent.action.MAIN"',
				'						],',
				'						"category": [',
				'							"android.intent.category.LAUNCHER"',
				'						]',
				'					}',
				'				]',
				'			},',
				'			"com.appcelerator.testapp2.TestactivityActivity": {',
				'				"configChanges": [',
				'					"keyboardHidden",',
				'					"orientation"',
				'				],',
				'				"name": "com.appcelerator.testapp2.TestactivityActivity"',
				'			},',
				'			"org.appcelerator.titanium.TiActivity": {',
				'				"configChanges": [',
				'					"keyboardHidden",',
				'					"orientation"',
				'				],',
				'				"name": "org.appcelerator.titanium.TiActivity"',
				'			},',
				'			"org.appcelerator.titanium.TiTranslucentActivity": {',
				'				"configChanges": [',
				'					"keyboardHidden",',
				'					"orientation"',
				'				],',
				'				"name": "org.appcelerator.titanium.TiTranslucentActivity",',
				'				"theme": "@android:style/Theme.Translucent"',
				'			},',
				'			"ti.modules.titanium.ui.android.TiPreferencesActivity": {',
				'				"name": "ti.modules.titanium.ui.android.TiPreferencesActivity"',
				'			}',
				'		},',
				'		"service": {',
				'			"com.appcelerator.cloud.push.PushService": {',
				'				"name": "com.appcelerator.cloud.push.PushService"',
				'			},',
				'			"org.appcelerator.titanium.analytics.TiAnalyticsService": {',
				'				"exported": false,',
				'				"name": "org.appcelerator.titanium.analytics.TiAnalyticsService"',
				'			},',
				'			"com.appcelerator.testapp2.TestserviceService": {',
				'				"name": "com.appcelerator.testapp2.TestserviceService"',
				'			}',
				'		},',
				'		"receiver": {',
				'			"ti.cloudpush.IntentReceiver": {',
				'				"name": "ti.cloudpush.IntentReceiver"',
				'			},',
				'			"ti.cloudpush.MQTTReceiver": {',
				'				"name": "ti.cloudpush.MQTTReceiver",',
				'				"intent-filter": [',
				'					{',
				'						"action": [',
				'							"android.intent.action.BOOT_COMPLETED",',
				'							"android.intent.action.USER_PRESENT",',
				'							"com.appcelerator.cloud.push.PushService.MSG_ARRIVAL"',
				'						],',
				'						"category": [',
				'							"android.intent.category.HOME"',
				'						]',
				'					}',
				'				],',
				'				"meta-data": {',
				'					"com.appcelerator.cloud.push.BroadcastReceiver.ArrivalActivity": {',
				'						"name": "com.appcelerator.cloud.push.BroadcastReceiver.ArrivalActivity",',
				'						"value": "ti.cloudpush.MQTTReceiver"',
				'					}',
				'				}',
				'			},',
				'			"ti.cloudpush.GCMReceiver": {',
				'				"name": "ti.cloudpush.GCMReceiver",',
				'				"permission": "com.google.android.c2dm.permission.SEND",',
				'				"intent-filter": [',
				'					{',
				'						"action": [',
				'							"com.google.android.c2dm.intent.RECEIVE"',
				'						],',
				'						"category": [',
				'							"com.appcelerator.testapp2"',
				'						]',
				'					}',
				'				]',
				'			},',
				'			"com.appcelerator.cloud.push.PushBroadcastReceiver": {',
				'				"name": "com.appcelerator.cloud.push.PushBroadcastReceiver",',
				'				"permission": "com.google.android.c2dm.permission.SEND",',
				'				"intent-filter": [',
				'					{',
				'						"action": [',
				'							"com.google.android.c2dm.intent.REGISTRATION"',
				'						],',
				'						"category": [',
				'							"com.appcelerator.testapp2"',
				'						]',
				'					}',
				'				]',
				'			}',
				'		}',
				'	},',
				'	"uses-permission": [',
				'		"android.permission.VIBRATE",',
				'		"android.permission.ACCESS_NETWORK_STATE",',
				'		"android.permission.WRITE_EXTERNAL_STORAGE",',
				'		"com.google.android.c2dm.permission.RECEIVE",',
				'		"android.permission.WAKE_LOCK",',
				'		"android.permission.ACCESS_WIFI_STATE",',
				'		"android.permission.RECEIVE_BOOT_COMPLETED",',
				'		"com.appcelerator.testapp2.permission.C2D_MESSAGE",',
				'		"android.permission.READ_PHONE_STATE",',
				'		"android.permission.INTERNET",',
				'		"android.permission.GET_ACCOUNTS"',
				'	]',
				'}'
			].join('\n'));
		});

		it('toString("xml")', () => {
			expect(am.toString('xml')).equal([
				'<?xml version="1.0" encoding="UTF-8"?>',
				'<manifest android:versionCode="1" android:versionName="1" package="com.appcelerator.testapp2" xmlns:android="http://schemas.android.com/apk/res/android">',
				'	<uses-sdk android:minSdkVersion="10" android:targetSdkVersion="17"/>',
				'	<permission android:name="com.appcelerator.testapp2.permission.C2D_MESSAGE" android:protectionLevel="signature"/>',
				'	<application android:debuggable="false" android:icon="@drawable/appicon" android:label="testapp2" android:name="Testapp2Application">',
				'		<activity android:alwaysRetainTaskState="true" android:configChanges="keyboardHidden|orientation" android:label="testapp" android:name=".TestappActivity" android:theme="@style/Theme.Titanium">',
				'			<intent-filter>',
				'				<action android:name="android.intent.action.MAIN"/>',
				'				<category android:name="android.intent.category.LAUNCHER"/>',
				'			</intent-filter>',
				'		</activity>',
				'		<activity android:configChanges="keyboardHidden|orientation" android:label="testapp2" android:name=".Testapp2Activity" android:theme="@style/Theme.Titanium">',
				'			<intent-filter>',
				'				<action android:name="android.intent.action.MAIN"/>',
				'				<category android:name="android.intent.category.LAUNCHER"/>',
				'			</intent-filter>',
				'		</activity>',
				'		<activity android:configChanges="keyboardHidden|orientation" android:name="com.appcelerator.testapp2.TestactivityActivity"/>',
				'		<activity android:configChanges="keyboardHidden|orientation" android:name="org.appcelerator.titanium.TiActivity"/>',
				'		<activity android:configChanges="keyboardHidden|orientation" android:name="org.appcelerator.titanium.TiTranslucentActivity" android:theme="@android:style/Theme.Translucent"/>',
				'		<activity android:name="ti.modules.titanium.ui.android.TiPreferencesActivity"/>',
				'		<service android:name="com.appcelerator.cloud.push.PushService"/>',
				'		<service android:exported="false" android:name="org.appcelerator.titanium.analytics.TiAnalyticsService"/>',
				'		<service android:name="com.appcelerator.testapp2.TestserviceService"/>',
				'		<receiver android:name="ti.cloudpush.IntentReceiver"/>',
				'		<receiver android:name="ti.cloudpush.MQTTReceiver">',
				'			<intent-filter>',
				'				<action android:name="android.intent.action.BOOT_COMPLETED"/>',
				'				<action android:name="android.intent.action.USER_PRESENT"/>',
				'				<action android:name="com.appcelerator.cloud.push.PushService.MSG_ARRIVAL"/>',
				'				<category android:name="android.intent.category.HOME"/>',
				'			</intent-filter>',
				'			<meta-data android:name="com.appcelerator.cloud.push.BroadcastReceiver.ArrivalActivity" android:value="ti.cloudpush.MQTTReceiver"/>',
				'		</receiver>',
				'		<receiver android:name="ti.cloudpush.GCMReceiver" android:permission="com.google.android.c2dm.permission.SEND">',
				'			<intent-filter>',
				'				<action android:name="com.google.android.c2dm.intent.RECEIVE"/>',
				'				<category android:name="com.appcelerator.testapp2"/>',
				'			</intent-filter>',
				'		</receiver>',
				'		<receiver android:name="com.appcelerator.cloud.push.PushBroadcastReceiver" android:permission="com.google.android.c2dm.permission.SEND">',
				'			<intent-filter>',
				'				<action android:name="com.google.android.c2dm.intent.REGISTRATION"/>',
				'				<category android:name="com.appcelerator.testapp2"/>',
				'			</intent-filter>',
				'		</receiver>',
				'	</application>',
				'	<uses-permission android:name="android.permission.VIBRATE"/>',
				'	<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>',
				'	<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>',
				'	<uses-permission android:name="com.google.android.c2dm.permission.RECEIVE"/>',
				'	<uses-permission android:name="android.permission.WAKE_LOCK"/>',
				'	<uses-permission android:name="android.permission.ACCESS_WIFI_STATE"/>',
				'	<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>',
				'	<uses-permission android:name="com.appcelerator.testapp2.permission.C2D_MESSAGE"/>',
				'	<uses-permission android:name="android.permission.READ_PHONE_STATE"/>',
				'	<uses-permission android:name="android.permission.INTERNET"/>',
				'	<uses-permission android:name="android.permission.GET_ACCOUNTS"/>',
				'</manifest>'
			].join('\r\n'));
		});
	});

	describe('AndroidManifest.xml Sample 3', () => {
		const am = new AndroidManifest(path.resolve('./test/mocks/mockManifestFiles/AndroidManifest-sample3.xml'));

		it('should match object', () => {
			expect(am).to.be.an.Object;
		});

		it('toString()', () => {
			expect(am.toString()).equal('[object Object]');
		});

		it('toString("json")', () => {
			expect(am.toString('json')).equal('{"uses-sdk":{"minSdkVersion":10,"targetSdkVersion":17},"supports-screens":{"anyDensity":false,"xlargeScreens":true},"application":{"activity":{".TestappActivity":{"alwaysRetainTaskState":true,"configChanges":["keyboardHidden","orientation"],"label":"testapp","name":".TestappActivity","theme":"@style/Theme.Titanium","intent-filter":[{"action":["android.intent.action.MAIN"],"category":["android.intent.category.LAUNCHER"]}]},"ti.modules.titanium.facebook.FBActivity":{"screenOrientation":"landscape","name":"ti.modules.titanium.facebook.FBActivity","theme":"@android:style/Theme.Translucent.NoTitleBar"},"org.appcelerator.titanium.TiActivity":{"screenOrientation":"landscape","name":"org.appcelerator.titanium.TiActivity","configChanges":["keyboardHidden","orientation"]},"org.appcelerator.titanium.TiModalActivity":{"screenOrientation":"landscape","name":"org.appcelerator.titanium.TiModalActivity","configChanges":["keyboardHidden","orientation"],"theme":"@android:style/Theme.Translucent.NoTitleBar.Fullscreen"},"ti.modules.titanium.ui.TiTabActivity":{"screenOrientation":"landscape","name":"ti.modules.titanium.ui.TiTabActivity","configChanges":["keyboardHidden","orientation"]},"ti.modules.titanium.media.TiVideoActivity":{"screenOrientation":"landscape","name":"ti.modules.titanium.media.TiVideoActivity","configChanges":["keyboardHidden","orientation"],"theme":"@android:style/Theme.NoTitleBar.Fullscreen"},"ti.modules.titanium.ui.android.TiPreferencesActivity":{"name":"ti.modules.titanium.ui.android.TiPreferencesActivity"}}}}');
		});

		it('toString("pretty-json")', () => {
			expect(am.toString('pretty-json')).equal([
				'{',
				'	"uses-sdk": {',
				'		"minSdkVersion": 10,',
				'		"targetSdkVersion": 17',
				'	},',
				'	"supports-screens": {',
				'		"anyDensity": false,',
				'		"xlargeScreens": true',
				'	},',
				'	"application": {',
				'		"activity": {',
				'			".TestappActivity": {',
				'				"alwaysRetainTaskState": true,',
				'				"configChanges": [',
				'					"keyboardHidden",',
				'					"orientation"',
				'				],',
				'				"label": "testapp",',
				'				"name": ".TestappActivity",',
				'				"theme": "@style/Theme.Titanium",',
				'				"intent-filter": [',
				'					{',
				'						"action": [',
				'							"android.intent.action.MAIN"',
				'						],',
				'						"category": [',
				'							"android.intent.category.LAUNCHER"',
				'						]',
				'					}',
				'				]',
				'			},',
				'			"ti.modules.titanium.facebook.FBActivity": {',
				'				"screenOrientation": "landscape",',
				'				"name": "ti.modules.titanium.facebook.FBActivity",',
				'				"theme": "@android:style/Theme.Translucent.NoTitleBar"',
				'			},',
				'			"org.appcelerator.titanium.TiActivity": {',
				'				"screenOrientation": "landscape",',
				'				"name": "org.appcelerator.titanium.TiActivity",',
				'				"configChanges": [',
				'					"keyboardHidden",',
				'					"orientation"',
				'				]',
				'			},',
				'			"org.appcelerator.titanium.TiModalActivity": {',
				'				"screenOrientation": "landscape",',
				'				"name": "org.appcelerator.titanium.TiModalActivity",',
				'				"configChanges": [',
				'					"keyboardHidden",',
				'					"orientation"',
				'				],',
				'				"theme": "@android:style/Theme.Translucent.NoTitleBar.Fullscreen"',
				'			},',
				'			"ti.modules.titanium.ui.TiTabActivity": {',
				'				"screenOrientation": "landscape",',
				'				"name": "ti.modules.titanium.ui.TiTabActivity",',
				'				"configChanges": [',
				'					"keyboardHidden",',
				'					"orientation"',
				'				]',
				'			},',
				'			"ti.modules.titanium.media.TiVideoActivity": {',
				'				"screenOrientation": "landscape",',
				'				"name": "ti.modules.titanium.media.TiVideoActivity",',
				'				"configChanges": [',
				'					"keyboardHidden",',
				'					"orientation"',
				'				],',
				'				"theme": "@android:style/Theme.NoTitleBar.Fullscreen"',
				'			},',
				'			"ti.modules.titanium.ui.android.TiPreferencesActivity": {',
				'				"name": "ti.modules.titanium.ui.android.TiPreferencesActivity"',
				'			}',
				'		}',
				'	}',
				'}'
			].join('\n'));
		});

		it('toString("xml")', () => {
			expect(am.toString('xml')).equal([
				'<?xml version="1.0" encoding="UTF-8"?>',
				'<manifest>',
				'	<uses-sdk android:minSdkVersion="10" android:targetSdkVersion="17"/>',
				'	<supports-screens android:anyDensity="false" android:xlargeScreens="true"/>',
				'	<application>',
				'		<activity android:alwaysRetainTaskState="true" android:configChanges="keyboardHidden|orientation" android:label="testapp" android:name=".TestappActivity" android:theme="@style/Theme.Titanium">',
				'			<intent-filter>',
				'				<action android:name="android.intent.action.MAIN"/>',
				'				<category android:name="android.intent.category.LAUNCHER"/>',
				'			</intent-filter>',
				'		</activity>',
				'		<activity android:screenOrientation="landscape" android:name="ti.modules.titanium.facebook.FBActivity" android:theme="@android:style/Theme.Translucent.NoTitleBar"/>',
				'		<activity android:screenOrientation="landscape" android:name="org.appcelerator.titanium.TiActivity" android:configChanges="keyboardHidden|orientation"/>',
				'		<activity android:screenOrientation="landscape" android:name="org.appcelerator.titanium.TiModalActivity" android:configChanges="keyboardHidden|orientation" android:theme="@android:style/Theme.Translucent.NoTitleBar.Fullscreen"/>',
				'		<activity android:screenOrientation="landscape" android:name="ti.modules.titanium.ui.TiTabActivity" android:configChanges="keyboardHidden|orientation"/>',
				'		<activity android:screenOrientation="landscape" android:name="ti.modules.titanium.media.TiVideoActivity" android:configChanges="keyboardHidden|orientation" android:theme="@android:style/Theme.NoTitleBar.Fullscreen"/>',
				'		<activity android:name="ti.modules.titanium.ui.android.TiPreferencesActivity"/>',
				'	</application>',
				'</manifest>'
			].join('\r\n'));
		});
	});

	describe('Merge multiple <application> tags', () => {
		var am = new AndroidManifest(path.resolve('./test/mocks/mockManifestFiles/AndroidManifest_application.xml'));
		var am2 = new AndroidManifest(path.resolve('./test/mocks/mockManifestFiles/AndroidManifest_application2.xml'));

		am.merge(am2);

		it('should match object', function () {
			expect(am).to.be.an.Object;
		});

		it('toString()', () => {
			expect(am.toString()).equal('[object Object]');
		});

		it('toString("json")', () => {
			expect(am.toString('json')).equal('{"application":{"allowTaskReparenting":false,"allowBackup":true,"backupAgent":".MyBackupAgent","debuggable":true,"description":"this is a test","enabled":true,"hasCode":true,"hardwareAccelerated":true,"icon":"@drawable/icon","killAfterRestore":true,"largeHeap":false,"label":"test","logo":"@drawable/logo","manageSpaceActivity":".TestActivity","name":"test","permission":"testPermission","persistent":true,"process":"test","restoreAnyVersion":false,"requiredAccountType":"com.google","restrictedAccountType":"com.google","supportsRtl":false,"taskAffinity":"test","testOnly":false,"theme":"testTheme","uiOptions":"none","vmSafeMode":false}}');
		});

		it('toString("pretty-json")', () => {
			expect(am.toString('pretty-json')).equal([
				'{',
				'	"application": {',
				'		"allowTaskReparenting": false,',
				'		"allowBackup": true,',
				'		"backupAgent": ".MyBackupAgent",',
				'		"debuggable": true,',
				'		"description": "this is a test",',
				'		"enabled": true,',
				'		"hasCode": true,',
				'		"hardwareAccelerated": true,',
				'		"icon": "@drawable/icon",',
				'		"killAfterRestore": true,',
				'		"largeHeap": false,',
				'		"label": "test",',
				'		"logo": "@drawable/logo",',
				'		"manageSpaceActivity": ".TestActivity",',
				'		"name": "test",',
				'		"permission": "testPermission",',
				'		"persistent": true,',
				'		"process": "test",',
				'		"restoreAnyVersion": false,',
				'		"requiredAccountType": "com.google",',
				'		"restrictedAccountType": "com.google",',
				'		"supportsRtl": false,',
				'		"taskAffinity": "test",',
				'		"testOnly": false,',
				'		"theme": "testTheme",',
				'		"uiOptions": "none",',
				'		"vmSafeMode": false',
				'	}',
				'}'
			].join('\n'));
		});

		it('toString("xml")', () => {
			expect(am.toString('xml')).equal([
				'<?xml version="1.0" encoding="UTF-8"?>',
				'<manifest>',
				'	<application android:allowTaskReparenting="false" android:allowBackup="true" android:backupAgent=".MyBackupAgent" android:debuggable="true" android:description="this is a test" android:enabled="true" android:hasCode="true" android:hardwareAccelerated="true" android:icon="@drawable/icon" android:killAfterRestore="true" android:largeHeap="false" android:label="test" android:logo="@drawable/logo" android:manageSpaceActivity=".TestActivity" android:name="test" android:permission="testPermission" android:persistent="true" android:process="test" android:restoreAnyVersion="false" android:requiredAccountType="com.google" android:restrictedAccountType="com.google" android:supportsRtl="false" android:taskAffinity="test" android:testOnly="false" android:theme="testTheme" android:uiOptions="none" android:vmSafeMode="false"/>',
				'</manifest>'
			].join('\r\n'));
		});
	});

	describe('Merge AndroidManifest.xml Sample 2, 3, and 4', () => {
		const am2 = new AndroidManifest(path.resolve('./test/mocks/mockManifestFiles/AndroidManifest-sample2.xml'));
		const am3 = new AndroidManifest(path.resolve('./test/mocks/mockManifestFiles/AndroidManifest-sample3.xml'));
		const am4 = new AndroidManifest(path.resolve('./test/mocks/mockManifestFiles/AndroidManifest-sample4.xml'));

		am2.merge(am3).merge(am4);

		it('should match object', () => {
			expect(am2).to.be.an.Object;
			// expect(am2).to.have.keys([
			// 	'__attr__',
			// 	'uses-sdk',
			// 	'permission',
			// 	'application',
			// 	'uses-permission',
			// 	'supports-screens'
			// ]);
			// expect(am2['__attr__']).to.have.keys([
			// 	'android:versionCode',
			// 	'android:versionName',
			// 	'package',
			// 	'xmlns:android'
			// ]);
			// expect(am2['__attr__']).to.have.property('android:versionCode').and.equal(1);
			// expect(am2['__attr__']).to.have.property('android:versionName').and.equal('1');
			expect(am2).to.deep.equal({
				'__attr__': {
					'android:versionCode': 1,
					'android:versionName': '1',
					package: 'com.appcelerator.testapp2',
					'xmlns:android': 'http://schemas.android.com/apk/res/android'
				},
				'uses-sdk': { minSdkVersion: 10, targetSdkVersion: 17 },
				permission: {
					'com.appcelerator.testapp2.permission.C2D_MESSAGE': {
						name: 'com.appcelerator.testapp2.permission.C2D_MESSAGE',
						protectionLevel: 'signature'
					},
					'${tiapp.properties[\'id\']}.permission.C2D_MESSAGE': {
						name: '${tiapp.properties[\'id\']}.permission.C2D_MESSAGE',
						protectionLevel: 'signature'
					}
				},
				application: {
					debuggable: false,
					icon: '@drawable/appicon',
					label: 'testapp2',
					name: 'Testapp2Application',
					activity: {
						'.TestappActivity': {
							alwaysRetainTaskState: true,
							configChanges: [ 'keyboardHidden', 'orientation' ],
							label: 'testapp',
							name: '.TestappActivity',
							theme: '@style/Theme.Titanium',
							'intent-filter': [
								{
									action: [ 'android.intent.action.MAIN' ],
									category: [ 'android.intent.category.LAUNCHER' ]
								}
							]
						},
						'.Testapp2Activity': {
							configChanges: [ 'keyboardHidden', 'orientation' ],
							label: 'testapp2',
							name: '.Testapp2Activity',
							theme: '@style/Theme.Titanium',
							'intent-filter': [
								{
									action: [ 'android.intent.action.MAIN' ],
									category: [ 'android.intent.category.LAUNCHER' ]
								}
							]
						},
						'com.appcelerator.testapp2.TestactivityActivity': {
							configChanges: [ 'keyboardHidden', 'orientation' ],
							name: 'com.appcelerator.testapp2.TestactivityActivity'
						},
						'org.appcelerator.titanium.TiActivity': {
							screenOrientation: 'landscape',
							name: 'org.appcelerator.titanium.TiActivity',
							configChanges: [ 'keyboardHidden', 'orientation' ]
						},
						'org.appcelerator.titanium.TiTranslucentActivity': {
							configChanges: [ 'keyboardHidden', 'orientation' ],
							name: 'org.appcelerator.titanium.TiTranslucentActivity',
							theme: '@android:style/Theme.Translucent'
						},
						'ti.modules.titanium.ui.android.TiPreferencesActivity': {
							name: 'ti.modules.titanium.ui.android.TiPreferencesActivity'
						},
						'ti.modules.titanium.facebook.FBActivity': {
							screenOrientation: 'landscape',
							name: 'ti.modules.titanium.facebook.FBActivity',
							theme: '@android:style/Theme.Translucent.NoTitleBar'
						},
						'org.appcelerator.titanium.TiModalActivity': {
							screenOrientation: 'landscape',
							name: 'org.appcelerator.titanium.TiModalActivity',
							configChanges: [ 'keyboardHidden', 'orientation' ],
							theme: '@android:style/Theme.Translucent.NoTitleBar.Fullscreen'
						},
						'ti.modules.titanium.ui.TiTabActivity': {
							screenOrientation: 'landscape',
							name: 'ti.modules.titanium.ui.TiTabActivity',
							configChanges: [ 'keyboardHidden', 'orientation' ]
						},
						'ti.modules.titanium.media.TiVideoActivity': {
							screenOrientation: 'landscape',
							name: 'ti.modules.titanium.media.TiVideoActivity',
							configChanges: [ 'keyboardHidden', 'orientation' ],
							theme: '@android:style/Theme.NoTitleBar.Fullscreen'
						}
					},
					service: {
						'com.appcelerator.cloud.push.PushService': {
							name: 'com.appcelerator.cloud.push.PushService'
						},
						'org.appcelerator.titanium.analytics.TiAnalyticsService': {
							exported: false,
							name: 'org.appcelerator.titanium.analytics.TiAnalyticsService'
						},
						'com.appcelerator.testapp2.TestserviceService': {
							name: 'com.appcelerator.testapp2.TestserviceService'
						}
					},
					receiver: {
						'ti.cloudpush.IntentReceiver': {
							name: 'ti.cloudpush.IntentReceiver'
						},
						'ti.cloudpush.MQTTReceiver': {
							name: 'ti.cloudpush.MQTTReceiver',
							'intent-filter': [
								{
									action: [
										'android.intent.action.BOOT_COMPLETED',
										'android.intent.action.USER_PRESENT',
										'com.appcelerator.cloud.push.PushService.MSG_ARRIVAL'
									],
									category: [ 'android.intent.category.HOME' ]
								}
							],
							'meta-data': {
								'com.appcelerator.cloud.push.BroadcastReceiver.ArrivalActivity': {
									name: 'com.appcelerator.cloud.push.BroadcastReceiver.ArrivalActivity',
									value: 'ti.cloudpush.MQTTReceiver'
								}
							}
						},
						'ti.cloudpush.GCMReceiver': {
							name: 'ti.cloudpush.GCMReceiver',
							permission: 'com.google.android.c2dm.permission.SEND',
							'intent-filter': [
								{
									action: [ 'com.google.android.c2dm.intent.RECEIVE' ],
									category: [ '${tiapp.properties[\'id\']}' ]
								}
							]
						},
						'com.appcelerator.cloud.push.PushBroadcastReceiver': {
							name: 'com.appcelerator.cloud.push.PushBroadcastReceiver',
							permission: 'com.google.android.c2dm.permission.SEND',
							'intent-filter': [
								{
									action: [ 'com.google.android.c2dm.intent.REGISTRATION' ],
									category: [ '${tiapp.properties[\'id\']}' ]
								}
							]
						}
					}
				},
				'uses-permission': [
					'android.permission.VIBRATE',
					'android.permission.ACCESS_NETWORK_STATE',
					'android.permission.WRITE_EXTERNAL_STORAGE',
					'com.google.android.c2dm.permission.RECEIVE',
					'android.permission.WAKE_LOCK',
					'android.permission.ACCESS_WIFI_STATE',
					'android.permission.RECEIVE_BOOT_COMPLETED',
					'com.appcelerator.testapp2.permission.C2D_MESSAGE',
					'android.permission.READ_PHONE_STATE',
					'android.permission.INTERNET',
					'android.permission.GET_ACCOUNTS',
					'${tiapp.properties[\'id\']}.permission.C2D_MESSAGE'
				],
				'supports-screens': { anyDensity: false, xlargeScreens: true }
			});
		});
	});

});
