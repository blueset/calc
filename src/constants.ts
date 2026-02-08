// Also change in index.html.
export const APP_NAME = import.meta.env.VITE_APP_TITLE || "Calc";

export const DEFAULT_DOCUMENT = `# Arithmetic
2 + 3
10 * 4 - 7
(100 + 50) / 3

# Units
5 km
25 km + 50 mi
3 ft 10 in + 20 in

# Conversions
100 C to F
1 mile to km
171 cm to ft in
3 hrs 15 min + 45 min to hrs min

# Variables
size = 12.59 GiB
speed = 100 Mbps
time = size / speed in min

# Date & Time
now
3 hours ago
18:30 New York in London
now + 2 months 3 days
2038-01-19 03:14:07 UTC - now  # The infamous 2038 problem!

# Currency
100 USD to EUR
100 USD + 215 CAD
100 USD/person * 3 person/day * 5 days in JPY

`;

export const DEMO_DOCUMENT = `# Welcome to ${APP_NAME}!
A notepad calculator where math just works. Type expressions, see results instantly. Edit anything — this document is live!

42 * 1.5
sqrt(144) + 10
100 km to miles
now + 3 days

> ℹ️ **Demo Mode**
> Changes made here will not affect your original document,
> and will be discarded when you exit demo mode.
> Return to ${APP_NAME} from the title above to exit demo mode.

## Arithmetic
Basic math with +, -, *, /, ^, and parentheses. Use ! for factorial and mod (or %) for modulo.

2 + 3 * 4
(100 + 50) / 3
2 ^ 10
5!
18 mod 7

Alternative operators: × and · for multiplication, ÷ for division.

6 × 7
12 ÷ 4
3 · 5

## Numbers
Decimals, scientific notation, underscore separators, and different bases.

3.14159
2.5e6
1_000_000
0xFF
0b1010
0o777
ABC base 16
1010 base 2
HELLO base 30

Percentages are evaluated as decimals:

50%
200 * 15%

## Constants
Built-in mathematical constants (case-insensitive):

pi
e
phi
sqrt2
Infinity

## Functions
### Trigonometry
sin(30 deg)
cos(60 deg)
tan(45 deg)
asin(0.5)
acos(0.5)
atan(1)

### Hyperbolic
sinh(1)
cosh(0)
tanh(0.5)

### Logarithms & Roots
sqrt(256)
cbrt(27)
log(100)
ln(e^2)
log10(1000)
exp(2)

### Rounding & Numbers
abs(-42)
round(3.7)
floor(3.9)
ceil(3.1)
trunc(-4.7)
frac(5.75)
sign(-10)

Round to the nearest multiple:

round(12, 5)
round(6200 m, 5 km)
floor(7, 3)
ceil(7, 3)
trunc(-4.7, 0.5)

### Combinatorics
perm(5, 2)
comb(10, 3)

### Random Numbers
random()  # float in [0, 1)
random(100)  # integer in [0, 100)
random(1, 10)  # integer in [1, 10)
random(0, 100, 5)  # multiple of 5 in [0, 100)

## Variables
Assign values with = and use them in later expressions:

price = 49.99
quantity = 3
subtotal = price * quantity
tax = subtotal * 8.25%
total = subtotal + tax

Works with units too:

speed = 60 km/h
time = 2.5 h
distance = speed * time
distance to miles

## Values
Supports length, mass, time, temperature, data, energy units, and more.

### Dimensionless Values
0.75
50%
100 thousand

### Values with Simple Units
5 km
180 lbs
25 °C
500 GB
750 watts

Units can be pluralized or abbreviated:
1 t
1 ton
1 tonne
2 tons
3 tonnes
5 metric tons

### Composite Values
Combine units of the same dimension:

5 ft 7 in
2 hr 30 min 15 sec
3 kg 500 g

### Values with Derived Units
Create compound units with multiplication, division, and exponents:

60 km/h
9.8 m/s^2
1.225 kg/m^3
50 watts per square meter

### Cross-Unit Arithmetic
Units convert automatically when compatible:

5 km + 500 m
2 hours - 45 min
100 ft^2 + 5 m^2

### User-Defined Units
Unknown units are treated as custom dimensions:

150 apples
30 apples/day
150 apples / 30 apples/day

### Supported Units Reference

Dimensionless:
- Ratios: percent (%), permille (‰)
- Counting: dozen, gross, score, mol
- Large numbers: thousand, million, billion, trillion

Length:
- SI: m, km, cm, mm, μm, nm… (and other SI prefixes)
- Imperial: in, ft, yd, mi
- Other: Å (angstrom), nmi (nautical mile), au, ly (lightyear)

Mass:
- SI: g, kg, mg, μg… (and other SI prefixes)
- Imperial: oz, lb, st (stone), short ton, long ton
- Metric: t (tonne), ct (carat)

Area:
- SI: m², km², cm², mm²
- Imperial: ft², in², mi², sq ft, sq in, sq mi
- Other: ha (hectare), acre

Volume:
- SI: m³, cm³, mm³, cc
- Imperial: ft³, in³
- Liquid SI: L, mL, μL… (and other SI prefixes)
- US/UK: tsp, tbsp, cup, fl oz, pt, qt, gal

Temperature:
- °C, °F, K (Celsius, Fahrenheit, Kelvin)
- Can also be written as C, F, deg C, deg F, celsius, fahrenheit, kelvin, degree Celsius, degree Fahrenheit, etc.

Time:
- SI: s, ms, μs, ns… (and other SI prefixes)
- Calendar: min, h, day, wk, mo, yr

Energy:
- SI: J, kJ, MJ, GJ… (and other SI prefixes)
- Calories: cal, kcal, gcal (small calorie)
- Other: BTU, eV (electronvolt), kWh

Power:
- SI: W, kW, MW, GW… (and other SI prefixes)
- Other: HP (horsepower)

Pressure:
- SI: Pa, kPa, MPa, GPa… (and other SI prefixes)
- Other: bar, atm, psi, mmHg, inHg

Force:
- SI: N, kN, MN… (and other SI prefixes)
- Other: lbf (pound-force), kgf (kilogram-force)

Data:
- Bit (SI): bit, kb, Mb, Gb, Tb… (and other SI prefixes)
- Bit (binary): Kib, Mib, Gib, Tib… (and other binary prefixes)
- Byte (SI): byte, kB, MB, GB, TB… (and other SI prefixes)
- Byte (binary): KiB, MiB, GiB, TiB… (and other binary prefixes)

Data Rate:
- Bit rate (SI): bps, kbps, Mbps, Gbps…
- Bit rate (binary): Kibps, Mibps, Gibps…
- Byte rate (SI): Bps, kBps, MBps, GBps…
- Byte rate (binary): KiBps, MiBps, GiBps…

Angle:
- rad (radian), deg or ° (degree)
- ′ or arcmin (arcminute), ″ or arcsec (arcsecond)

Frequency:
- SI: Hz, kHz, MHz, GHz, THz… (and other SI prefixes)
- Other: cycle, beat, BPM (beats per minute)

Electrical:
- Current: A, mA, μA… (and other SI prefixes)
- Voltage: V, mV, kV… (and other SI prefixes)
- Resistance: Ω, kΩ, MΩ… (and other SI prefixes)

Other:
- Luminosity: cd (candela)
- Printing: dot, dpi (dots per inch)
- Computing: ops (operation), FLOPS, MFLOPS, GFLOPS…

## Unit Conversions
Convert with to, in, as, -> or →:

100 °C to °F
5 miles in km
1 light year as km
500 g → oz

### Composite Targets
Convert to mixed units:

171 cm to ft in
5000 seconds to hr min sec

### Chained Conversions
5 km to m in cm
100 USD to EUR to GBP

## Currency
Supports ISO codes, symbols, and names with live exchange rates.

### ISO Codes
100 USD
50 EUR
10000 JPY

### Currency Symbols
€250
US$50
CA$75
₹5000
⃁100

### Currency Names
100 US dollars
50 euros
1000 japanese yen

### Currency Arithmetic
100 USD + 50 EUR
200 GBP * 3
1000 JPY / 4

### Currency Conversion
100 USD to EUR
500 EUR to GBP
10000 JPY to USD

### Derived Currency Units
150 USD/person * 4 person
75 EUR/hour * 8 hours

## Date & Time
### Date Formats

Numerical dates must be in the order of year, month, day.
2038-01-19
2038.01.19

English month names in full and abbreviated are supported.
2038 Jan 19
2038 January 19
Jan 19 2038
January 19 2038
19 Jan 2038
19 January 2038

### Time Formats

Time values by default are in 24-hour format.
14:30
03:14:07

You can also specify AM/PM for 12-hour format: 
2:30 PM
8 am

### Relative Dates & Times
now
today
yesterday
tomorrow
3 days ago
2 weeks from now
6 months ago

### Unix Timestamps
Unix timestamps are shown in your local timezone.
0 unix
1700000000 unix
2147483647000 unix ms

You can also set the timezone explicitly:
0 unix in UTC
0 unix in Tokyo

### Date & Time Arithmetic
2024 Jun 15 - 2024 Jan 01
now + 100 days
14:30 + 2 hours 15 minutes
2038 Jan 19 03:14:07 UTC - today

### Timezone Conversions
Supports UTC offsets, IANA zones, timezone names and abbreviations, and city names:

12:00 UTC
18:30 Tokyo
15:00 New York
9:00 UTC+5:30
06:30 PM PT
18:30 Pacific Time
now in London
10:00 AM America/Los_Angeles to Europe/Paris
2000-01-01 08:00 Singapore in Buenos Aires
10 hours from now in Australian Eastern Standard Time

### Property Extraction
Extract components from dates and times:

today to year
today to month
today to weekday # 1 (Monday) through 7 (Sunday)
now to hour
today to day of year
today to week of year

## Presentation Formats
Format output in different ways.

### Number Bases
255 to binary
255 to hex
255 to octal
0xDEADBEEF to oct
HelloWorld base 36 to decimal
100 to base 7

### Fractions
0.75 to fraction
2.5 to fraction
0.3333 to fraction

### Scientific Notation
299792458 to scientific
0.00000001 to scientific

### Percentages
0.15 to percentage
1.5 to %

### Ordinals
42 to ordinal
1 to ordinal
23 to ordinal

### Precision Control
pi to 2 decimals
pi to 6 decimals
12345 to 3 sig figs

### Date/Time Formats
now to ISO 8601
12:30 Seattle to RFC 9557
2038-01-19 03:14:07 to RFC 2822

ISO 8601 and RFC 9557 supports all date, time, and duration values.
RFC 2822 supports date and time values, but not durations.

now to unix
now to unix ms

Unix timestamps support both seconds and milliseconds.
Available aliases include: \`unix\` \`unix s\` \`unix second\` \`unix seconds\` \`unix ms\` \`unix millisecond\` \`unix milliseconds\`

## Boolean & Logic
### Comparisons
5 > 3
10 <= 10
100 == 1e2
5 != 6
5 km > 3 miles

### Logical Operators
true && false
true || false
!true

### Conditionals
if 5 > 3 then 100 else 200
if (today to weekday) > 5 then 1.5 else 1.0

### Bitwise Operations
0b1010 & 0b1100 to binary
0b1010 | 0b1100 to binary
0b1010 xor 0b1100 to binary
~0b1010 to binary
0b1 << 4 to binary
0b10000 >> 2 to binary

## Text Formatting
### Headings
Lines starting with \`#\` become headings (like this manual). Use \`#\` through \`######\` for different levels.

### Comments
Add \`#\` anywhere on a line for inline comments:

100 * 1.08  # price with tax
365.25 * 24  # hours in a year

### Plain Text
Lines that aren’t valid expressions appear as plain text, like this sentence.

### Markdown Support
The editor supports most GFM (GitHub Flavored Markdown) syntax highlighting **bold**, *italic*, ~~strikethrough~~, and more alongside live calculations.

## Settings
Customize your experience with themes, fonts, and more. Changes apply immediately and persist across sessions.

You can:
- adjust font size, font style
- toggle between light and dark themes
- toggle line wrapping
- adjust number formatting options (precision, decimal separator, number groupings, etc.)
- adjust date time formatting options
- switch between US and UK style of imperial units (e.g. gallon, ton)

   * * *

That’s it! Return to ${APP_NAME} from the title above, start editing, and make it your own.
`;

export const FONT_SIZE_MAP = {
  small: 13,
  medium: 15,
  large: 18,
} as const;

export const FONT_FAMILY_MAP: Record<string, string> = {
  monospace: "var(--font-mono)",
  "sans-serif": "var(--font-sans)",
  serif: "var(--font-serif)",
};

export const SUPERSCRIPTS: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "-": "⁻",
  ".": "·",
};

export const SUBSCRIPTS: Record<string, string> = {
  "0": "₀",
  "1": "₁",
  "2": "₂",
  "3": "₃",
  "4": "₄",
  "5": "₅",
  "6": "₆",
  "7": "₇",
  "8": "₈",
  "9": "₉",
  "-": "₋",
  ".": ".",
};

export const DOCUMENT_STORAGE_KEY = "calc-document";
export const SETTINGS_STORAGE_KEY = "calc-settings";
export const EXCHANGE_RATES_STORAGE_KEY = "calc-exchange-rates";
