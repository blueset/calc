import { useState, useRef, useEffect, useCallback, useDeferredValue } from "react";
import { DataLoader } from "@/calculator/data-loader";
import { Calculator } from "@/calculator/calculator";
import type { LineResult, CalculationResult } from "@/calculator/calculator";
import type { Document } from "@/calculator/document";
import type { Settings } from "@/calculator/settings";
import { ExchangeRatesDatabase } from "@/calculator/types/types";
import { EXCHANGE_RATES_STORAGE_KEY } from "@/constants";

const EXCHANGE_RATES_URL =
  "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json";

function loadCachedExchangeRates(): ExchangeRatesDatabase | null {
  try {
    const stored = localStorage.getItem(EXCHANGE_RATES_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    /* ignore */
  }
  return null;
}

function saveCachedExchangeRates(data: ExchangeRatesDatabase): void {
  try {
    localStorage.setItem(EXCHANGE_RATES_STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export interface UseCalculatorReturn {
  results: LineResult[];
  errors: CalculationResult["errors"];
  ast: Document | null;
  isReady: boolean;
  exchangeRatesVersion: string;
}

export function useCalculator(
  input: string,
  settings: Partial<Settings>,
  debounce = false,
): UseCalculatorReturn {
  const [results, setResults] = useState<LineResult[]>([]);
  const [errors, setErrors] = useState<CalculationResult["errors"]>({
    parser: [],
    runtime: [],
  });
  const [ast, setAst] = useState<Document | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [exchangeRatesVersion, setExchangeRatesVersion] = useState("…");

  const dataLoaderRef = useRef<DataLoader | null>(null);
  const calculatorRef = useRef<Calculator | null>(null);
  const exchangeRatesRef = useRef<ExchangeRatesDatabase | null>(null);

  const deferredInput = useDeferredValue(input);
  const effectiveInput = debounce ? deferredInput : input;

  // Initialize DataLoader + load cached exchange rates synchronously
  useEffect(() => {
    const dl = new DataLoader();
    dl.load();
    dataLoaderRef.current = dl;

    // Load cached exchange rates synchronously
    const cached = loadCachedExchangeRates();
    if (cached) {
      exchangeRatesRef.current = cached;
      setExchangeRatesVersion(cached.date);
    }

    setIsReady(true);

    // Fetch fresh exchange rates in background
    fetch(EXCHANGE_RATES_URL)
      .then((res) => res.json())
      .then((data) => {
        if (data?.usd) {
          exchangeRatesRef.current = data;
          calculatorRef.current?.loadExchangeRates(data);
          saveCachedExchangeRates(data);
          // Trigger re-calculation with fresh rates
          setExchangeRatesVersion(data.date);
        }
      })
      .catch((e) => {
        console.error("Failed to load exchange rates: ", e);
      });
  }, []);

  // Recreate Calculator when settings change, reuse cached exchange rates
  useEffect(() => {
    if (!dataLoaderRef.current) return;
    const calc = new Calculator(dataLoaderRef.current, settings);
    if (exchangeRatesRef.current) {
      calc.loadExchangeRates(exchangeRatesRef.current);
    }
    calculatorRef.current = calc;
  }, [settings, isReady]);

  // Debounced calculation
  const calculate = useCallback((text: string) => {
    if (!calculatorRef.current) return;

    const calcResult = calculatorRef.current.calculate(text);
    setResults(calcResult.results);
    setErrors(calcResult.errors);
    setAst(calcResult.ast);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    calculate(effectiveInput);
  }, [effectiveInput, isReady, calculate, settings, exchangeRatesVersion]);

  return { results, errors, ast, isReady, exchangeRatesVersion };
}
