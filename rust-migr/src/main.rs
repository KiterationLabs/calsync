use std::fs::File;
use std::io::{BufRead, BufReader};
use chrono::{DateTime, NaiveDateTime, Utc, SecondsFormat};
use serde::Serialize;
use std::time::Instant;
use std::io::BufWriter;

#[derive(Debug)]
struct ParsedSummary {
    program: Option<String>,
    kurs_grp: Option<String>,
    kurs_grp_extra: Option<String>,
    kurs_grp_raw: Option<String>,
    hjalpm: Option<String>,
    sign: Option<String>,
    moment: Option<String>,
    aktivitetstyp: Option<String>,
}

#[derive(Debug)]
struct Entry {
    dtstart: DateTime<Utc>,
    dtend: DateTime<Utc>,
    dtstamp: DateTime<Utc>,
    uid: String,
    created: DateTime<Utc>,
    last_modified: DateTime<Utc>,
    location: Option<String>,

    status: Option<String>,        
    transparency: Option<String>, 

    // summary
    summary_raw: String,
    summary_parsed: ParsedSummary,
}

/// ---------- Output JSON models ----------
#[derive(Serialize)]
struct DateObj {
    #[serde(rename = "dateTime")]
    date_time: String,
}

#[derive(Serialize)]
struct PrivateProps {
    kronoxSummaryRaw: String,
}

#[derive(Serialize)]
struct ExtendedProps {
    #[serde(rename = "private")]
    private_: PrivateProps,
}

#[derive(Serialize)]
struct GoogleEvent {
    #[serde(rename = "iCalUID")]
    i_cal_uid: String,
    summary: String,
    location: Option<String>,
    description: String,
    start: DateObj,
    end: DateObj,
    status: String,
    transparency: String,
    extendedProperties: ExtendedProps,
}

/// ICS UTC format like 20250909T131500Z
fn parse_ical_utc(s: &str) -> Option<DateTime<Utc>> {
    let ndt = NaiveDateTime::parse_from_str(s.trim(), "%Y%m%dT%H%M%SZ").ok()?;
    Some(ndt.and_utc())
}

fn slice_between_labels<'a>(summary: &'a str, label: &str, labels: &[&str]) -> Option<String> {
    let start = summary.find(label)? + label.len();
    // find the next label that occurs AFTER this start
    let mut next_start = summary.len();
    for &other in labels {
        if other == label { continue; }
        if let Some(pos) = summary[start..].find(other) {
            let abs = start + pos;
            if abs < next_start {
                next_start = abs;
            }
        }
    }
    let value = summary[start..next_start].trim();
    if value.is_empty() { None } else { Some(value.to_string()) }
}

fn parse_summary(summary: &str) -> ParsedSummary {
    let labels = [
        "Program:",
        "Kurs.grp:",
        "Hjälpm.:",
        "Sign:",
        "Moment:",
        "Aktivitetstyp:",
    ];

    let program      = slice_between_labels(summary, "Program:", &labels);
    let kurs_grp_raw = slice_between_labels(summary, "Kurs.grp:", &labels);
    let hjalpm       = slice_between_labels(summary, "Hjälpm.:", &labels);
    let sign         = slice_between_labels(summary, "Sign:", &labels);
    let moment       = slice_between_labels(summary, "Moment:", &labels);
    let aktivitetstyp= slice_between_labels(summary, "Aktivitetstyp:", &labels);

    let (kurs_grp, kurs_grp_extra) = if let Some(raw) = &kurs_grp_raw {
        let marker = "Kurs inom program";
        if let Some(i) = raw.find(marker) {
            let left = raw[..i].trim().trim_end_matches(',');
            let right = raw[i..].trim();
            (
                if left.is_empty() { None } else { Some(left.to_string()) },
                if right.is_empty() { None } else { Some(right.to_string()) },
            )
        } else {
            (Some(raw.trim().to_string()), None)
        }
    } else {
        (None, None)
    };

    ParsedSummary {
        program,
        kurs_grp,
        kurs_grp_extra,
        kurs_grp_raw,
        hjalpm,
        sign,
        moment,
        aktivitetstyp,
    }
}

