# FlatSync

**FlatSync** is a professional-grade web tool designed for the precise synchronization, calibration, and comparison of historical and modern panoramic imagery. It provides researchers, historians, and urban planners with a powerful interface to align disparate visual datasets and observe longitudinal changes at scale.

![FlatSync Logo](https://img.shields.io/badge/FlatSync-1.0.0-blue?style=for-the-badge)
![Tech Stack](https://img.shields.io/badge/Stack-Vanilla_JS_%7C_HTML5_%7C_CSS3-orange?style=for-the-badge)

## 🌟 Key Features

### 📐 Precise Calibration Lab
Align historical "flat" panoramas to modern equivalents using advanced calibration tools:
- **Nudge Controls**: Fine-tune Scale, X/Y Offset, and Rotation with adjustable fineness (from 0.1px to 100px).
- **Control Point Alignment**: Mark corresponding features in both images to automatically calculate best-fit transformations.
- **Blink Overlay**: Toggle rapid visibility of the historical layer to spot misalignments with sub-pixel precision.

### 🌓 Dual View Modes
Switch between two distinct comparison paradigms:
- **Split Screen**: Side-by-side synchronized viewers for detailed feature analysis.
- **Dynamic Overlay**: Layer historical imagery directly over the modern base with adjustable opacity to visualize structural evolution.

### 🔄 Seamless Synchronization
The custom **FlatViewer** engine ensures that every pan and zoom action is perfectly mirrored between the two viewpoints, accounting for variations in scale, rotation, and offset.

### 📁 Project Management
Organize multiple datasets into projects. Calibration settings are persisted across sessions, allowing for continuous refinement of complex alignments.

## 🚀 Getting Started

FlatSync is built with zero dependencies and runs directly in any modern browser.

1. **Clone the repository**:
   ```bash
   git clone https://github.com/idbnstra/flat-sync.git
   ```
2. **Launch the app**:
   Simply open `index.html` in your browser.
3. **Select a Project**:
   Navigate to the "My Projects" page to choose between existing datasets or start a new calibration.

## 🛠️ Technical Architecture

- **Core Engine (`js/viewer.js`)**: A lightweight, high-performance `FlatViewer` class that handles CSS-accelerated transformations, 360° horizontal wrapping, and coordinate space conversions.
- **Persistence (`js/projects.js`)**: Manages project metadata and calibration state using `localStorage`.
- **UI System**: A custom-built CSS design system focused on performance and clarity, featuring a JetBrains-inspired aesthetic.

## 📖 Usage Guide: Calibrating a Project

1. **Entry**: Open a project from the "My Projects" page.
2. **Alignment**: Click "Align Images" to enter the **Calibration Lab**.
3. **Manual Tweaking**: Use the sliders in the sidebar to roughly align the images.
4. **Fine-Tuning**:
   - Use the **Nudge buttons** for incremental adjustments.
   - Use **Control Points** for automated alignment:
     - Mark a point on the Modern base.
     - Mark the corresponding point on the Historical image.
     - Click **Apply Alignment** to snap them together.
5. **Persistence**: Click **Save Calibration** to store your settings for future viewing.

---

*FlatSync — Bridging the gap between then and now.*
