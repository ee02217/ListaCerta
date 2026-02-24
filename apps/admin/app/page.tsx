import { ListSchema } from '@listacerta/shared-types';

export default function HomePage() {
  const example = ListSchema.parse({
    id: 'admin-example-id',
    name: 'Admin Example List',
    createdAt: new Date().toISOString(),
  });

  return (
    <main className="container">
      <h1>ListaCerta Admin</h1>
      <p>Next.js + TypeScript ready.</p>
      <p>
        Shared schema example: <strong>{example.name}</strong>
      </p>
    </main>
  );
}
