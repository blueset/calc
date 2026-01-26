# Specification

I want to build a web application for a “notepad calculator” where user can write math expressions in a text area and get the results calculated in real-time. The main layout is a simple text area on the left and a results pane on the right. The expression and results should align line by line.

## Main instruction

Please read this entire specification, research any existing similar products, libraries, or frameworks that could help in building this application, and then provide a detailed plan for implementation. Your plan should implement the entire specification and leverage existing tools where appropriate.

## Similar products

- Open source
    - https://github.com/teamxenox/caligator
    - https://github.com/SteveRidout/notepad-calculator
    - https://github.com/antonmedv/numbr/
    - https://github.com/bornova/numara-calculator
    - https://github.com/parnoldx/nasc
    - https://github.com/sharkdp/numbat
    - https://github.com/ronkok/Hurmet
    - https://bitbucket.org/heldercorreia/speedcrunch
    - https://github.com/bbodi/notecalc3
    - https://github.com/LorenzoCorbella74/soulver-web
- Proprietary
    - https://soulver.app/
    - https://hissab.io
    - https://instacalc.com/
    - https://numi.app/
    - https://calca.io/

## Features in example

Below is the list of features in the style of a calculation transcript. The content starting with `⎙` represents the calculation result of the previous line, and is not a part of the user input.

```md
# Text content
Anything that is not a valid expression is treated as plain text, and no calculation result is shown.

# Inline comments
If a line contains an inline comment starting with `#`, the comment and anything after it is ignored for calculation.
5 + 5 # this is a comment ⎙ 10
20 / 4 # another comment ⎙ 5

If text content contains `#` at the start of the line, it is treated as a heading.

If the text before `#` is not a valid expression, the entire line is treated as plain text.

# Values
## Numbers
Support the following number formats:
0 # integer ⎙ 0
3.14 # decimal ⎙ 3.14
1_000 # with underscore as thousands separator ⎙ 1000
2.5e3 # scientific notation (uppercase and lowercase E) ⎙ 2500
4.8E-2 # scientific notation with negative exponent ⎙ 0.048
-5 # negative number ⎙ -5

## Number bases
0b1010 ⎙ 10
1010 base 2 ⎙ 10
1010 bin ⎙ 10
1010 binary ⎙ 10
0o12 ⎙ 10
12 base 8 ⎙ 10
12 octal ⎙ 10
12 oct ⎙ 10
0xA ⎙ 10
A base 16 ⎙ 10
A hexadecimel ⎙ 10
A hex ⎙ 10
255 ⎙ 255
255 decimal ⎙ 255
255 dec ⎙ 255
255 base 10 ⎙ 255
Support arbitrary base from 2 to 36:
ABC base 36 ⎙ 13368
10 base 3 ⎙ 3
100 base 4 ⎙ 16

## Date and time
Plain date: Support input format YYYY.M.D (in numbers), YYYY MMM D, D MMM YYYY, MMM D YYYY, YYYY MMMM D, D MMMM YYYY, MMMM D YYYY (in English)
1970.01.01 ⎙ 1970-01-01 Thu
1970 Jan 01 ⎙ 1970-01-01 Thu
01 Jan 1970 ⎙ 1970-01-01 Thu
Jan 01 1970 ⎙ 1970-01-01 Thu
1970 January 01 ⎙ 1970-01-01 Thu
01 January 1970 ⎙ 1970-01-01 Thu
January 01 1970 ⎙ 1970-01-01 Thu

Note: YYYY-MM-DD (ISO 8601) is not supported as it conflicts with subtraction operator.

Relative date: Support relative date expressions like `today`, `yesterday`, `tomorrow`, `N days/weeks/months/years ago/from now`
today ⎙ (current date in settings date format)
yesterday ⎙ (current date - 1 day in settings date format)
tomorrow ⎙ (current date + 1 day in settings date format)
3 days ago ⎙ (current date - 3 days in settings date format)
5 weeks from now ⎙ (current date + 5 weeks in settings date format)
2 months ago ⎙ (current date - 2 months in settings date format)
1 year from now ⎙ (current date + 1 year in settings date format)

Relative date are computed base on gregorian calendar rules. E.g. adding 1 month to January 31 results in February 28 (or 29 in leap years).

Relative date values are of type “plain date”.

Plain time: Support input format H:MM (24-hour), H:MM AM/PM (12-hour), H:MM:SS (24-hour), H:MM:SS AM/PM (12-hour) H AM/PM (12-hour)
14:30 ⎙ 14:30:00
2:30 PM ⎙ 14:30:00
2:30 am ⎙ 02:30:00
14:30:15 ⎙ 14:30:15
2:30:15 PM ⎙ 14:30:15
1 pm ⎙ 13:00:00
11 AM ⎙ 11:00:00

Relative time: Support relative time expressions like `now`, `N seconds/minutes/hours ago/from now`
now ⎙ (current time in settings date time format)
5 seconds ago ⎙ (current time - 5 seconds in settings date time format)
10 minutes from now ⎙ (current time + 10 minutes in settings date time format)
2 hours ago ⎙ (current time - 2 hours in settings date time format)

Relative time are of type “instant”.

Plain date time:
Support input format `{plain date} {plain time}` and `{plain time} {plain date}`
1970 Jan 01 14:30 ⎙ 1970-01-01 Thu 14:30:00
14:30 1970 Jan 01 ⎙ 1970-01-01 Thu 14:30:00
01 January 1970 2:30 PM ⎙ 1970-01-01 Thu 14:30:00
2:30 PM 01 January 1970 ⎙ 1970-01-01 Thu 14:30:00

Unix time:
Support input format in seconds or milliseconds since Unix epoch (1970 Jan 01 00:00:00 UTC)
3600 unix ⎙ 1970-01-01 Thu 01:00:00 UTC
3600 unix seconds ⎙ 1970-01-01 Thu 01:00:00 UTC
3600 unix s ⎙ 1970-01-01 Thu 01:00:00 UTC
3600000 unix milliseconds ⎙ 1970-01-01 Thu 01:00:00 UTC
3600000 unix ms ⎙ 1970-01-01 Thu 01:00:00 UTC

