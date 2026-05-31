import api from '../api/client.js';

export async function downloadExcelReport(params = {}) {
  const response = await api.get('/reports/excel', {
    params,
    responseType: 'blob',
  });
  const disposition = response.headers['content-disposition'];
  let filename = 'erp-otchet.xlsx';
  const match = disposition?.match(/filename="?([^"]+)"?/);
  if (match) filename = match[1];

  const url = URL.createObjectURL(new Blob([response.data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
