# ES2 Purity Synth

A web-based software synthesizer inspired by Logic Pro's ES2 synthesizer, featuring adaptive audio parameters for JITAI (Just-in-Time Adaptive Intervention) research.

## Features

### Synthesizer Engine
- **3-Oscillator Design** - Triple sine oscillators with independent detune and level controls
- **Filter Section** - Lowpass filter with cutoff, resonance, and ADSR envelope
- **Amp Envelope** - Full ADSR envelope for amplitude shaping
- **LFO Modulation** - Pan modulation with adjustable rate and depth

### Effects
- **Chorus** - Stereo chorus with rate, depth, and mix controls
- **Long Reverb** - Algorithmic reverb with decay, pre-delay, damping, and stereo width
- **3-Band EQ** - Master EQ with Low/Mid/High bands

### DAW-like Interface
- **Multi-Channel Mixer** - Multiple synth tracks with volume, pan, mute, and solo
- **Step Sequencer** - 16/32/64/128 step sequencer with swing
- **Piano Roll** - Interactive keyboard for live playing
- **Transport Controls** - Play/Stop with BPM control
- **Project Save/Load** - LocalStorage-based project persistence

### JITAI Research Module
Adaptive parameter mapping system for sleep/relaxation intervention research:

- **Input Parameters**
  - Heart Rate (HR) & Heart Rate Variability (HRV)
  - Stress Level & Sleepiness
  - Environmental: Room Temperature, Humidity
  - Behavioral: Sleep Hours, Step Count

- **Adaptive Mapping Modes**
  - Linear: Direct parameter mapping
  - Adaptive: Context-aware mapping based on physiological state
  - Experimental: Research-oriented advanced mapping

- **Audio Output Parameters**
  - Drone frequency and solfeggio frequencies
  - Filter characteristics and LFO modulation
  - Reverb depth and spatial properties
  - Dynamic range and stereo width

## Tech Stack

- **TypeScript** - Type-safe development
- **Vite** - Fast development server and build tool
- **Web Audio API** - Native browser audio synthesis
- **AudioWorklet** - Low-latency audio processing (with fallback)

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/es2-purity-synth.git
cd es2-purity-synth

# Install dependencies
npm install

# Start development server
npm run dev
```

Open http://localhost:5173 in your browser.

### Build for Production

```bash
npm run build
npm run preview
```

## Usage

1. Click "Start Audio" or press `Space` to initialize the audio engine
2. Use the piano roll or computer keyboard (Z-M for lower octave, Q-I for upper) to play notes
3. Adjust synth parameters using the rotary knobs
4. Create sequences in the step sequencer
5. Use the JITAI panel to experiment with adaptive audio parameters

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Toggle Play/Stop |
| Z-M, ,-. | Play notes (lower octave) |
| Q-I, 2-9 | Play notes (upper octave) |

## Project Structure

```
src/
├── main.ts              # Application entry point
├── synth/
│   ├── SynthEngine.ts   # Main synthesizer engine
│   └── Preset.ts        # Preset definitions
├── channel/
│   ├── Channel.ts       # Individual channel (synth + sequencer)
│   └── ChannelManager.ts # Multi-channel management
├── sequencer/
│   └── Sequencer.ts     # Step sequencer
├── fx/
│   ├── Chorus.ts        # Chorus effect
│   ├── Reverb.ts        # Short reverb
│   ├── LongReverb.ts    # Algorithmic reverb
│   └── EQ.ts            # Equalizer
├── ui/
│   ├── RotaryKnob.ts    # Rotary knob component
│   ├── PianoRoll.ts     # Piano keyboard
│   ├── ChannelStrip.ts  # Mixer channel strip
│   └── MasterSection.ts # Master volume & EQ
├── jitai/
│   ├── InterventionParameters.ts  # JITAI input parameters
│   ├── AudioParameters.ts         # Audio output parameters
│   ├── ParameterMapper.ts         # Adaptive mapping logic
│   ├── JitaiController.ts         # JITAI controller
│   └── JitaiPanel.ts              # JITAI UI panel
├── worklet/
│   └── voice-processor.ts  # AudioWorklet voice processor
└── utils/
    └── droneGenerator.ts   # Sleep drone generator
```

## Research Context

This synthesizer was developed as part of research on **Ambient Intelligence (AmI)** and **JITAI (Just-in-Time Adaptive Intervention)** for sleep quality improvement. The adaptive audio system can respond to:

- Physiological signals (heart rate, HRV)
- Environmental conditions (temperature, humidity)
- Behavioral patterns (sleep history, activity levels)

The goal is to create personalized, context-aware audio environments that promote relaxation and improve sleep quality through non-intrusive intervention.

## License

MIT License

## Acknowledgments

- Inspired by Apple Logic Pro's ES2 synthesizer
- Research conducted at The University of Tokyo
