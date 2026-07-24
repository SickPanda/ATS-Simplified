/**
 * Download a CSV export from /api/ats/export/{entity}
 * entity: candidates | jobs | clients | placements | pipeline
 */
export async function downloadCsvExport(entity) {
  const res = await fetch(`/api/ats/export/${entity}`);
  if (!res.ok) {
    let msg = `Export failed (${res.status})`;
    try {
      const j = await res.json();
      if (j?.message) msg = j.message;
    } catch { /* ignore */ }
    throw new Error(msg);
  }

  const blob = await res.blob();
  const cd = res.headers.get('Content-Disposition') || '';
  const match = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(cd);
  const fileName = match
    ? match[1].replace(/['"]/g, '')
    : `${entity}-${new Date().toISOString().slice(0, 10)}.csv`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return fileName;
}
