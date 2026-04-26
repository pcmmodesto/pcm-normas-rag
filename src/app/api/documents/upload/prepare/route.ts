import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import {
  buildDocumentStoragePath,
  createDirectUploadSession,
  getDocumentsBucket,
  validateDirectUploadMetadata,
} from "@/features/documents/server/direct-upload-session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestId = randomUUID();
  console.info("[documents/upload/prepare]", {
    requestId,
    stage: "request_start",
  });

  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return uploadPrepareError("Voce precisa estar autenticado.", 401);
  }

  if (currentUser.role !== "ADMIN") {
    return uploadPrepareError("Apenas administradores podem enviar normas.", 403);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return uploadPrepareError("Nao foi possivel ler os dados do upload.", 400);
  }

  const validation = validateDirectUploadMetadata(body);

  if (!validation.ok) {
    return uploadPrepareError(validation.message, validation.status);
  }

  const bucket = getDocumentsBucket();
  const storagePath = buildDocumentStoragePath(
    validation.metadata.title,
    validation.metadata.fileName,
  );

  try {
    const supabase = createSupabaseServiceRoleClient();
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(storagePath, { upsert: false });

    if (error || !data?.token) {
      console.error("[documents/upload/prepare]", {
        requestId,
        stage: "signed_upload_url",
        message: error?.message ?? "Missing signed upload token.",
        bucket,
      });
      return uploadPrepareError(
        "Nao foi possivel preparar o envio direto ao Storage.",
        502,
      );
    }

    const uploadSession = createDirectUploadSession({
      id: requestId,
      exp: Date.now() + 15 * 60 * 1000,
      bucket,
      storagePath,
      metadata: validation.metadata,
    });

    console.info("[documents/upload/prepare]", {
      requestId,
      stage: "signed_upload_url",
      bucket,
      storagePathSegments: storagePath.split("/").length,
    });

    return NextResponse.json({
      ok: true,
      success: true,
      bucket,
      storagePath,
      token: data.token,
      uploadSession,
    });
  } catch (error) {
    console.error("[documents/upload/prepare]", {
      requestId,
      stage: "signed_upload_url",
      message: error instanceof Error ? error.message : "Unknown error",
      errorName: error instanceof Error ? error.name : typeof error,
      bucket,
    });

    return uploadPrepareError(
      "Nao foi possivel preparar o upload no Supabase Storage.",
      500,
    );
  }
}

function uploadPrepareError(message: string, status: number) {
  return NextResponse.json(
    {
      ok: false,
      success: false,
      message,
      error: message,
    },
    { status },
  );
}
