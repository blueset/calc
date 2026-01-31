import { describe, it, expect, beforeAll } from 'vitest';
import { Calculator } from '../../src/calculator';
import { DataLoader } from '../../src/data-loader';
import * as path from 'path';

/**
 * Integration tests for basic unit handling
 * Tests the full pipeline: Lexer → Parser → Evaluator → Formatter
 */
describe('Integration Tests - Basic Units', () => {
  let calculator: Calculator;
  let dataLoader: DataLoader;

  beforeAll(async () => {
    dataLoader = new DataLoader();
    await dataLoader.load(path.join(__dirname, '../..', 'data'));

    calculator = new Calculator(dataLoader);
  });

  describe('Dimensionless Units', () => {
    it('should handle English number units converting to dimensionless', () => {
      const result = calculator.calculate('5 dozen');
      expect(result.results[0].result).toBe('60');
    });

    it('should handle gross units', () => {
      const result = calculator.calculate('3 gross');
      expect(result.results[0].result).toBe('432');
    });

    it('should handle score units', () => {
      const result = calculator.calculate('2 score');
      expect(result.results[0].result).toBe('40');
    });

    it('should handle large number units', () => {
      const result = calculator.calculate(`10 thousand
2 million
3 billion
1 trillion`);
      expect(result.results[0].result).toBe('10 000');
      expect(result.results[1].result).toBe('2 000 000');
      expect(result.results[2].result).toBe('3 000 000 000');
      expect(result.results[3].result).toBe('1e+12');
    });

    it('should handle percentages (word form) converting to dimensionless', () => {
      const result = calculator.calculate('100 percent');
      expect(result.results[0].result).toBe('1');
    });

    it('should handle percent symbol converting to dimensionless', () => {
      const result = calculator.calculate('50%');
      expect(result.results[0].result).toBe('0.5');
    });

    it('should handle per thousand', () => {
      const result = calculator.calculate(`1‰`);
      expect(result.results[0].result).toBe('0.001');
    });

    it('should handle mol (Avogadro’s number)', () => {
      const result = calculator.calculate('1 mol');
      expect(result.results[0].result).toBe('6.02214076e+23');
    });

    it('should handle modulo operator', () => {
      const result = calculator.calculate('10 % 3');
      expect(result.results[0].result).toBe('1');
    });

    it('should distinguish percent from modulo', () => {
      const result = calculator.calculate('50%\n10 % 3');
      expect(result.results[0].result).toBe('0.5');  // percent
      expect(result.results[1].result).toBe('1');    // modulo
    });

  });

  describe('Length Units', () => {
    it('should handle metric length units', () => {
      const result = calculator.calculate('5 cm');
      expect(result.results[0].result).toBe('5 cm');

      const result2 = calculator.calculate('2 m');
      expect(result2.results[0].result).toBe('2 m');

      const result3 = calculator.calculate('1 km');
      expect(result3.results[0].result).toBe('1 km');
    });

    it('should handle imperial length units', () => {
      const result = calculator.calculate('10 inch');
      expect(result.results[0].result).toBe('10 in');

      const result2 = calculator.calculate('5 ft');
      expect(result2.results[0].result).toBe('5 ft');

      const result3 = calculator.calculate('100 yard');
      expect(result3.results[0].result).toBe('100 yd');

      const result4 = calculator.calculate('5 mile');
      expect(result4.results[0].result).toBe('5 mi');
    });

    it('should handle am/pm ambiguity - integer values 1-12 are time', () => {
      const result = calculator.calculate(`10 am
10 pm
10 PM`);
      expect(result.results[0].result).toBe('10:00');
      expect(result.results[1].result).toBe('22:00');
      expect(result.results[2].result).toBe('22:00');
    });

    it('should handle am/pm ambiguity - decimal values are units', () => {
      const result = calculator.calculate(`10.0 am
10.5 am
10.0 pm
10.5 pm
10.0 PM`);
      expect(result.results[0].result).toBe('10 am'); // attometers
      expect(result.results[1].result).toBe('10.5 am');
      expect(result.results[2].result).toBe('10 pm'); // picometers
      expect(result.results[3].result).toBe('10.5 pm');
      expect(result.results[4].result).toBe('10 PM'); // petameters
    });

    it('should handle prime symbols for feet and inches', () => {
      const result = calculator.calculate(`5′
5″`);
      expect(result.results[0].result).toBe('5 ft');
      expect(result.results[1].result).toBe('5 in');
    });

    it('should handle alternative quote marks for feet and inches', () => {
      const result = calculator.calculate(`5'
5"
5''`);
      expect(result.results[0].result).toBe('5 ft');
      expect(result.results[1].result).toBe('5 in');
      expect(result.results[2].result).toBe('5 in');
    });

    it('should handle astronomical units', () => {
      const result = calculator.calculate(`1 au
1 astronomical unit`);
      expect(result.results[0].result).toBe('1 au');
      expect(result.results[1].result).toBe('1 au');
    });

    it('should handle lightyear', () => {
      const result = calculator.calculate(`1 ly
1 lightyear`);
      expect(result.results[0].result).toBe('1 ly');
      expect(result.results[1].result).toBe('1 ly');
    });

    it('should handle angstrom', () => {
      const result = calculator.calculate('10 angstrom');
      expect(result.results[0].result).toBe('10 Å');
    });

    it('should handle nautical mile unit symbol', () => {
      const result = calculator.calculate('5 nautical mile');
      expect(result.results[0].result).toBe('5 nmi');
    });
  });

  describe('Mass/Weight Units', () => {
    it('should handle metric mass units', () => {
      const result = calculator.calculate('7 g');
      expect(result.results[0].result).toBe('7 g');

      const result2 = calculator.calculate('3 kg');
      expect(result2.results[0].result).toBe('3 kg');
    });

    it('should handle imperial mass units', () => {
      const result = calculator.calculate('10 ounces');
      expect(result.results[0].result).toBe('10 oz');

      const result2 = calculator.calculate('10 lbs');
      expect(result2.results[0].result).toBe('10 lb');
    });

    it('should handle carat for gemstones', () => {
      const result = calculator.calculate(`1 carat
5 ct`);
      expect(result.results[0].result).toBe('1 ct');
      expect(result.results[1].result).toBe('5 ct');
    });

    it('should handle stone (UK weight unit)', () => {
      const result = calculator.calculate('10 stone');
      expect(result.results[0].result).toBe('10 st');
    });

    it('should handle metric ton', () => {
      const result = calculator.calculate(`1 ton
1 tonne
1 t`);
      expect(result.results[0].result).toBe('1 t');
      expect(result.results[1].result).toBe('1 t');
      expect(result.results[2].result).toBe('1 t');
    });

    it('should handle short ton (US)', () => {
      const result = calculator.calculate('1 short ton');
      expect(result.results[0].result).toBe('1 sh tn');
    });

    it('should handle long ton (UK)', () => {
      const result = calculator.calculate('1 long ton');
      expect(result.results[0].result).toBe('1 lg tn');
    });

    it('should handle additional SI prefixes for grams', () => {
      const result = calculator.calculate(`1 mg
1 μg
1 ng`);
      expect(result.results[0].result).toBe('1 mg');
      expect(result.results[1].result).toBe('1 μg');
      expect(result.results[2].result).toBe('1 ng');
    });

    it('should handle extreme small SI prefixes (zepto-, yocto-)', () => {
      const result = calculator.calculate(`1 zm
1 zg
1 ym
1 yg`);
      expect(result.results[0].result).toBe('1 zm'); // zeptometer
      expect(result.results[1].result).toBe('1 zg'); // zeptogram
      expect(result.results[2].result).toBe('1 ym'); // yoctometer
      expect(result.results[3].result).toBe('1 yg'); // yoctogram
    });

    it('should handle extreme large SI prefixes (zetta-, yotta-)', () => {
      const result = calculator.calculate(`1 Zm
1 Zg
1 Ym
1 Yg`);
      expect(result.results[0].result).toBe('1 Zm'); // zettameter
      expect(result.results[1].result).toBe('1 Zg'); // zettagram
      expect(result.results[2].result).toBe('1 Ym'); // yottameter
      expect(result.results[3].result).toBe('1 Yg'); // yottagram
    });

    it('should handle medium SI prefixes (deca-, hecto-)', () => {
      const result = calculator.calculate(`1 dam
1 dag
1 hm
1 hg`);
      expect(result.results[0].result).toBe('1 dam'); // decameter
      expect(result.results[1].result).toBe('1 dag'); // decagram
      expect(result.results[2].result).toBe('1 hm'); // hectometer
      expect(result.results[3].result).toBe('1 hg'); // hectogram
    });

    it('should handle SI prefixes for watts', () => {
      const result = calculator.calculate(`1 mW
1 kW
1 MW
1 GW
1 TW
1 PW`);
      expect(result.results[0].result).toBe('1 mW'); // milliwatt
      expect(result.results[1].result).toBe('1 kW'); // kilowatt
      expect(result.results[2].result).toBe('1 MW'); // megawatt
      expect(result.results[3].result).toBe('1 GW'); // gigawatt
      expect(result.results[4].result).toBe('1 TW'); // terawatt
      expect(result.results[5].result).toBe('1 PW'); // petawatt
    });

    it('should handle SI prefixes for joules', () => {
      const result = calculator.calculate(`1 mJ
1 kJ
1 MJ
1 GJ`);
      expect(result.results[0].result).toBe('1 mJ'); // millijoule
      expect(result.results[1].result).toBe('1 kJ'); // kilojoule
      expect(result.results[2].result).toBe('1 MJ'); // megajoule
      expect(result.results[3].result).toBe('1 GJ'); // gigajoule
    });

    it('should handle SI prefixes for amperes', () => {
      const result = calculator.calculate(`1 mA
1 μA
1 nA
1 kA
1 MA`);
      expect(result.results[0].result).toBe('1 mA'); // milliampere
      expect(result.results[1].result).toBe('1 μA'); // microampere
      expect(result.results[2].result).toBe('1 nA'); // nanoampere
      expect(result.results[3].result).toBe('1 kA'); // kiloampere
      expect(result.results[4].result).toBe('1 MA'); // megaampere
    });

    it('should handle SI prefixes for candelas', () => {
      const result = calculator.calculate(`1 mcd
1 kcd
1 Mcd`);
      expect(result.results[0].result).toBe('1 mcd'); // millicandela
      expect(result.results[1].result).toBe('1 kcd'); // kilocandela
      expect(result.results[2].result).toBe('1 Mcd'); // megacandela
    });
  });

  describe('Area Units', () => {
    it('should handle square units with superscript', () => {
      const result = calculator.calculate('1 m²');
      expect(result.results[0].result).toBe('1 m²');
    });

    it('should handle square units with caret', () => {
      const result = calculator.calculate('1 m^2');
      expect(result.results[0].result).toBe('1 m²');
    });

    it('should handle named square units', () => {
      let result = calculator.calculate('1 square meter');
      expect(result.results[0].result).toBe('1 m²');
      result = calculator.calculate('1 meter squared');
      expect(result.results[0].result).toBe('1 m²');
      result = calculator.calculate('1 square foot');
      expect(result.results[0].result).toBe('1 ft²');
    });

    it('should handle named multi-word units', () => {
      let result = calculator.calculate('1 sq m');
      expect(result.results[0].result).toBe('1 m²');
      result = calculator.calculate('1 sq ft');
      expect(result.results[0].result).toBe('1 ft²');
    });

    it('should handle special area units', () => {
      const result = calculator.calculate('1 hectare');
      expect(result.results[0].result).toBe('1 ha');

      const result2 = calculator.calculate('1 acre');
      expect(result2.results[0].result).toBe('1 acre');
    });
  });

  describe('Volume Units', () => {
    it('should handle liters', () => {
      const result = calculator.calculate('1 L');
      expect(result.results[0].result).toBe('1 L');

      const result2 = calculator.calculate('1 mL');
      expect(result2.results[0].result).toBe('1 mL');
    });

    it('should handle cubic units with superscript', () => {
      let result = calculator.calculate('1 m³');
      expect(result.results[0].result).toBe('1 m³');
      result = calculator.calculate('1 lb³');
      expect(result.results[0].result).toBe('1 lb³');
    });

    it('should handle cubic units with caret', () => {
      let result = calculator.calculate('1 m^3');
      expect(result.results[0].result).toBe('1 m³');
      result = calculator.calculate('1 lb^3');
      expect(result.results[0].result).toBe('1 lb³');
    });

    it('should handle multi-word units', () => {
      let result = calculator.calculate('1 fl oz');
      expect(result.results[0].result).toBe('1 fl oz');
      result = calculator.calculate('10 fluid ounces');
      expect(result.results[0].result).toBe('10 fl oz');
    });

    it('should handle cooking volume units', () => {
      const result = calculator.calculate(`1 teaspoon
2 tsp
1 tablespoon
2 tbsp
1 cup
1 CUP`);
      expect(result.results[0].result).toBe('1 tsp');
      expect(result.results[1].result).toBe('2 tsp');
      expect(result.results[2].result).toBe('1 tbsp');
      expect(result.results[3].result).toBe('2 tbsp');
      expect(result.results[4].result).toBe('1 cup'); // US cup, case-sensitive match prioritized
      expect(result.results[5].result).toBe('1.00 CUP'); // Cuban Peso, case-sensitive match prioritized
    });

    it('should handle imperial volume units', () => {
      const result = calculator.calculate(`1 pint
1 pt
1 quart
1 qt
1 gallon
1 gal`);
      expect(result.results[0].result).toBe('1 pt');
      expect(result.results[1].result).toBe('1 pt');
      expect(result.results[2].result).toBe('1 qt');
      expect(result.results[3].result).toBe('1 qt');
      expect(result.results[4].result).toBe('1 gal');
      expect(result.results[5].result).toBe('1 gal');
    });

    it('should handle cubic centimeters (cc)', () => {
      const result = calculator.calculate(`1 cc
1 cm³`);
      // Both should be equivalent
      expect(result.results[0].result).toBe('1 cm³');
      expect(result.results[1].result).toBe('1 cm³');
    });
  });

  describe('Temperature Units', () => {
    it('should handle temperature units with degree symbol', () => {
      const result = calculator.calculate('25 °C');
      expect(result.results[0].result).toBe('25 °C');
    });

    it('should handle temperature units', () => {
      const result = calculator.calculate('25 Celsius');
      expect(result.results[0].result).toBe('25 °C');
    });
  });

  describe('Time Units', () => {
    it('should handle time units', () => {
      const result = calculator.calculate('30 ms');
      expect(result.results[0].result).toBe('30 ms');

      const result2 = calculator.calculate('30 s');
      expect(result2.results[0].result).toBe('30 s');

      const result3 = calculator.calculate('30 min');
      expect(result3.results[0].result).toBe('30 min');

      const result4 = calculator.calculate('1 h');
      expect(result4.results[0].result).toBe('1 h');

      const result5 = calculator.calculate('1 day');
      expect(result5.results[0].result).toBe('1 day');
    });
  });

  describe('Energy Units', () => {
    it('should handle joules', () => {
      const result = calculator.calculate('5 J');
      expect(result.results[0].result).toBe('5 J');

      const result2 = calculator.calculate('10 kJ');
      expect(result2.results[0].result).toBe('10 kJ');
    });

    it('should handle calories', () => {
      const result = calculator.calculate('100 kcal');
      expect(result.results[0].result).toBe('100 kcal');
    });

    it('should handle small calories and gram calories', () => {
      const result = calculator.calculate(`1 sm cal
10 small calories`);
      expect(result.results[0].result).toBe('1 gcal');
      expect(result.results[1].result).toBe('10 gcal');
    });

    it('should treat calorie as kilocalorie', () => {
      const result = calculator.calculate(`1 calorie
1 kcal`);
      // Both should be equivalent (food calories)
      expect(result.results[0].result).toBe('1 kcal');
      expect(result.results[1].result).toBe('1 kcal');
    });

    it('should handle electronvolts', () => {
      const result = calculator.calculate(`1 eV
1 keV
1 MeV
1 GeV
1 electronvolt`);
      expect(result.results[0].result).toBe('1 eV');
      expect(result.results[1].result).toBe('1 keV');
      expect(result.results[2].result).toBe('1 MeV');
      expect(result.results[3].result).toBe('1 GeV');
      expect(result.results[4].result).toBe('1 eV');
    });

    it('should handle BTU', () => {
      const result = calculator.calculate(`1 BTU
1 British Thermal Unit`);
      expect(result.results[0].result).toBe('1 BTU');
      expect(result.results[1].result).toBe('1 BTU');
    });

    it('should handle foot-pound', () => {
      const result = calculator.calculate('1 foot pound force');
      expect(result.results[0].result).toBe('1 ft lbf');
    });
  });

  describe('Force Units', () => {
    it('should handle newtons', () => {
      const result = calculator.calculate(`1 N
1 kN
1 newton`);
      expect(result.results[0].result).toBe('1 N');
      expect(result.results[1].result).toBe('1 kN');
      expect(result.results[2].result).toBe('1 N');
    });

    it('should handle pound-force', () => {
      const result = calculator.calculate('1 lbf');
      expect(result.results[0].result).toBe('1 lbf');
    });

    it('should handle kilogram-force', () => {
      const result = calculator.calculate('1 kgf');
      expect(result.results[0].result).toBe('1 kgf');
    });
  });

  describe('Pressure units', () => {
    it('should handle pascals', () => {
      const result = calculator.calculate('101325 Pa');
      expect(result.results[0].result).toBe('101 325 Pa');
    });

    it('should handle SI prefixes for pascals', () => {
      const result = calculator.calculate(`1 kPa
1 MPa
1 GPa`);
      expect(result.results[0].result).toBe('1 kPa');
      expect(result.results[1].result).toBe('1 MPa');
      expect(result.results[2].result).toBe('1 GPa');
    });

    it('should handle atmospheres', () => {
      const result = calculator.calculate('1 atm');
      expect(result.results[0].result).toBe('1 atm');
    });

    it('should handle bar', () => {
      const result = calculator.calculate('1 bar');
      expect(result.results[0].result).toBe('1 bar');
    });

    it('should handle mmHg', () => {
      let result = calculator.calculate('1 mmHg');
      expect(result.results[0].result).toBe('1 mmHg');
      result = calculator.calculate('1 millimeter of mercury');
      expect(result.results[0].result).toBe('1 mmHg');
    });

    it('should handle inHg (inches of mercury)', () => {
      const result = calculator.calculate(`1 inHg
1 inch of mercury`);
      expect(result.results[0].result).toBe('1 inHg');
      expect(result.results[1].result).toBe('1 inHg');
    });

    it('should handle psi (pounds per square inch)', () => {
      const result = calculator.calculate('1 psi');
      expect(result.results[0].result).toBe('1 psi');
    });

    it('should handle kgf/cm²', () => {
      const result = calculator.calculate('1 kgf/cm²');
      expect(result.results[0].result).toBe('1 kgf/cm²');
    });
  });

  describe('Speed Units', () => {
    it('should handle common speed units', () => {
      const result = calculator.calculate(`60 km/h
30 mph`);
      expect(result.results[0].result).toBe('60 km/h');
      expect(result.results[1].result).toBe('30 mph');
    });

    it('should handle nautical speed (knots)', () => {
      const result = calculator.calculate(`20 knot
20 kn
20 kt`);
      expect(result.results[0].result).toBe('20 kn');
      expect(result.results[1].result).toBe('20 kn');
      expect(result.results[2].result).toBe('20 kn');
    });

    it('should handle mach (speed of sound)', () => {
      const result = calculator.calculate('2 mach');
      expect(result.results[0].result).toBe('2 mach');
    });
  });

  describe('Frequency Units', () => {
    it('should handle cycles', () => {
      const result = calculator.calculate('60 cycles');
      expect(result.results[0].result).toBe('60 cycle');
    });

    it('should handle hertz', () => {
      const result = calculator.calculate('60 Hz');
      expect(result.results[0].result).toBe('60 Hz');
    });

    it('should handle operations per time', () => {
      const result = calculator.calculate(`1 operation
1000 operations`);
      expect(result.results[0].result).toBe('1 ops');
      expect(result.results[1].result).toBe('1 000 ops');
    });

    it('should handle FLOPS (floating point operations per second)', () => {
      const result = calculator.calculate(`1 FLOPS
1 MFLOPS
1 GFLOPS
1 TFLOPS`);
      expect(result.results[0].result).toBe('1 FLOPS');
      expect(result.results[1].result).toBe('1 MFLOPS');
      expect(result.results[2].result).toBe('1 GFLOPS');
      expect(result.results[3].result).toBe('1 TFLOPS');
    });

    it('should handle beats per minute', () => {
      const result = calculator.calculate(`1 beat
60 beats
120 BPM
120 bpm`);
      expect(result.results[0].result).toBe('1 beat');
      expect(result.results[1].result).toBe('60 beat');
      expect(result.results[2].result).toBe('120 BPM');
      expect(result.results[3].result).toBe('120 BPM');
    });
  });
});
