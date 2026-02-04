import type { LargeNumberLike } from "node:crypto"
import { format } from "node:path"

export interface meeting {
  meeting_key: number
  meeting_name: string
  meeting_official_name: string
  location: string
  country_key: number
  country_code: string
  country_name: string
  country_flag: string
  circuit_key: number
  circuit_short_name: string
  circuit_type: string
  circuit_info_url: string
  circuit_image: string
  gmt_offset: string
  date_start: string
  date_end: string
  year: number
}

type YMD = [number, number, number]
   
/* 
@returns a formatted string with full official name of the next F1 session, along with the full date
*/
export async function nextSession(): Promise<string> {
    const today = formatDate(new Date()); // today's date formatted as [yyyy,mm,dd]
    const url = `https://api.openf1.org/v1/meetings?year=${today[0]}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`); // checking for errors
    const meetings: meeting[] = await res.json();
    for( const m of meetings){
        const startDate = formatDate(m.date_start); // the date of the event for the season
        if( (startDate[1] === today[1] && startDate[2] >= today[2]) || (startDate[1] > today[1])) {
            const properDate = new Date(m.date_start);
            return `Next Formula One Event:\n${m.meeting_official_name}\n${new Intl.DateTimeFormat("UTC", {
        dateStyle: "full",
        timeStyle: "short"
    }).format(properDate)}(UTC Time)`;
        }
    }
    return 'baba';
}

/*
*
* @returns formatted date as tuple [number(year), number(month), number(day)]
* 
*
*/
function formatDate(tsmp: string | Date): YMD {
  const isoNow =
    tsmp instanceof Date
      ? tsmp.toISOString().slice(0, 10).split("-")
      : tsmp.slice(0, 10).split("-");

  if (isoNow.length !== 3) throw new Error(`Bad date format: ${isoNow.join("-")}`);

  const y = Number(isoNow[0]);
  const m = Number(isoNow[1]);
  const d = Number(isoNow[2]);

  if (![y, m, d].every(Number.isFinite)) {
    throw new Error(`Bad date numbers: ${isoNow.join("-")}`);
  }

  return [y, m, d];
}