Unix times are of type “instant”.

# Constants
NaN # (case insensitive, also nan) ⎙ NaN
Infinity # (case insensitive) ⎙ Infinity
inf # (case insensitive) ⎙ Infinity
pi # (case insensitive) ⎙ 3.141592653589793
π # (case insensitive) ⎙ 3.141592653589793
e # (case insensitive) ⎙ 2.718281828459045
golden_ratio # (case insensitive) ⎙ 1.618033988749895
phi # (case insensitive) ⎙ 1.618033988749895
φ # (case insensitive) ⎙ 1.618033988749895

# Units

## Dimension-less units
### English number units
5 dozen ⎙ 60
3 gross ⎙ 432
2 score ⎙ 40
10 thousand ⎙ 10000
2 million ⎙ 2000000
5 billion ⎙ 5000000000
1 trillion ⎙ 1000000000000

### Other
100 percent ⎙ 1
50% ⎙ 0.5
1 per thousand ⎙ 0.001
1 per mille ⎙ 0.001
1‰ ⎙ 0.001
1 mol ⎙ 6.02214076e23

## Length
5 cm ⎙ 5 cm
5 centimeters ⎙ 5 cm
2 m ⎙ 2 m
2 meters ⎙ 2 m
1 km ⎙ 1 km
1 kilometer ⎙ 1 km
Support meters with all SI prefixes, spelt out or abbreviated.
Note: abbreviations of attometers, picometers, petameters conflict with am, pm respectively. am/AM/PM of number written exactly as /(0?[1-9]|1[0-2])/ are treated as time indicators only. To use attometers, picometers, petameters, add a decimal part or use the full spelling for these 12 values.

10 am # plain time ⎙ 10:00:00
10.0 am ⎙ 10 attometers
10 attometers ⎙ 10 am
13 am # 13 attometers ⎙ 13 am
10 pm # plain time ⎙ 22:00:00
10.0 pm ⎙ 10 picometers
10 picometers ⎙ 10 pm
22 pm # 22 picometers ⎙ 22 pm
10 PM # plain time ⎙ 22:00:00
10.0 PM ⎙ 10 Pm
10 petameters ⎙ 10 Pm
33 PM # 33 petameters ⎙ 33 Pm

10 inch ⎙ 10 in
10 inches ⎙ 10 in
10 in ⎙ 10 in
5′ ⎙ 5 ft
5' ⎙ 5 ft
5″ ⎙ 5 in
5'' ⎙ 5 in
5" ⎙ 5 in
Support inches, feet, yards, miles (spelt out, abbreviated, or symbol).
Refer to settings for US/UK definition.

10 angstrom ⎙ 10 Å
10 Å ⎙ 10 Å

5 nautical mile ⎙ 5 nmi
4 astronomical unit ⎙ 4 au
3 lightyear ⎙ 3 ly

## Weight/Mass
7 g ⎙ 7 g
7 grams ⎙ 7 g
3 kg ⎙ 3 kg
3 kilograms ⎙ 3 kg
Support grams with all SI prefixes, spelt out or abbreviated.
5 ton ⎙ 5000 kg
5 tonne ⎙ 5000 kg
5 t ⎙ 5000 kg
Support metric tons (tonnes), spelt out or abbreviated, treated as alias of 1000 kg.

5 carats ⎙ 5 ct
10 ounces ⎙ 10 oz
10 lbs ⎙ 10 lb
Support ounces, pounds, stones (spelt out or abbreviated).

1 short ton ⎙ 2000 lb
Support US short tons (spelt out or abbreviated), treated as alias of 2000 lb.
1 long ton ⎙ 2240 lb
Support UK long tons (spelt out or abbreviated), treated as alias of 2240 lb.

## Area
1 m² ⎙ 1 m²
1 m^2 ⎙ 1 m²
1 square meter ⎙ 1 m²
1 meter squared ⎙ 1 m²
1 ft² ⎙ 1 ft²
1 ft^2 ⎙ 1 ft²
1 sq ft ⎙ 1 ft²
Support square length units (meters, feet, etc.), in both shorthand and longhand forms. e.g. `unit^2`, `unit²`, `unit squared`, `square unit`, `sq unit`.
See “derived units” for more complex forms.

1 hectare ⎙ 1 ha
1 ha ⎙ 1 ha
1 acre ⎙ 1 acre

## Volume
1 L ⎙ 1 L
1 liter ⎙ 1 L
1 mL ⎙ 1 mL
1 milliliter ⎙ 1 mL
Support liters with all SI prefixes, spelt out or abbreviated.

1 teaspoon ⎙ 1 tsp
1 tablespoon ⎙ 1 tbsp
1 cup ⎙ 1 cup
Support imperial units teaspoon, tablespoon, cup, fluid ounce, pint, quart, gallon (spelt out or abbreviated).
Refer to settings for US/UK definition.

1 m³ ⎙ 1 m³
1 m^3 ⎙ 1 m³
1 cubic meter ⎙ 1 m³
1 meter cubed ⎙ 1 m³
1 ft³ ⎙ 1 ft³
1 ft^3 ⎙ 1 ft³
Support cubic length units (meters, feet, etc.), in both shorthand and longhand forms. e.g. `unit^3`, `unit³`, `unit cubed`, `cubic unit`.
See “derived units” for more complex forms.

1 cc ⎙ 1 cm³
Support cc (cubic centimeters) as alias of cm³.

## Temperature
25 °C ⎙ 25 °C
25 Celsius ⎙ 25 °C
77 °F ⎙ 77 °F
77 Fahrenheit ⎙ 77 °F
25 K ⎙ 25 K
25 Kelvin ⎙ 25 K
Support Celsius (°C, degree Celsius, deg C), Fahrenheit (°F, degree Fahrenheit, deg F), Kelvin (K) (spelt out or abbreviated).

