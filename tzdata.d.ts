declare module "tzdata" {
  interface ZoneData {
    [key: string]: any;
  }

  interface TzData {
    zones: {
      [timezone: string]: ZoneData | string;
    };
  }

  const tzdata: TzData;
  export default tzdata;
}
