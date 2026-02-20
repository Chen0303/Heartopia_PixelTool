export async function fetchSheetTranslations(sheetId: string) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;

  const res = await fetch(url);
  const text = await res.text();

  const json = JSON.parse(text.substring(47).slice(0, -2));

  const rows = json.table.rows;

  const result: Record<string, any> = {};

  rows.forEach((row: any) => {
    const key = row.c[0]?.v;
    const zh = row.c[1]?.v;
    const en = row.c[2]?.v;

    if (key) {
      result[key] = { zh, en };
    }
  });

  return result;
}
