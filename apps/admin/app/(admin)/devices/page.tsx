import { apiFetch } from '../../../lib/api';
import { DeviceUsage } from '../../../lib/types';

async function loadDevices() {
  const devices = await apiFetch<DeviceUsage[]>('/devices?limit=500');

  const registeredCount = devices.length;
  const activeCount = devices.filter((device) => device.submissionsCount > 0).length;
  const latestUsedAt = devices
    .map((device) => device.lastUsedAt)
    .filter(Boolean)
    .sort((a, b) => (a! < b! ? 1 : -1))[0] ?? null;

  return {
    devices,
    registeredCount,
    activeCount,
    latestUsedAt,
  };
}

export default async function DevicesPage() {
  const data = await loadDevices();

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold">Devices</h2>
        <p className="mt-1 text-sm text-slate-600">
          Anonymous device footprint and last usage from price submissions.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <article className="card">
          <p className="text-xs uppercase tracking-wide text-slate-500">Registered devices</p>
          <p className="mt-2 text-3xl font-semibold">{data.registeredCount}</p>
        </article>
        <article className="card">
          <p className="text-xs uppercase tracking-wide text-slate-500">Active submitters</p>
          <p className="mt-2 text-3xl font-semibold">{data.activeCount}</p>
        </article>
        <article className="card">
          <p className="text-xs uppercase tracking-wide text-slate-500">Latest usage</p>
          <p className="mt-2 text-sm font-semibold">
            {data.latestUsedAt ? new Date(data.latestUsedAt).toLocaleString() : 'No submissions yet'}
          </p>
        </article>
      </section>

      <section className="card overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-600">
              <th className="px-2 py-2 font-medium">Device ID</th>
              <th className="px-2 py-2 font-medium">Registered</th>
              <th className="px-2 py-2 font-medium">Submissions</th>
              <th className="px-2 py-2 font-medium">Last used</th>
            </tr>
          </thead>
          <tbody>
            {data.devices.length === 0 ? (
              <tr>
                <td className="px-2 py-4 text-slate-500" colSpan={4}>
                  No devices registered yet.
                </td>
              </tr>
            ) : (
              data.devices.map((device) => (
                <tr key={device.id} className="border-b border-slate-100">
                  <td className="px-2 py-3 font-mono text-xs">{device.id}</td>
                  <td className="px-2 py-3 text-xs text-slate-600">
                    {new Date(device.createdAt).toLocaleString()}
                  </td>
                  <td className="px-2 py-3 font-medium">{device.submissionsCount}</td>
                  <td className="px-2 py-3 text-xs text-slate-600">
                    {device.lastUsedAt ? new Date(device.lastUsedAt).toLocaleString() : 'Never'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
