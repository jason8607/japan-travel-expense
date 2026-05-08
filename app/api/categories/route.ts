import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { getRequestUser } from "@/lib/supabase/auth-helper";
import { DEFAULT_CATEGORIES } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const user = await getRequestUser(req);
    if (!user) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    const admin = getAdminClient();
    const { data: custom, error } = await admin
      .from("custom_categories")
      .select("*")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("categories GET error:", error.message);
      return NextResponse.json({ error: "載入分類失敗" }, { status: 500 });
    }

    if (!custom || custom.length === 0) {
      return NextResponse.json({ categories: DEFAULT_CATEGORIES, is_default: true });
    }

    const categories = custom.map((c) => ({
      id: c.id,
      value: c.value,
      label: c.label,
      icon: c.icon,
      color: c.color,
    }));

    return NextResponse.json({ categories, is_default: false });
  } catch (err) {
    console.error("categories GET error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getRequestUser(req);
    if (!user) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    const body = await req.json();

    if (body.seed) {
      const admin = getAdminClient();

      const { data: existing } = await admin
        .from("custom_categories")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);

      if (existing && existing.length > 0) {
        return NextResponse.json({ success: true });
      }

      const rows = DEFAULT_CATEGORIES.map((c, i) => ({
        user_id: user.id,
        value: c.value,
        label: c.label,
        icon: c.icon,
        color: c.color,
        sort_order: i,
      }));

      const { error } = await admin.from("custom_categories").insert(rows);
      if (error) {
        console.error("categories seed error:", error.message);
        return NextResponse.json({ error: "初始化分類失敗" }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    const { value, label, icon, color } = body;

    if (!label || typeof label !== "string" || label.trim().length === 0) {
      return NextResponse.json({ error: "分類名稱不得為空" }, { status: 400 });
    }

    const admin = getAdminClient();

    const { data: existing } = await admin
      .from("custom_categories")
      .select("sort_order")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

    const { data: category, error } = await admin
      .from("custom_categories")
      .insert({
        user_id: user.id,
        value: (value || label).trim(),
        label: label.trim(),
        icon: icon || "📦",
        color: color || "#6B7280",
        sort_order: nextOrder,
      })
      .select()
      .single();

    if (error) {
      console.error("categories POST error:", error.message);
      return NextResponse.json({ error: "新增分類失敗" }, { status: 500 });
    }

    return NextResponse.json({ category });
  } catch (err) {
    console.error("categories POST error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getRequestUser(req);
    if (!user) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    const body = await req.json();
    const { id, label, icon, color } = body;

    if (!id) {
      return NextResponse.json({ error: "缺少 id" }, { status: 400 });
    }

    const admin = getAdminClient();

    const { data: existing } = await admin
      .from("custom_categories")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: "無權限" }, { status: 403 });
    }

    if (label !== undefined && (typeof label !== "string" || label.trim().length === 0)) {
      return NextResponse.json({ error: "分類名稱不得為空" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (label !== undefined) {
      updates.label = label.trim();
      updates.value = label.trim();
    }
    if (icon !== undefined) updates.icon = icon;
    if (color !== undefined) updates.color = color;

    const { data: category, error } = await admin
      .from("custom_categories")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("categories PUT error:", error.message);
      return NextResponse.json({ error: "更新分類失敗" }, { status: 500 });
    }

    return NextResponse.json({ category });
  } catch (err) {
    console.error("categories PUT error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getRequestUser(req);
    if (!user) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    const body = await req.json();
    const orderedIds = body?.orderedIds;
    if (!Array.isArray(orderedIds) || orderedIds.some((id) => typeof id !== "string")) {
      return NextResponse.json({ error: "缺少排序資料" }, { status: 400 });
    }

    const admin = getAdminClient();

    const { data: owned } = await admin
      .from("custom_categories")
      .select("id")
      .eq("user_id", user.id);

    const ownedIds = new Set((owned ?? []).map((r) => r.id));
    if (orderedIds.some((id) => !ownedIds.has(id))) {
      return NextResponse.json({ error: "無權限" }, { status: 403 });
    }

    const updates = orderedIds.map((id, index) =>
      admin
        .from("custom_categories")
        .update({ sort_order: index })
        .eq("id", id)
        .eq("user_id", user.id)
    );

    const results = await Promise.all(updates);
    const failure = results.find((r) => r.error);
    if (failure?.error) {
      console.error("categories PATCH error:", failure.error.message);
      return NextResponse.json({ error: "更新排序失敗" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("categories PATCH error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getRequestUser(req);
    if (!user) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "缺少 id" }, { status: 400 });
    }

    const admin = getAdminClient();

    const { data: existing } = await admin
      .from("custom_categories")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: "無權限" }, { status: 403 });
    }

    const { error } = await admin
      .from("custom_categories")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("categories DELETE error:", error.message);
      return NextResponse.json({ error: "刪除分類失敗" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("categories DELETE error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
