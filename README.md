# 🛣️ RoadWise — Edge-AI Based Real-Time Pothole Detection & Classification
---

## 📌 Table of Contents

1. [Project Overview](#-project-overview)
2. [Abstract](#-abstract)
3. [Problem Statement](#-problem-statement)
4. [Key Features](#-key-features)
5. [System Architecture](#-system-architecture)
6. [Core Modules](#-core-modules)
7. [Tech Stack](#-tech-stack)
8. [Project Structure](#-project-structure)
9. [Prerequisites](#-prerequisites)
10. [Setup & Installation](#-setup--installation)
11. [How It Works](#-how-it-works)
12. [Signal Classification Logic](#-signal-classification-logic)
13. [Civic Dashboard & Geo-Tagged Reporting](#-civic-dashboard--geo-tagged-reporting)
14. [VETS Evaluation](#-vets-evaluation)
15. [Development Roadmap](#-development-roadmap)
16. [Contributing](#-contributing)

---

## 🌐 Project Overview

**RoadWise** is a mobile-first, **Edge-AI powered Android application** for real-time pothole detection, severity classification, and geo-tagged civic reporting. The system uses **only the smartphone's built-in accelerometer and GPS** — no external hardware, no camera, no cloud round-trip.

By running entirely on-device, RoadWise ensures **low latency, user privacy, and seamless operation even in low-connectivity zones** — making it a highly scalable, cost-effective solution for road condition monitoring across large populations.

---

## 📄 Abstract

Poor road infrastructure remains a major safety concern in India, contributing to thousands of accidents annually due to undetected potholes and inefficient maintenance workflows. Existing reporting systems depend on manual complaints, resulting in delayed responses and lack of structured, actionable data for municipal authorities.

This project proposes a **mobile-based Edge-AI system** that enables real-time pothole detection, classification, and geo-tagged reporting using only a smartphone's built-in sensors. The system eliminates the need for external hardware by leveraging the phone's **accelerometer and GPS**, making it highly scalable and easy to deploy across large populations.

The application runs **on-device**, ensuring low latency, privacy, and minimal reliance on cloud infrastructure. By combining **inertial sensing with spectral analysis**, the system accurately detects road anomalies and distinguishes between potholes and speed breakers, significantly reducing false positives.

---

## ⚠️ Problem Statement

| Issue | Impact |
|---|---|
| Manual pothole reporting systems | Slow response, incomplete data |
| Reactive maintenance (fix after failure) | Higher repair costs, more accidents |
| Lack of structured geospatial road data | No prioritization of critical zones |
| Expensive dedicated sensors/hardware | Low scalability and deployment cost |

**RoadWise** addresses all four by turning every smartphone into a passive, intelligent road quality sensor.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 📳 **Accelerometer-Based Detection** | Uses only the phone's built-in inertial sensor — no camera needed |
| 🔬 **FFT Spectral Analysis** | Converts raw time-series vibration data into frequency domain for classification |
| 🤖 **On-Device Edge AI Classifier** | Lightweight Random Forest / 1D-CNN model runs entirely on-device |
| 🚗 **Pothole vs. Speed Breaker Classification** | Distinguishes road anomaly type using spectral feature signatures |
| 📍 **GPS Geo-Tagging** | Every detected event is tagged with precise GPS coordinates |
| 🗺️ **Live Heatmap Dashboard** | Authorities can view pothole hotspots on an interactive map |
| 📊 **Severity Grading** | Events rated by vibration intensity (G-force magnitude) |
| 📈 **Temporal Trend Analysis** | Track pothole clusters over time for predictive maintenance |
| 🔔 **Automated Alerts & Reports** | System generates structured reports for municipal dashboards |
| 🔋 **Low Power & Offline-First** | Edge processing eliminates constant cloud dependency |

---

## 🏗️ System Architecture

```
┌───────────────────────────── Android Device (Edge) ──────────────────────────────┐
│                                                                                    │
│   ┌──────────────────────┐                                                         │
│   │  Built-in            │                                                         │
│   │  ACCELEROMETER       │  (Z-axis, X-axis continuous sampling)                  │
│   └──────────┬───────────┘                                                         │
│              │ Raw time-series vibration data                                      │
│              ▼                                                                     │
│   ┌──────────────────────────────────────────────────────────────────────────┐    │
│   │              MODULE 1: Inertial Sensing & Signal Acquisition              │    │
│   │   - Continuous accelerometer sampling while vehicle is in motion         │    │
│   │   - Captures vertical & longitudinal motion reflecting road surface      │    │
│   │   - Raw signals are noisy; pre-processing applied (filtering/windowing)  │    │
│   └──────────────────────────┬───────────────────────────────────────────────┘    │
│                              │ Windowed time-series segments                       │
│                              ▼                                                     │
│   ┌──────────────────────────────────────────────────────────────────────────┐    │
│   │           MODULE 2: Spectral Analysis & Event Classification              │    │
│   │                                                                           │    │
│   │   Fast Fourier Transform (FFT)                                            │    │
│   │   ┌─────────────────────────────────────────────────────────────────┐    │    │
│   │   │  Time Domain Signal ──► Frequency Domain Spectrum               │    │    │
│   │   │                                                                   │    │    │
│   │   │  Extracted Features:                                              │    │    │
│   │   │   • Energy Distribution across frequency bands                   │    │    │
│   │   │   • Dominant Frequencies (peak Hz)                               │    │    │
│   │   │   • Signal Variance & RMS amplitude                              │    │    │
│   │   │   • Broadband spike detection                                    │    │    │
│   │   └─────────────────────────────────────────────────────────────────┘    │    │
│   │                              │                                            │    │
│   │            ┌─────────────────▼──────────────────┐                        │    │
│   │            │  On-Device Classifier               │                        │    │
│   │            │  (Random Forest / 1D-CNN)           │                        │    │
│   │            │                                     │                        │    │
│   │            │  POTHOLE      ──► Broadband high-   │                        │    │
│   │            │                   amplitude spike   │                        │    │
│   │            │  SPEED BREAKER ─► Smooth, periodic  │                        │    │
│   │            │                   low-frequency wave│                        │    │
│   │            └─────────────────────────────────────┘                        │    │
│   └──────────────────────────┬───────────────────────────────────────────────┘    │
│                              │ Classified event + intensity score                  │
│                              ▼                                                     │
│   ┌──────────────────────────────────────────────────────────────────────────┐    │
│   │               MODULE 3: Geo-Tagging & Civic Dashboard Integration        │    │
│   │                                                                           │    │
│   │   GPS / Location Provider ──► Lat / Lng attached to every event         │    │
│   │   Local Storage             ──► Events cached on-device offline-first    │    │
│   │   Cloud Sync (Firebase)     ──► Upload to centralized dashboard          │    │
│   └──────────────────────────┬───────────────────────────────────────────────┘    │
│                              │                                                     │
└──────────────────────────────┼─────────────────────────────────────────────────────┘
                               │
                               ▼
            ┌──────────────────────────────────────────────┐
            │         Municipal Civic Dashboard             │
            │                                               │
            │  🗺️  Pothole Hotspot Heatmaps                 │
            │  📊  Severity Levels (vibration intensity)    │
            │  📅  Temporal trends & predictive analytics   │
            │  🔔  Automated alerts & repair prioritization │
            └──────────────────────────────────────────────┘
```

---

## 🔩 Core Modules

### Module 1 — Inertial Sensing & Signal Acquisition

The smartphone's **built-in accelerometer** continuously captures vertical (Z-axis) and longitudinal motion data while the user is traveling. These signals directly reflect road surface irregularities. Key steps:

- **Continuous Sampling** — Accelerometer polled at high frequency (`SENSOR_DELAY_GAME`) to capture sharp transient events
- **Signal Windowing** — Raw data is split into overlapping time windows for analysis
- **Noise Reduction** — High-pass filtering removes DC gravity offset and low-frequency vehicle body motion
- **Normalization** — Signals normalized across different device orientations and mounting positions

---

### Module 2 — Spectral Analysis & Event Classification

The core intelligence of the system. Raw time-series accelerometer data is transformed into the **frequency domain using Fast Fourier Transform (FFT)**.

#### Why FFT?

| Road Event | Time-Domain Signature | Frequency-Domain Signature |
|---|---|---|
| **Pothole** | Sharp, sudden high-amplitude spike | Broadband energy burst across wide frequency range |
| **Speed Breaker** | Gradual rise and fall | Dominant low-frequency components, periodic and smooth |
| **Normal Road** | Low-amplitude random noise | Flat, low-energy spectrum |

#### Spectral Features Extracted

1. **Energy Distribution** — Power spectral density across defined frequency bands
2. **Dominant Frequency** — Peak frequency (Hz) in the spectrum
3. **Signal Variance** — Measure of amplitude spread (high for potholes)
4. **RMS Amplitude** — Root mean square of the signal window
5. **Spectral Entropy** — Measures randomness; high entropy = broadband = pothole

#### On-Device Classifier

A lightweight classifier — **Random Forest** or **1D-CNN** — trained on labeled spectral feature vectors:

- **Input:** Extracted spectral feature vector per window
- **Output:** `POTHOLE` | `SPEED_BREAKER` | `NORMAL`
- **Runs entirely on-device** — no network call during inference
- **Optimized for mobile** — low memory footprint, real-time throughput

---

### Module 3 — Geo-Tagging & Civic Dashboard Integration

Every classified event is automatically paired with precise geolocation data:

- **GPS Location** — `FusedLocationProviderClient` provides high-accuracy coordinates
- **Event Record** — Stores: `latitude`, `longitude`, `timestamp`, `event_type`, `intensity (G-force)`
- **Local Cache** — Events stored on-device for offline-first operation
- **Cloud Sync** — Uploaded to a centralized server / Firebase Firestore when connectivity is available

#### Civic Dashboard Capabilities

| Dashboard Feature | Description |
|---|---|
| 🗺️ **Pothole Heatmaps** | Geographic density visualization of detected potholes |
| 🔴 **Severity Indicators** | Color-coded markers based on vibration intensity |
| 📅 **Temporal Trends** | Time-series charts to track deterioration or improvement |
| 🔔 **Automated Reports** | Structured repair prioritization reports for municipal teams |
| 📍 **Cluster Analysis** | Hotspot identification for predictive maintenance scheduling |

---

## 🛠️ Tech Stack

| Category | Technology |
|---|---|
| **Language** | Kotlin |
| **Build System** | Gradle (Groovy DSL) |
| **Inertial Sensing** | Android `SensorManager` — `TYPE_ACCELEROMETER` |
| **Signal Processing** | Fast Fourier Transform (FFT) |
| **On-Device ML** | Random Forest / 1D-CNN (TensorFlow Lite `.tflite`) |
| **Location** | Android `FusedLocationProviderClient` (GPS + Network) |
| **Maps & Visualization** | osmdroid 6.1.18 (OpenStreetMap) |
| **Cloud Sync** | Firebase Firestore (planned) |
| **Networking** | Retrofit 2.9.0 + OkHttp 4.11.0 |
| **Concurrency** | Kotlin Coroutines + AndroidX Lifecycle KTX |
| **UI** | ViewBinding, ConstraintLayout, Material 3 |
| **Min SDK** | API 24 (Android 7.0 Nougat) |
| **Target SDK** | API 34 (Android 14) |

---

## 📁 Project Structure

```
Roadwise-main/
├── app/
│   ├── build.gradle                      # App-level dependencies & build config
│   └── src/main/
│       ├── AndroidManifest.xml           # Permissions & component declarations
│       ├── assets/
│       │   └── classifier_model.tflite   # On-device pothole classifier model
│       └── kotlin/com/roadwise/
│           ├── MainActivity.kt           # Entry point, orchestration, UI
│           ├── HistoryActivity.kt        # Past detections viewer
│           ├── SettingsActivity.kt       # Sensitivity & preference controls
│           ├── sensors/
│           │   └── BumpDetector.kt       # Accelerometer sampling & windowing
│           ├── signal/
│           │   ├── FFTProcessor.kt       # Fast Fourier Transform pipeline
│           │   └── FeatureExtractor.kt   # Spectral feature extraction
│           ├── classifier/
│           │   └── RoadEventClassifier.kt # On-device ML inference (RF / 1D-CNN)
│           ├── models/
│           │   └── PotholeData.kt        # Data model: lat, lng, type, intensity, timestamp
│           ├── mapping/
│           │   └── AdaptiveRoadOverlay.kt # OSM heatmap & severity overlay
│           └── utils/
│               ├── PotholeRepository.kt  # Local data persistence
│               ├── RoadQualityScorer.kt  # A–F road segment grading
│               └── PotholeAdapter.kt     # RecyclerView adapter (History screen)
├── ARCHITECTURE_DIAGRAM.md
├── ROADMAP.md
├── build.gradle                          # Root build config
├── settings.gradle
└── local.properties                      # API keys (gitignored)
```

---

## ✅ Prerequisites

| Requirement | Details |
|---|---|
| **Android Studio** | Hedgehog (2023.1.1) or newer |
| **JDK** | Java 8 (bundled with Android Studio) |
| **Android SDK** | API 34 (compile), API 24 (minimum) |
| **Gradle** | Wrapper included — `./gradlew` |
| **Physical Device** | **Required** — emulators do not have a real accelerometer |

---

## ⚙️ Setup & Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/roadwise.git
cd roadwise
```

### 2. Open in Android Studio

1. **File → Open** → select the `Roadwise-main` folder
2. Wait for **Gradle sync** to complete
3. Ensure **Android SDK API 34** is installed via SDK Manager

### 3. Run on a Physical Device

```
1. Enable Developer Options on your Android phone
2. Enable USB Debugging
3. Connect via USB
4. Select your device in the run target dropdown
5. Click ▶️ Run
```

```bash
# Or via CLI:
./gradlew installDebug
```

> ⚠️ **A real physical device is mandatory.** The accelerometer is a hardware sensor — emulators cannot simulate real road vibrations.

---

## ⚙️ How It Works

### End-to-End Detection Flow

```
1. USER DRIVES  →  Accelerometer streams Z-axis + X-axis data continuously

2. WINDOWING    →  Sliding window segments raw signal (e.g., 256 samples @ 50 Hz)

3. FFT          →  Each window transformed into frequency domain spectrum

4. FEATURES     →  Spectral energy, dominant frequency, variance, RMS, entropy extracted

5. CLASSIFIER   →  On-device Random Forest / 1D-CNN predicts:
                     • POTHOLE        (broadband high-amplitude spike)
                     • SPEED BREAKER  (low-frequency smooth periodic wave)
                     • NORMAL ROAD    (flat low-energy noise)

6. GPS TAG      →  Classification result paired with current GPS coordinates

7. STORE        →  Event saved locally (offline-first)

8. SYNC         →  Uploaded to cloud dashboard when connected

9. MAP          →  Heatmap updated on OpenStreetMap overlay
```

---

## 📡 Signal Classification Logic

### Pothole Spectral Signature
- **Sharp, sudden impact** → produces **high-amplitude, broadband frequency burst**
- Energy is spread across **wide frequency range** (short-duration impulse)
- High **spectral entropy** and high **signal variance**

### Speed Breaker Spectral Signature
- **Gradual, periodic rise-and-fall** → produces **dominant low-frequency components**
- Energy concentrated in **narrow, low-frequency bands**
- Low spectral entropy, smooth and symmetric waveform

```
FFT Spectrum Comparison:

Pothole:        |||||||||||||||||||||||||  (wide broadband burst)
Speed Breaker:  ||||                       (narrow, low-frequency peak)
Normal Road:    |                          (low flat noise floor)

          0Hz            25Hz            50Hz
```

---

## 🗺️ Civic Dashboard & Geo-Tagged Reporting

Each verified road event is uploaded with the following structured data:

```json
{
  "event_id": "uuid-1234",
  "type": "POTHOLE",
  "latitude": 12.9716,
  "longitude": 77.5946,
  "timestamp": "2025-11-14T10:23:45Z",
  "intensity": 2.7,
  "severity": "Critical",
  "device_speed_kmph": 35
}
```

### Dashboard Outputs

| Output | Description |
|---|---|
| 🗺️ **Heatmap** | Color-coded pothole density map by geographic area |
| 📊 **Severity Report** | Breakdown of potholes by Critical / Severe / Moderate / Minor |
| 📅 **Temporal Chart** | Detection frequency over time per road segment |
| 🔔 **Alert Trigger** | Auto-alert when a segment exceeds a severity threshold |
| 📋 **Repair Priority List** | Ranked list of road segments for maintenance scheduling |

---

## 📈 VETS Evaluation

### ✅ Viability
- **Zero external hardware cost** — deployed on any Android smartphone (API 24+)
- Works on buses, cabs, private vehicles — scalable across entire vehicle fleets
- Edge processing ensures functionality in **low / no connectivity areas**
- Distribution via Play Store enables mass citizen adoption

### ✅ Engineering Depth
- **FFT-based spectral analysis** of inertial time-series data — signal processing rigor
- **Frequency-domain feature engineering** (energy distribution, dominant frequency, RMS, entropy)
- **Lightweight on-device classifier** (Random Forest / 1D-CNN) optimized for mobile inference
- **Sensor fusion design** — multi-axis accelerometer + GPS correlation
- Robust false-positive suppression via spectral signature matching (not simple threshold)

### ✅ Trend Alignment
- 🌐 **Edge Computing & Edge AI** — inference on the device, not the cloud
- 🏙️ **Smart Cities & AIoT** — citizens as passive infrastructure sensors
- 🔮 **Predictive Maintenance** — data-driven scheduling over reactive repairs
- 📱 **Mobile-First Civic Tech** — scalable, no infra investment required

### ✅ Social & Sustainability Impact
- Directly reduces road accidents and vehicle damage from undetected potholes
- Enables **proactive, data-driven governance** — shifting from complaint-driven to evidence-driven repair
- Citizens contribute passively — no extra effort or behavior change required
- Municipal authorities gain **structured, geo-tagged, severity-graded** road condition data at negligible cost

---

## 🗺️ Development Roadmap

| Phase | Status | Description |
|---|---|---|
| **Phase 1: Foundation** | ✅ Complete | Android project setup, permissions, UI scaffold, Gradle config |
| **Phase 2: Sensor Pipeline** | 🏗️ In Progress | Accelerometer sampling, windowing, noise filtering |
| **Phase 3: FFT & Feature Extraction** | 🏗️ In Progress | FFT processing, spectral feature computation |
| **Phase 4: On-Device Classifier** | 📋 Planned | Train & deploy RF / 1D-CNN TFLite model |
| **Phase 5: Geo-Tagging** | 📋 Planned | FusedLocationProvider, event + GPS correlation |
| **Phase 6: Local Storage** | 📋 Planned | Offline-first data persistence |
| **Phase 7: Cloud & Dashboard** | 📋 Planned | Firebase Firestore sync, civic dashboard integration |
| **Phase 8: Heatmap Visualization** | 📋 Planned | OSM overlay, severity color mapping |
| **Phase 9: Optimization** | 📋 Planned | Battery tuning, sensitivity controls, UX polish |

---

## 🤝 Contributing

1. **Fork** this repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "feat: describe your change"`
4. Push: `git push origin feature/your-feature`
5. Open a **Pull Request**

---

## 📜 License

This project is licensed under the **MIT License**. See [`LICENSE`](LICENSE) for details.

---

<div align="center">

**RoadWise** — Turning every smartphone into a smart road sensor. 🛣️

*Group No. 02 | Edge-AI Systems Project*

</div>