## Energy
5 J ⎙ 5 J
5 joules ⎙ 5 J
10 kJ ⎙ 10 kJ
10 kilojoules ⎙ 10 kJ
Support joules with all SI prefixes, spelt out or abbreviated.

100 sm cal ⎙ 100 gcal
100 small calories ⎙ 100 gcal
100 kcal ⎙ 100 kcal
100 kilocalories ⎙ 100 kcal
Support small calories and kilocalories, spelt out or abbreviated.

100 cal ⎙ 100 kcal
100 calories ⎙ 100 kcal
Support calories as alias of kilocalories.

1 eV ⎙ 1 eV
1 electronvolt ⎙ 1 eV
1 keV ⎙ 1 keV
1 kiloelectronvolt ⎙ 1 keV
Support electronvolts with all SI prefixes, spelt out or abbreviated.

1 kWh ⎙ 1 kW h
1 kilowatt hour ⎙ 1 kW h
1 kW h ⎙ 1 kW h
1 kilowatt-hour ⎙ 1 kW h
Support kWh, kilowatt hour as an alias of derived unit kW h.
See “derived units” for more complex forms.

1 BTU ⎙ 1 BTU
1 British Thermal Unit ⎙ 1 BTU

1 foot-pound ⎙ 1 ft lbf
Support foot-pound as alias of derived unit ft lbf.

## Speed
60 km/h ⎙ 60 km/h
60 kilometers per hour ⎙ 60 km/h
See “derived units” for more complex forms.

45 mph ⎙ 45 mi/h
Support mph as an alias of mi/h.

1 knot ⎙ 1 knot
1 kt ⎙ 1 knot
1 mach ⎙ 1 mach

## Time
30 ms ⎙ 30 ms
30 milliseconds ⎙ 30 ms
30 s ⎙ 30 s
30 sec ⎙ 30 s
30 seconds ⎙ 30 s
30 min ⎙ 30 min
30 minutes ⎙ 30 min
1 h ⎙ 1 hour
1 hours ⎙ 1 hour
24 hr ⎙ 24 hours
24 hrs ⎙ 24 hours
24 hours ⎙ 24 hours
1 day ⎙ 1 day
1 wk ⎙ 1 week
1 week ⎙ 1 week
1 mth ⎙ 1 month
1 month ⎙ 1 month
1 yr ⎙ 1 year
2 yrs ⎙ 2 years
1 year ⎙ 1 year
Support milliseconds, seconds, minutes, hours, days, weeks, months, years (spelt out or abbreviated).

## Power
100 W ⎙ 100 W
100 watts ⎙ 100 W
1 kW ⎙ 1 kW
1 kilowatt ⎙ 1 kW
Support watts with all SI prefixes, spelt out or abbreviated.

1 HP ⎙ 1 HP
1 horsepower ⎙ 1 HP
Support horsepower as imperial horsepower (spelt out or abbreviated).

1 foot-pound per second ⎙ 1 ft lbf/s
1 BTTU per minute ⎙ 1 BTU/min
See “derived units” for more complex forms.

## Data storage

1 bit ⎙ 1 bit
1 b ⎙ 1 bit
1 kb ⎙ 1 kb
1 kilobit ⎙ 1 kb
1 Kib ⎙ 1 Kib
1 kibibit ⎙ 1 Kib

1 byte ⎙ 1 byte
1 B ⎙ 1 byte
1 KB ⎙ 1 KB
1 kilobyte ⎙ 1 KB
1 KiB ⎙ 1 KiB
1 kibibyte ⎙ 1 KiB

Support bits and bytes with all SI and binary prefixes, spelt out or abbreviated.

## Data transfer rate
1 bps ⎙ 1 bit/s
1 kbps ⎙ 1 kb/s
1 Mbps ⎙ 1 Mb/s
1 Gbps ⎙ 1 Gb/s
1 Tbps ⎙ 1 Tb/s
Support the above as aliases of of their corresponding derived units.

## Pressure
100 Pa ⎙ 100 Pa
100 pascal ⎙ 100 Pa
100 kPa ⎙ 100 kPa
100 kilopascal ⎙ 100 kPa
Support pascals with all SI prefixes, spelt out or abbreviated.

1 atm ⎙ 1 atm
1 atmosphere ⎙ 1 atm
1 bar ⎙ 1 bar
1 mmHg ⎙ 1 mmHg
1 millimeter of mercury ⎙ 1 mmHg
1 inHg ⎙ 1 inHg
1 inch of mercury ⎙ 1 inHg

1 psi ⎙ 1 lbf/in²
Support psi as alias of derived unit lbf/in².

1 kgf/cm² ⎙ 1 kgf/cm²
See “derived units” for more complex forms.

## Force
10 N ⎙ 10 N
1 kN ⎙ 1 kN
Support newtons with all SI prefixes, spelt out or abbreviated.

1 lbf ⎙ 1 lbf
1 pound-force ⎙ 1 lbf
1 kgf ⎙ 1 kgf
1 kilogram-force ⎙ 1 kgf

## Angle
10 deg ⎙ 10 deg
10 degree ⎙ 10 deg
10° ⎙ 10 deg
0.5 rad ⎙ 0.5 rad
0.5 radian ⎙ 0.5 rad

## Frequencies
1 cycle ⎙ 1 cycle
2 cycles ⎙ 2 cycles
1 Hz ⎙ 1 Hz
1 hertz ⎙ 1 Hz
1 kHz ⎙ 1 kHz
1 kilohertz ⎙ 1 kHz
Support cycles and hertz with all SI prefixes, spelt out or abbreviated.
Internally, treat hertz as derived unit cycles per second.

1 operation ⎙ 1 ops
2 operations ⎙ 2 ops

1 FLOPS ⎙ 1 FLOPS
1 MFLOPS ⎙ 1 MFLOPS
1 GFLOPS ⎙ 1 GFLOPS
Support FLOPS with all SI prefixes.
Internally, treat FLOPS as derived unit ops per second.

