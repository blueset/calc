/**
 * Mathematical functions for the calculator
 * Implements all functions from GRAMMAR.md
 */

/**
 * Function result with optional error
 */
export interface FunctionResult {
  value: number;
  error?: string;
}

/**
 * Math functions registry
 */
export class MathFunctions {
  /**
   * Execute a function by name
   *
   * @param name Function name
   * @param args Function arguments
   * @returns Function result with value or error
   */
  execute(name: string, args: number[]): FunctionResult {
    const lowerName = name.toLowerCase();

    // Trigonometric functions
    if (this.isTrigFunction(lowerName)) {
      return this.executeTrig(lowerName, args);
    }

    // Logarithmic functions
    if (this.isLogFunction(lowerName)) {
      return this.executeLog(lowerName, args);
    }

    // Number functions
    if (this.isNumberFunction(lowerName)) {
      return this.executeNumber(lowerName, args);
    }

    // Random function
    if (lowerName === 'random') {
      return this.random(args);
    }

    // Combinatoric functions
    if (this.isCombinatoricFunction(lowerName)) {
      return this.executeCombinatoricFunction(lowerName, args);
    }

    return { value: 0, error: `Unknown function: ${name}` };
  }

  /**
   * Check if a name is a valid function
   */
  isFunction(name: string): boolean {
    const lowerName = name.toLowerCase();
    return (
      this.isTrigFunction(lowerName) ||
      this.isLogFunction(lowerName) ||
      this.isNumberFunction(lowerName) ||
      lowerName === 'random' ||
      this.isCombinatoricFunction(lowerName)
    );
  }

  // Type checks

  private isTrigFunction(name: string): boolean {
    const trigFunctions = [
      'sin',
      'cos',
      'tan',
      'asin',
      'acos',
      'atan',
      'arcsin',
      'arccos',
      'arctan',
      'sinh',
      'cosh',
      'tanh',
      'asinh',
      'acosh',
      'atanh',
      'arsinh',
      'arcosh',
      'artanh'
    ];
    return trigFunctions.includes(name);
  }

  private isLogFunction(name: string): boolean {
    const logFunctions = ['sqrt', 'cbrt', 'log', 'ln', 'exp', 'log10'];
    return logFunctions.includes(name);
  }

  private isNumberFunction(name: string): boolean {
    const numberFunctions = ['abs', 'round', 'floor', 'ceil', 'trunc', 'frac'];
    return numberFunctions.includes(name);
  }

  private isCombinatoricFunction(name: string): boolean {
    return name === 'perm' || name === 'comb';
  }

  // Trigonometric functions

  private executeTrig(name: string, args: number[]): FunctionResult {
    if (args.length !== 1) {
      return { value: 0, error: `${name} requires 1 argument, got ${args.length}` };
    }

    const x = args[0];
    let result: number;

    switch (name) {
      case 'sin':
        result = Math.sin(x);
        break;
      case 'cos':
        result = Math.cos(x);
        break;
      case 'tan':
        result = Math.tan(x);
        break;

      case 'asin':
      case 'arcsin':
        if (x < -1 || x > 1) {
          return { value: 0, error: `${name} argument must be in range [-1, 1]` };
        }
        result = Math.asin(x);
        break;

      case 'acos':
      case 'arccos':
        if (x < -1 || x > 1) {
          return { value: 0, error: `${name} argument must be in range [-1, 1]` };
        }
        result = Math.acos(x);
        break;

      case 'atan':
      case 'arctan':
        result = Math.atan(x);
        break;

      case 'sinh':
        result = Math.sinh(x);
        break;

      case 'cosh':
        result = Math.cosh(x);
        break;

      case 'tanh':
        result = Math.tanh(x);
        break;

      case 'asinh':
      case 'arsinh':
        result = Math.asinh(x);
        break;

      case 'acosh':
      case 'arcosh':
        if (x < 1) {
          return { value: 0, error: `${name} argument must be >= 1` };
        }
        result = Math.acosh(x);
        break;

      case 'atanh':
      case 'artanh':
        if (x <= -1 || x >= 1) {
          return { value: 0, error: `${name} argument must be in range (-1, 1)` };
        }
        result = Math.atanh(x);
        break;

      default:
        return { value: 0, error: `Unknown trigonometric function: ${name}` };
    }

    return { value: result };
  }

