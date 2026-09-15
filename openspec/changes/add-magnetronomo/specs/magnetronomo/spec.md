## Purpose

El Magnetrónomo mide el campo magnético del entorno con el magnetómetro del teléfono y lo registra a lo largo del tiempo mediante un cronómetro, para visualizar y exportar la sesión capturada dentro de SensoLab.

## ADDED Requirements

### Requirement: Magnitude measurement

The system SHALL measure the local magnetic field using the device magnetometer (via the `Magnetometer` sensor API when available, falling back to the compass heading from `deviceorientationabsolute` when the magnetometer is not directly exposed). It SHALL display the total field magnitude in microteslas (µT) and the individual x, y, z axis strengths when those values are available.

#### Scenario: Reading the live field
- **WHEN** the user opens the Magnetrónomo view on a device with a magnetometer
- **THEN** the app shows a live magnitude readout in µT and per-axis values (x, y, z), refreshed at the sensor's update rate

#### Scenario: Sensor unavailable
- **WHEN** the device does not expose any magnetic sensor (e.g. desktop browser)
- **THEN** the app shows a clear "sensor not available" message and disables the recording controls instead of crashing or showing fake data

#### Scenario: Compass fallback
- **WHEN** the raw magnetometer is unavailable but `deviceorientationabsolute` heading is available
- **THEN** the app shows the heading as field direction and marks the data source as fallback, while still allowing timing and recording

### Requirement: Chronometer and timed sampling

The system SHALL provide a chronometer with start, pause and reset controls. While the chronometer is running, it SHALL record a sample (timestamp in milliseconds relative to session start, total magnitude, and axis values) at a fixed interval of at least 5 Hz. Sampling SHALL stop when the chronometer is paused or reset, and SHALL resume from an accumulated elapsed time when restarted instead of reset.

#### Scenario: Starting a session
- **WHEN** the user presses Start
- **THEN** the chronometer begins timing and the app starts recording samples with their relative timestamps

#### Scenario: Pausing and resuming
- **WHEN** the user presses Pause and later presses Resume
- **THEN** the elapsed time carries over from where it paused, no samples are recorded while paused, and sampling resumes after Resume

#### Scenario: Resetting
- **WHEN** the user presses Reset
- **THEN** the elapsed time returns to zero, all recorded samples are cleared, and the graph is emptied

### Requirement: Real-time graph

The system SHALL render the recorded samples as a live graph on a canvas, plotting the total magnitude over time and highlighting the latest sample.

#### Scenario: Plotting samples
- **WHEN** at least two samples have been recorded
- **THEN** the graph draws the magnitude trend with the latest point highlighted, scrolling as new samples arrive

### Requirement: Session export

The system SHALL allow the user to export the recorded session as a JSON document (timestamps, magnitudes, axes, and session duration) using the app's existing file/share capabilities.

#### Scenario: Session with samples
- **WHEN** the user presses Export after recording at least one sample
- **THEN** the app produces a downloadable/shareable JSON containing the session data

#### Scenario: Empty session
- **WHEN** the user presses Export with no samples recorded
- **THEN** the app disables the export action or shows an empty-session notice

### Requirement: Hub integration

The system SHALL register the Magnetrónomo app in the main Hub grid and route to it from the app shell.

#### Scenario: Opening from the Hub
- **WHEN** the user taps the Magnetrónomo card in the Hub
- **THEN** SensoLab opens the Magnetrónomo view and its Back control returns to the Hub