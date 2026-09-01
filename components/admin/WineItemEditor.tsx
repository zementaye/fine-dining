"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Wine = {
  id: string;
  category: string;
  name: string;
  vintage: string | null;
  region: string;
  priceGlassCents: number | null;
  priceBottleCents: number | null;
};

const EMPTY_FORM = {
  category: "",
  name: "",
  vintage: "",
  region: "",
  priceGlassCents: "",
  priceBottleCents: "",
};

export function WineItemEditor({ wines }: { wines: Wine[] }) {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function startEdit(wine: Wine) {
    setEditingId(wine.id);
    setForm({
      category: wine.category,
      name: wine.name,
      vintage: wine.vintage ?? "",
      region: wine.region,
      priceGlassCents: wine.priceGlassCents != null ? String(wine.priceGlassCents / 100) : "",
      priceBottleCents: wine.priceBottleCents != null ? String(wine.priceBottleCents / 100) : "",
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function save() {
    setSaving(true);
    const payload = {
      category: form.category,
      name: form.name,
      vintage: form.vintage || null,
      region: form.region,
      priceGlassCents: form.priceGlassCents ? Math.round(Number(form.priceGlassCents) * 100) : null,
      priceBottleCents: form.priceBottleCents ? Math.round(Number(form.priceBottleCents) * 100) : null,
    };

    const res = editingId
      ? await fetch(`/api/admin/wine/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch(`/api/admin/wine`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

    setSaving(false);
    if (res.ok) {
      resetForm();
      router.refresh();
    }
  }

  async function remove(id: string) {
    if (!confirm("Remove this wine from the list?")) return;
    const res = await fetch(`/api/admin/wine/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  return (
    <div>
      <div className="overflow-x-auto">
      <table className="w-full text-sm mb-10">
        <thead className="text-left text-charcoal/50 border-b border-charcoal/10">
          <tr>
            <th className="py-2">Category</th>
            <th>Name</th>
            <th>Vintage</th>
            <th>Region</th>
            <th>Glass</th>
            <th>Bottle</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {wines.map((w) => (
            <tr key={w.id} className="border-b border-charcoal/5">
              <td className="py-2">{w.category}</td>
              <td>{w.name}</td>
              <td>{w.vintage ?? "—"}</td>
              <td className="text-charcoal/50">{w.region}</td>
              <td>{w.priceGlassCents != null ? `$${(w.priceGlassCents / 100).toFixed(0)}` : "—"}</td>
              <td>{w.priceBottleCents != null ? `$${(w.priceBottleCents / 100).toFixed(0)}` : "—"}</td>
              <td className="space-x-3">
                <button onClick={() => startEdit(w)} className="text-xs underline">Edit</button>
                <button onClick={() => remove(w.id)} className="text-xs underline text-red-700">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      <div className="border border-charcoal/20 p-6 max-w-lg">
        <p className="text-xs uppercase tracking-widest2 text-charcoal/50 mb-4">
          {editingId ? "Edit Wine" : "Add Wine"}
        </p>
        <div className="space-y-3">
          <input placeholder="Category (e.g. Champagne, Red - Burgundy)" className="w-full border border-charcoal/20 px-3 py-2 text-sm"
            value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <input placeholder="Name" className="w-full border border-charcoal/20 px-3 py-2 text-sm"
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input placeholder="Vintage (optional)" className="w-full border border-charcoal/20 px-3 py-2 text-sm"
            value={form.vintage} onChange={(e) => setForm({ ...form, vintage: e.target.value })} />
          <input placeholder="Region" className="w-full border border-charcoal/20 px-3 py-2 text-sm"
            value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
          <input placeholder="Glass price (USD, blank if bottle-only)" className="w-full border border-charcoal/20 px-3 py-2 text-sm"
            value={form.priceGlassCents} onChange={(e) => setForm({ ...form, priceGlassCents: e.target.value })} />
          <input placeholder="Bottle price (USD, blank if glass-only)" className="w-full border border-charcoal/20 px-3 py-2 text-sm"
            value={form.priceBottleCents} onChange={(e) => setForm({ ...form, priceBottleCents: e.target.value })} />

          <div className="flex gap-3">
            <button
              onClick={save}
              disabled={saving || !form.category || !form.name || !form.region}
              className="bg-charcoal text-bone px-5 py-2 text-xs tracking-widest2 uppercase disabled:opacity-40"
            >
              {saving ? "Saving…" : editingId ? "Save Changes" : "Add Wine"}
            </button>
            {editingId && (
              <button onClick={resetForm} className="text-xs underline">Cancel</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
