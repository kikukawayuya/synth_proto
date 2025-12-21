/**
 * Rotary Knob Component
 * Authentic rotation-based control like hardware synths
 */

export class RotaryKnob {
    private element: HTMLElement;
    private input: HTMLInputElement;
    private knobVisual: HTMLElement;
    private valueDisplay: HTMLElement;
    private isDragging: boolean = false;
    private startY: number = 0;
    private startValue: number = 0;

    private min: number;
    private max: number;
    private value: number;
    private step: number;
    private sensitivity: number = 0.005; // How much mouse movement affects value

    private onChange: ((value: number) => void) | null = null;

    constructor(container: HTMLElement, options: {
        min: number;
        max: number;
        value: number;
        step?: number;
        label?: string;
        size?: 'small' | 'normal' | 'large';
        onChange?: (value: number) => void;
    }) {
        this.min = options.min;
        this.max = options.max;
        this.value = options.value;
        this.step = options.step || 0.01;
        this.onChange = options.onChange || null;

        // Create knob structure
        this.element = document.createElement('div');
        this.element.className = `rotary-knob ${options.size || 'normal'}`;

        this.knobVisual = document.createElement('div');
        this.knobVisual.className = 'knob-body';

        const indicator = document.createElement('div');
        indicator.className = 'knob-indicator';
        this.knobVisual.appendChild(indicator);

        this.valueDisplay = document.createElement('div');
        this.valueDisplay.className = 'knob-value';

        const label = document.createElement('div');
        label.className = 'knob-label';
        label.textContent = options.label || '';

        // Hidden input for form compatibility
        this.input = document.createElement('input');
        this.input.type = 'hidden';
        this.input.value = String(this.value);

        this.element.appendChild(this.knobVisual);
        this.element.appendChild(this.valueDisplay);
        this.element.appendChild(label);
        this.element.appendChild(this.input);

        container.appendChild(this.element);

        this.updateVisual();
        this.bindEvents();
    }

    private bindEvents(): void {
        // Mouse events
        this.knobVisual.addEventListener('mousedown', this.onMouseDown.bind(this));
        document.addEventListener('mousemove', this.onMouseMove.bind(this));
        document.addEventListener('mouseup', this.onMouseUp.bind(this));

        // Touch events
        this.knobVisual.addEventListener('touchstart', this.onTouchStart.bind(this));
        document.addEventListener('touchmove', this.onTouchMove.bind(this));
        document.addEventListener('touchend', this.onTouchEnd.bind(this));

        // Double click to reset
        this.knobVisual.addEventListener('dblclick', () => {
            this.setValue((this.min + this.max) / 2);
        });

        // Mouse wheel
        this.knobVisual.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -this.step * 10 : this.step * 10;
            this.setValue(this.value + delta);
        });
    }

    private onMouseDown(e: MouseEvent): void {
        e.preventDefault();
        this.isDragging = true;
        this.startY = e.clientY;
        this.startValue = this.value;
        this.element.classList.add('dragging');
    }

    private onMouseMove(e: MouseEvent): void {
        if (!this.isDragging) return;

        const deltaY = this.startY - e.clientY;
        const range = this.max - this.min;
        const newValue = this.startValue + deltaY * range * this.sensitivity;

        this.setValue(newValue);
    }

    private onMouseUp(): void {
        this.isDragging = false;
        this.element.classList.remove('dragging');
    }

    private onTouchStart(e: TouchEvent): void {
        e.preventDefault();
        this.isDragging = true;
        this.startY = e.touches[0].clientY;
        this.startValue = this.value;
        this.element.classList.add('dragging');
    }

    private onTouchMove(e: TouchEvent): void {
        if (!this.isDragging) return;

        const deltaY = this.startY - e.touches[0].clientY;
        const range = this.max - this.min;
        const newValue = this.startValue + deltaY * range * this.sensitivity;

        this.setValue(newValue);
    }

    private onTouchEnd(): void {
        this.isDragging = false;
        this.element.classList.remove('dragging');
    }

    setValue(newValue: number): void {
        // Clamp value
        this.value = Math.max(this.min, Math.min(this.max, newValue));

        // Quantize to step
        this.value = Math.round(this.value / this.step) * this.step;

        this.input.value = String(this.value);
        this.updateVisual();

        if (this.onChange) {
            this.onChange(this.value);
        }
    }

    getValue(): number {
        return this.value;
    }

    private updateVisual(): void {
        // Calculate rotation angle (270 degree range, from -135 to +135)
        const normalized = (this.value - this.min) / (this.max - this.min);
        const angle = -135 + normalized * 270;

        this.knobVisual.style.transform = `rotate(${angle}deg)`;

        // Update value display
        if (Math.abs(this.value) >= 1000) {
            this.valueDisplay.textContent = (this.value / 1000).toFixed(1) + 'k';
        } else if (Math.abs(this.value) >= 100) {
            this.valueDisplay.textContent = Math.round(this.value).toString();
        } else if (Math.abs(this.value) >= 10) {
            this.valueDisplay.textContent = this.value.toFixed(1);
        } else {
            this.valueDisplay.textContent = this.value.toFixed(2);
        }
    }

    destroy(): void {
        this.element.remove();
    }
}

