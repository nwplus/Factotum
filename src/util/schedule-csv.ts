import { parse } from "csv-parse/sync";

export interface ParsedShift {
  // server-local; becomes a Timestamp on write
  startTime: Date;
  durationMinutes: number;
  location: string;
  description: string;
  organizerEmails: string[];
  shiftLeadEmails: string[];
  channelId?: string;
  link?: string;
}

export interface RowError {
  // spreadsheet row (header is row 1)
  row: number;
  messages: string[];
}

export interface ParseResult {
  shifts: ParsedShift[];
  errors: RowError[];
  // rows dropped as duplicates
  duplicateRows: number[];
}

const REQUIRED_COLUMNS = [
  "organizer_emails",
  "start_time",
  "location",
  "shift_leads",
  "duration_minutes",
  "description",
] as const;
const OPTIONAL_COLUMNS = ["channel_id", "link"] as const;
const ALL_COLUMNS = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS];
type ColumnName = (typeof ALL_COLUMNS)[number];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const START_TIME_REGEX = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/;

// split a cell into trimmed, lowercased emails
const parseEmailList = (value: string): string[] =>
  value
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);

// parse "YYYY-MM-DD HH:MM" (server-local); null if invalid or not a real date
const parseStartTime = (value: string): Date | null => {
  const match = START_TIME_REGEX.exec(value.trim());
  if (!match) return null;
  const [, year, month, day, hour, minute] = match.map(Number);
  const date = new Date(year, month - 1, day, hour, minute);
  // reject rolled-over dates like Feb 31
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute
  ) {
    return null;
  }
  return date;
};

// validate one row's fields -> a shift, or the problems found
const validateRow = (
  get: (column: ColumnName) => string,
): { shift?: ParsedShift; messages: string[] } => {
  const messages: string[] = [];

  const organizerEmails = parseEmailList(get("organizer_emails"));
  if (organizerEmails.length === 0) {
    messages.push("organizer_emails is required (at least one email).");
  } else {
    const invalid = organizerEmails.filter((email) => !EMAIL_REGEX.test(email));
    if (invalid.length > 0) {
      messages.push(`Invalid organizer email(s): ${invalid.join(", ")}`);
    }
  }

  const shiftLeadEmails = parseEmailList(get("shift_leads"));
  const invalidLeads = shiftLeadEmails.filter(
    (email) => !EMAIL_REGEX.test(email),
  );
  if (invalidLeads.length > 0) {
    messages.push(`Invalid shift lead email(s): ${invalidLeads.join(", ")}`);
  }

  const startTime = parseStartTime(get("start_time"));
  if (!startTime) {
    messages.push(
      'start_time must be a valid date in "YYYY-MM-DD HH:MM" format.',
    );
  }

  const durationRaw = get("duration_minutes");
  const durationMinutes = Number(durationRaw);
  if (
    durationRaw === "" ||
    !Number.isInteger(durationMinutes) ||
    durationMinutes <= 0
  ) {
    messages.push("duration_minutes must be a positive integer.");
  }

  // captured but not validated — degraded display at worst, mapping/send handles the rest
  const location = get("location");
  const description = get("description");
  const channelId = get("channel_id");
  const link = get("link");

  if (!startTime || messages.length > 0) return { messages };

  return {
    messages,
    shift: {
      startTime,
      durationMinutes,
      location,
      description,
      organizerEmails,
      shiftLeadEmails,
      ...(channelId !== "" && { channelId }),
      ...(link !== "" && { link }),
    },
  };
};

// parse + validate the schedule CSV; collects every error per row, no side effects
export function parseScheduleCsv(content: string): ParseResult {
  let rows: string[][];
  try {
    rows = parse(content, {
      skip_empty_lines: true,
      trim: true,
      bom: true,
      relax_column_count: true,
    }) as string[][];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      shifts: [],
      errors: [
        { row: 1, messages: [`Could not parse file as CSV: ${message}`] },
      ],
      duplicateRows: [],
    };
  }

  if (rows.length === 0) {
    return {
      shifts: [],
      errors: [{ row: 1, messages: ["File is empty."] }],
      duplicateRows: [],
    };
  }

  const header = rows[0].map((column) => column.trim().toLowerCase());
  const missingColumns = REQUIRED_COLUMNS.filter(
    (column) => !header.includes(column),
  );
  if (missingColumns.length > 0) {
    return {
      shifts: [],
      errors: [
        {
          row: 1,
          messages: [
            `Missing required column(s): ${missingColumns.join(", ")}`,
          ],
        },
      ],
      duplicateRows: [],
    };
  }

  const columnIndex = Object.fromEntries(
    ALL_COLUMNS.map((column) => [column, header.indexOf(column)]),
  ) as Record<ColumnName, number>;
  const cell = (row: string[], column: ColumnName): string => {
    const index = columnIndex[column];
    return index >= 0 ? (row[index] ?? "").trim() : "";
  };

  const shifts: ParsedShift[] = [];
  const errors: RowError[] = [];
  const duplicateRows: number[] = [];
  const seenKeys = new Set<string>();

  for (let i = 1; i < rows.length; i++) {
    const rowNumber = i + 1; // header is row 1
    const { shift, messages } = validateRow((column) => cell(rows[i], column));

    if (!shift) {
      errors.push({ row: rowNumber, messages });
      continue;
    }

    // dedupe valid rows
    const duplicateKey = [
      shift.startTime.getTime(),
      shift.location.toLowerCase(),
      [...shift.organizerEmails].sort().join(","),
    ].join("|");
    if (seenKeys.has(duplicateKey)) {
      duplicateRows.push(rowNumber);
      continue;
    }
    seenKeys.add(duplicateKey);
    shifts.push(shift);
  }

  return { shifts, errors, duplicateRows };
}
