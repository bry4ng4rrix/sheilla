"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  ActionFormProvider,
  FormField,
  useActionForm,
} from "@/components/shared/form";
import { announcementSchema } from "@/lib/validations";
import { ANNOUNCEMENT_TYPE, PUBLICATION_STATUS } from "@/lib/labels";
import { saveAnnouncementAction } from "@/server/actions/communication";

export function AnnouncementForm({
  id,
  defaults,
  imageUrl,
}: {
  id?: string;
  defaults?: Record<string, string>;
  imageUrl?: string | null;
}) {
  const router = useRouter();
  const [preview, setPreview] = useState<string | null>(imageUrl ?? null);
  const { form, ref, onSubmit, pending } = useActionForm({
    schema: announcementSchema,
    defaultValues: {
      title: "",
      type: "GENERAL",
      content: "",
      status: "PUBLISHED",
      expiresAt: "",
      ...defaults,
    } as never,
    action: saveAnnouncementAction.bind(null, id ?? null),
    onSuccess: (d) => router.push(`/announcements/${(d as { id: string }).id}`),
  });
  const r = form.register;
  return (
    <ActionFormProvider form={form}>
      <form
        ref={ref}
        onSubmit={onSubmit}
        noValidate
        className="grid gap-6 lg:grid-cols-[1fr_320px]"
      >
        <div className="space-y-4 rounded-2xl border bg-card p-5">
          <FormField name="title" label="Titre" required>
            <Input
              id="title"
              className="h-11 text-base font-semibold"
              {...r("title")}
            />
          </FormField>
          <FormField name="content" label="Contenu" required>
            <Textarea
              id="content"
              rows={12}
              placeholder="Rédigez votre annonce…"
              {...r("content")}
            />
          </FormField>
        </div>
        <div className="space-y-4">
          <div className="space-y-4 rounded-2xl border bg-card p-5">
            <FormField name="type" label="Type" required>
              <NativeSelect
                id="type"
                className="w-full [&_select]:h-10"
                {...r("type")}
              >
                {Object.entries(ANNOUNCEMENT_TYPE).map(([v, t]) => (
                  <NativeSelectOption key={v} value={v}>
                    {t.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </FormField>
            <FormField
              name="status"
              label="Publication"
              hint="La première publication notifie tout le personnel."
            >
              <NativeSelect
                id="status"
                className="w-full [&_select]:h-10"
                {...r("status")}
              >
                {Object.entries(PUBLICATION_STATUS).map(([v, t]) => (
                  <NativeSelectOption key={v} value={v}>
                    {t.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </FormField>
            <FormField name="expiresAt" label="Expire le (facultatif)">
              <Input
                id="expiresAt"
                type="date"
                className="h-10"
                {...r("expiresAt")}
              />
            </FormField>
          </div>
          <label className="group relative block cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed border-orange-200 bg-orange-50/40 hover:border-orange-400">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element -- aperçu local
              <img
                src={preview}
                alt="Aperçu"
                className="aspect-video w-full object-cover"
              />
            ) : (
              <span className="flex aspect-video flex-col items-center justify-center gap-2 text-sm text-orange-600">
                <ImagePlus className="size-8" /> Ajouter une image
              </span>
            )}
            <input
              type="file"
              name="image"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setPreview(URL.createObjectURL(f));
              }}
            />
          </label>
          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <Save />}{" "}
            Enregistrer
          </Button>
        </div>
      </form>
    </ActionFormProvider>
  );
}
