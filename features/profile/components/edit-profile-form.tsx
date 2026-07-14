"use client";

import { useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Camera, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { updateProfileSchema, type UpdateProfileInput } from "@/validators/profile";
import { updateProfileAction, uploadAvatarAction } from "@/actions/profile";
import { USER_ROLE_LABELS, type UserRole } from "@/constants/user";
import type { OwnProfile } from "@/features/profile/services/profile.service";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function LockedField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-muted-foreground">{label}</Label>
      <div className="relative">
        <Input value={value} disabled className="pr-8" />
        <Lock className="absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
      </div>
    </div>
  );
}

export function EditProfileForm({ profile }: { profile: OwnProfile }) {
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [isUploading, startUpload] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { name: profile.name, phone: profile.phone ?? "" },
  });

  async function onSubmit(values: UpdateProfileInput) {
    const result = await updateProfileAction(values);
    if (result.success) {
      toast.success("Profile updated");
      reset(values);
    } else {
      toast.error(result.error);
    }
  }

  function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.set("file", file);
    startUpload(async () => {
      const result = await uploadAvatarAction(formData);
      if (result.success) {
        setAvatarUrl(URL.createObjectURL(file));
        toast.success("Profile picture updated");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar className="size-16">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={profile.name} />}
            <AvatarFallback className="bg-primary/10 text-base font-semibold text-primary">
              {initials(profile.name)}
            </AvatarFallback>
          </Avatar>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleAvatarChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full border bg-background text-muted-foreground hover:text-foreground"
            aria-label="Change profile picture"
          >
            <Camera className="size-3.5" />
          </button>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-lg font-semibold">{profile.name}</p>
            <Badge variant={profile.emailVerified ? "outline" : "destructive"}>
              {profile.emailVerified ? "Verified" : "Unverified"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{USER_ROLE_LABELS[profile.role as UserRole]}</p>
          <p className="text-sm text-muted-foreground">{profile.email}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <h3 className="text-sm font-semibold">Profile Information</h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <LockedField label="Job Title" value={profile.title ?? "Not set"} />

          <div className="space-y-1.5">
            <Label>Email Address</Label>
            <Input value={profile.email} disabled />
            <p className="text-xs text-muted-foreground">Change your email from the Security tab.</p>
          </div>
          <LockedField label="Department" value={profile.department ?? "Not set"} />

          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone Number</Label>
            <Input id="phone" {...register("phone")} placeholder="+1 (555) 000-0000" />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
          </div>
          <LockedField label="Role" value={USER_ROLE_LABELS[profile.role as UserRole]} />
        </div>

        <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
          <Lock className="mt-0.5 size-3.5 shrink-0" />
          <p>
            For security reasons, you can only update your personal contact information. Please contact your
            administrator to change your role, department, or job title.
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="outline" onClick={() => reset()} disabled={!isDirty || isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={!isDirty || isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
