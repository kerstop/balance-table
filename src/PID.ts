function clamp(value: number, limits: [number, number] | []): number {
  const [lower, upper] = limits;

  if (value == null) return value;
  else if (upper != null && value > upper) return upper;
  else if (lower != null && value < lower) return lower;
  return value;
}

interface Options {
  sampleTime?: number;
  outputLimits?: [number, number] | [];
  autoMode?: boolean;
  proportionalOnMeasurement?: boolean;
  errorMap?: (x: number) => number;
}

export default class PID {
  public sampleTime: number;
  public proportionalOnMeasurement: boolean;
  public errorMap: (x: any) => any;

  public proportional: number;
  public integral: number;
  public derivative: number;

  private _outputLimits: [number, number] | [];
  private _autoMode: boolean;
  private _lastTime: number;
  private _lastOutput: number;
  private _lastInput: number;

  constructor(
    public kp: number,
    public ki: number,
    public kd: number,
    public setpoint: number,
    options?: Options,
  ) {
    this.sampleTime = options?.sampleTime ?? 10;
    this.outputLimits = options?.outputLimits ?? [];
    this.proportionalOnMeasurement =
      options?.proportionalOnMeasurement ?? false;
    this.errorMap = options?.errorMap ?? ((x) => x);

    this.proportional = 0;
    this.integral = 0;
    this.derivative = 0;

    this._autoMode = options?.autoMode ?? true;
    this._lastTime = Date.now();
    this._lastOutput = 0;
    this._lastInput = 0;

    this.reset();
  }

  update(input: number, dt?: number): number {
    if (!this.autoMode) return this._lastOutput ?? 0;

    const now = Date.now();

    if (dt === undefined) dt = now - this._lastTime || 1;
    if (dt <= 0)
      throw new RangeError(`invalid dt value ${dt}, must be positive`);

    if (
      this.sampleTime != null &&
      dt < this.sampleTime &&
      this._lastOutput != null
    )
      return this._lastOutput;

    dt = dt / 1000; // seconds
    const error = this.errorMap(this.setpoint - input);
    const dInput = input - (this._lastInput ?? input);

    if (this.proportionalOnMeasurement) this.proportional -= this.kp * dInput;
    else this.proportional = this.kp * error;

    this.integral += this.ki * error * dt;
    this.integral = clamp(this.integral, this.outputLimits);

    this.derivative = (-this.kd * dInput) / dt;

    const output = clamp(
      this.proportional + this.integral + this.derivative,
      this.outputLimits,
    );

    this._lastTime = now;
    this._lastOutput = output;
    this._lastInput = input;

    return output;
  }

  get autoMode() {
    return this._autoMode;
  }

  set autoMode(value) {
    this.setAutoMode(value);
  }

  get outputLimits() {
    return this._outputLimits;
  }

  set outputLimits(value) {
    if (value == null) value = [];
    const [lower, upper] = value;

    if (lower != null && upper != null && lower >= upper) {
      throw new RangeError("lower limit must be less than upper");
    }

    this._outputLimits = value;
    this.integral = clamp(this.integral, value);
    this._lastOutput = clamp(this._lastOutput, value);
  }

  setAutoMode(enabled: boolean, lastOutput = null) {
    if (enabled && !this._autoMode) {
      this.reset();
      this.integral = clamp(lastOutput ?? 0, this.outputLimits);
    }

    this._autoMode = enabled;
  }

  reset() {
    this.proportional = 0;
    this.integral = clamp(this.integral, this.outputLimits);
    this.derivative = 0;

    this._lastTime = Date.now();
    this._lastOutput = 0;
    this._lastInput = 0;
  }
}