  // Logarithmic functions

  private executeLog(name: string, args: number[]): FunctionResult {
    if (args.length !== 1) {
      return { value: 0, error: `${name} requires 1 argument, got ${args.length}` };
    }

    const x = args[0];
    let result: number;

    switch (name) {
      case 'sqrt':
        if (x < 0) {
          return { value: 0, error: 'sqrt argument must be non-negative' };
        }
        result = Math.sqrt(x);
        break;

      case 'cbrt':
        result = Math.cbrt(x);
        break;

      case 'log':
        if (x <= 0) {
          return { value: 0, error: 'log argument must be positive' };
        }
        result = Math.log(x);
        break;

      case 'ln':
        if (x <= 0) {
          return { value: 0, error: 'ln argument must be positive' };
        }
        result = Math.log(x);
        break;

      case 'log10':
        if (x <= 0) {
          return { value: 0, error: 'log10 argument must be positive' };
        }
        result = Math.log10(x);
        break;

      case 'exp':
        result = Math.exp(x);
        break;

      default:
        return { value: 0, error: `Unknown logarithmic function: ${name}` };
    }

    return { value: result };
  }

  // Number functions

  private executeNumber(name: string, args: number[]): FunctionResult {
    if (args.length !== 1) {
      return { value: 0, error: `${name} requires 1 argument, got ${args.length}` };
    }

    const x = args[0];
    let result: number;

    switch (name) {
      case 'abs':
        result = Math.abs(x);
        break;

      case 'round':
        result = Math.round(x);
        break;

      case 'floor':
        result = Math.floor(x);
        break;

      case 'ceil':
        result = Math.ceil(x);
        break;

      case 'trunc':
        result = Math.trunc(x);
        break;

      case 'frac':
        // Fractional part: x - trunc(x)
        result = x - Math.trunc(x);
        break;

      default:
        return { value: 0, error: `Unknown number function: ${name}` };
    }

    return { value: result };
  }

  // Random function

  private random(args: number[]): FunctionResult {
    if (args.length !== 0) {
      return { value: 0, error: `random requires 0 arguments, got ${args.length}` };
    }

    return { value: Math.random() };
  }

  // Combinatoric functions

  private executeCombinatoricFunction(name: string, args: number[]): FunctionResult {
    if (args.length !== 2) {
      return { value: 0, error: `${name} requires 2 arguments, got ${args.length}` };
    }

    const n = args[0];
    const k = args[1];

    // Check that n and k are non-negative integers
    if (!Number.isInteger(n) || !Number.isInteger(k) || n < 0 || k < 0) {
      return { value: 0, error: `${name} arguments must be non-negative integers` };
    }

    if (k > n) {
      return { value: 0, error: `${name}: k cannot be greater than n` };
    }

    switch (name) {
      case 'perm':
        // P(n, k) = n! / (n-k)!
        return { value: this.permutation(n, k) };

      case 'comb':
        // C(n, k) = n! / (k! * (n-k)!)
        return { value: this.combination(n, k) };

      default:
        return { value: 0, error: `Unknown combinatoric function: ${name}` };
    }
  }

  // Helper methods for combinatorics

  private factorial(n: number): number {
    if (n === 0 || n === 1) {
      return 1;
    }
    let result = 1;
    for (let i = 2; i <= n; i++) {
      result *= i;
    }
    return result;
  }

  private permutation(n: number, k: number): number {
    // P(n, k) = n! / (n-k)!
    // Optimize by computing n * (n-1) * ... * (n-k+1) instead of full factorials
    let result = 1;
    for (let i = n; i > n - k; i--) {
      result *= i;
    }
    return result;
  }

  private combination(n: number, k: number): number {
    // C(n, k) = n! / (k! * (n-k)!)
    // Optimize: C(n, k) = C(n, n-k), use smaller k
    if (k > n - k) {
      k = n - k;
    }

    let result = 1;
    for (let i = 0; i < k; i++) {
      result *= n - i;
      result /= i + 1;
    }

    return result;
  }
}
