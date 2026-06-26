"use client";

import type { ReactNode } from "react";
import { Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Teacher, TeacherWorkExperience } from "@/types/teacher";
import { cn } from "@/lib/utils";

function display(value: string | number | null | undefined): string {
  if (value == null) return "—";
  const s = String(value).trim();
  return s === "" || s === "—" ? "—" : s;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return display(iso);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatList(items: string[] | undefined): string {
  if (!items?.length) return "—";
  return items.join(", ");
}

function ProfileField({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border border-border/80 bg-muted/30 px-3 py-2.5",
        className
      )}
    >
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-foreground break-words">
        {value}
      </dd>
    </div>
  );
}

function ProfileSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function WorkRoleCard({ role, index }: { role: TeacherWorkExperience; index: number }) {
  const period = role.currentlyWorking
    ? `${formatDate(role.from)} – Present`
    : `${formatDate(role.from)} – ${formatDate(role.to)}`;
  return (
    <div className="rounded-lg border border-border/80 bg-muted/20 p-4">
      <p className="text-sm font-semibold text-foreground">Role {index + 1}</p>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
        <ProfileField label="School" value={display(role.schoolName)} />
        <ProfileField label="Role" value={display(role.role)} />
        <ProfileField label="Period" value={period} className="sm:col-span-2" />
        <ProfileField
          label="Currently working here"
          value={role.currentlyWorking ? "Yes" : "No"}
        />
      </dl>
    </div>
  );
}

export interface TeacherProfileViewProps {
  teacher: Teacher;
  loading?: boolean;
  onDownloadResume?: () => void;
  resumeDownloading?: boolean;
}

export function TeacherProfileView({
  teacher,
  loading,
  onDownloadResume,
  resumeDownloading,
}: TeacherProfileViewProps) {
  return (
    <div className="space-y-6">
      {loading ? (
        <div className="flex items-center gap-2 rounded-lg border border-dashed bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
          Loading latest details from the server…
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted-foreground">
          Teacher ID: {display(teacher.id)}
        </span>
        {teacher.createdAt ? (
          <span className="text-sm text-muted-foreground">
            Added {formatDate(teacher.createdAt)}
          </span>
        ) : null}
      </div>

      <ProfileSection title="Contact & location">
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ProfileField label="Full name" value={display(teacher.name)} />
          <ProfileField label="Email" value={display(teacher.email)} />
          <ProfileField label="Mobile" value={display(teacher.mobile)} />
          <ProfileField label="Country" value={display(teacher.country)} />
          <ProfileField label="State" value={display(teacher.state)} />
          <ProfileField label="City" value={display(teacher.city)} />
          <ProfileField
            label="Address"
            value={display(teacher.address)}
            className="sm:col-span-2 lg:col-span-3"
          />
        </dl>
      </ProfileSection>

      <ProfileSection title="Educational details">
        <dl className="grid gap-3 sm:grid-cols-2">
          <ProfileField label="UG college" value={display(teacher.ugCollege)} />
          <ProfileField
            label="PG university"
            value={display(teacher.pgUniversity)}
          />
          <ProfileField
            label="Qualification"
            value={display(teacher.qualification)}
          />
          <ProfileField
            label="Certifications"
            value={display(teacher.certifications)}
          />
        </dl>
        {teacher.extraEducation && teacher.extraEducation.length > 0 ? (
          <>
            <Separator className="my-4" />
            <p className="mb-3 text-sm font-medium text-muted-foreground">
              Additional details
            </p>
            <dl className="grid gap-3">
              {teacher.extraEducation.map((line, i) => (
                <ProfileField
                  key={`${teacher.id}-edu-${i}`}
                  label={`Additional ${i + 1}`}
                  value={display(line)}
                />
              ))}
            </dl>
          </>
        ) : null}
      </ProfileSection>

      <ProfileSection title="Teaching & preferences">
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ProfileField label="Subject taught" value={display(teacher.subject)} />
          <ProfileField label="Boards" value={formatList(teacher.boards)} />
          <ProfileField label="Grades" value={formatList(teacher.grades)} />
          {/* <ProfileField label="Roles" value={formatList(teacher.roles)} /> */}
          <ProfileField
            label="Current location"
            value={display(teacher.currentLocation)}
          />
          <ProfileField
            label="Preferred location"
            value={display(teacher.preferredLocation)}
          />
          <ProfileField
            label="Area of interest"
            value={display(teacher.areaOfInterest)}
          />
          <ProfileField
            label="Total experience"
            value={
              teacher.experienceYears > 0
                ? `${teacher.experienceYears} yrs`
                : "—"
            }
          />
          <ProfileField
            label="Current salary (₹)"
            value={
              teacher.currentSalary > 0
                ? String(teacher.currentSalary)
                : "—"
            }
          />
        </dl>
      </ProfileSection>

      <ProfileSection title="Work experience">
        {teacher.workHistory.length > 0 ? (
          <div className="space-y-4">
            {teacher.workHistory.map((w, i) => (
              <WorkRoleCard key={w.id} role={w} index={i} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No work history recorded.</p>
        )}
      </ProfileSection>

      <ProfileSection title="Resume, skills & notes">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col rounded-lg border border-border/80 bg-muted/30 px-3 py-2.5 sm:col-span-2">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Resume
            </dt>
            <dd className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">
                {display(teacher.resumeFileName)}
              </span>
              {onDownloadResume && teacher.resumeFileName ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={resumeDownloading}
                  onClick={onDownloadResume}
                >
                  {resumeDownloading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Download
                </Button>
              ) : null}
            </dd>
          </div>
          <ProfileField
            label="Skills & tags"
            value={formatList(teacher.skills)}
            className="sm:col-span-2"
          />
          <ProfileField
            label="Internal notes"
            value={display(teacher.notes)}
            className="sm:col-span-2"
          />
        </dl>
      </ProfileSection>
    </div>
  );
}
