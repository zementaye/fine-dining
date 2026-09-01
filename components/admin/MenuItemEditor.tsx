"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Item = {
  id: string;
  courseId: string | null;
  category: string | null;
  name: string;
  description: string;
  priceCents: number | null;
  allergens: string[];
  winePairingNote: string | null;
  displayOrder: number;
};
type Course = { id: string; courseNumber: number; name: string };
type Menu = { id: string; type: "a_la_carte" | "tasting"; items: Item[]; courses: Course[] };

const EMPTY_FORM = {
  category: "",
  courseId: "",
  name: "",
  description: "",
  priceCents: "",
  allergens: "",
  winePairingNote: "",
};

export function MenuItemEditor({ menu }: { menu: Menu }) {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function startEdit(item: Item) {
    setEditingId(item.id);
    setForm({
      category: item.category ?? "",
      courseId: item.courseId ?? "",
      name: item.name,
      description: item.description,
      priceCents: item.priceCents != null ? String(item.priceCents / 100) : "",
      allergens: item.allergens.join(", "),
      winePairingNote: item.winePairingNote ?? "",
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function save() {
    setSaving(true);
    const payload = {
      menuId: menu.id,
      courseId: form.courseId || null,
      category: form.category || null,
      name: form.name,
      description: form.description,
      priceCents: form.priceCents ? Math.round(Number(form.priceCents) * 100) : null,
      allergens: form.allergens
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
      winePairingNote: form.winePairingNote || null,
    };

    const res = editingId
      ? await fetch(`/api/admin/menu-items/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch(`/api/admin/menu-items`, {
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
    if (!confirm("Remove this item from the menu?")) return;
    const res = await fetch(`/api/admin/menu-items/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  return (
    <div>
      <div className="overflow-x-auto">
      <table className="w-full text-sm mb-10">
        <thead className="text-left text-charcoal/50 border-b border-charcoal/10">
          <tr>
            <th className="py-2">Name</th>
            <th>{menu.type === "tasting" ? "Course" : "Category"}</th>
            <th>Price</th>
            <th>Allergens</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {menu.items.map((item) => (
            <tr key={item.id} className="border-b border-charcoal/5">
              <td className="py-2">{item.name}</td>
              <td>
                {menu.type === "tasting"
                  ? menu.courses.find((c) => c.id === item.courseId)?.name ?? "—"
                  : item.category ?? "—"}
              </td>
              <td>{item.priceCents != null ? `$${(item.priceCents / 100).toFixed(0)}` : "—"}</td>
              <td className="text-charcoal/50">{item.allergens.join(", ")}</td>
              <td className="space-x-3">
                <button onClick={() => startEdit(item)} className="text-xs underline">Edit</button>
                <button onClick={() => remove(item.id)} className="text-xs underline text-red-700">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      <div className="border border-charcoal/20 p-6 max-w-lg">
        <p className="text-xs uppercase tracking-widest2 text-charcoal/50 mb-4">
          {editingId ? "Edit Item" : "Add Item"}
        </p>
        <div className="space-y-3">
          <input placeholder="Name" className="w-full border border-charcoal/20 px-3 py-2 text-sm"
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <textarea placeholder="Description" className="w-full border border-charcoal/20 px-3 py-2 text-sm"
            value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

          {menu.type === "tasting" ? (
            <select className="w-full border border-charcoal/20 px-3 py-2 text-sm"
              value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })}>
              <option value="">Course…</option>
              {menu.courses.map((c) => (
                <option key={c.id} value={c.id}>Course {c.courseNumber} — {c.name}</option>
              ))}
            </select>
          ) : (
            <select className="w-full border border-charcoal/20 px-3 py-2 text-sm"
              value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="">Category…</option>
              <option>Starters</option>
              <option>Mains</option>
              <option>Desserts</option>
            </select>
          )}

          <input placeholder="Price (USD, blank for included)" className="w-full border border-charcoal/20 px-3 py-2 text-sm"
            value={form.priceCents} onChange={(e) => setForm({ ...form, priceCents: e.target.value })} />
          <input placeholder="Allergens (comma-separated)" className="w-full border border-charcoal/20 px-3 py-2 text-sm"
            value={form.allergens} onChange={(e) => setForm({ ...form, allergens: e.target.value })} />
          <input placeholder="Wine pairing note (optional)" className="w-full border border-charcoal/20 px-3 py-2 text-sm"
            value={form.winePairingNote} onChange={(e) => setForm({ ...form, winePairingNote: e.target.value })} />

          <div className="flex gap-3">
            <button
              onClick={save}
              disabled={saving || !form.name || !form.description}
              className="bg-charcoal text-bone px-5 py-2 text-xs tracking-widest2 uppercase disabled:opacity-40"
            >
              {saving ? "Saving…" : editingId ? "Save Changes" : "Add Item"}
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