fn parse_entry(lines: &[String]) -> Option<Entry> {
    let mut dtstart = None;
    let mut dtend = None;
    let mut dtstamp = None;
    let mut uid = None;
    let mut created = None;
    let mut last_modified = None;
    let mut location = None;
    let mut summary_raw = None;

    let mut status: Option<String> = None;
    let mut transparency: Option<String> = None;

    for line in lines {
        if let Some(rest) = line.strip_prefix("DTSTART:") {
            dtstart = parse_ical_utc(rest);
        } else if let Some(rest) = line.strip_prefix("DTEND:") {
            dtend = parse_ical_utc(rest);
        } else if let Some(rest) = line.strip_prefix("DTSTAMP:") {
            dtstamp = parse_ical_utc(rest);
        } else if let Some(rest) = line.strip_prefix("UID:") {
            uid = Some(rest.to_string());
        } else if let Some(rest) = line.strip_prefix("CREATED:") {
            created = parse_ical_utc(rest);
        } else if let Some(rest) = line.strip_prefix("LAST-MODIFIED:") {
            last_modified = parse_ical_utc(rest);
        } else if let Some(rest) = line.strip_prefix("LOCATION:") {
            location = Some(rest.to_string());
        } else if let Some(rest) = line.strip_prefix("STATUS:") {
            status = Some(rest.trim().to_string()); 
        } else if let Some(rest) = line.strip_prefix("TRANSP:") {
            transparency = Some(rest.trim().to_string());
        } else if let Some(rest) = line.strip_prefix("SUMMARY:") {
            summary_raw = Some(rest.to_string());
        }
    }

    let summary_raw = summary_raw?;
    let summary_parsed = parse_summary(&summary_raw);

    Some(Entry {
        dtstart: dtstart?,
        dtend: dtend?,
        dtstamp: dtstamp?,
        uid: uid?,
        created: created?,
        last_modified: last_modified?,
        location,
        status,
        transparency,
        summary_raw,
        summary_parsed,
    })
}

/// Build "summary" for Google from parsed fields:
/// Prefer the parsed "moment" (e.g., "Project kick-off"); fall back to the raw summary.
fn build_summary(e: &Entry) -> String {
    e.summary_parsed
        .moment
        .as_deref()
        .unwrap_or(&e.summary_raw)
        .to_string()
}

/// Build "description", like "TGIAR24h - Information bortom skärmar Kurs inom program, 50% dagtid"
fn build_description(e: &Entry) -> String {
    let program_first = e.summary_parsed.program.as_deref()
        .map(|p| p.split_whitespace().next().unwrap_or(p))
        .unwrap_or("Program");
    let kurs_raw = e.summary_parsed.kurs_grp_raw
        .as_deref()
        .or(e.summary_parsed.kurs_grp.as_deref())
        .unwrap_or("");
    if kurs_raw.is_empty() {
        program_first.to_string()
    } else {
        format!("{} - {}", program_first, kurs_raw)
    }
}

/// Map one Entry → GoogleEvent
fn to_google_event(e: &Entry) -> GoogleEvent {
    GoogleEvent {
        i_cal_uid: e.uid.clone(),
        summary: build_summary(e),
        location: e.location.clone(),
        description: build_description(e),
        start: DateObj { date_time: e.dtstart.to_rfc3339_opts(SecondsFormat::Secs, true) },
        end:   DateObj { date_time: e.dtend  .to_rfc3339_opts(SecondsFormat::Secs, true) },
        status: e.status.as_deref().unwrap_or("CONFIRMED").to_ascii_lowercase(),
        transparency: e.transparency.as_deref().unwrap_or("OPAQUE").to_ascii_lowercase(),
        extendedProperties: ExtendedProps {
            private_: PrivateProps { kronoxSummaryRaw: e.summary_raw.clone() }
        }
    }
}

fn main() -> std::io::Result<()> {
    let start = Instant::now();
    let reader = BufReader::new(File::open("testfile.ics")?);

    let mut entries: Vec<Entry> = Vec::new();
    let mut current_block: Vec<String> = Vec::new();
    let mut inside_event = false;

    for line in reader.lines() {
        let line = line?;

        if line == "BEGIN:VEVENT" {
            inside_event = true;
            current_block.clear();
            continue;
        }

        if line == "END:VEVENT" {
            if let Some(entry) = parse_entry(&current_block) {
                entries.push(entry);
            }
            inside_event = false;
            continue;
        }

        if inside_event {
            if line.starts_with(' ') {
                if let Some(last) = current_block.last_mut() {
                    last.push_str(&line[1..]);
                    continue;
                }
            }
            current_block.push(line);
        }
    }

  let events: Vec<GoogleEvent> = entries.iter().map(to_google_event).collect();

  let out = File::create("./rsout/test.json")?;
  let mut writer = BufWriter::new(out);
  serde_json::to_writer_pretty(&mut writer, &events)?;

  println!("Wrote {} events to out.json", events.len());

  let duration = start.elapsed();
  println!("Execution time: {:?}", duration);
  println!("Execution time: {} ms", duration.as_millis());

  Ok(())
}