## Crestron Digital Media Matrix Module (v3.x)

A module for controlling Crestron DigitalMedia Matrix switchers (DM-MD8x8, DM-MD16x16, DM-MD32x32, DM-MD64x64, DM-MD128x128).

### Requirements & Setup

- Connects via TCP to port 23 (Telnet). Telnet must be enabled on the Crestron DM device.
- **Authentication**: Optional. If enabled on the device, configure username and password in the connection settings.
- **Secret Storage**: Passwords are securely stored in Companion's native secrets store.
- **Debug Logging**: Can be enabled in connection settings for detailed protocol logs.

### Features

#### Actions

- **Route source to destination**: Route Audio, Video, USB, Audio & Video, or Audio, Video & USB to any destination. Source `0` (`Off`) mutes/disconnects the output.
- **Poll / Refresh Matrix Routing**: Manually triggers a full routing table refresh (`dumpdmrouteinfo`).
- **Front Panel Lockout**: Lock (`on`) or unlock (`off`) the Crestron switcher front panel controls.
- **Display Message on Front Panel**: Send temporary (`shortmessage`) or persistent (`message`) custom text notifications to the switcher's LCD front panel display.

#### Feedbacks

- **Output Routing Status**: Highlights when a specific input is routed to an output (selectable by Video, Audio, or USB signal type).
- **Output is Disconnected (Off)**: Highlights when an output has no active video route (source `0`).

#### Variables

- `$(dm:connection_status)`: Current connection status (`Connected`, etc.).
- `$(dm:model)`: Switcher model identifier (e.g. `DM-MD16x16`).
- `$(dm:RouteOut<Slot>Video)`: Current Video input slot routed to output card `<Slot>`.
- `$(dm:RouteOut<Slot>Audio)`: Current Audio input slot routed to output card `<Slot>`.
- `$(dm:RouteOut<Slot>USB)`: Current USB input slot routed to output card `<Slot>`.
- `$(dm:tcp_response)`: Last raw TCP console response (if enabled).

#### Presets

- **Dynamic Status Tile**: Automatically detects matched vs. breakaway (split) routing. Shows `AV: IN X` when matched, and switches live to `V: IN X / A: IN Y` when split! Supports the new Companion 5 layered graphics engine with fallback for older surfaces.
- **Disconnect / Mute**: One-click mute for each output slot.
- **Source Selection Grid**: Pre-configured crosspoint routing buttons with real-time tally feedbacks for all detected inputs and outputs.
- **System Utilities**: Quick refresh and front-panel lockout buttons.