// CSS for rotary knobs (will be injected)
export const rotaryKnobStyles = `
.rotary-knob {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  user-select: none;
}

.rotary-knob.small .knob-body {
  width: 32px;
  height: 32px;
}

.rotary-knob.normal .knob-body {
  width: 44px;
  height: 44px;
}

.rotary-knob.large .knob-body {
  width: 60px;
  height: 60px;
}

.knob-body {
  border-radius: 50%;
  background: 
    radial-gradient(ellipse at 30% 25%, rgba(140, 160, 180, 0.5) 0%, transparent 50%),
    linear-gradient(160deg, #6a7a8a 0%, #4a5a68 30%, #3a4a58 70%, #2a3a48 100%);
  border: 2px solid #2a3a48;
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.5),
    inset 0 2px 0 rgba(255, 255, 255, 0.15),
    inset 0 -3px 6px rgba(0, 0, 0, 0.2);
  position: relative;
  cursor: grab;
  transition: box-shadow 0.1s ease;
}

.knob-body:hover {
  box-shadow: 
    0 4px 16px rgba(74, 144, 184, 0.3),
    inset 0 2px 0 rgba(255, 255, 255, 0.15),
    inset 0 -3px 6px rgba(0, 0, 0, 0.2);
}

.rotary-knob.dragging .knob-body {
  cursor: grabbing;
  box-shadow: 
    0 4px 20px rgba(74, 144, 184, 0.5),
    inset 0 2px 0 rgba(255, 255, 255, 0.2),
    inset 0 -3px 6px rgba(0, 0, 0, 0.2);
}

.knob-indicator {
  position: absolute;
  top: 6px;
  left: 50%;
  transform: translateX(-50%);
  width: 3px;
  height: 10px;
  background: #e0e8f0;
  border-radius: 2px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}

.rotary-knob.large .knob-indicator {
  width: 4px;
  height: 14px;
}

.knob-value {
  font-size: 0.65rem;
  color: #4ade80;
  font-family: 'SF Mono', 'Monaco', monospace;
  background: rgba(0, 0, 0, 0.4);
  padding: 1px 4px;
  border-radius: 2px;
  min-width: 32px;
  text-align: center;
}

.knob-label {
  font-size: 0.55rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #78889a;
}

/* Knob track arc (optional visual) */
.knob-body::before {
  content: '';
  position: absolute;
  top: -4px;
  left: -4px;
  right: -4px;
  bottom: -4px;
  border-radius: 50%;
  border: 2px solid transparent;
  border-top-color: rgba(74, 144, 184, 0.3);
  border-left-color: rgba(74, 144, 184, 0.3);
  transform: rotate(-45deg);
}
`;
