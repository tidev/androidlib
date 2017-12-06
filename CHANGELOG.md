# v2.2.0 (Dec 6, 2017)

 - Fixed regression where track devices would return emulators along with the connected devices.
 - Removed unnecessary device call to initialize track devices.
 - Added better error handling when getting a devices properties.
 - Added more debug logging.

# v2.1.1 (Dec 5, 2017)

 - Updated appcd npm deps to v1.0.0.

# v2.1.0 (Dec 4, 2017)

 - Fixed bug where multiple simultaneous calls to ADB-related functions would try to start multiple
   ADB instances at the same time.
 - Added `close` event to ADB connection and device tracking.
 - Fixed bug where updated list of devices would only be emitted if devices were connected or
   disconnected, but not if a device property was changed.
 - Track devices now emits the initial list of connected devices instead of future changes only.

# v2.0.11 (Nov 28, 2017)

 - Fixed bug in VirtualBox detection when trying to read non-existent `.xml` file.

# v2.0.10 (Nov 28, 2017)

 - Fixed incorrect Genymotion search paths option name.
 - Default `adb` executable in options to `null`.

# v2.0.9 (Nov 22, 2017)

 - Fixed Android NDK detection on Windows where certain NDK's `ndk-which` program did not include
   the `.cmd` extension.

# v2.0.8 (Nov 22, 2017)

 - Fixed detection of Android SDK add-ons that use a `manifest.ini` instead of a `source.properties`
   file.
 - Fixed `.ini` file line match regular expression to properly handle commented out lines.

# v2.0.7 (Nov 22, 2017)

 - Fixed populating emulator `basedOn`, `description`, `vendor`, and `version` properties.

# v2.0.6 (Nov 22, 2017)

 - Fixed bug with detecting connected devices as emulators.

# v2.0.5 (Nov 22, 2017)

 - Fixed bug with handling of Genymotion emulator ids.

# v2.0.4 (Nov 22, 2017)

 - Updated NPM dependencies.

# v2.0.3 (Nov 22, 2017)

 - Updated unnecessarily async emulator detection functions to sync.
 - Refactored Genymotion and VirtualBox detection.
 - Removed Genymotion detection dependency on `deployDir` and `vboxmanage`.

# v2.0.2 (Nov 20, 2017)

 - Fixed bug getting emulators when list of Android SDKs is empty.

# v2.0.1 (Nov 17, 2017)

 - Added missing macOS Genymotion mock files.
 - Fixed bug with custom Android SDK search paths.

# v2.0.0 (Nov 17, 2017)

 - Initial release of the v2 rewrite.
 - Updated code to ES2015.
 - Support for detecting SDKs, NDKs, devices, Android emulators, and Genymotion emulators.
