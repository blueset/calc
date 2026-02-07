import { useState, useRef, useEffect, useCallback } from 'react'
import { DataLoader } from '@/calculator/data-loader'
import { Calculator } from '@/calculator/calculator'
import type { LineResult, CalculationResult } from '@/calculator/calculator'
import type { Document } from '@/calculator/document'
import type { Settings } from '@/calculator/settings'

const EXCHANGE_RATES_URL =
  'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json'

export interface UseCalculatorReturn {
  results: LineResult[]
  errors: CalculationResult['errors']
  ast: Document | null
  isReady: boolean
}

export function useCalculator(input: string, settings: Partial<Settings>, debounce = false): UseCalculatorReturn {
  const [results, setResults] = useState<LineResult[]>([])
  const [errors, setErrors] = useState<CalculationResult['errors']>({ lexer: [], parser: [], runtime: [] })
  const [ast, setAst] = useState<Document | null>(null)
  const [isReady, setIsReady] = useState(false)

  const dataLoaderRef = useRef<DataLoader | null>(null)
  const calculatorRef = useRef<Calculator | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const exchangeRatesRef = useRef<unknown>(null)

  // Initialize DataLoader + fetch exchange rates
  useEffect(() => {
    const dl = new DataLoader()
    dl.load()
    dataLoaderRef.current = dl
    setIsReady(true)

    // Fetch exchange rates in background
    fetch(EXCHANGE_RATES_URL)
      .then(res => res.json())
      .then(data => {
        if (data?.usd) {
          exchangeRatesRef.current = data
          // Load into current calculator instance
          calculatorRef.current?.loadExchangeRates(data)
        }
      })
      .catch(() => {
        // Exchange rates are optional - calculator works without them
      })
  }, [])

  // Recreate Calculator when settings change, reuse cached exchange rates
  useEffect(() => {
    if (!dataLoaderRef.current) return
    const calc = new Calculator(dataLoaderRef.current, settings)
    if (exchangeRatesRef.current) {
      calc.loadExchangeRates(exchangeRatesRef.current)
    }
    calculatorRef.current = calc
  }, [settings, isReady])

  // Debounced calculation
  const calculate = useCallback((text: string) => {
    if (!calculatorRef.current) return

    const calcResult = calculatorRef.current.calculate(text)
    setResults(calcResult.results)
    setErrors(calcResult.errors)

    const parseResult = calculatorRef.current.parse(text)
    setAst(parseResult.ast)
  }, [])

  useEffect(() => {
    if (!isReady) return

    if (timerRef.current) clearTimeout(timerRef.current)

    if (debounce) {
      timerRef.current = setTimeout(() => calculate(input), 150)
    } else {
      calculate(input)
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [input, isReady, calculate, settings, debounce])

  return { results, errors, ast, isReady }
}