1 beat ⎙ 1 beat
2 beats ⎙ 2 beats
1 BPM ⎙ 1 BPM
1 bpm ⎙ 1 BPM
Support BPM (beats per minute).
Internally, treat BPM as derived unit beats per minute.

## Current
10 A ⎙ 10 A
10 ampere ⎙ 10 A
10 amperes ⎙ 10 A
1 mA ⎙ 1 mA
1 milliampere ⎙ 1 mA
Support amperes with all SI prefixes, spelt out or abbreviated.

## Luminous intensity
10 cd ⎙ 10 cd
10 candela ⎙ 10 cd
10 candelas ⎙ 10 cd
Support candelas with all SI prefixes, spelt out or abbreviated.

## Printing / Display

1 dot ⎙ 1 dot
10 dots ⎙ 10 dots
320 dpi ⎙ 320 dpi
Support dpi (dots per inch).
Internally, treat dpi as derived unit dots per inch.


## Currency
Support currencies with their standard 3-letter ISO 4217 codes (case insensitive):
10 USD ⎙ 10.00 USD
10 EUR ⎙ 10.90 EUR
10 JPY ⎙ 10 JPY
Note this list is not exhaustive.

Support unambiguous currency names and symbols:
10 US dollars ⎙ 10.00 USD
10 euros ⎙ 10.00 EUR
€10 ⎙ 10.00 EUR
£10 ⎙ 10.00 GBP
₹10 ⎙ 10.00 INR
⃁10 ⎙ 10.00 SAR
10 dong ⎙ 10 VND
US$10 ⎙ 10.00 USD
C$10 ⎙ 10.00 CAD
CA$10 ⎙ 10.00 CAD
CAN$10 ⎙ 10.00 CAD
A$10 ⎙ 10.00 AUD
NT$10 ⎙ 10.00 TWD
HK$10 ⎙ 10.00 HKD
Note this list is not exhaustive.

Support other unambiguous currency names:

10 won ⎙ 10 KRW
10 yuan ⎙ 10.00 CNY
10 renminbi ⎙ 10.00 CNY
10 RMB ⎙ 10.00 CNY
10 円 ⎙ 10 JPY
Note this list is not exhaustive.

Ambiguous currency names are treated as currency units of their own dimension, and cannot be converted to other currencies.

Dollars = `$`
10 dollars ⎙ $10
$10 ⎙ $10
10 cents ⎙ ¢10
¢10 ⎙ ¢10
¥10 ⎙ ¥10
10 pesos ⎙ 10 pesos
10 francs ⎙ 10 francs
10 rupees ⎙ 10 rupees
10 pennies ⎙ 10 pennies
¤10 ⎙ ¤10
10 元 ⎙ 10 元
Note this list is not exhaustive, other ambiguous currency names should be treated similarly.

Note that pounds are resolved to pounds mass (lbs) in the weight/mass section.
10 pounds ⎙ 10 lbs

Output currency format rules for unambiguous currencies:
- Use the standard 3-letter ISO 4217 code for the currency.
- Use ISO 4217 minor unit for decimal places (e.g. 2 decimal places for USD, 0 decimal places for JPY, 3 decimal places for KWD).

Output currency format rules for ambiguous currencies:
- Use the same format as the input (e.g. `pesos`, `francs`, `¤`).
    - The only exception is `dollars` which has a corresponding abbreviated symbol `$`.

Only currency currently in use needs to be supported for conversion. Historical currencies (e.g. DEM, FRF, ITL) do not need to be supported.

## Timezone
Timezones are a special kind of unit that applys to types “plain date time”, and “plain time”.
Attaching a timezone unit to a “plain time” assumes the date is today in that timezone.
Attaching a timezone unit converts the unit to type “zoned date time”.

Timezone can be specified as:
- UTC: `UTC`, `Z`, `Coordinated Universal Time`, `GMT`, `Greenwich Mean Time`
- UTC offset: `UTC+h`, `UTC-h`, `UTC+h:mm`, `UTC-h:mm`, `UTC+hmm`, `UTC-hmm`, `GMT+h`, `GMT-h`, `GMT+h:mm`, `GMT-h:mm`, `GMT+hmm`, `GMT-hmm`
- IANA timezone name: e.g. `America/New_York`, `Europe/London`, `Asia/Tokyo`, etc.
- Unambiguous long and short timezone : e.g. `Eastern Standard Time`, `Eastern Time`, `Central European Time`, `Japan Standard Time`, `Japan Time`, `AEST`, `JST`, etc.
- Unambiguous major city names: e.g. `New York`, `London`, `Tokyo`, `Sydney`, etc.

Timezones are resolved to IANA timezone names internally. Daylight saving specific names are resolved to their standard timezone names (e.g. `Eastern Time`, `Eastern Daylight Time` and `Eastern Standard Time` all resolve to `America/New_York`).

Unambiguous names refers to names that only map to a single IANA timezone. Ambiguous names are not supported.

Source of timezones list: `Intl.supportedValuesOf("timeZone")`
Source of long and short timezone names: `(new Intl.DateTimeFormat(`en-{countryCode}`, { timeZone: timezone, timeZoneName: "long" | "longGeneric" | "shortGeneric" })).format(new Date())`
Source of world’s major cities: https://download.geonames.org/export/dump/cities15000.zip
- Filter to population > 500000 or capital cities (`PPLC`) only.

Examples:
12:30 UTC ⎙ 12:30:00 UTC
8:25 JST ⎙ 08:25:00 UTC+9
2023 Jan 01 14:00 America/New_York ⎙ 2023-01-01 Sun 14:00:00 UTC-5
2023.06.15 09:00 London ⎙ 2023-06-15 Thu 09:00:00 UTC+1

Render rules for zoned date time:
- If the date is today in the specified timezone, render as `(settings time format) UTC±H(:MM)`.
- If the date is specified, render as `(settings date time format) UTC±H(:MM)`.

## User specified units
When an unknown unit is encountered, consider it as a user specified unit. Each user specified unit is treated as its own dimension, and cannot be converted to other units.

