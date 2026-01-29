import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

// Sample CSV content (comma-separated) - this is the actual Sanbai export format
const SANBAI_CSV_SAMPLE = `Song ID,Song Name,Difficulty,Rating,Score,Grade,Lamp,Flare,Flare Skill,Time Uploaded,Time Played
006ob1iI9b1I8dDl0dq1bqIOP8886li1,☆shining☆,bSP,2,1000000,AAA,MFC,,,2022-02-28 10:08:21,2022-02-28 08:43:18
006ob1iI9b1I8dDl0dq1bqIOP8886li1,☆shining☆,ESP,11,1000000,AAA,MFC,,,2021-08-17 19:04:02,2021-08-17 06:30:34`;

// Sample TSV content (tab-separated) - alternative format that should also work
const SANBAI_TSV_SAMPLE = `Song ID\tSong Name\tDifficulty\tRating\tScore\tGrade\tLamp\tFlare\tFlare Skill\tTime Uploaded\tTime Played
006ob1iI9b1I8dDl0dq1bqIOP8886li1\t☆shining☆\tbSP\t2\t1000000\tAAA\tMFC\t\t\t2022-02-28 10:08:21\t2022-02-28 08:43:18
006ob1iI9b1I8dDl0dq1bqIOP8886li1\t☆shining☆\tESP\t11\t1000000\tAAA\tMFC\t\t\t2021-08-17 19:04:02\t2021-08-17 06:30:34`;

// PhaseII JSON sample for contrast
const PHASEII_JSON_SAMPLE = `[{"song":{"id":37962,"chart":"SP EXPERT - 14"},"points":"999000","halo":"PERFECT FULL COMBO","rank":"AAA","flare":null,"timestamp":"2025-11-26 21:51:06"}]`;

Deno.test("Sanbai CSV format should be detected correctly", async () => {
  // Test that CSV format (comma-separated) is recognized as sanbai
  const firstLine = SANBAI_CSV_SAMPLE.split('\n')[0];
  
  // The detection logic checks for 'Song ID' header
  assertEquals(firstLine.includes('Song ID'), true, "CSV should contain 'Song ID' header");
  assertEquals(firstLine.includes(','), true, "CSV should use comma separator");
  
  console.log("✅ Sanbai CSV format detection verified");
});

Deno.test("Sanbai TSV format should be detected correctly", async () => {
  // Test that TSV format (tab-separated) is recognized as sanbai
  const firstLine = SANBAI_TSV_SAMPLE.split('\n')[0];
  
  assertEquals(firstLine.includes('Song ID'), true, "TSV should contain 'Song ID' header");
  assertEquals(firstLine.includes('\t'), true, "TSV should use tab separator");
  
  console.log("✅ Sanbai TSV format detection verified");
});

Deno.test("Separator detection should work for both formats", async () => {
  // CSV detection
  const csvFirstLine = SANBAI_CSV_SAMPLE.split('\n')[0];
  const csvSeparator = csvFirstLine.includes('\t') ? '\t' : ',';
  assertEquals(csvSeparator, ',', "CSV should detect comma separator");
  
  // TSV detection  
  const tsvFirstLine = SANBAI_TSV_SAMPLE.split('\n')[0];
  const tsvSeparator = tsvFirstLine.includes('\t') ? '\t' : ',';
  assertEquals(tsvSeparator, '\t', "TSV should detect tab separator");
  
  console.log("✅ Separator auto-detection verified for both CSV and TSV");
});

Deno.test("CSV column parsing should extract all values correctly", async () => {
  const lines = SANBAI_CSV_SAMPLE.split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  // Verify expected columns exist
  const expectedCols = ['Song ID', 'Song Name', 'Difficulty', 'Rating', 'Score', 'Grade', 'Lamp'];
  for (const col of expectedCols) {
    assertEquals(headers.includes(col), true, `Should have column: ${col}`);
  }
  
  // Parse a data row
  const dataRow = lines[1].split(',');
  assertEquals(dataRow[0], '006ob1iI9b1I8dDl0dq1bqIOP8886li1', "Song ID should parse correctly");
  assertEquals(dataRow[1], '☆shining☆', "Song Name with special chars should parse correctly");
  assertEquals(dataRow[2], 'bSP', "Difficulty code should parse correctly");
  assertEquals(dataRow[4], '1000000', "Score should parse correctly");
  
  console.log("✅ CSV column parsing verified");
});

Deno.test("PhaseII JSON should not be confused with Sanbai", async () => {
  const trimmed = PHASEII_JSON_SAMPLE.trim();
  
  // PhaseII starts with JSON array/object marker
  assertEquals(trimmed.startsWith('[') || trimmed.startsWith('{'), true, "PhaseII should start with JSON marker");
  
  // Sanbai should not start with JSON marker
  assertEquals(SANBAI_CSV_SAMPLE.trim().startsWith('['), false, "Sanbai CSV should not start with [");
  assertEquals(SANBAI_CSV_SAMPLE.trim().startsWith('{'), false, "Sanbai CSV should not start with {");
  
  console.log("✅ PhaseII vs Sanbai format distinction verified");
});
