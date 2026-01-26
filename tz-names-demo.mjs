const icu = await import('icu');

const locale = icu.Locale.fromString('en-GB');
const parser = new icu.IanaParserExtended();
const offsetCalc = new icu.VariantOffsetsCalculator();

const testZones = ['America/Los_Angeles', 'America/Vancouver', 'Europe/London', 'Asia/Tokyo', 'America/North_Dakota/Beulah'];

const formatters = {
  'SpecificLong': icu.TimeZoneFormatter.createSpecificLong(locale),
  'SpecificShort': icu.TimeZoneFormatter.createSpecificShort(locale),
  'GenericLong': icu.TimeZoneFormatter.createGenericLong(locale),
  'GenericShort': icu.TimeZoneFormatter.createGenericShort(locale),
  'Location': icu.TimeZoneFormatter.createLocation(locale),
  'ExemplarCity': icu.TimeZoneFormatter.createExemplarCity(locale),
  'LocalizedOffsetLong': icu.TimeZoneFormatter.createLocalizedOffsetLong(locale),
  'LocalizedOffsetShort': icu.TimeZoneFormatter.createLocalizedOffsetShort(locale),
};

for (const iana of testZones) {
  const parsed = parser.parse(iana);
  const tz = parsed.timeZone;
  
  // Get standard and daylight offsets
  const offsets = offsetCalc.computeOffsetsFromTimeZoneAndTimestamp(tz, BigInt(Date.now()));
  
  console.log('\n=== ' + iana + ' ===');
  
  if (offsets) {
    // Standard time
    console.log("standard offset:"); console.dir(Object.keys(tz.withOffset(offsets.standard)));

    const tzStd = tz.withOffset(offsets.standard).atTimestamp(BigInt(Date.now()));
    console.log('  [STANDARD]');
    console.log('    SpecificLong:', formatters.SpecificLong.format(tzStd));
    console.log('    SpecificShort:', formatters.SpecificShort.format(tzStd));
    
    // Daylight time (if applicable)
    if (offsets.daylight) {
      console.log("daylight offset:"); console.dir(Object.keys(tz.withOffset(offsets.daylight)));
      const tzDst = tz.withOffset(offsets.daylight).atTimestamp(BigInt(Date.now()));
      console.log('  [DAYLIGHT]');
      console.log('    SpecificLong:', formatters.SpecificLong.format(tzDst));
      console.log('    SpecificShort:', formatters.SpecificShort.format(tzDst));
    }

    
    // Generic (same regardless of DST)
    const tzInfo = tz.withoutOffset().atTimestamp(BigInt(Date.now()));
    console.log('  [GENERIC]');
    console.log('    GenericLong:', formatters.GenericLong.format(tzInfo));
    console.log('    GenericShort:', formatters.GenericShort.format(tzInfo));
    console.log('    Location:', formatters.Location.format(tzInfo));
    console.log('    ExemplarCity:', formatters.ExemplarCity.format(tzInfo));
    console.log('    LocalizedOffsetLong:', formatters.LocalizedOffsetLong.format(tzStd));
    console.log('    LocalizedOffsetShort:', formatters.LocalizedOffsetShort.format(tzStd));
  }
}