1 click ⎙ 1 click
2 trips ⎙ 2 trips

## Derived units
Support derived units formed by combining basic units using multiplication, division, and exponentiation.
1 N m ⎙ 1 N m
1 newton meter ⎙ 1 N m
1 J s ⎙ 1 J s
1 joule second ⎙ 1 J s
1 W/m² ⎙ 1 W/m²
1 watt per square meter ⎙ 1 W/m²
1 joule per kilogram per kelvin ⎙ 1 J kg⁻¹ K⁻¹
1 J/(kg K) ⎙ 1 J kg⁻¹ K⁻¹
120 per day ⎙ 120 /day

User defined units can also be used in derived units.
3 clicks per second ⎙ 3 click/s
5 person/km^2 ⎙ 5 person/km²
150 USD per person per day ⎙ 150 USD person⁻¹ day⁻¹

Dimensionless units can also be used in derived units.
12 million km ⎙ 1.2e7 km
50 percent per year ⎙ 0.5 /yr

Rules for parsing derived units:
- Multiplication can be indicated by space.
- Division can be indicated by `/` or the word `per`.
- Exponents can be indicated by `^`, superscript characters, or words like `squared`, `cubed`.
- Division indicated by `/` or `per` applies to the next single unit or parenthesized group, which inverts the exponent of that unit or group.

Rules for canonical representation of derived units:
- Use abbreviated unit symbols if available.
- Insert spaces between different unit symbols when multiplying, e.g. `N m`, `kg m/s²`.
- Use superscript for exponents, e.g. `m²`, `s⁻¹`.
- If there is only one unit in the denominator, use `foo bar/baz`.
- If there are multiple units in the denominator, use negative exponents, e.g. `foo bar⁻¹ baz⁻²`.
- Negative exponents and denominators should always come after positive exponents and numerators.

Regarding currency units in derived units:
- If the only nominator unit is a currency, use the ISO 4217 decimal places for formatting the numeric value.
- Otherwise, treat currency units like other units without special formatting.

## Composite units
Units of the same dimension can be combined together by addition.

5 m 20 cm ⎙ 5 m 20 cm
5' 10" ⎙ 5 ft 10 in
2 hr 30 min ⎙ 2 hr 30 min
3 kg 500 g ⎙ 3 kg 500 g

Exception:
- when `(′|')` and/or `(″|''|")` are used after `(°|degree|deg)`, they are treated as arcminutes and arcseconds respectively.

Composite values can be negated as a whole.
-(5 m 20 cm) ⎙ -5 m -20 cm
-(2 hr 30 min) ⎙ -2 hr -30 min

## Unit conversions
Support unit conversions using keywords `to` `in` `as` `->` `→`.

5 km to m ⎙ 5000 m
10 inches in cm ⎙ 25.4 cm
100 ft -> m ⎙ 30.48 m
100 USD to EUR ⎙ 85.8 EUR

Derive units can also be converted.
1 kW h to J ⎙ 3.6e6 J
60 mph to km/h ⎙ 96.56 km/h
171 cm to ft ⎙ 5.61 ft
100 EUR/min to USD/month ⎙ 6993.01 USD/month

User specified units can also be converted if they have the same dimension.
5 clicks per second to clicks/min ⎙ 300 clicks/min

Composite units of a single dimension can also be converted.
6 ft 3 in to cm ⎙ 190.50 cm
171 cm to ft in ⎙ 5 ft 7.32 in
1 cm to ft in ⎙ 0 ft 0.39 in

Rules for composite unit conversion output:
- Use the target units specified in the order they are given.
- For each target unit, use as much of integer units as possible before moving to the next target unit.
- For the last target unit, include any remaining fractional part according to the precision setting.

Unit conversion expression ambiguity resolution:
- If the expression can be interpreted in multiple ways, use the first valid interpretation found when parsing from left to right.
    - e.g. `5 km to m in cm` can be interpreted as `5(value) km(unit) to(keyword) m(unit) in(unit) cm(unit)` or `5(value) km(unit) to(keyword) m(unit) in(keyword) cm(unit)`. The first interpretation should be used, where `m in cm` is interpreted as a composite unit. If the second interpretation is desired, parentheses can be used to disambiguate: `(5 km to m) in cm`.
    - e.g. `10 in in cm` should be interpreted as `10(value) in(unit) in(keyword) cm(unit)`, where the first `in` is a unit and the second `in` is a keyword, since other interpretations would result in invalid expressions. Same applies to `10 cm in in` as `10(value) cm(unit) in(keyword) in(unit)`.
- However, unambiguous nested conversions should be supported.
    - e.g. `10 m to km to fraction` ⎙ 1/100 km

### Presentation conversion targets
For dimensionless values, support base conversions:
255 to binary ⎙ 0b11111111
255 to bin ⎙ 0b11111111
255 to octal ⎙ 0o377
255 to oct ⎙ 0o377
255 to hexadecimal ⎙ 0xFF
255 to hex ⎙ 0xFF
0xFF to decimal ⎙ 255
0xFF to dec ⎙ 255

Support arbitrary base conversion from 2 to 36:
255 to base 3 ⎙ 100110 base 3
255 to base 4 ⎙ 3333 base 4
200 to base 36 ⎙ 5A base 36

Support conversion between arbitrary bases:
ABC base 14 to base 18 ⎙ 6A2 base 18

Support conversion of decimal values base conversions:
0.5 to binary ⎙ 0b0.1
0.75 to binary ⎙ 0b0.11
0.1 to hexadecimal ⎙ 0x0.1999999999999A

Support stripping units, units are removed from the evaluated value in its unit.
100 km to value ⎙ 100
10 km / 50 km/h ⎙ 0.2 h
10 km / 50 km/h to value ⎙ 0.2

Support output as fraction:
1000 to fraction ⎙ 1000/1
0.75 to fraction ⎙ 3/4
2.5 kg to fraction ⎙ 5/2 kg

