import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const targetEmail = process.argv[2] ?? "pcm.modestoengenharia@gmail.com";
const env = readEnvFile();
const supabaseUrl = env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausente.");
  process.exit(1);
}

const tempPassword = `Pcm-${randomBytes(12).toString("base64url")}!9`;
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const existing = await findUserByEmail(targetEmail);
let action;
let userId;

if (existing) {
  const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      ...(existing.user_metadata ?? {}),
      name: "PCM Modesto Engenharia",
    },
  });

  if (error) {
    throw error;
  }

  action = "updated";
  userId = data.user.id;
} else {
  const { data, error } = await supabase.auth.admin.createUser({
    email: targetEmail,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      name: "PCM Modesto Engenharia",
    },
  });

  if (error) {
    throw error;
  }

  action = "created";
  userId = data.user.id;
}

console.log(
  JSON.stringify(
    {
      ok: true,
      action,
      email: targetEmail,
      userId,
      adminEmailConfiguredLocally: (env.ADMIN_EMAILS ?? "")
        .toLowerCase()
        .split(",")
        .map((email) => email.trim())
        .includes(targetEmail.toLowerCase()),
      tempPassword,
    },
    null,
    2,
  ),
);

async function findUserByEmail(email) {
  let page = 1;

  while (page <= 50) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 100,
    });

    if (error) {
      throw error;
    }

    const found = data.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase(),
    );

    if (found || data.users.length < 100) {
      return found ?? null;
    }

    page += 1;
  }

  return null;
}

function readEnvFile() {
  const parsed = {};
  const text = readFileSync(".env", "utf8");

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const equalsIndex = line.indexOf("=");

    if (equalsIndex === -1) {
      continue;
    }

    const key = line.slice(0, equalsIndex);
    const value = line.slice(equalsIndex + 1).replace(/^"|"$/g, "");
    parsed[key] = value;
  }

  return parsed;
}
