"use client";

import { useRouter } from "next/navigation";

export function ToggleActiveMenu({
  menuId,
  isActive,
}: {
  menuId: string;
  type: string;
  isActive: boolean;
}) {
  const router = useRouter();

  async function activate() {
    await fetch(`/api/admin/menus/${menuId}/toggle-active`, { method: "PATCH" });
    router.refresh();
  }

  if (isActive) return <span className="text-xs text-green-700">● Active</span>;
  return <button onClick={activate} className="text-xs underline">Make active</button>;
}