Support specifying number of decimals:
10/3 to 2 decimals ⎙ 3.33
10 km to m to 1 decimal ⎙ 10000.0 m

Support specifying significant figures:
10/3 to 3 sig figs ⎙ 3.33
10 km to m to 4 sig figs ⎙ 10000 m

Support output as scientific notation:
5000 to scientific ⎙ 5.00e3
0.0001234 to scientific ⎙ 1.234e-4

Date time presentation conversions:
1970 Jan 01 01:00 UTC to ISO 8601 ⎙ 1970-01-01T01:00:00Z
1970 Jan 01 01:00 UTC to RFC 2822 ⎙ Thu, 01 Jan 1970 01:00:00 +0000
1970 Jan 01 01:00 UTC to Unix ⎙ 3600
1970 Jan 01 01:00 UTC to Unix seconds ⎙ 3600
1970 Jan 01 01:00 UTC to Unix milliseconds ⎙ 3600000

### Date time property extractions
Support extraction of properties from date time values.

Applicable to types “plain date”, “plain date time”, “instant” (converted to “plain date time”) and “zoned date time”. 
1970 Jan 01 14:00 UTC to year ⎙ 1970
1970 Jan 01 14:00 UTC to month ⎙ 1
1970 Jan 01 14:00 UTC to day ⎙ 1
1970 Jan 01 14:00 UTC to weekday ⎙ 4
Monday = 1, Tuesday = 2, Wednesday = 3, Thursday = 4, Friday = 5, Saturday = 6, Sunday = 7
1970 Jan 01 14:00 UTC to day of year ⎙ 1
1970 Jan 01 14:00 UTC to week of year ⎙ 1

Applicable to types “plain time”, “plain date time”, “instant” (converted to “plain date time”) and “zoned date time”.
1970 Jan 01 14:00 UTC to hour ⎙ 14
1970 Jan 01 14:00 UTC to minute ⎙ 0
1970 Jan 01 14:00 UTC to second ⎙ 0
1970 Jan 01 14:00 UTC to millisecond ⎙ 0

Applicable to types “zoned date time”, “plain date time” and “instant” (converted to “zoned date time” in local timezone).
1970 Jan 01 14:00 UTC to offset ⎙ 0 h

### Timezone conversions
Conversions can be performed from
- zoned date time to a timezone
- plain date time (convert to local timezone) to a timezone
- plain time (convert to local timezone today) to a timezone
- instant (convert to local timezone) to a timezone

Rules for rendering converted zoned date time:
- If the converted date has the same “plain date” as “plain date” today, render as `(settings time format) UTC±H(:MM)`.
- Otherwise, if the converted date has a “plain date” as “plain date” tomorrow or yesterday, render as `(settings time format) (Tomorrow|Yesterday) UTC±H(:MM)`.
- Otherwise, render as `(settings date time format) UTC±H(:MM)`.

1970 Jan 01 14:00 UTC to America/New_York ⎙ 1970-01-01 Thu 09:00:00 UTC-5
14:30 Rio de Janeiro to Tokyo ⎙ 02:20:00 Tomorrow UTC+9
2:30 Seoul to Dubai ⎙ 21:30:00 Yesterday UTC+4

# Basic arithmetic
2 + 2 ⎙ 4
10 + -3 ⎙ 7
3 * (4 + 5) ⎙ 27
10 / 4 ⎙ 2.5
5 - 8 ⎙ -3
2 ^ 3 # power ⎙ 8
18 % 7 # modulo ⎙ 4
18 mod 7 # modulo (alternative syntax) ⎙ 4
5! # factorial ⎙ 120

## Cross unit arithmetic
Support arithmetic operations between compatible units.
5 m + 20 cm ⎙ 5.2 m
2 hr - 30 min ⎙ 1.5 hr
3 kg * 2 ⎙ 6 kg
4 m / 2 ⎙ 2 m

User defined units of the same dimension are compatible.
5 clicks + 10 clicks ⎙ 15 clicks

User defined units can also appear in composite units for cross unit arithmetic.
1000 click * 0.25 person/click * 0.001 USD/person ⎙ 0.25 USD

Unit conversions can be combined with arithmetic operations. The conversion target should appear at the end of the expression.
5 km + 200 m to m ⎙ 5200 m
10 in + 5 cm in cm ⎙ 30.4 cm
12m / 4 to ft in ⎙ 9 ft 10.11 in

## Alternative operators
Support alternative operators for multiplication and division.
- Multiplication: `×`, `·`, `*`
- Division: `÷`, `/`

Special division operators `per` are also supported for division.

Derived unit: `km per h`
60 km per h ⎙ 60 km/h
Division expression: `60 km per 2 h`
60 km per 2 h ⎙ 30 km/h

## Date and time arithmetic
For the purpose of date and time arithmetic, treat values of one time unit and values of composite time units as type “duration”.

2 days + 3 hours ⎙ 2.125 days

Subtraction between two “plain date” values results in a duration.
2023 Jan 10 - 2023 Jan 1 ⎙ 9 days
2023 Jun 15 - 2023 Jan 1 ⎙ 6 months 14 days
2023 Jun 15 - 2023 Jan 1 to days ⎙ 195 days
2023 Jan 1 - 2023 Jun 15 ⎙ -6 months -14 days

Subtraction between two “plain time” values results in a duration.
14:30 - 09:15 ⎙ 5 hours 15 minutes
2:30 PM - 11:00 AM ⎙ 3 hours 30 minutes

Subtraction between two “plain date time” values results in a duration.
2023 Jan 10 14:30 - 2023 Jan 1 09:15 ⎙ 9 days 5 hours 15 minutes
2023 Jun 15 08:00 - 2023 Jan 1 18:00 ⎙ 5 months 13 days 14 hours

When dates are involved in addition or subtraction, resulting duration should be expressed in terms of years, months, weeks, days as applicable.
When times are involved in addition or subtraction, resulting duration should be expressed in terms of hours, minutes, seconds as applicable.

