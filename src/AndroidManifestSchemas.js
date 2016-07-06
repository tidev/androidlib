function castInt(hex) {
	return {
		transform: v => {
			if (v !== void 0) {
				if (typeof v === 'number' && hex && v > 255) {
					v = v.toString(16);
					return '0x' + (v.length < 8 ? '00000000'.substring(v.length) : '') + v;
				}
				return String(v);
			}
		},
		untransform: v => v === void 0 ? v : ~~v
	};
}

function castBool() {
	return {
		transform: v => v === void 0 ? v : String(v),
		untransform: v => v === void 0 ? v : (v && v !== 'false')
	};
}

export const action = {
	tag: 'action',
	array: true,
	attributes: {
		'android:name': {}
	}
};

export const category = {
	tag: 'category',
	array: true,
	attributes: {
		'android:name': {}
	}
};

export const data = {
	tag: 'data',
	array: true,
	attributes: {
		'android:scheme': {},
		'android:host': {},
		'android:port': {},
		'android:path': {},
		'android:pathPattern': {},
		'android:pathPrefix': {},
		'android:mimeType': {}
	}
};

export const intentFilter = {
	tag: 'intent-filter',
	array: true,
	attributes: {
		'android:icon': {},
		'android:label': {},
		'android:priority': castInt()
	},
	fields: {
		'action': action,
		'category': category,
		'data': data
	}
};

export const metaData = {
	tag: 'meta-data',
	array: true,
	attributes: {
		'android:name': {},
		'android:resource': {},
		'android:value': {}
	},
	fields: {
		'action': action,
		'category': category,
		'data': data
	}
};

export const activity = {
	tag: 'activity',
	array: true,
	attributes: {
		'android:allowEmbedded': castBool(),
		'android:allowTaskReparenting': castBool(),
		'android:alwaysRetainTaskState': castBool(),
		'android:autoRemoveFromRecents': castBool(),
		'android:banner': {},
		'android:clearTaskOnLaunch': castBool(),
		'android:configChanges': {},
		'android:documentLaunchMode': {},
		'android:enabled': castBool(),
		'android:excludeFromRecents': castBool(),
		'android:exported': castBool(),
		'android:finishOnTaskLaunch': castBool(),
		'android:hardwareAccelerated': castBool(),
		'android:icon': {},
		'android:label': {},
		'android:launchMode': {},
		'android:maxRecents': {},
		'android:multiprocess': castBool(),
		'android:name': {},
		'android:noHistory': castBool(),
		'android:parentActivityName': {},
		'android:permission': {},
		'android:process': {},
		'android:relinquishTaskIdentity': castBool(),
		'android:screenOrientation': {},
		'android:stateNotNeeded': castBool(),
		'android:taskAffinity': {},
		'android:theme': {},
		'android:uiOptions': {},
		'android:windowSoftInputMode': {}
	},
	fields: {
		'intent-filter': intentFilter,
		'meta-data': metaData
	}
};

export const activityAlias = {
	tag: 'activity-alias',
	array: true,
	attributes: {
		'android:enabled': castBool(),
		'android:exported': castBool(),
		'android:icon': {},
		'android:label': {},
		'android:name': {},
		'android:permission': {},
		'android:targetActivity': {}
	},
	fields: {
		'intent-filter': intentFilter,
		'meta-data': metaData
	}
};

export const service = {
	tag: 'service',
	array: true,
	attributes: {
		'android:enabled': castBool(),
		'android:exported': castBool(),
		'android:icon': {},
		'android:isolatedProcess': castBool(),
		'android:label': {},
		'android:name': {},
		'android:permission': {},
		'android:process': {}
	},
	fields: {
		'intent-filter': intentFilter,
		'meta-data': metaData
	}
};

export const receiver = {
	tag: 'receiver',
	array: true,
	attributes: {
		'android:enabled': castBool(),
		'android:exported': castBool(),
		'android:icon': {},
		'android:isolatedProcess': {},
		'android:label': {},
		'android:name': {},
		'android:permission': {},
		'android:process': {}
	},
	fields: {
		'intent-filter': intentFilter,
		'meta-data': metaData
	}
};

export const grantUriPermissions = {
	tag: 'grant-uri-permissions',
	array: true,
	attributes: {
		'android:path': {},
		'android:pathPattern': {},
		'android:pathPrefix': {}
	}
};

export const pathPermission = {
	tag: 'path-permission',
	array: true,
	attributes: {
		'android:path': {},
		'android:pathPattern': {},
		'android:pathPrefix': {},
		'android:permission': {},
		'android:readPermission': {},
		'android:writePermission': {}
	}
};

export const provider = {
	tag: 'provider',
	array: true,
	attributes: {
		'android:authorities': {},
		'android:enabled': castBool(),
		'android:exported': castBool(),
		'android:grantUriPermissions': castBool(),
		'android:icon': {},
		'android:initOrder': castInt(),
		'android:label': {},
		'android:multiprocess': castBool(),
		'android:name': {},
		'android:permission': {},
		'android:process': {},
		'android:readPermission': {},
		'android:syncable': castBool(),
		'android:writePermission': {}
	},
	fields: {
		'meta-data': metaData,
		'grant-uri-permission': grantUriPermissions,
		'path-permission': pathPermission
	}
};

