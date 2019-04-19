# v2.6.0

 * fix: Removed unused 'targets' property from SDKs.
 * chore: Updated dependencies.

# v2.5.0 (Mar 29, 2019)

 * chore: Updated dependencies.

# v2.4.0 (Jan 29, 2019)

 * fix(connection): Fixed bug when executing adb command over a connection and `bufferUntilClose` is
   `true` and the results hang because of listening to `close` instead of `end` event.
 * chore: Upgraded to Gulp 4.
 * chore: Updated dependencies.

# v2.3.6 (Jun 14, 2018)

 * Fixed verbiage in invalid SDK when directory does not contain an emulator executable.

# v2.3.5 (Jun 12, 2018)

 * Added support for scanning the Android SDK `emulator` directory for the emulator executable.
   ([TIMOB-26126](https://jira.appcelerator.org/browse/TIMOB-26126))
 * Updated npm dependencies.
 * Removed `yarn.lock` from distribution.

# v2.3.4 (Apr 9, 2018)

 * Updated npm dependencies.

# v2.3.3 (Jan 10, 2018)

 * Fixed adb socket handling when adb goes away.

# v2.3.2 (Jan 4, 2018)

 * Updated npm dependencies, namely gawk@4.4.5.
 * Updated copyright year.

# v2.3.1 (Jan 4, 2018)

 * Prevent device changes from being emitted after stop tracking devices.
 * Clone internal devices array to strip gawk data before emitting.

# v2.3.0 (Dec 6, 2017)

 * Fixed bug where an ADB connection wouldn't wait for data for certain queries such as getting
   devices. This was especially noticeable when querying devices several times.

# v2.2.1 (Dec 6, 2017)

 * Added missing xmldom dependency.

# v2.2.0 (Dec 6, 2017)

 * Fixed regression where track devices would return emulators along with the connected devices.
 * Removed unnecessary device call to initialize track devices.
 * Added better error handling when getting a devices properties.
 * Added more debug logging.

# v2.1.1 (Dec 5, 2017)

 * Updated appcd npm deps to v1.0.0.

# v2.1.0 (Dec 4, 2017)

 * Fixed bug where multiple simultaneous calls to ADB-related functions would try to start multiple
   ADB instances at the same time.
 * Added `close` event to ADB connection and device tracking.
 * Fixed bug where updated list of devices would only be emitted if devices were connected or
   disconnected, but not if a device property was changed.
 * Track devices now emits the initial list of connected devices instead of future changes only.

# v2.0.11 (Nov 28, 2017)

 * Fixed bug in VirtualBox detection when trying to read non-existent `.xml` file.

# v2.0.10 (Nov 28, 2017)

 * Fixed incorrect Genymotion search paths option name.
 * Default `adb` executable in options to `null`.

# v2.0.9 (Nov 22, 2017)

 * Fixed Android NDK detection on Windows where certain NDK's `ndk-which` program did not include
   the `.cmd` extension.

# v2.0.8 (Nov 22, 2017)

 * Fixed detection of Android SDK add-ons that use a `manifest.ini` instead of a `source.properties`
   file.
 * Fixed `.ini` file line match regular expression to properly handle commented out lines.

# v2.0.7 (Nov 22, 2017)

 * Fixed populating emulator `basedOn`, `description`, `vendor`, and `version` properties.

# v2.0.6 (Nov 22, 2017)

 * Fixed bug with detecting connected devices as emulators.

# v2.0.5 (Nov 22, 2017)

 * Fixed bug with handling of Genymotion emulator ids.

# v2.0.4 (Nov 22, 2017)

 * Updated NPM dependencies.

# v2.0.3 (Nov 22, 2017)

 * Updated unnecessarily async emulator detection functions to sync.
 * Refactored Genymotion and VirtualBox detection.
 * Removed Genymotion detection dependency on `deployDir` and `vboxmanage`.

# v2.0.2 (Nov 20, 2017)

 * Fixed bug getting emulators when list of Android SDKs is empty.

# v2.0.1 (Nov 17, 2017)

 * Added missing macOS Genymotion mock files.
 * Fixed bug with custom Android SDK search paths.

# v2.0.0 (Nov 17, 2017)

 * Initial release of the v2 rewrite.
 * Updated code to ES2015.
 * Support for detecting SDKs, NDKs, devices, Android emulators, and Genymotion emulators.