Subtraction between two “instant” values results in a duration expressed in terms of seconds.
now - 3600 seconds ago ⎙ 3600 seconds

Subtraction between two “zoned date time” values results in a duration expressed in terms of years, months, weeks, days, hours, minutes, seconds as applicable.
The time zone offsets are taken into account during the subtraction.

Addition and subtraction between a “plain date time”/“plain time”/“instant”/“zoned date time” and a duration is also supported.
2023 Jan 1 + 10 days ⎙ 2023-01-11 Wed
14:30 + 2 hours 15 minutes ⎙ 16:45:00

Special rules for addition and subtraction of durations to dates and times:
- If a duration satisfies Temporal.Duration requirements, the duration in each units are added or subtracted based on the calendar values, and shall not be converted to smaller units first.

1970 Feb 1 + 1 month 2 days ⎙ 1970-03-03 Sun
1970 Feb 1 + 33 days ⎙ 1970-03-06 Fri

- If a duration does not satisfy Temporal.Duration requirements, the entire duration is first reduce to integer nanoseconds (no fraction), then added or subtracted.
1970 Feb 1 + 1 month 15 days ⎙ 1970-03-16 Wed
1970 Feb 1 + 1.5 months ⎙ 1970-03-18 Wed 15:00:00
1970 Feb 1 + 45 days 15 hours ⎙ 1970-03-18 Wed 15:00:00

Date time addition and subtraction conversion table:

- Addition between
    - plain date and plain date → N/A
    - plain date and plain time → plain date time (combine plain date and plain time)
    - plain date and plain date time → N/A
    - plain date and instant → N/A
    - plain date and zoned date time → N/A
    - plain date and date duration → plain date
    - plain date and time duration → plain date time (set LHS to 00:00:00)
    - plain date and date time duration → plain date time (set LHS to 00:00:00)
    - plain time and plain time → N/A
    - plain time and plain date time → N/A
    - plain time and instant → N/A
    - plain time and zoned date time → N/A
    - plain time and date duration → plain date time (treat LHS as today)
    - plain time and time duration → plain time if within 24 hours, plain date time if exceed 24 hours (treat LHS as today)
    - plain time and date time duration → plain time (treat LHS as today)
    - plain date time and plain date time → N/A
    - plain date time and instant → N/A
    - plain date time and zoned date time → N/A
    - plain date time and date duration → plain date time
    - plain date time and time duration → plain date time
    - plain date time and date time duration → plain date time
    - instant and instant → N/A
    - instant and zoned date time → N/A
    - instant and date duration → instant
    - instant and time duration → instant
    - instant and date time duration → instant
    - zoned date time and zoned date time → N/A
    - zoned date time and date duration → zoned date time
    - zoned date time and time duration → zoned date time
    - zoned date time and date time duration → zoned date time
    - date duration and date duration → date duration
    - date duration and time duration → date time duration
    - date duration and date time duration → date time duration
    - time duration and time duration → time duration
    - time duration and date time duration → date time duration
    - date time duration and date time duration → date time duration
- Subtraction of
    - plain date from plain date → date duration
    - plain date from plain time → date time duration (set LHS to 00:00:00)
    - plain date from plain date time → date duration (set time to 00:00:00)
    - plain date from instant → date duration (treat LHS as 00:00:00 in local time zone)
    - plain date from zoned date time → date duration (treat LHS as 00:00:00 in local time zone)
    - plain date from date duration → plain date
    - plain date from time duration → plain date time (set LHS to 00:00:00)
    - plain date from date time duration → plain date time (set LHS to 00:00:00)
    - plain time from plain date → time duration (treat LHS as today)
    - plain time from plain time → time duration
    - plain time from plain date time → date time duration (treat LHS as today)
    - plain time from instant → date time duration (treat LHS as today in local time zone)
    - plain time from zoned date time → date time duration (treat LHS as today in local time zone)
    - plain time from date duration → plain date time (treat LHS as today)
    - plain time from time duration → plain time if greater than 0, plain date time if exceed 24 hours (treat LHS as today)
    - plain time from date time duration → plain time (treat LHS as today)
    - plain date time from plain date → date time duration (set RHS to 00:00:00)
    - plain date time from plain time → date time duration (treat RHS as today)
    - plain date time from plain date time → date time duration
    - plain date time from instant → date time duration (treat LHS as local time zone)
    - plain date time from zoned date time → date time duration (treat LHS as local time zone)
    - plain date time from date duration → plain date time
    - plain date time from time duration → plain date time
    - plain date time from date time duration → plain date time
    - instant from plain date → date time duration (treat RHS as 00:00:00 in local time zone)
    - instant from plain time → date time duration (treat RHS as today in local time zone)
    - instant from plain date time → date time duration (treat RHS as local time zone)
    - instant from instant → date time duration
    - instant from zoned date time → date time duration
    - instant from date duration → instant
    - instant from time duration → instant
    - instant from date time duration → instant
    - zoned date time from plain date → date time duration (treat RHS as 00:00:00 in local time zone)
    - zoned date time from plain time → date time duration (treat RHS as today in local time zone)
    - zoned date time from plain date time → date time duration (treat RHS as local time zone)
    - zoned date time from instant → date time duration
    - zoned date time from zoned date time → date time duration
    - zoned date time from date duration → zoned date time
    - zoned date time from time duration → zoned date time
    - zoned date time from date time duration → zoned date time
    - date duration from plain date → N/A
    - date duration from plain time → N/A
    - date duration from plain date time → N/A
    - date duration from instant → N/A
    - date duration from zoned date time → N/A
    - date duration from date duration → date duration
    - date duration from time duration → date time duration
    - date duration from date time duration → date time duration
    - time duration from plain date → N/A
    - time duration from plain time → N/A
    - time duration from plain date time → N/A
    - time duration from instant → N/A
    - time duration from zoned date time → N/A
    - time duration from time duration → time duration
    - time duration from date duration → date time duration
    - time duration from date time duration → date time duration
    - date time duration from plain date → N/A
    - date time duration from plain time → N/A
    - date time duration from plain date time → N/A
    - date time duration from instant → N/A
    - date time duration from zoned date time → N/A
    - date time duration from date duration → date time duration
    - date time duration from time duration → date time duration
    - date time duration from date time duration → date time duration

