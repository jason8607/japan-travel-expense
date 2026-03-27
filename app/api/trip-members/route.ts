import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { getRequestUser } from "@/lib/supabase/auth-helper";

export async function GET(req: NextRequest) {
  try {
    const user = await getRequestUser(req);
    if (!user) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    const tripId = req.nextUrl.searchParams.get("trip_id");
    if (!tripId) {
      return NextResponse.json({ error: "缺少 trip_id" }, { status: 400 });
    }

    const admin = getAdminClient();

    const { data: membership } = await admin
      .from("trip_members")
      .select("trip_id")
      .eq("trip_id", tripId)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "無權限" }, { status: 403 });
    }

    const { data: members, error } = await admin
      .from("trip_members")
      .select("*, profile:profiles(*)")
      .eq("trip_id", tripId);

    if (error) {
      console.error("trip-members GET error:", error.message);
      return NextResponse.json({ error: "載入成員失敗" }, { status: 500 });
    }

    return NextResponse.json({ members: members || [] });
  } catch (err) {
    console.error("trip-members GET error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getRequestUser(req);
    if (!user) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    const { trip_id, email } = await req.json();
    if (!trip_id || !email) {
      return NextResponse.json({ error: "缺少必要參數" }, { status: 400 });
    }

    const admin = getAdminClient();

    const { data: callerMembership } = await admin
      .from("trip_members")
      .select("role")
      .eq("trip_id", trip_id)
      .eq("user_id", user.id)
      .single();

    if (!callerMembership || callerMembership.role !== "owner") {
      return NextResponse.json({ error: "只有建立者可以邀請成員" }, { status: 403 });
    }

    const { data: found } = await admin.rpc("find_user_by_email", { email_input: email });
    if (!found || found.length === 0) {
      return NextResponse.json({ error: "找不到此 Email 的使用者，請確認對方已註冊" }, { status: 404 });
    }

    const targetUserId = found[0].id;

    const { data: existing } = await admin
      .from("trip_members")
      .select("user_id")
      .eq("trip_id", trip_id)
      .eq("user_id", targetUserId)
      .single();

    if (existing) {
      return NextResponse.json({ error: "此成員已在旅程中" }, { status: 409 });
    }

    const { error } = await admin.from("trip_members").insert({
      trip_id,
      user_id: targetUserId,
      role: "member",
    });

    if (error) {
      console.error("trip-members POST error:", error.message);
      return NextResponse.json({ error: "邀請成員失敗" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("trip-members POST error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getRequestUser(req);
    if (!user) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    const { trip_id, user_id } = await req.json();
    if (!trip_id || !user_id) {
      return NextResponse.json({ error: "缺少必要參數" }, { status: 400 });
    }

    if (user_id === user.id) {
      return NextResponse.json({ error: "無法移除自己" }, { status: 400 });
    }

    const admin = getAdminClient();

    const { data: callerMembership } = await admin
      .from("trip_members")
      .select("role")
      .eq("trip_id", trip_id)
      .eq("user_id", user.id)
      .single();

    if (!callerMembership || callerMembership.role !== "owner") {
      return NextResponse.json({ error: "只有建立者可以移除成員" }, { status: 403 });
    }

    const { data: target } = await admin
      .from("trip_members")
      .select("role")
      .eq("trip_id", trip_id)
      .eq("user_id", user_id)
      .single();

    if (!target) {
      return NextResponse.json({ error: "找不到此成員" }, { status: 404 });
    }

    if (target.role === "owner") {
      return NextResponse.json({ error: "無法移除建立者" }, { status: 400 });
    }

    const { data: ownerMember } = await admin
      .from("trip_members")
      .select("user_id")
      .eq("trip_id", trip_id)
      .eq("role", "owner")
      .single();

    const ownerId = ownerMember?.user_id || user.id;

    // 先轉移資料，再刪成員
    // 若轉移失敗成員還在，可重試；若先刪成員轉移才失敗，會產生孤兒資料（paid_by 指向非成員）

    const { data: paidExpenses } = await admin
      .from("expenses")
      .select("id, title")
      .eq("trip_id", trip_id)
      .eq("paid_by", user_id);

    if (paidExpenses && paidExpenses.length > 0) {
      const results = await Promise.all(
        paidExpenses.map((exp) =>
          admin
            .from("expenses")
            .update({
              paid_by: ownerId,
              title: exp.title.endsWith("（轉移）") ? exp.title : `${exp.title}（轉移）`,
            })
            .eq("id", exp.id)
        )
      );
      const transferError = results.find((r) => r.error)?.error;
      if (transferError) {
        console.error("trip-members: expense transfer error:", transferError.message);
        return NextResponse.json({ error: "轉移消費紀錄失敗，成員未移除" }, { status: 500 });
      }
    }

    const { error: ownerIdError } = await admin
      .from("expenses")
      .update({ owner_id: null, split_type: "personal" })
      .eq("trip_id", trip_id)
      .eq("owner_id", user_id);

    if (ownerIdError) {
      console.error("trip-members: owner_id cleanup error:", ownerIdError.message);
      return NextResponse.json({ error: "清除消費歸屬失敗，成員未移除" }, { status: 500 });
    }

    const { error } = await admin
      .from("trip_members")
      .delete()
      .eq("trip_id", trip_id)
      .eq("user_id", user_id);

    if (error) {
      console.error("trip-members DELETE error:", error.message);
      return NextResponse.json({ error: "移除成員失敗" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("trip-members DELETE error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