export const usesLibrary = {
	tag: 'uses-library',
	array: true,
	attributes: {
		'android:name': {},
		'android:required': castBool()
	}
};

export const application = {
	tag: 'application',
	attributes: {
		'android:allowTaskReparenting': castBool(),
		'android:allowBackup': castBool(),
		'android:backupAgent': {},
		'android:banner': {},
		'android:debuggable': castBool(),
		'android:description': {},
		'android:enabled': castBool(),
		'android:hasCode': castBool(),
		'android:hardwareAccelerated': castBool(),
		'android:icon': {},
		'android:isGame': castBool(),
		'android:killAfterRestore': castBool(),
		'android:largeHeap': castBool(),
		'android:label': {},
		'android:logo': {},
		'android:manageSpaceActivity': {},
		'android:name': {},
		'android:permission': {},
		'android:persistent': castBool(),
		'android:process': {},
		'android:restoreAnyVersion': castBool(),
		'android:requiredAccountType': {},
		'android:restrictedAccountType': {},
		'android:supportsRtl': castBool(),
		'android:taskAffinity': {},
		'android:testOnly': castBool(),
		'android:theme': {},
		'android:uiOptions': {},
		'android:usesCleartextTraffic': castBool(),
		'android:vmSafeMode': castBool()
	},
	fields: {
		'activity': activity,
		'activity-alias': activityAlias,
		'meta-data': metaData,
		'service': service,
		'receiver': receiver,
		'provider': provider,
		'uses-library': usesLibrary
	}
};

export const screen = {
	tag: 'screen',
	array: true,
	attributes: {
		'android:screenSize': {},
		'android:screenDensity': {}
	}
};

export const compatibleScreens = {
	tag: 'compatible-screens',
	fields: {
		'screen': screen
	}
};

export const instrumentation = {
	tag: 'instrumentation',
	array: true,
	attributes: {
		'android:functionalTest': castBool(),
		'android:handleProfiling': castBool(),
		'android:icon': {},
		'android:label': {},
		'android:name': {},
		'android:targetPackage': {}
	}
};

export const permission = {
	tag: 'permission',
	array: true,
	attributes: {
		'android:description': {},
		'android:icon': {},
		'android:label': {},
		'android:name': {},
		'android:permissionGroup': {},
		'android:protectionLevel': {}
	}
};

export const permissionGroup = {
	tag: 'permission-group',
	array: true,
	attributes: {
		'android:description': {},
		'android:icon': {},
		'android:label': {},
		'android:name': {}
	}
};

export const permissionTree = {
	tag: 'permission-tree',
	array: true,
	attributes: {
		'android:icon': {},
		'android:label': {},
		'android:name': {}
	}
};

export const supportsGlTexture = {
	tag: 'supports-gl-texture',
	array: true,
	attributes: {
		'android:name': {}
	}
};

export const supportsScreens = {
	tag: 'supports-screens',
	attributes: {
		'android:anyDensity': castBool(),
		'android:compatibleWidthLimitDp': castInt(),
		'android:largeScreens': castBool(),
		'android:largestWidthLimitDp': castInt(),
		'android:normalScreens': castBool(),
		'android:requiresSmallestWidthDp': castInt(),
		'android:resizeable': castBool(),
		'android:smallScreens': castBool(),
		'android:xlargeScreens': castBool()
	}
};

export const usesConfiguration = {
	tag: 'uses-configuration',
	attributes: {
		'android:reqFiveWayNav': castBool(),
		'android:reqHardKeyboard': castBool(),
		'android:reqKeyboardType': {},
		'android:reqNavigation': {},
		'android:reqTouchScreen': {}
	}
};

export const usesFeature = {
	tag: 'uses-feature',
	array: true,
	attributes: {
		'android:name': {},
		'android:required': castBool(),
		'android:glEsVersion': castInt(true)
	}
};

export const usesPermission = {
	tag: 'uses-permission',
	array: true,
	attributes: {
		'android:name': {},
		'android:maxSdkVersion': castInt()
	}
};

export const usesPermissionSdk23 = {
	tag: 'uses-permission-sdk-23',
	array: true,
	attributes: {
		'android:name': {},
		'android:maxSdkVersion': castInt()
	}
};

export const usesSdk = {
	tag: 'uses-sdk',
	attributes: {
		'android:minSdkVersion': castInt(),
		'android:targetSdkVersion': castInt(),
		'android:maxSdkVersion': castInt()
	}
};

export const manifest = {
	tag: 'manifest',
	attributes: {
		'xmlns:android': {},
		'package': {},
		'android:sharedUserId': {},
		'android:sharedUserLabel': {},
		'android:versionCode': castInt(),
		'android:versionName': {},
		'android:installLocation': {}
	},
	fields: {
		'application': application,
		'compatible-screens': compatibleScreens,
		'instrumentation': instrumentation,
		'permission': permission,
		'permission-group': permissionGroup,
		'permission-tree': permissionTree,
		'supports-gl-texture': supportsGlTexture,
		'supports-screens': supportsScreens,
		'uses-configuration': usesConfiguration,
		'uses-feature': usesFeature,
		'uses-permission': usesPermission,
		'uses-permission-sdk-23': usesPermissionSdk23,
		'uses-sdk': usesSdk
	}
};
