export async function api<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, options);
  if (response.status === 401) {
    window.location.href = "/login";
    throw new Error("Sesi berakhir. Silakan masuk kembali.");
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Permintaan gagal. Coba lagi.");
  return data as T;
}
export function feedback(message: string, type = "info") {
  const element = document.getElementById("feedback");
  if (element) {
    element.className = "feedback";
    element.dataset.type = type;
    element.textContent = message;
  }
}
export function escapeHtml(value: unknown) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}
export function bytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), 4);
  return `${(value / 1024 ** index).toFixed(index > 0 ? 1 : 0)} ${["B", "KB", "MB", "GB", "TB"][index]}`;
}