# Functions
## Trigonometric

sin(30 deg) ⎙ 0.5
cos(pi / 3 rad) ⎙ 0.5
tan(45 deg) ⎙ 1

When angle unit is not specified, use the angle unit setting:
sin(30) ⎙ 0.5

Default output of inverse trigonometric functions should respect the angle unit setting:
asin(0.5) ⎙ 30 deg
acos(0.5) ⎙ 60 deg
atan(1) ⎙ 45 deg

Output angle unit can be specified to override the angle unit setting:
asin(0.5) to rad ⎙ 0.5235987755982988 rad
acos(0.5) to rad ⎙ 1.047197551196597 rad
atan(1) to rad ⎙ 0.7853981633974483 rad

Support arcsin(), arccos(), arctan() as aliases of asin(), acos(), atan() respectively.

Also support hyperbolic functions and their inverses: sinh(), cosh(), tanh(), asinh(), acosh(), atanh().
Support arsinh(), arcosh(), artanh() as aliases of asinh(), acosh(), atanh() respectively.

## Logarithmic and exponential
sqrt(16) ⎙ 4
cbrt(27) ⎙ 3
log(100) ⎙ 2
ln(e^3) ⎙ 3
exp(2) ⎙ 7.38905609893065
e^2 ⎙ 7.38905609893065
log10(1000) ⎙ 3
log(2, 32) # log with base specified ⎙ 5

## Number manipulation
abs(-5) ⎙ 5
round(3.6) ⎙ 4
round(18.9 kg) ⎙ 19 kg
round(12, 5) # round to the nearest ⎙ 10
round(6200 m, 5 km) # round to the nearest with unit ⎙ 5 km
floor(3.6) ⎙ 3
floor(3.6, 2) # floor to the nearest ⎙ 2
ceil(3.2) ⎙ 4
ceil(3.2, 0.5) # ceil to the nearest ⎙ 3.5
trunc(-4.7) ⎙ -4
trunc(-4.7, 0.1) # trunc to the nearest ⎙ -4.7
frac(5.75) ⎙ 0.75

## Random number generation
random() ⎙ (random number in `[0, 1)`)
random(10) ⎙ (random integer in `[0, 10)`)
random(5, 10) ⎙ (random integer in `[5, 10)`)
random(5, 10, 2) ⎙ (random number in `{x | x = 5 + n*2, n ∈ Z, 5 ≤ x < 10}`)

## Permutation and combination
perm(5, 2) ⎙ 20
comb(5, 2) ⎙ 10

# Boolean arithmetic
## Constants
true ⎙ true
false ⎙ false

## Operators
true && false ⎙ false
true || false ⎙ true
!true ⎙ false

## Comparisons
Support operators: `<`, `<=`, `>`, `>=`, `==`, `!=`
5 > 3 ⎙ true
4.5 <= 4.5 ⎙ true
200 == 2e2 ⎙ true
100 != 1e2 ⎙ false

Comparisons can be performed between compatible units.
5 miles < 3 meters ⎙ false

# Binary arithmetic

0b1010 & 0b1100 ⎙ 0b1000
0b1010 | 0b1100 ⎙ 0b1110
0b1010 xor 0b1100 ⎙ 0b0110
~0b1010 ⎙ 0b-1011
Note: binary not of x is defined as `-x-1`
0b1010 << 2 ⎙ 0b101000
0b1010 >> 1 ⎙ 0b0101

# Variables
User can define variables using the syntax: `identifier = expression`
Evaluated value of the expression is assigned to the variable, and is shown as the result of the expression.

x = 10 m ⎙ 10 m
tax = 10% ⎙ 10%
start_date = now - 100 days ⎙ (calculated date)

Variable definitions must appear at the beginning a line, before any expressions that use them. Variable definitions cannot be nested inside expressions.

Identifier name rules follow that of Unicode Standard Annex #31.

# Conditional expressions
Support conditional expressions using the syntax: `if condition then expression1 else expression2`
if 5 > 3 then 10 m else 20 m ⎙ 10 m
if true || false then 100 USD else 200 USD ⎙ 100 USD
today_weekday = today to weekday ⎙ (calculated weekday number)

surcharge = if today_weekday == 6 || today_weekday == 7 then 0.1 else 0.05 ⎙ (calculated surcharge)
total_price = 100 USD * (1 + surcharge) ⎙ (calculated total price)

Conditional expression can be nested and appear in a parts of other expressions.
100 * (if 5 > 3 then (if 2 < 1 then 10 else 20) else 30) + 1 ⎙ 2001

```

## Other features

### Syntex highlighting

- Highlight the following syntax elements in the text area:
  - Markdown headings
  - Inline comments
  - Numbers
  - Units
  - Operators
  - Functions
  - Variables
  - Keywords
- Use different colors for different syntax elements.

## Settings

Support the following settings, and persist them in local storage:

- Theme: light, dark, system; default: system
- Font size: small, medium, large; default: medium
- Font family: monospace, sans-serif, serif; default: monospace
- Precision: number of decimal places to show in results; default: 2
- Angle unit: degrees/radians for trigonometric functions; default: degrees
- Decimal separator: dot/comma; default: dot
- Digits grouping separator: none/space/comma/dot/prime symbol; default: space
- Digits grouping size: 3 (European)/2-3 (South Asian)/4 (East Asian)/off; default: 3
- Date format: YYYY-MM-DD DDD/YYYY MMM DD DDD/DDD DD MMM YYYY/DDD MMM DD YYYY; default: YYYY-MM-DD DDD
- Time format: 24-hour/12-hour; default: 24-hour
- Date time format: `{date} {time}` / `{time} {date}`; default: `{date} {time}`
- Imperial units: US/UK; default: US
