export function generateGoogleFlightsUrl(
  dep: string,
  arr: string,
  date1: string,
  date2: string,
  airlines: string[]
): string {
  if (!airlines || airlines.length === 0) {
    return `https://www.google.com/travel/flights?q=Flights%20to%20${arr}%20from%20${dep}%20on%20${date1}%20through%20${date2}`;
  }

  const airlineBytes: number[] = [];
  for (const c of airlines) {
    if (c.length === 2) {
      airlineBytes.push(0x32, 0x02, c.charCodeAt(0), c.charCodeAt(1));
    }
  }

  const d1Bytes = Array.from(Buffer.from(date1));
  const d2Bytes = Array.from(Buffer.from(date2));
  const depBytes = Array.from(Buffer.from(dep));
  const arrBytes = Array.from(Buffer.from(arr));

  const buildLeg = (dateBuf: number[], origin: number[], dest: number[]) => {
    const leg = [
      0x12, 0x0a, ...dateBuf,
      0x28, 0x00, // <--- Add direct flight only filter
      ...airlineBytes,
      0x6a, 0x07, 0x08, 0x01, 0x12, 0x03, ...origin,
      0x72, 0x07, 0x08, 0x01, 0x12, 0x03, ...dest
    ];
    return [0x1a, leg.length, ...leg];
  };

  const pbBytes = [
    0x08, 0x1c, 0x10, 0x02,
    ...buildLeg(d1Bytes, depBytes, arrBytes),
    ...buildLeg(d2Bytes, arrBytes, depBytes),
    0x40, 0x01, 0x48, 0x01, 0x70, 0x01, 0x82, 0x01, 0x0b, 0x08,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x01, 0x88, 0x01, 0x01, 0x98, 0x01, 0x01 // <--- Add no separate tickets filter
  ];

  let rawB64 = Buffer.from(pbBytes).toString('base64');
  rawB64 = rawB64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  
  // Add &tfu=EgYIAhAAGAA to force sorting by price instead of best flights
  return `https://www.google.com/travel/flights/search?tfs=${rawB64}&tfu=EgYIAhAAGAA`;
}
